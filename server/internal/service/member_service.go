package service

import (
	"context"
	"errors"
	"github.com/google/uuid"
	"gorm.io/gorm"
	"log"
	"task-tracker/internal/dto"
	"task-tracker/internal/models"
	"task-tracker/internal/uow"
	"task-tracker/pkg/exceptions"
)

type MemberService interface {
	GetMemberProfile(ctx context.Context, projectID, userID uuid.UUID) (*models.ProjectMember, error)
	AddMember(ctx context.Context, projectID uuid.UUID, userID uuid.UUID, req dto.AddMemberRequest) (*models.ProjectMember, error)
	RemoveMember(ctx context.Context, projectID uuid.UUID, targetUserID uuid.UUID) error
	UpdateMember(ctx context.Context, projectID uuid.UUID, targetUserID uuid.UUID, req dto.UpdateMemberRequest) (*models.ProjectMember, error)
	LeaveProject(ctx context.Context, projectID uuid.UUID, userID uuid.UUID) error
	TransferOwnership(ctx context.Context, projectID uuid.UUID, userID uuid.UUID, newOwnerID uuid.UUID) error
	CheckAccess(ctx context.Context, projectID uuid.UUID, userID uuid.UUID, requiredLevel string) error
}

type memberService struct {
	uowFactory uow.MemberUoWFactory
}

func NewMemberService(uowFactory uow.MemberUoWFactory) MemberService {
	return &memberService{uowFactory: uowFactory}
}

func (s *memberService) GetMemberProfile(ctx context.Context, projectID, userID uuid.UUID) (*models.ProjectMember, error) {
	w := s.uowFactory.New()
	return w.MemberRepo().FindByProjectAndUser(ctx, projectID, userID)
}

func (s *memberService) AddMember(ctx context.Context, projectID uuid.UUID, userID uuid.UUID, req dto.AddMemberRequest) (*models.ProjectMember, error) {
	uoWTx, err := s.uowFactory.NewTransaction(ctx)
	if err != nil {
		return nil, err
	}
	defer func() {
		if r := recover(); r != nil {
			uoWTx.Rollback()
		}
	}()

	// Проверяем, существует ли добавляемый пользователь
	targetUser, err := uoWTx.UserRepo().FindByID(ctx, req.UserID)
	if err != nil {
		uoWTx.Rollback()
		return nil, exceptions.ErrUserNotFound
	}

	// Проверяем, не является ли пользователь уже участником
	existing, _ := uoWTx.MemberRepo().FindByProjectAndUser(ctx, projectID, req.UserID)
	if existing != nil {
		uoWTx.Rollback()
		return nil, exceptions.ErrMemberAlreadyExists
	}

	// Получаем проект для проверки владельца
	project, err := uoWTx.ProjectRepo().FindByID(ctx, projectID)
	if err != nil {
		uoWTx.Rollback()
		return nil, exceptions.ErrProjectNotFound
	}

	// Нельзя добавить владельца через этот метод
	if req.UserID == project.OwnerID {
		uoWTx.Rollback()
		return nil, exceptions.ErrMemberAlreadyExists
	}

	// Создаем участника
	roleInTeam := req.RoleInTeam
	member := &models.ProjectMember{
		ProjectID:       projectID,
		UserID:          req.UserID,
		RoleInTeam:      &roleInTeam,
		PermissionLevel: req.PermissionLevel,
		GrantedByID:     &userID,
	}

	if err = uoWTx.MemberRepo().Create(ctx, member); err != nil {
		uoWTx.Rollback()
		return nil, err
	}

	if err = uoWTx.Commit(ctx); err != nil {
		return nil, err
	}

	member.User = *targetUser
	return member, nil
}

func (s *memberService) RemoveMember(ctx context.Context, projectID uuid.UUID, targetUserID uuid.UUID) error {
	uoWTx, err := s.uowFactory.NewTransaction(ctx)
	if err != nil {
		return err
	}
	defer func() {
		if r := recover(); r != nil {
			uoWTx.Rollback()
		}
	}()

	// Проверяем, не является ли пользователь владельцем
	project, err := uoWTx.ProjectRepo().FindByID(ctx, projectID)
	if err != nil {
		uoWTx.Rollback()
		return exceptions.ErrProjectNotFound
	}
	if targetUserID == project.OwnerID {
		uoWTx.Rollback()
		return exceptions.ErrCannotRemoveOwner
	}

	if err = uoWTx.MemberRepo().DeleteByProjectAndUser(ctx, projectID, targetUserID); err != nil {
		uoWTx.Rollback()
		return err
	}

	return uoWTx.Commit(ctx)
}

