package repository

import (
	"context"

	"github.com/google/uuid"
	"gorm.io/gorm"
	"task-tracker/internal/models"
)

// AttachmentRepository - интерфейс для работы с вложениями
type AttachmentRepository interface {
	// Create создает запись о вложении
	Create(ctx context.Context, attachment *models.Attachment) error

	// FindByID находит вложение по ID
	FindByID(ctx context.Context, id uuid.UUID) (*models.Attachment, error)

	// FindByTaskID находит все вложения задачи
	FindByTaskID(ctx context.Context, taskID uuid.UUID) ([]models.Attachment, error)

	// FindByCommentID находит все вложения комментария
	FindByCommentID(ctx context.Context, commentID uuid.UUID) ([]models.Attachment, error)

	// Delete удаляет запись о вложении
	Delete(ctx context.Context, id uuid.UUID) error
}

// attachmentRepo - реализация AttachmentRepository
type attachmentRepo struct {
	db *gorm.DB
}

// NewAttachmentRepository создает новый экземпляр репозитория
func NewAttachmentRepository(db *gorm.DB) AttachmentRepository {
	return &attachmentRepo{db: db}
}

// Create создает запись о вложении в БД
func (r *attachmentRepo) Create(ctx context.Context, attachment *models.Attachment) error {
	return r.db.WithContext(ctx).Create(attachment).Error
}

// FindByID находит вложение по ID с пользователем кто загрузил
func (r *attachmentRepo) FindByID(ctx context.Context, id uuid.UUID) (*models.Attachment, error) {
	var attachment models.Attachment
	err := r.db.WithContext(ctx).
		Preload("Uploader"). // Загружаем информацию о пользователе
		First(&attachment, "id = ?", id).Error

	if err != nil {
		return nil, err
	}

	return &attachment, nil
}

// FindByTaskID находит все вложения задачи, отсортированные по дате создания
func (r *attachmentRepo) FindByTaskID(ctx context.Context, taskID uuid.UUID) ([]models.Attachment, error) {
	var attachments []models.Attachment
	err := r.db.WithContext(ctx).
		Where("task_id = ?", taskID).
		Preload("Uploader").
		Order("created_at DESC").
		Find(&attachments).Error

	return attachments, err
}

// FindByCommentID находит все вложения комментария
func (r *attachmentRepo) FindByCommentID(ctx context.Context, commentID uuid.UUID) ([]models.Attachment, error) {
	var attachments []models.Attachment
	err := r.db.WithContext(ctx).
		Where("comment_id = ?", commentID).
		Preload("Uploader").
		Order("created_at DESC").
		Find(&attachments).Error

	return attachments, err
}

// Delete удаляет запись о вложении из БД
func (r *attachmentRepo) Delete(ctx context.Context, id uuid.UUID) error {
	return r.db.WithContext(ctx).Delete(&models.Attachment{}, "id = ?", id).Error
}
