package service

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"github.com/google/uuid"
	"gorm.io/gorm"
	"task-tracker/internal/dto"
	"task-tracker/internal/models"
	"task-tracker/internal/uow"
	"task-tracker/pkg/exceptions"
	pkg "task-tracker/pkg/parser"
)

type ProjectService interface {
	CreateCustom(ctx context.Context, userID uuid.UUID, req dto.CreateCustomProjectRequest) (*models.Project, error)
	CreateDefault(ctx context.Context, userID uuid.UUID, req dto.CreateDefaultProjectRequest) (*models.Project, error)
	GetByID(ctx context.Context, projectID uuid.UUID) (*models.Project, error)
	Update(ctx context.Context, projectID uuid.UUID, req dto.UpdateProjectRequest) error
	Delete(ctx context.Context, projectID uuid.UUID) error
	GetUserProjects(ctx context.Context, userID uuid.UUID) ([]models.Project, error)
	GetProjectMembers(ctx context.Context, projectID uuid.UUID) ([]models.ProjectMember, error)
	UpdateUserLastSeen(ctx context.Context, projectID, userID uuid.UUID) error
}

type projectService struct {
	uowFactory uow.ProjectUoWFactory
}

func NewProjectService(uowFactory uow.ProjectUoWFactory) ProjectService {
	return &projectService{uowFactory: uowFactory}
}

func (s *projectService) CreateCustom(ctx context.Context, userID uuid.UUID, req dto.CreateCustomProjectRequest) (*models.Project, error) {
	// Создаем транзакцию через UoW
	uowTx, err := s.uowFactory.NewTransaction(ctx)
	if err != nil {
		return nil, fmt.Errorf("failed to begin transaction: %w", err)
	}
	defer func() {
		if r := recover(); r != nil {
			uowTx.Rollback()
		}
	}()

	// 1. Создаем проект
	project := &models.Project{
		OwnerID:     userID,
		Description: req.Description,
		Name:        req.Name,
	}
	if err = uowTx.ProjectRepo().Create(ctx, project); err != nil {
		uowTx.Rollback()
		return nil, fmt.Errorf("failed to create project: %w", err)
	}

	// 2. Добавляем владельца как участника
	member := &models.ProjectMember{
		ProjectID:       project.ID,
		UserID:          userID,
		PermissionLevel: "owner",
	}
	if err = uowTx.MemberRepo().Create(ctx, member); err != nil {
		uowTx.Rollback()
		return nil, fmt.Errorf("failed to add project owner: %w", err)
	}

	// 3. Создаем статусы и колонки
	for _, statusReq := range req.Statuses {
		status := &models.ProjectStatus{
			ProjectID:  project.ID,
			Name:       statusReq.Name,
			StatusType: statusReq.StatusType,
			Color:      statusReq.Color,
		}
		if err = uowTx.StatusRepo().Create(ctx, status); err != nil {
			uowTx.Rollback()
			return nil, fmt.Errorf("failed to create status '%s': %w", statusReq.Name, err)
		}

		// Если статус должен быть на доске - создаем колонку
		if statusReq.BoardPosition != nil {
			column := &models.Column{
				ProjectID: project.ID,
				StatusID:  status.ID,
				Position:  *statusReq.BoardPosition,
			}
			if err := uowTx.BoardRepo().CreateColumn(ctx, column); err != nil {
				uowTx.Rollback()
				return nil, fmt.Errorf("failed to create board column for status '%s': %w", statusReq.Name, err)
			}
		}
	}

	// 4. Создаем умные линии (ланы)
	for _, laneReq := range req.Lanes {
		// Парсим строку правила в JSON
		ruleParser := pkg.NewRuleParser(laneReq.RuleCondition)
		conditionNode, err := ruleParser.Parse()
		if err != nil {
			uowTx.Rollback()
			return nil, fmt.Errorf("failed to parse rule for lane '%s': %w", laneReq.Title, err)
		}

		ruleJSON, err := json.Marshal(conditionNode)
		if err != nil {
			uowTx.Rollback()
			return nil, fmt.Errorf("failed to marshal rule for lane '%s': %w", laneReq.Title, err)
		}

		lane := &models.Lane{
			ProjectID:     project.ID,
			Title:         laneReq.Title,
			Description:   &laneReq.Description,
			Position:      laneReq.Position,
			Color:         laneReq.Color,
			RuleCondition: ruleJSON,
		}

		if err = uowTx.BoardRepo().CreateLane(ctx, lane); err != nil {
			uowTx.Rollback()
			return nil, fmt.Errorf("failed to create lane '%s': %w", laneReq.Title, err)
		}
	}

	// 5. Создаем теги
	for _, tagReq := range req.Tags {
		tag := &models.Tag{
			ProjectID: project.ID,
			Title:     tagReq.Title,
			Color:     tagReq.Color,
		}
		if err = uowTx.TagRepo().Create(ctx, tag); err != nil {
			uowTx.Rollback()
			return nil, fmt.Errorf("failed to create tag '%s': %w", tagReq.Title, err)
		}
	}

	// Коммитим транзакцию
	if err = uowTx.Commit(ctx); err != nil {
		return nil, fmt.Errorf("failed to commit transaction: %w", err)
	}

	// Возвращаем созданный проект с полными данными
	return s.GetByID(ctx, project.ID)
}

