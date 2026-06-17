package handlers

import (
	"fmt"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"net/http"
	mwcontext "task-tracker/internal/handlers/middleware"
	"task-tracker/pkg/exceptions"

	"task-tracker/internal/dto"
	"task-tracker/internal/service"
)

type ProjectHandler interface {
	CreateCustomProject(c *gin.Context)
	CreateDefaultProject(c *gin.Context)
	GetUserProjects(c *gin.Context)
	GetProject(c *gin.Context)
	UpdateProject(c *gin.Context)
	DeleteProject(c *gin.Context)
	GetProjectMembers(c *gin.Context)
	GetSummary(c *gin.Context)
}

type projectHandler struct {
	projectService service.ProjectService
}

func NewProjectHandler(projectService service.ProjectService) ProjectHandler {
	return &projectHandler{projectService: projectService}
}

func (h *projectHandler) CreateCustomProject(c *gin.Context) {
	ctx := mwcontext.GetValidationContext(c)
	if ctx.UserID == uuid.Nil {
		c.JSON(exceptions.NewApiError(
			exceptions.Unauthorized("invalid user id"),
		))
		return
	}

	var req dto.CreateCustomProjectRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(exceptions.NewApiError(err))
		return
	}

	// Валидация: хотя бы один статус должен быть на доске
	hasBoardStatus := false
	for _, status := range req.Statuses {
		if status.BoardPosition != nil {
			hasBoardStatus = true
			break
		}
	}
	if !hasBoardStatus {
		c.JSON(exceptions.NewApiError(
			exceptions.BadRequest("at least one status must be visible on board"),
		))
		return
	}

	// Валидация board_position: уникальность и последовательность
	boardPositions := make(map[int]bool)
	for _, status := range req.Statuses {
		if status.BoardPosition != nil {
			pos := *status.BoardPosition
			if pos < 1 {
				c.JSON(exceptions.NewApiError(
					exceptions.BadRequest(fmt.Sprintf("board_position must be >= 1, got %d", pos)),
				))
				return
			}
			if boardPositions[pos] {
				c.JSON(exceptions.NewApiError(
					exceptions.BadRequest(fmt.Sprintf("duplicate board_position: %d", pos)),
				))
				return
			}
			boardPositions[pos] = true
		}
	}

	project, err := h.projectService.CreateCustom(c.Request.Context(), ctx.UserID, req)
	if err != nil {
		c.JSON(exceptions.NewApiError(err))
		return
	}

	c.JSON(http.StatusCreated, dto.ProjectResponse{
		ID:        project.ID,
		Name:      project.Name,
		OwnerID:   project.OwnerID,
		CreatedAt: project.CreatedAt,
		UpdatedAt: project.UpdatedAt,
	})
}

func (h *projectHandler) CreateDefaultProject(c *gin.Context) {
	ctx := mwcontext.GetValidationContext(c)
	if ctx.UserID == uuid.Nil {
		c.JSON(exceptions.NewApiError(exceptions.Unauthorized("invalid user id")))
		return
	}

	var req dto.CreateDefaultProjectRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(exceptions.NewApiError(err))
		return
	}

	project, err := h.projectService.CreateDefault(c.Request.Context(), ctx.UserID, req)
	if err != nil {
		c.JSON(exceptions.NewApiError(err))
		return
	}
	c.JSON(http.StatusCreated, project)
}

func (h *projectHandler) GetUserProjects(c *gin.Context) {
	ctx := mwcontext.GetValidationContext(c)
	if ctx.UserID == uuid.Nil {
		c.JSON(exceptions.NewApiError(exceptions.Unauthorized("invalid user id")))
		return
	}

	projects, err := h.projectService.GetUserProjects(c.Request.Context(), ctx.UserID)
	if err != nil {
		c.JSON(exceptions.NewApiError(err))
		return
	}
	c.JSON(http.StatusOK, projects)
}

func (h *projectHandler) GetProject(c *gin.Context) {
	ctx := mwcontext.GetValidationContext(c)
	if ctx.ProjectID == uuid.Nil {
		c.JSON(exceptions.NewApiError(exceptions.NotFound("project not found")))
		return
	}

	project, err := h.projectService.GetByID(c.Request.Context(), ctx.ProjectID)
	if err != nil {
		c.JSON(exceptions.NewApiError(err))
		return
	}
	c.JSON(http.StatusOK, project)
}

func (h *projectHandler) UpdateProject(c *gin.Context) {
	ctx := mwcontext.GetValidationContext(c)
	if ctx.ProjectID == uuid.Nil {
		c.JSON(exceptions.NewApiError(exceptions.NotFound("project not found")))
		return
	}

	var req dto.UpdateProjectRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(exceptions.NewApiError(err))
		return
	}

	if err := h.projectService.Update(c.Request.Context(), ctx.ProjectID, req); err != nil {
		c.JSON(exceptions.NewApiError(err))
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Project updated successfully"})
}

func (h *projectHandler) DeleteProject(c *gin.Context) {
	ctx := mwcontext.GetValidationContext(c)
	if ctx.ProjectID == uuid.Nil {
		c.JSON(exceptions.NewApiError(exceptions.NotFound("project not found")))
		return
	}

	if err := h.projectService.Delete(c.Request.Context(), ctx.ProjectID); err != nil {
		c.JSON(exceptions.NewApiError(err))
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Project deleted successfully"})
}

func (h *projectHandler) GetProjectMembers(c *gin.Context) {
	ctx := mwcontext.GetValidationContext(c)
	if ctx.ProjectID == uuid.Nil {
		c.JSON(exceptions.NewApiError(exceptions.NotFound("project not found")))
		return
	}

	members, err := h.projectService.GetProjectMembers(c.Request.Context(), ctx.ProjectID)
	if err != nil {
		c.JSON(exceptions.NewApiError(err))
		return
	}

	c.JSON(http.StatusOK, members)
}

func (h *projectHandler) GetSummary(c *gin.Context) {
	ctx := mwcontext.GetValidationContext(c)
	period := c.DefaultQuery("period", "30d")

	if period != "7d" && period != "30d" && period != "90d" {
		c.JSON(exceptions.NewApiError(
			exceptions.BadRequest("invalid period, must be 7d, 30d or 90d"),
		))
		return
	}

	summary, err := h.projectService.GetSummary(c.Request.Context(), ctx.ProjectID, period)
	if err != nil {
		c.JSON(exceptions.NewApiError(err))
		return
	}

	c.JSON(http.StatusOK, summary)
}
