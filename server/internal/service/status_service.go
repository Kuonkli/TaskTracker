package service

import (
	"context"
	"errors"
	"github.com/google/uuid"
	"gorm.io/gorm"
	"task-tracker/internal/dto"
	"task-tracker/internal/models"
	"task-tracker/internal/uow"
	"task-tracker/pkg/exceptions"
)

type StatusService interface {
	Create(ctx context.Context, projectID uuid.UUID, req dto.CreateStatusRequest) (*models.ProjectStatus, error)
	GetByID(ctx context.Context, id uuid.UUID) (*models.ProjectStatus, error)
	Update(ctx context.Context, id uuid.UUID, req dto.UpdateStatusRequest) (*models.ProjectStatus, error)
	Delete(ctx context.Context, id uuid.UUID) error
	List(ctx context.Context, projectID uuid.UUID, limit, offset int) ([]models.ProjectStatus, int64, error)
	GetProjectStatuses(ctx context.Context, projectID uuid.UUID) ([]models.ProjectStatus, error)
}

type statusService struct {
	uowFactory uow.StatusUoWFactory
}

func NewStatusService(uowFactory uow.StatusUoWFactory) StatusService {
	return &statusService{uowFactory: uowFactory}
}

func (s *statusService) Create(ctx context.Context, projectID uuid.UUID, req dto.CreateStatusRequest) (*models.ProjectStatus, error) {
	uoWTx, err := s.uowFactory.NewTransaction(ctx)
	if err != nil {
		return nil, err
	}
	defer func() {
		if r := recover(); r != nil {
			uoWTx.Rollback()
		}
	}()

	_, err = uoWTx.ProjectRepo().FindByID(ctx, projectID)
	if err != nil {
		uoWTx.Rollback()
		return nil, exceptions.ErrProjectNotFound
	}

	status := &models.ProjectStatus{
		ProjectID:  projectID,
		Name:       req.Name,
		StatusType: req.StatusType,
		Color:      req.Color,
	}

	if status.Color == "" {
		status.Color = "#8B5CF6"
	}

	if err = uoWTx.StatusRepo().Create(ctx, status); err != nil {
		uoWTx.Rollback()
		return nil, err
	}

	if err = uoWTx.Commit(ctx); err != nil {
		return nil, err
	}

	w := s.uowFactory.New()
	return w.StatusRepo().FindByID(ctx, status.ID)
}

func (s *statusService) GetByID(ctx context.Context, id uuid.UUID) (*models.ProjectStatus, error) {
	w := s.uowFactory.New()
	status, err := w.StatusRepo().FindByID(ctx, id)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, exceptions.ErrStatusNotFound
		}
		return nil, err
	}
	return status, nil
}

func (s *statusService) Update(ctx context.Context, id uuid.UUID, req dto.UpdateStatusRequest) (*models.ProjectStatus, error) {
	uoWTx, err := s.uowFactory.NewTransaction(ctx)
	if err != nil {
		return nil, err
	}
	defer func() {
		if r := recover(); r != nil {
			uoWTx.Rollback()
		}
	}()

	status, err := uoWTx.StatusRepo().FindByID(ctx, id)
	if err != nil {
		uoWTx.Rollback()
		return nil, exceptions.ErrStatusNotFound
	}

	if req.Name != nil {
		status.Name = *req.Name
	}
	if req.StatusType != nil {
		status.StatusType = *req.StatusType
	}
	if req.Color != nil {
		status.Color = *req.Color
	}

	if err = uoWTx.StatusRepo().Update(ctx, status); err != nil {
		uoWTx.Rollback()
		return nil, err
	}

	if err = uoWTx.Commit(ctx); err != nil {
		return nil, err
	}
	w := s.uowFactory.New()
	return w.StatusRepo().FindByID(ctx, id)
}

func (s *statusService) Delete(ctx context.Context, id uuid.UUID) error {
	uoWTx, err := s.uowFactory.NewTransaction(ctx)
	if err != nil {
		return err
	}
	defer func() {
		if r := recover(); r != nil {
			uoWTx.Rollback()
		}
	}()

	_, err = uoWTx.StatusRepo().FindByID(ctx, id)
	if err != nil {
		uoWTx.Rollback()
		return exceptions.ErrStatusNotFound
	}

	if err = uoWTx.StatusRepo().Delete(ctx, id); err != nil {
		uoWTx.Rollback()
		return err
	}

	return uoWTx.Commit(ctx)
}

func (s *statusService) List(ctx context.Context, projectID uuid.UUID, limit, offset int) ([]models.ProjectStatus, int64, error) {
	if limit <= 0 {
		limit = 20
	}
	if limit > 100 {
		limit = 100
	}
	if offset < 0 {
		offset = 0
	}

	w := s.uowFactory.New()

	filter := dto.ProjectStatusFilter{
		ProjectID: &projectID,
	}

	statuses, err := w.StatusRepo().List(ctx, filter, limit, offset)
	if err != nil {
		return nil, 0, err
	}

	allStatuses, _ := w.StatusRepo().FindByProjectID(ctx, projectID)
	total := int64(len(allStatuses))

	return statuses, total, nil
}

func (s *statusService) GetProjectStatuses(ctx context.Context, projectID uuid.UUID) ([]models.ProjectStatus, error) {
	w := s.uowFactory.New()
	return w.StatusRepo().FindByProjectID(ctx, projectID)
}
