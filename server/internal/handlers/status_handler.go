package handlers

import (
	"net/http"
	"strconv"
	"task-tracker/internal/dto"
	mwcontext "task-tracker/internal/handlers/middleware"
	"task-tracker/internal/models"
	"task-tracker/internal/service"
	"task-tracker/pkg/exceptions"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

type StatusHandler interface {
	CreateStatus(c *gin.Context)
	GetStatus(c *gin.Context)
	UpdateStatus(c *gin.Context)
	DeleteStatus(c *gin.Context)
	GetProjectStatuses(c *gin.Context)
}

type statusHandler struct {
	statusService service.StatusService
}

func NewStatusHandler(statusService service.StatusService) StatusHandler {
	return &statusHandler{
		statusService: statusService,
	}
}

// CreateStatus создает новый статус в проекте
func (h *statusHandler) CreateStatus(c *gin.Context) {
	ctx := mwcontext.GetValidationContext(c)
	if ctx.ProjectID == uuid.Nil {
		c.JSON(exceptions.NewApiError(exceptions.BadRequest("project id required")))
		return
	}

	var req dto.CreateStatusRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(exceptions.NewApiError(err))
		return
	}

	status, err := h.statusService.Create(c.Request.Context(), ctx.ProjectID, req)
	if err != nil {
		c.JSON(exceptions.NewApiError(err))
		return
	}

	c.JSON(http.StatusCreated, mapStatusToResponse(status))
}

// GetStatus возвращает статус по ID
func (h *statusHandler) GetStatus(c *gin.Context) {
	ctx := mwcontext.GetValidationContext(c)
	if ctx.StatusID == uuid.Nil {
		c.JSON(exceptions.NewApiError(exceptions.BadRequest("status id required")))
		return
	}

	status, err := h.statusService.GetByID(c.Request.Context(), ctx.StatusID)
	if err != nil {
		c.JSON(exceptions.NewApiError(err))
		return
	}

	c.JSON(http.StatusOK, mapStatusToResponse(status))
}

// UpdateStatus обновляет статус
func (h *statusHandler) UpdateStatus(c *gin.Context) {
	ctx := mwcontext.GetValidationContext(c)
	if ctx.StatusID == uuid.Nil {
		c.JSON(exceptions.NewApiError(exceptions.BadRequest("status id required")))
		return
	}

	var req dto.UpdateStatusRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(exceptions.NewApiError(err))
		return
	}

	status, err := h.statusService.Update(c.Request.Context(), ctx.StatusID, req)
	if err != nil {
		c.JSON(exceptions.NewApiError(err))
		return
	}

	c.JSON(http.StatusOK, mapStatusToResponse(status))
}

// DeleteStatus удаляет статус
func (h *statusHandler) DeleteStatus(c *gin.Context) {
	ctx := mwcontext.GetValidationContext(c)
	if ctx.StatusID == uuid.Nil {
		c.JSON(exceptions.NewApiError(exceptions.BadRequest("status id required")))
		return
	}

	if err := h.statusService.Delete(c.Request.Context(), ctx.StatusID); err != nil {
		c.JSON(exceptions.NewApiError(err))
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Status deleted successfully"})
}

// GetProjectStatuses возвращает все статусы проекта
func (h *statusHandler) GetProjectStatuses(c *gin.Context) {
	ctx := mwcontext.GetValidationContext(c)
	if ctx.ProjectID == uuid.Nil {
		c.JSON(exceptions.NewApiError(exceptions.BadRequest("project id required")))
		return
	}

	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "20"))
	offset, _ := strconv.Atoi(c.DefaultQuery("offset", "0"))

	statuses, total, err := h.statusService.List(c.Request.Context(), ctx.ProjectID, limit, offset)
	if err != nil {
		c.JSON(exceptions.NewApiError(err))
		return
	}

	response := make([]dto.StatusResponse, len(statuses))
	for i, s := range statuses {
		response[i] = *mapStatusToResponse(&s)
	}

	c.JSON(http.StatusOK, dto.StatusListResponse{
		Statuses: response,
		Total:    total,
		Limit:    limit,
		Offset:   offset,
	})
}

func mapStatusToResponse(s *models.ProjectStatus) *dto.StatusResponse {
	return &dto.StatusResponse{
		ID:         s.ID,
		Name:       s.Name,
		StatusType: s.StatusType,
		Color:      s.Color,
		ProjectID:  s.ProjectID,
		CreatedAt:  s.CreatedAt,
		UpdatedAt:  s.UpdatedAt,
	}
}
