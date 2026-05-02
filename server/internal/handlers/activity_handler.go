package handlers

import (
	"net/http"
	"strconv"
	mwcontext "task-tracker/internal/handlers/middleware"
	"task-tracker/internal/service"
	"task-tracker/pkg/exceptions"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

type ActivityHandler interface {
	GetTaskActivities(c *gin.Context)
	GetUserActivities(c *gin.Context)
	GetTaskComments(c *gin.Context)
	GetTaskChanges(c *gin.Context)
}

type activityHandler struct {
	activityService service.ActivityService
}

func NewTaskActivityHandler(activityService service.ActivityService) ActivityHandler {
	return &activityHandler{
		activityService: activityService,
	}
}

func (h *activityHandler) GetTaskActivities(c *gin.Context) {
	ctx := mwcontext.GetValidationContext(c)
	if ctx.UserID == uuid.Nil {
		c.JSON(exceptions.NewApiError(exceptions.Unauthorized("user id required")))
		return
	}
	if ctx.ProjectID == uuid.Nil {
		c.JSON(exceptions.NewApiError(exceptions.NotFound("project not found")))
	}
	if ctx.TaskID == uuid.Nil {
		c.JSON(exceptions.NewApiError(exceptions.NotFound("task not found")))
		return
	}

	offset, err := strconv.Atoi(c.DefaultQuery("offset", "0"))
	if err != nil {
		c.JSON(exceptions.NewApiError(err))
	}

	limit, err := strconv.Atoi(c.DefaultQuery("limit", "50"))
	if err != nil {
		c.JSON(exceptions.NewApiError(err))
	}

	activities, total, err := h.activityService.GetTaskActivities(c.Request.Context(), ctx.ProjectID, ctx.TaskID, limit, offset)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"activities": activities,
		"total":      total,
		"limit":      limit,
		"offset":     offset,
	})
}

func (h *activityHandler) GetUserActivities(c *gin.Context) {
	ctx := mwcontext.GetValidationContext(c)
	if ctx.UserID == uuid.Nil {
		c.JSON(exceptions.NewApiError(exceptions.Unauthorized("user id required")))
		return
	}
	if ctx.ProjectID == uuid.Nil {
		c.JSON(exceptions.NewApiError(exceptions.NotFound("project not found")))
	}
	if ctx.MemberID == uuid.Nil {
		c.JSON(exceptions.NewApiError(exceptions.NotFound("user not found")))
		return
	}

	offset, err := strconv.Atoi(c.DefaultQuery("offset", "0"))
	if err != nil {
		c.JSON(exceptions.NewApiError(err))
	}

	limit, err := strconv.Atoi(c.DefaultQuery("limit", "50"))
	if err != nil {
		c.JSON(exceptions.NewApiError(err))
	}

	activities, total, err := h.activityService.GetUserActivities(c.Request.Context(), ctx.ProjectID, ctx.MemberID, limit, offset)
	if err != nil {
		c.JSON(exceptions.NewApiError(err))
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"activities": activities,
		"total":      total,
		"limit":      limit,
		"offset":     offset,
	})
}

func (h *activityHandler) GetTaskComments(c *gin.Context) {
	taskID, err := uuid.Parse(c.Param("task_id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid task id"})
		return
	}

	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "20"))
	offset, _ := strconv.Atoi(c.DefaultQuery("offset", "0"))

	comments, total, err := h.activityService.GetTaskComments(c.Request.Context(), taskID, limit, offset)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"comments": comments,
		"total":    total,
		"limit":    limit,
		"offset":   offset,
	})
}

func (h *activityHandler) GetTaskChanges(c *gin.Context) {
	taskID, err := uuid.Parse(c.Param("task_id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid task id"})
		return
	}

	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "20"))
	offset, _ := strconv.Atoi(c.DefaultQuery("offset", "0"))
	fieldName := c.DefaultQuery("fieldName", "")

	changes, total, err := h.activityService.GetTaskChanges(c.Request.Context(), taskID, fieldName, limit, offset)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"changes": changes,
		"total":   total,
		"limit":   limit,
		"offset":  offset,
	})
}
