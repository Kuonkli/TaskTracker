package repository

import (
	"context"
	"errors"
	"github.com/google/uuid"
	"gorm.io/gorm"
	"task-tracker/internal/dto"
	"task-tracker/internal/models"
)

type ChangeRepository interface {
	Create(ctx context.Context, change *models.Change) error
	FindByID(ctx context.Context, id uuid.UUID) (*models.Change, error)
	Update(ctx context.Context, change *models.Change) error
	Delete(ctx context.Context, id uuid.UUID) error
	List(ctx context.Context, filter dto.ChangeFilter) ([]models.Change, int64, error)
	GetLastChange(ctx context.Context, taskID uuid.UUID, field string) (*models.Change, error)
}

type changeRepo struct {
	db *gorm.DB
}

func NewChangeRepository(db *gorm.DB) ChangeRepository {
	return &changeRepo{db: db}
}

func (r *changeRepo) Create(ctx context.Context, change *models.Change) error {
	return r.db.WithContext(ctx).Create(change).Error
}

func (r *changeRepo) FindByID(ctx context.Context, id uuid.UUID) (*models.Change, error) {
	var change models.Change
	err := r.db.WithContext(ctx).
		Preload("Task").
		Preload("User").
		First(&change, "id = ?", id).Error
	return &change, err
}

func (r *changeRepo) Update(ctx context.Context, change *models.Change) error {
	return r.db.WithContext(ctx).Save(change).Error
}

func (r *changeRepo) Delete(ctx context.Context, id uuid.UUID) error {
	return r.db.WithContext(ctx).Delete(&models.Change{}, "id = ?", id).Error
}

func (r *changeRepo) List(ctx context.Context, filter dto.ChangeFilter) ([]models.Change, int64, error) {
	var changes []models.Change

	query := r.db.WithContext(ctx).
		Model(&models.Change{}).
		Preload("Task").
		Preload("User")

	if filter.TaskID != nil {
		query = query.Where("task_id = ?", *filter.TaskID)
	}
	if filter.UserID != nil {
		query = query.Where("user_id = ?", *filter.UserID)
	}
	if filter.FieldName != "" {
		query = query.Where("field_name = ?", filter.FieldName)
	}

	var total int64
	if err := query.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	if filter.Limit != 0 {
		query = query.Limit(filter.Limit)
	} else {
		query = query.Limit(50)
	}
	if filter.Offset != 0 {
		query = query.Offset(filter.Offset)
	}

	err := query.
		Order("created_at DESC").
		Find(&changes).Error

	return changes, total, err
}

func (r *changeRepo) GetLastChange(ctx context.Context, taskID uuid.UUID, field string) (*models.Change, error) {
	var change models.Change

	query := r.db.WithContext(ctx).
		Where("task_id = ?", taskID)

	if field != "all" {
		query = query.Where("field_name = ?", field)
	}

	err := query.
		Order("created_at DESC").
		First(&change).Error

	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, nil
		}
		return nil, err
	}

	return &change, nil
}
