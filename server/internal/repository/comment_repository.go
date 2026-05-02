package repository

import (
	"context"
	"github.com/google/uuid"
	"gorm.io/gorm"
	"task-tracker/internal/dto"
	"task-tracker/internal/models"
)

type CommentRepository interface {
	Create(ctx context.Context, comment *models.Comment) error
	FindByID(ctx context.Context, id uuid.UUID) (*models.Comment, error)
	Update(ctx context.Context, comment *models.Comment) error
	Delete(ctx context.Context, id uuid.UUID) error
	List(ctx context.Context, filter dto.CommentFilter) ([]models.Comment, int64, error)
}

type commentRepo struct {
	db *gorm.DB
}

func NewCommentRepository(db *gorm.DB) CommentRepository {
	return &commentRepo{db: db}
}

func (r *commentRepo) Create(ctx context.Context, comment *models.Comment) error {
	return r.db.WithContext(ctx).Create(comment).Error
}

func (r *commentRepo) FindByID(ctx context.Context, id uuid.UUID) (*models.Comment, error) {
	var comment models.Comment
	err := r.db.WithContext(ctx).Preload("Task").Preload("User").Preload("Attachments").First(&comment, "id = ?", id).Error
	return &comment, err
}

func (r *commentRepo) Update(ctx context.Context, comment *models.Comment) error {
	return r.db.WithContext(ctx).Save(comment).Error
}

func (r *commentRepo) Delete(ctx context.Context, id uuid.UUID) error {
	return r.db.WithContext(ctx).Delete(&models.Comment{}, "id = ?", id).Error
}

func (r *commentRepo) List(ctx context.Context, filter dto.CommentFilter) ([]models.Comment, int64, error) {
	var comments []models.Comment

	query := r.db.WithContext(ctx).Model(&models.Comment{}).Preload("User").Preload("Attachments")

	if filter.TaskID != nil {
		query = query.Where("task_id = ?", *filter.TaskID)
	}
	if filter.UserID != nil {
		query = query.Where("user_id = ?", *filter.UserID)
	}
	if filter.Content != "" {
		query = query.Where("content ILIKE ?", "%"+filter.Content+"%")
	}

	var total int64
	if err := query.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	if filter.Limit != 0 {
		query = query.Limit(filter.Limit)
	} else {
		query = query.Limit(filter.Limit)
	}
	if filter.Offset != 0 {
		query = query.Offset(filter.Offset)
	}

	err := query.
		Order("created_at DESC").
		Find(&comments).Error

	return comments, total, err
}