func (s *memberService) UpdateMember(ctx context.Context, projectID uuid.UUID, targetUserID uuid.UUID, req dto.UpdateMemberRequest) (*models.ProjectMember, error) {
	uoWTx, err := s.uowFactory.NewTransaction(ctx)
	if err != nil {
		return nil, err
	}
	defer func() {
		if r := recover(); r != nil {
			uoWTx.Rollback()
		}
	}()

	targetMember, err := uoWTx.MemberRepo().FindByProjectAndUser(ctx, projectID, targetUserID)
	if err != nil {
		uoWTx.Rollback()
		return nil, exceptions.ErrMemberNotFound
	}

	// Нельзя изменить права владельца
	project, err := uoWTx.ProjectRepo().FindByID(ctx, projectID)
	if err != nil {
		uoWTx.Rollback()
		return nil, exceptions.ErrProjectNotFound
	}
	if targetUserID == project.OwnerID {
		uoWTx.Rollback()
		return nil, exceptions.ErrCannotRemoveOwner
	}

	if req.RoleInTeam != "" {
		targetMember.RoleInTeam = &req.RoleInTeam
	}
	if req.PermissionLevel != "" {
		if req.PermissionLevel == "owner" {
			uoWTx.Rollback()
			return nil, exceptions.ErrCannotRemoveOwner
		}
		targetMember.PermissionLevel = req.PermissionLevel
	}

	if err = uoWTx.MemberRepo().Update(ctx, targetMember); err != nil {
		uoWTx.Rollback()
		return nil, err
	}

	if err = uoWTx.Commit(ctx); err != nil {
		return nil, err
	}

	return uoWTx.MemberRepo().FindByID(ctx, targetMember.ID)
}

func (s *memberService) LeaveProject(ctx context.Context, projectID uuid.UUID, userID uuid.UUID) error {
	uoWTx, err := s.uowFactory.NewTransaction(ctx)
	if err != nil {
		return err
	}
	defer func() {
		if r := recover(); r != nil {
			uoWTx.Rollback()
		}
	}()

	// Проверяем, что пользователь участник
	member, err := uoWTx.MemberRepo().FindByProjectAndUser(ctx, projectID, userID)
	if err != nil {
		uoWTx.Rollback()
		return exceptions.ErrMemberNotFound
	}

	// Владелец не может покинуть проект без передачи прав
	project, err := uoWTx.ProjectRepo().FindByID(ctx, projectID)
	if err != nil {
		uoWTx.Rollback()
		return exceptions.ErrProjectNotFound
	}
	if userID == project.OwnerID {
		uoWTx.Rollback()
		return exceptions.ErrCannotRemoveOwner
	}

	if err = uoWTx.MemberRepo().Delete(ctx, member.ID); err != nil {
		uoWTx.Rollback()
		return err
	}

	return uoWTx.Commit(ctx)
}

func (s *memberService) TransferOwnership(ctx context.Context, projectID uuid.UUID, userID uuid.UUID, newOwnerID uuid.UUID) error {
	uoWTx, err := s.uowFactory.NewTransaction(ctx)
	if err != nil {
		return err
	}
	defer func() {
		if r := recover(); r != nil {
			uoWTx.Rollback()
		}
	}()

	project, err := uoWTx.ProjectRepo().FindByID(ctx, projectID)
	if err != nil {
		uoWTx.Rollback()
		return exceptions.ErrProjectNotFound
	}

	// Убеждаемся, что текущий пользователь - владелец
	if project.OwnerID != userID {
		uoWTx.Rollback()
		return exceptions.ErrProjectOwnerRequired
	}

	// Проверяем, что новый владелец является участником проекта
	newOwnerMember, err := uoWTx.MemberRepo().FindByProjectAndUser(ctx, projectID, newOwnerID)
	if err != nil {
		uoWTx.Rollback()
		return exceptions.ErrMemberNotFound
	}

	if err = uoWTx.MemberRepo().TransferOwnership(ctx, projectID, userID, newOwnerMember); err != nil {
		uoWTx.Rollback()
		return err
	}

	return uoWTx.Commit(ctx)
}

func (s *memberService) CheckAccess(ctx context.Context, projectID uuid.UUID, userID uuid.UUID, requiredLevel string) error {
	uoW := s.uowFactory.New()

	project, err := uoW.ProjectRepo().FindByID(ctx, projectID)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return exceptions.ErrProjectNotFound
		}
		return err
	}
	if project.OwnerID == userID {
		return nil
	}

	member, err := uoW.MemberRepo().FindByProjectAndUser(ctx, projectID, userID)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return exceptions.ErrProjectAccessDenied
		}
		return err
	}

	log.Printf("[CheckAccess] project_id = %s required_level = %s, user permission_level = %s", projectID, requiredLevel, member.PermissionLevel)

	levels := map[string]int{"member": 1, "admin": 2, "owner": 3}
	if levels[member.PermissionLevel] < levels[requiredLevel] {
		log.Printf("[CheckAccess] error = %s", exceptions.ErrInsufficientPermissions.Error())
		return exceptions.ErrInsufficientPermissions
	}

	return nil
}
