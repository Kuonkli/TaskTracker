package repository

import (
	"context"
	"github.com/google/uuid"
	"gorm.io/gorm"
	"task-tracker/internal/dto"
	"task-tracker/internal/models"
)

type AttachmentRepository interface {
	Create(ctx context.Context, attachment *models.Attachment) error
	FindByID(ctx context.Context, id uuid.UUID) (*models.Attachment, error)
	Update(ctx context.Context, attachment *models.Attachment) error
	Delete(ctx context.Context, id uuid.UUID) error
	List(ctx context.Context, filter dto.AttachmentFilter, limit, offset int) ([]models.Attachment, error)
	FindByTaskID(ctx context.Context, taskID uuid.UUID) ([]models.Attachment, error)
	FindByCommentID(ctx context.Context, commentID uuid.UUID) ([]models.Attachment, error)
}

type attachmentRepo struct {
	db *gorm.DB
}

func NewAttachmentRepository(db *gorm.DB) AttachmentRepository {
	return &attachmentRepo{db: db}
}

func (r *attachmentRepo) Create(ctx context.Context, attachment *models.Attachment) error {
	return r.db.WithContext(ctx).Create(attachment).Error
}

func (r *attachmentRepo) FindByID(ctx context.Context, id uuid.UUID) (*models.Attachment, error) {
	var attachment models.Attachment
	err := r.db.WithContext(ctx).Preload("Uploader").Preload("Task").Preload("Comment").First(&attachment, "id = ?", id).Error
	return &attachment, err
}

func (r *attachmentRepo) Update(ctx context.Context, attachment *models.Attachment) error {
	return r.db.WithContext(ctx).Save(attachment).Error
}

func (r *attachmentRepo) Delete(ctx context.Context, id uuid.UUID) error {
	return r.db.WithContext(ctx).Delete(&models.Attachment{}, "id = ?", id).Error
}

func (r *attachmentRepo) List(ctx context.Context, filter dto.AttachmentFilter, limit, offset int) ([]models.Attachment, error) {
	var attachments []models.Attachment
	query := r.db.WithContext(ctx).Preload("Uploader")

	if filter.TaskID != nil {
		query = query.Where("task_id = ?", *filter.TaskID)
	}
	if filter.CommentID != nil {
		query = query.Where("comment_id = ?", *filter.CommentID)
	}
	if filter.UploadedBy != nil {
		query = query.Where("uploaded_by = ?", *filter.UploadedBy)
	}

	err := query.
		Order("created_at DESC").
		Limit(limit).
		Offset(offset).
		Find(&attachments).Error

	return attachments, err
}

func (r *attachmentRepo) FindByTaskID(ctx context.Context, taskID uuid.UUID) ([]models.Attachment, error) {
	var attachments []models.Attachment
	err := r.db.WithContext(ctx).Preload("Uploader").Where("task_id = ?", taskID).Order("created_at DESC").Find(&attachments).Error
	return attachments, err
}

func (r *attachmentRepo) FindByCommentID(ctx context.Context, commentID uuid.UUID) ([]models.Attachment, error) {
	var attachments []models.Attachment
	err := r.db.WithContext(ctx).Preload("Uploader").Where("comment_id = ?", commentID).Order("created_at DESC").Find(&attachments).Error
	return attachments, err
}