func (s *projectService) CreateDefault(ctx context.Context, userID uuid.UUID, req dto.CreateDefaultProjectRequest) (*models.Project, error) {
	uoWTx, err := s.uowFactory.NewTransaction(ctx)
	if err != nil {
		return nil, err
	}
	defer func() {
		if r := recover(); r != nil {
			uoWTx.Rollback()
		}
	}()

	project, err := uoWTx.ProjectRepo().CreateDefault(ctx, userID, req)
	if err != nil {
		uoWTx.Rollback()
		return nil, err
	}

	if err = uoWTx.Commit(ctx); err != nil {
		return nil, err
	}

	return s.GetByID(ctx, project.ID)
}

func (s *projectService) GetByID(ctx context.Context, projectID uuid.UUID) (*models.Project, error) {
	uoWTx := s.uowFactory.New()
	project, err := uoWTx.ProjectRepo().GetProjectWithDetails(ctx, projectID)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, exceptions.ErrProjectNotFound
		}
		return nil, err
	}
	return project, nil
}

func (s *projectService) Update(ctx context.Context, projectID uuid.UUID, req dto.UpdateProjectRequest) error {
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

	if req.Name != "" && req.Name != project.Name {
		project.Name = req.Name
	}

	if err = uoWTx.ProjectRepo().Update(ctx, project); err != nil {
		uoWTx.Rollback()
		return err
	}

	return uoWTx.Commit(ctx)
}

func (s *projectService) Delete(ctx context.Context, projectID uuid.UUID) error {
	uoWTx, err := s.uowFactory.NewTransaction(ctx)
	if err != nil {
		return err
	}
	defer func() {
		if r := recover(); r != nil {
			uoWTx.Rollback()
		}
	}()

	if err = uoWTx.ProjectRepo().Delete(ctx, projectID); err != nil {
		uoWTx.Rollback()
		return err
	}

	return uoWTx.Commit(ctx)
}

func (s *projectService) GetUserProjects(ctx context.Context, userID uuid.UUID) ([]models.Project, error) {
	uoWTx := s.uowFactory.New()
	return uoWTx.ProjectRepo().FindByMemberID(ctx, userID)
}

func (s *projectService) GetProjectMembers(ctx context.Context, projectID uuid.UUID) ([]models.ProjectMember, error) {
	uoWTx := s.uowFactory.New()
	return uoWTx.MemberRepo().FindByProjectID(ctx, projectID)
}

func (s *projectService) UpdateUserLastSeen(ctx context.Context, projectID, userID uuid.UUID) error {
	uowTx := s.uowFactory.New()
	return uowTx.MemberRepo().UpdateUserLastSeen(ctx, projectID, userID)
}
