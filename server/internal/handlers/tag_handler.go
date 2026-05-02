package handlers

import (
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"net/http"
	"strconv"
	mwcontext "task-tracker/internal/handlers/middleware"
	"task-tracker/pkg/exceptions"

	"task-tracker/internal/dto"
	"task-tracker/internal/models"
	"task-tracker/internal/service"
)

type TagHandler interface {
	CreateTag(c *gin.Context)
	GetTag(c *gin.Context)
	DeleteTag(c *gin.Context)
	GetProjectTags(c *gin.Context)
}

type tagHandler struct {
	tagService service.TagService
}

func NewTagHandler(tagService service.TagService) TagHandler {
	return &tagHandler{
		tagService: tagService,
	}
}

// CreateTag создает новый тег в проекте
// POST /api/projects/:project_id/tags
func (h *tagHandler) CreateTag(c *gin.Context) {
	ctx := mwcontext.GetValidationContext(c)
	if ctx.ProjectID == uuid.Nil {
		c.JSON(exceptions.NewApiError(exceptions.NotFound("project not found")))
		return
	}

	var req dto.CreateTagRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(exceptions.NewApiError(err))
		return
	}

	tag, err := h.tagService.Create(c.Request.Context(), ctx.ProjectID, req)
	if err != nil {
		c.JSON(exceptions.NewApiError(err))
		return
	}

	c.JSON(http.StatusCreated, mapTagToResponse(tag))
}

// GetTag возвращает тег по ID
// GET /api/projects/:project_id/tags/:tag_id
func (h *tagHandler) GetTag(c *gin.Context) {
	ctx := mwcontext.GetValidationContext(c)
	if ctx.TagID == uuid.Nil {
		c.JSON(exceptions.NewApiError(exceptions.NotFound("tag not found")))
		return
	}

	tag, err := h.tagService.GetByID(c.Request.Context(), ctx.TagID)
	if err != nil {
		c.JSON(exceptions.NewApiError(err))
		return
	}

	c.JSON(http.StatusOK, mapTagToResponse(tag))
}

// DeleteTag удаляет тег
// DELETE /api/projects/:project_id/tags/:tag_id
func (h *tagHandler) DeleteTag(c *gin.Context) {
	ctx := mwcontext.GetValidationContext(c)
	if ctx.TagID == uuid.Nil {
		c.JSON(exceptions.NewApiError(exceptions.NotFound("tag not found")))
		return
	}

	if err := h.tagService.Delete(c.Request.Context(), ctx.TagID); err != nil {
		c.JSON(exceptions.NewApiError(err))
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Tag deleted successfully"})
}

// GetProjectTags возвращает все теги проекта
// GET /api/projects/:project_id/tags
func (h *tagHandler) GetProjectTags(c *gin.Context) {
	ctx := mwcontext.GetValidationContext(c)
	if ctx.ProjectID == uuid.Nil {
		c.JSON(exceptions.NewApiError(exceptions.NotFound("project not found")))
		return
	}

	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "20"))
	offset, _ := strconv.Atoi(c.DefaultQuery("offset", "0"))

	// Всегда идем в сервис, так как в контексте больше нет полных данных
	tags, total, err := h.tagService.List(c.Request.Context(), ctx.ProjectID, limit, offset)
	if err != nil {
		c.JSON(exceptions.NewApiError(err))
		return
	}

	response := make([]dto.TagResponse, len(tags))
	for i, t := range tags {
		response[i] = *mapTagToResponse(&t)
	}

	c.JSON(http.StatusOK, dto.TagListResponse{
		Tags:   response,
		Total:  total,
		Limit:  limit,
		Offset: offset,
	})
}

func mapTagToResponse(t *models.Tag) *dto.TagResponse {
	return &dto.TagResponse{
		ID:        t.ID,
		Title:     t.Title,
		Color:     t.Color,
		ProjectID: t.ProjectID,
		CreatedAt: t.CreatedAt,
	}
}
