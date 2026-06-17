package handlers

import (
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"net/http"
	"strconv"
	mwcontext "task-tracker/internal/handlers/middleware"
	"task-tracker/pkg/exceptions"

	"task-tracker/internal/dto"
	"task-tracker/internal/service"
)

type TaskHandler interface {
	CreateTask(c *gin.Context)
	GetTask(c *gin.Context)
	UpdateTask(c *gin.Context)
	DeleteTask(c *gin.Context)
	GetProjectTasks(c *gin.Context)
	GetUserTasks(c *gin.Context)
	AddTag(c *gin.Context)
	RemoveTag(c *gin.Context)
}

type taskHandler struct {
	taskService service.TaskService
}

func NewTaskHandler(taskService service.TaskService) TaskHandler {
	return &taskHandler{
		taskService: taskService,
	}
}

// CreateTask создает новую задачу
// POST /api/projects/:project_id/tasks
func (h *taskHandler) CreateTask(c *gin.Context) {
	ctx := mwcontext.GetValidationContext(c)
	if ctx.UserID == uuid.Nil {
		c.JSON(exceptions.NewApiError(exceptions.Unauthorized("user id required")))
		return
	}
	if ctx.ProjectID == uuid.Nil {
		c.JSON(exceptions.NewApiError(exceptions.NotFound("project not found")))
		return
	}

	var req dto.CreateTaskRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(exceptions.NewApiError(err))
		return
	}

	task, err := h.taskService.Create(c.Request.Context(), ctx.ProjectID, ctx.UserID, req)
	if err != nil {
		c.JSON(exceptions.NewApiError(err))
		return
	}

	c.JSON(http.StatusCreated, task)
}

// GetTask возвращает задачу по ID
// GET /api/projects/:project_id/tasks/:task_id
func (h *taskHandler) GetTask(c *gin.Context) {
	ctx := mwcontext.GetValidationContext(c)
	if ctx.TaskID == uuid.Nil {
		c.JSON(exceptions.NewApiError(exceptions.NotFound("task not found")))
		return
	}

	task, err := h.taskService.GetByID(c.Request.Context(), ctx.TaskID)
	if err != nil {
		c.JSON(exceptions.NewApiError(err))
		return
	}

	c.JSON(http.StatusOK, task)
}

// UpdateTask обновляет задачу
// PUT /api/projects/:project_id/tasks/:task_id
func (h *taskHandler) UpdateTask(c *gin.Context) {
	ctx := mwcontext.GetValidationContext(c)
	if ctx.UserID == uuid.Nil {
		c.JSON(exceptions.NewApiError(exceptions.Unauthorized("user id required")))
		return
	}
	if ctx.TaskID == uuid.Nil {
		c.JSON(exceptions.NewApiError(exceptions.NotFound("task not found")))
		return
	}

	var req dto.UpdateTaskRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(exceptions.NewApiError(err))
		return
	}

	if err := h.taskService.Update(c.Request.Context(), ctx.TaskID, ctx.UserID, req); err != nil {
		c.JSON(exceptions.NewApiError(err))
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Task updated successfully"})
}

// DeleteTask удаляет задачу
// DELETE /api/projects/:project_id/tasks/:task_id
func (h *taskHandler) DeleteTask(c *gin.Context) {
	ctx := mwcontext.GetValidationContext(c)
	if ctx.TaskID == uuid.Nil {
		c.JSON(exceptions.NewApiError(exceptions.NotFound("task not found")))
		return
	}

	if err := h.taskService.Delete(c.Request.Context(), ctx.TaskID); err != nil {
		c.JSON(exceptions.NewApiError(err))
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Task deleted successfully"})
}

// GetProjectTasks возвращает все задачи проекта
// GET /api/projects/:project_id/tasks
// handlers/task_handler.go
func (h *taskHandler) GetProjectTasks(c *gin.Context) {
	ctx := mwcontext.GetValidationContext(c)
	if ctx.ProjectID == uuid.Nil {
		c.JSON(exceptions.NewApiError(exceptions.NotFound("project not found")))
		return
	}

	// Парсим query фильтры
	var queryFilter dto.QueryFilter
	if err := c.ShouldBindQuery(&queryFilter); err != nil {
		c.JSON(exceptions.NewApiError(err))
		return
	}

	// Парсим в TaskFilter
	filter, err := queryFilter.Parse()
	if err != nil {
		c.JSON(exceptions.NewApiError(err))
		return
	}

	filter.ProjectID = &ctx.ProjectID

	tasks, total, err := h.taskService.List(c.Request.Context(), *filter)
	if err != nil {
		c.JSON(exceptions.NewApiError(err))
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"tasks":  tasks,
		"total":  total,
		"limit":  filter.Limit,
		"offset": filter.Offset,
		"page":   queryFilter.Page,
	})
}

// GetUserTasks возвращает задачи текущего пользователя
// GET /api/user/tasks
func (h *taskHandler) GetUserTasks(c *gin.Context) {
	ctx := mwcontext.GetValidationContext(c)
	if ctx.UserID == uuid.Nil {
		c.JSON(exceptions.NewApiError(exceptions.Unauthorized("user id required")))
		return
	}

	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "20"))
	offset, _ := strconv.Atoi(c.DefaultQuery("offset", "0"))

	filter := dto.TaskFilter{
		AssigneeID: &ctx.UserID,
	}

	tasks, total, err := h.taskService.List(c.Request.Context(), filter)
	if err != nil {
		c.JSON(exceptions.NewApiError(err))
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"tasks":  tasks,
		"total":  total,
		"limit":  limit,
		"offset": offset,
	})
}

// AddTag добавляет тег к задаче
// POST /api/projects/:project_id/tasks/:task_id/tags?tag_id=...
func (h *taskHandler) AddTag(c *gin.Context) {
	ctx := mwcontext.GetValidationContext(c)
	if ctx.TaskID == uuid.Nil {
		c.JSON(exceptions.NewApiError(exceptions.NotFound("task not found")))
		return
	}

	var req dto.TagIDRequest
	if err := c.ShouldBindQuery(&req); err != nil {
		c.JSON(exceptions.NewApiError(err))
		return
	}

	tagID, err := uuid.Parse(req.TagID)
	if err != nil {
		c.JSON(exceptions.NewApiError(err))
		return
	}

	if err = h.taskService.AddTag(c.Request.Context(), ctx.TaskID, tagID); err != nil {
		c.JSON(exceptions.NewApiError(err))
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Tag added successfully"})
}

// RemoveTag удаляет тег из задачи
// DELETE /api/projects/:project_id/tasks/:task_id/tags?tag_id=...
func (h *taskHandler) RemoveTag(c *gin.Context) {
	ctx := mwcontext.GetValidationContext(c)
	if ctx.TaskID == uuid.Nil {
		c.JSON(exceptions.NewApiError(exceptions.NotFound("task not found")))
		return
	}

	var req dto.TagIDRequest
	if err := c.ShouldBindQuery(&req); err != nil {
		c.JSON(exceptions.NewApiError(err))
		return
	}

	tagID, err := uuid.Parse(req.TagID)
	if err != nil {
		c.JSON(exceptions.NewApiError(err))
		return
	}

	if err = h.taskService.RemoveTag(c.Request.Context(), ctx.TaskID, tagID); err != nil {
		c.JSON(exceptions.NewApiError(err))
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Tag removed successfully"})
}
