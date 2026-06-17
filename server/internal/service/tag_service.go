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

type TagService interface {
	Create(ctx context.Context, projectID uuid.UUID, req dto.CreateTagRequest) (*models.Tag, error)
	GetByID(ctx context.Context, id uuid.UUID) (*models.Tag, error)
	Delete(ctx context.Context, id uuid.UUID) error
	List(ctx context.Context, projectID uuid.UUID, limit, offset int) ([]models.Tag, int64, error)
	GetProjectTags(ctx context.Context, projectID uuid.UUID) ([]models.Tag, error)
}

type tagService struct {
	uowFactory uow.TagUoWFactory
}

func NewTagService(uowFactory uow.TagUoWFactory) TagService {
	return &tagService{uowFactory: uowFactory}
}

func (s *tagService) Create(ctx context.Context, projectID uuid.UUID, req dto.CreateTagRequest) (*models.Tag, error) {
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

	tag := &models.Tag{
		ProjectID: projectID,
		Title:     req.Title,
		Color:     req.Color,
	}

	if tag.Color == "" {
		tag.Color = "#8b5cf6"
	}

	if err = uoWTx.TagRepo().Create(ctx, tag); err != nil {
		uoWTx.Rollback()
		return nil, err
	}

	if err = uoWTx.Commit(ctx); err != nil {
		return nil, err
	}

	w := s.uowFactory.New()
	return w.TagRepo().FindByID(ctx, tag.ID)
}

func (s *tagService) GetByID(ctx context.Context, id uuid.UUID) (*models.Tag, error) {
	w := s.uowFactory.New()
	tag, err := w.TagRepo().FindByID(ctx, id)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, exceptions.ErrTagNotFound
		}
		return nil, err
	}
	return tag, nil
}

func (s *tagService) Delete(ctx context.Context, id uuid.UUID) error {
	uoWTx, err := s.uowFactory.NewTransaction(ctx)
	if err != nil {
		return err
	}
	defer func() {
		if r := recover(); r != nil {
			uoWTx.Rollback()
		}
	}()

	_, err = uoWTx.TagRepo().FindByID(ctx, id)
	if err != nil {
		uoWTx.Rollback()
		return exceptions.ErrTagNotFound
	}

	if err = uoWTx.TagRepo().Delete(ctx, id); err != nil {
		uoWTx.Rollback()
		return err
	}

	return uoWTx.Commit(ctx)
}

func (s *tagService) List(ctx context.Context, projectID uuid.UUID, limit, offset int) ([]models.Tag, int64, error) {
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

	filter := dto.TagFilter{
		ProjectID: &projectID,
	}

	tags, err := w.TagRepo().List(ctx, filter, limit, offset)
	if err != nil {
		return nil, 0, err
	}

	allTags, _ := w.TagRepo().FindByProjectID(ctx, projectID)
	total := int64(len(allTags))

	return tags, total, nil
}

func (s *tagService) GetProjectTags(ctx context.Context, projectID uuid.UUID) ([]models.Tag, error) {
	w := s.uowFactory.New()
	return w.TagRepo().FindByProjectID(ctx, projectID)
}
