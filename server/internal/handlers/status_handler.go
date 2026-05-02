package handlers

import (
	"net/http"
	"strconv"
	"task-tracker/internal/dto"
	"task-tracker/internal/models"
	"task-tracker/internal/service"

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
// POST /api/projects/:project_id/statuses
func (h *statusHandler) CreateStatus(c *gin.Context) {
	projectID, err := uuid.Parse(c.Param("project_id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid project id"})
		return
	}

	var req dto.CreateStatusRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	status, err := h.statusService.Create(c.Request.Context(), projectID, req)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, mapStatusToResponse(status))
}

// GetStatus возвращает статус по ID
// GET /api/statuses/:status_id
func (h *statusHandler) GetStatus(c *gin.Context) {
	statusID, err := uuid.Parse(c.Param("status_id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid status id"})
		return
	}

	status, err := h.statusService.GetByID(c.Request.Context(), statusID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, mapStatusToResponse(status))
}

// UpdateStatus обновляет статус
// PUT /api/statuses/:status_id
func (h *statusHandler) UpdateStatus(c *gin.Context) {
	statusID, err := uuid.Parse(c.Param("status_id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid status id"})
		return
	}

	var req dto.UpdateStatusRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	status, err := h.statusService.Update(c.Request.Context(), statusID, req)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, mapStatusToResponse(status))
}

// DeleteStatus удаляет статус
// DELETE /api/statuses/:status_id
func (h *statusHandler) DeleteStatus(c *gin.Context) {
	statusID, err := uuid.Parse(c.Param("status_id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid status id"})
		return
	}

	if err := h.statusService.Delete(c.Request.Context(), statusID); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Status deleted successfully"})
}

// GetProjectStatuses возвращает все статусы проекта
// GET /api/projects/:project_id/statuses
func (h *statusHandler) GetProjectStatuses(c *gin.Context) {
	projectID, err := uuid.Parse(c.Param("project_id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid project id"})
		return
	}

	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "20"))
	offset, _ := strconv.Atoi(c.DefaultQuery("offset", "0"))

	statuses, total, err := h.statusService.List(c.Request.Context(), projectID, limit, offset)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
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
