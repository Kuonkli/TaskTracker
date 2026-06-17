// handlers/attachment_handler.go

package handlers

import (
	"fmt"
	"net/http"
	"task-tracker/internal/models"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	mwcontext "task-tracker/internal/handlers/middleware"
	"task-tracker/internal/service"
	"task-tracker/pkg/exceptions"
)

// AttachmentHandler - интерфейс обработчика вложений
type AttachmentHandler interface {
	// Upload загружает вложение к задаче
	Upload(c *gin.Context)

	// UploadToComment загружает вложение к комментарию
	UploadToComment(c *gin.Context)

	// Download скачивает вложение
	Download(c *gin.Context)

	// Delete удаляет вложение
	Delete(c *gin.Context)

	// ListByTask возвращает список вложений задачи
	ListByTask(c *gin.Context)
}

// attachmentHandler - реализация AttachmentHandler
type attachmentHandler struct {
	service service.AttachmentService
}

// NewAttachmentHandler создает новый экземпляр обработчика
func NewAttachmentHandler(service service.AttachmentService) AttachmentHandler {
	return &attachmentHandler{
		service: service,
	}
}

// Upload загружает вложение к задаче
func (h *attachmentHandler) Upload(c *gin.Context) {
	ctx := mwcontext.GetValidationContext(c)
	if ctx.UserID == uuid.Nil {
		c.JSON(exceptions.NewApiError(
			exceptions.Unauthorized("user id required"),
		))
		return
	}

	taskID, err := uuid.Parse(c.Param("task_id"))
	if err != nil {
		c.JSON(exceptions.NewApiError(
			exceptions.BadRequest("invalid task id"),
		))
		return
	}

	// Получаем файл из формы
	file, header, err := c.Request.FormFile("file")
	if err != nil {
		c.JSON(exceptions.NewApiError(
			exceptions.BadRequest("file is required"),
		))
		return
	}
	defer file.Close()

	// Проверяем размер файла (максимум 10MB)
	if header.Size > 10*1024*1024 {
		c.JSON(exceptions.NewApiError(
			exceptions.BadRequest("file size exceeds 10MB limit"),
		))
		return
	}

	// Загружаем файл через сервис
	attachment, err := h.service.Upload(c.Request.Context(), taskID, ctx.UserID, file, header)
	if err != nil {
		c.JSON(exceptions.NewApiError(err))
		return
	}

	c.JSON(http.StatusCreated, attachment)
}

// UploadToComment загружает вложение к комментарию
func (h *attachmentHandler) UploadToComment(c *gin.Context) {
	ctx := mwcontext.GetValidationContext(c)
	if ctx.UserID == uuid.Nil {
		c.JSON(exceptions.NewApiError(
			exceptions.Unauthorized("user id required"),
		))
		return
	}

	commentID, err := uuid.Parse(c.Param("comment_id"))
	if err != nil {
		c.JSON(exceptions.NewApiError(
			exceptions.BadRequest("invalid comment id"),
		))
		return
	}

	file, header, err := c.Request.FormFile("file")
	if err != nil {
		c.JSON(exceptions.NewApiError(
			exceptions.BadRequest("file is required"),
		))
		return
	}
	defer file.Close()

	if header.Size > 10*1024*1024 {
		c.JSON(exceptions.NewApiError(
			exceptions.BadRequest("file size exceeds 10MB limit"),
		))
		return
	}

	attachment, err := h.service.UploadCommentAttachment(c.Request.Context(), commentID, ctx.UserID, file, header)
	if err != nil {
		c.JSON(exceptions.NewApiError(err))
		return
	}

	c.JSON(http.StatusCreated, attachment)
}

// Download скачивает вложение по ID
func (h *attachmentHandler) Download(c *gin.Context) {
	attachmentID, err := uuid.Parse(c.Param("attachment_id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid attachment id"})
		return
	}

	// Получаем вложение из БД
	attachment, err := h.service.GetByID(c.Request.Context(), attachmentID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "attachment not found"})
		return
	}

	c.Header("Content-Disposition", fmt.Sprintf("attachment; filename=\"%s\"", attachment.Filename))
	if attachment.FileType != nil {
		c.Header("Content-Type", *attachment.FileType)
	}
	c.File(attachment.FileURL) // <-- ПРЯМО ТАК
}

// Delete удаляет вложение
func (h *attachmentHandler) Delete(c *gin.Context) {
	ctx := mwcontext.GetValidationContext(c)
	if ctx.UserID == uuid.Nil {
		c.JSON(exceptions.NewApiError(
			exceptions.Unauthorized("user id required"),
		))
		return
	}

	attachmentID, err := uuid.Parse(c.Param("attachment_id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid attachment id"})
		return
	}

	// Проверяем права на удаление
	attachment, err := h.service.GetByID(c.Request.Context(), attachmentID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "attachment not found"})
		return
	}

	// Только загрузивший может удалить (или owner/admin проекта)
	if attachment.UploadedBy != ctx.UserID {
		c.JSON(http.StatusForbidden, gin.H{"error": "you can only delete your own attachments"})
		return
	}

	if err := h.service.Delete(c.Request.Context(), attachmentID); err != nil {
		c.JSON(exceptions.NewApiError(err))
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "attachment deleted successfully"})
}

// ListByTask возвращает список вложений задачи
func (h *attachmentHandler) ListByTask(c *gin.Context) {
	taskID, err := uuid.Parse(c.Param("task_id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid task id"})
		return
	}

	attachments, err := h.service.GetByTaskID(c.Request.Context(), taskID)
	if err != nil {
		c.JSON(exceptions.NewApiError(err))
		return
	}

	if attachments == nil {
		attachments = []models.Attachment{}
	}

	c.JSON(http.StatusOK, gin.H{
		"attachments": attachments,
		"total":       len(attachments),
	})
}
