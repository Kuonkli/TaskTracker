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
	GetProjectActivities(c *gin.Context)
	GetTaskActivities(c *gin.Context)
	GetUserActivities(c *gin.Context)
	GetTaskComments(c *gin.Context)
	GetTaskChanges(c *gin.Context)
	AddComment(c *gin.Context)
	UpdateComment(c *gin.Context)
	DeleteComment(c *gin.Context)
}

type activityHandler struct {
	activityService service.ActivityService
}

func NewTaskActivityHandler(activityService service.ActivityService) ActivityHandler {
	return &activityHandler{
		activityService: activityService,
	}
}

func (h *activityHandler) GetProjectActivities(c *gin.Context) {
	ctx := mwcontext.GetValidationContext(c)
	if ctx.UserID == uuid.Nil {
		c.JSON(exceptions.NewApiError(exceptions.Unauthorized("user id required")))
		return
	}
	if ctx.ProjectID == uuid.Nil {
		c.JSON(exceptions.NewApiError(exceptions.NotFound("project not found")))
		return
	}
	offset, err := strconv.Atoi(c.DefaultQuery("offset", "0"))
	if err != nil {
		c.JSON(exceptions.NewApiError(err))
		return
	}

	limit, err := strconv.Atoi(c.DefaultQuery("limit", "50"))
	if err != nil {
		c.JSON(exceptions.NewApiError(err))
		return
	}
	activities, total, err := h.activityService.GetProjectActivities(c.Request.Context(), ctx.ProjectID, limit, offset)
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

func (h *activityHandler) GetTaskActivities(c *gin.Context) {
	ctx := mwcontext.GetValidationContext(c)
	if ctx.UserID == uuid.Nil {
		c.JSON(exceptions.NewApiError(exceptions.Unauthorized("user id required")))
		return
	}
	if ctx.ProjectID == uuid.Nil {
		c.JSON(exceptions.NewApiError(exceptions.NotFound("project not found")))
		return
	}
	if ctx.TaskID == uuid.Nil {
		c.JSON(exceptions.NewApiError(exceptions.NotFound("task not found")))
		return
	}

	offset, err := strconv.Atoi(c.DefaultQuery("offset", "0"))
	if err != nil {
		c.JSON(exceptions.NewApiError(err))
		return
	}

	limit, err := strconv.Atoi(c.DefaultQuery("limit", "50"))
	if err != nil {
		c.JSON(exceptions.NewApiError(err))
		return
	}

	activities, total, err := h.activityService.GetTaskActivities(c.Request.Context(), ctx.ProjectID, ctx.TaskID, limit, offset)
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

func (h *activityHandler) GetUserActivities(c *gin.Context) {
	ctx := mwcontext.GetValidationContext(c)
	if ctx.UserID == uuid.Nil {
		c.JSON(exceptions.NewApiError(exceptions.Unauthorized("user id required")))
		return
	}
	if ctx.ProjectID == uuid.Nil {
		c.JSON(exceptions.NewApiError(exceptions.NotFound("project not found")))
		return
	}
	if ctx.MemberID == uuid.Nil {
		c.JSON(exceptions.NewApiError(exceptions.NotFound("user not found")))
		return
	}

	offset, err := strconv.Atoi(c.DefaultQuery("offset", "0"))
	if err != nil {
		c.JSON(exceptions.NewApiError(err))
		return
	}

	limit, err := strconv.Atoi(c.DefaultQuery("limit", "50"))
	if err != nil {
		c.JSON(exceptions.NewApiError(err))
		return
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
		c.JSON(exceptions.NewApiError(err))
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"changes": changes,
		"total":   total,
		"limit":   limit,
		"offset":  offset,
	})
}

// AddComment - добавление комментария к задаче
func (h *activityHandler) AddComment(c *gin.Context) {
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

	var req struct {
		Content string `json:"content" binding:"required,min=1,max=5000"`
	}

	if err = c.ShouldBindJSON(&req); err != nil {
		c.JSON(exceptions.NewApiError(err))
		return
	}

	comment, err := h.activityService.AddComment(
		c.Request.Context(),
		taskID,
		ctx.UserID,
		req.Content,
	)
	if err != nil {
		c.JSON(exceptions.NewApiError(err))
		return
	}

	c.JSON(http.StatusCreated, comment)
}

// UpdateComment - обновление комментария
func (h *activityHandler) UpdateComment(c *gin.Context) {
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

	var req struct {
		Content string `json:"content" binding:"required,min=1,max=5000"`
	}

	if err = c.ShouldBindJSON(&req); err != nil {
		c.JSON(exceptions.NewApiError(err))
		return
	}

	// Проверяем, что пользователь является автором комментария
	existingComment, err := h.activityService.GetCommentByID(c.Request.Context(), commentID)
	if err != nil {
		c.JSON(exceptions.NewApiError(
			exceptions.NotFound("comment not found"),
		))
		return
	}

	if existingComment.UserID != ctx.UserID {
		c.JSON(exceptions.NewApiError(
			exceptions.Forbidden("you can only edit your own comments"),
		))
		return
	}

	comment, err := h.activityService.UpdateComment(
		c.Request.Context(),
		commentID,
		req.Content,
	)
	if err != nil {
		c.JSON(exceptions.NewApiError(err))
		return
	}

	c.JSON(http.StatusOK, comment)
}

// DeleteComment - удаление комментария
func (h *activityHandler) DeleteComment(c *gin.Context) {
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

	// Проверяем, что пользователь является автором комментария или владельцем/админом проекта
	existingComment, err := h.activityService.GetCommentByID(c.Request.Context(), commentID)
	if err != nil {
		c.JSON(exceptions.NewApiError(
			exceptions.NotFound("comment not found"),
		))
		return
	}

	// TODO: Добавить проверку прав (владелец/админ проекта может удалять любые комментарии)
	// Пока только автор может удалить свой комментарий
	if existingComment.UserID != ctx.UserID {
		c.JSON(exceptions.NewApiError(
			exceptions.Forbidden("you can only delete your own comments"),
		))
		return
	}

	if err = h.activityService.DeleteComment(c.Request.Context(), commentID); err != nil {
		c.JSON(exceptions.NewApiError(err))
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "comment deleted successfully"})
}
