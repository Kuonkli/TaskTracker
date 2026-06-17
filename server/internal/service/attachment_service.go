package service

import (
	"context"
	"fmt"
	"mime/multipart"

	"github.com/google/uuid"
	"task-tracker/internal/models"
	"task-tracker/internal/uow"
	"task-tracker/pkg/storage"
)

// AttachmentService - интерфейс сервиса для работы с вложениями
type AttachmentService interface {
	// Upload загружает файл и создает запись в БД
	Upload(ctx context.Context, taskID, userID uuid.UUID, file multipart.File, header *multipart.FileHeader) (*models.Attachment, error)

	// UploadCommentAttachment загружает файл для комментария
	UploadCommentAttachment(ctx context.Context, commentID, userID uuid.UUID, file multipart.File, header *multipart.FileHeader) (*models.Attachment, error)

	// GetByID возвращает вложение по ID
	GetByID(ctx context.Context, id uuid.UUID) (*models.Attachment, error)

	// GetByTaskID возвращает все вложения задачи
	GetByTaskID(ctx context.Context, taskID uuid.UUID) ([]models.Attachment, error)

	// Delete удаляет вложение (файл с диска и запись из БД)
	Delete(ctx context.Context, id uuid.UUID) error
}

// attachmentService - реализация AttachmentService
type attachmentService struct {
	uowFactory uow.AttachmentUoWFactory
	storage    storage.FileStorage
}

// NewAttachmentService создает новый экземпляр сервиса
func NewAttachmentService(uowFactory uow.AttachmentUoWFactory, fileStorage storage.FileStorage) AttachmentService {
	return &attachmentService{
		uowFactory: uowFactory,
		storage:    fileStorage,
	}
}

// Upload загружает файл задачи
func (s *attachmentService) Upload(ctx context.Context, taskID, userID uuid.UUID, file multipart.File, header *multipart.FileHeader) (*models.Attachment, error) {
	// 1. Сохраняем файл на диск
	fileURL, err := s.storage.Save(header.Filename, file)
	if err != nil {
		return nil, fmt.Errorf("failed to save file: %w", err)
	}

	// 2. Создаем запись в БД
	w := s.uowFactory.New()

	fileSize := int(header.Size)
	fileType := header.Header.Get("Content-Type")
	attachment := &models.Attachment{
		TaskID:     &taskID,
		Filename:   header.Filename,
		FileURL:    fileURL,
		FileSize:   &fileSize,
		FileType:   &fileType,
		UploadedBy: userID,
	}

	if err = w.AttachmentRepo().Create(ctx, attachment); err != nil {
		// Если не удалось сохранить в БД - удаляем файл с диска
		err = s.storage.Delete(fileURL)
		if err != nil {
			return nil, err
		}
		return nil, fmt.Errorf("failed to save attachment record: %w", err)
	}

	// 3. Загружаем полную информацию с пользователем
	return w.AttachmentRepo().FindByID(ctx, attachment.ID)
}

// UploadCommentAttachment загружает файл для комментария
func (s *attachmentService) UploadCommentAttachment(ctx context.Context, commentID, userID uuid.UUID, file multipart.File, header *multipart.FileHeader) (*models.Attachment, error) {
	// 1. Сохраняем файл на диск
	fileURL, err := s.storage.Save(header.Filename, file)
	if err != nil {
		return nil, fmt.Errorf("failed to save file: %w", err)
	}

	// 2. Создаем запись в БД
	w := s.uowFactory.New()

	fileSize := int(header.Size)
	fileType := header.Header.Get("Content-Type")
	attachment := &models.Attachment{
		CommentID:  &commentID,
		Filename:   header.Filename,
		FileURL:    fileURL,
		FileSize:   &fileSize,
		FileType:   &fileType,
		UploadedBy: userID,
	}

	if err = w.AttachmentRepo().Create(ctx, attachment); err != nil {
		err = s.storage.Delete(fileURL)
		if err != nil {
			return nil, err
		}
		return nil, fmt.Errorf("failed to save attachment record: %w", err)
	}

	return w.AttachmentRepo().FindByID(ctx, attachment.ID)
}

// GetByID возвращает вложение по ID
func (s *attachmentService) GetByID(ctx context.Context, id uuid.UUID) (*models.Attachment, error) {
	w := s.uowFactory.New()
	return w.AttachmentRepo().FindByID(ctx, id)
}

// GetByTaskID возвращает все вложения задачи
func (s *attachmentService) GetByTaskID(ctx context.Context, taskID uuid.UUID) ([]models.Attachment, error) {
	w := s.uowFactory.New()
	return w.AttachmentRepo().FindByTaskID(ctx, taskID)
}

// Delete удаляет вложение (файл и запись)
func (s *attachmentService) Delete(ctx context.Context, id uuid.UUID) error {
	w := s.uowFactory.New()

	// 1. Находим вложение
	attachment, err := w.AttachmentRepo().FindByID(ctx, id)
	if err != nil {
		return fmt.Errorf("attachment not found: %w", err)
	}

	// 2. Удаляем файл с диска
	if err = s.storage.Delete(attachment.FileURL); err != nil {
		return fmt.Errorf("failed to delete file: %w", err)
	}

	// 3. Удаляем запись из БД
	if err = w.AttachmentRepo().Delete(ctx, id); err != nil {
		return fmt.Errorf("failed to delete attachment record: %w", err)
	}

	return nil
}
