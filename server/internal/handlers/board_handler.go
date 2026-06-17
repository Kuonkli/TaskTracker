package handlers

import (
	"net/http"
	"task-tracker/internal/dto"
	"task-tracker/internal/service"
	"task-tracker/pkg/exceptions"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

type BoardHandler interface {
	GetBoard(c *gin.Context)
	CreateLane(c *gin.Context)
	UpdateLane(c *gin.Context)
	DeleteLane(c *gin.Context)
	ReorderLanes(c *gin.Context)
	CreateColumn(c *gin.Context)
	DeleteColumn(c *gin.Context)
	ReorderColumns(c *gin.Context)
}

type boardHandler struct {
	boardService service.BoardService
}

func NewBoardHandler(boardService service.BoardService) BoardHandler {
	return &boardHandler{boardService: boardService}
}

func (h *boardHandler) GetBoard(c *gin.Context) {
	projectIDStr := c.Param("project_id")
	if projectIDStr == "" {
		c.JSON(exceptions.NewApiError(exceptions.BadRequest("project id is required")))
		return
	}

	projectID, err := uuid.Parse(projectIDStr)
	if err != nil {
		c.JSON(exceptions.NewApiError(exceptions.BadRequest("invalid project id")))
		return
	}

	board, err := h.boardService.GetBoard(c.Request.Context(), projectID)
	if err != nil {
		c.JSON(exceptions.NewApiError(err))
		return
	}

	c.JSON(http.StatusOK, board)
}

func (h *boardHandler) CreateLane(c *gin.Context) {
	projectIDStr := c.Param("project_id")
	if projectIDStr == "" {
		c.JSON(exceptions.NewApiError(exceptions.BadRequest("project id is required")))
		return
	}

	projectID, err := uuid.Parse(projectIDStr)
	if err != nil {
		c.JSON(exceptions.NewApiError(exceptions.BadRequest("invalid project id")))
		return
	}

	var req dto.CreateLaneRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(exceptions.NewApiError(exceptions.BadRequest(err.Error())))
		return
	}

	lane, err := h.boardService.CreateLane(c.Request.Context(), projectID, req)
	if err != nil {
		c.JSON(exceptions.NewApiError(err))
		return
	}

	c.JSON(http.StatusCreated, lane)
}

func (h *boardHandler) UpdateLane(c *gin.Context) {
	laneIDStr := c.Param("lane_id")
	if laneIDStr == "" {
		c.JSON(exceptions.NewApiError(exceptions.BadRequest("lane id is required")))
		return
	}

	laneID, err := uuid.Parse(laneIDStr)
	if err != nil {
		c.JSON(exceptions.NewApiError(exceptions.BadRequest("invalid lane id")))
		return
	}

	var req dto.UpdateLaneRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(exceptions.NewApiError(exceptions.BadRequest(err.Error())))
		return
	}

	lane, err := h.boardService.UpdateLane(c.Request.Context(), laneID, req)
	if err != nil {
		c.JSON(exceptions.NewApiError(err))
		return
	}

	c.JSON(http.StatusOK, lane)
}

func (h *boardHandler) DeleteLane(c *gin.Context) {
	laneIDStr := c.Param("lane_id")
	if laneIDStr == "" {
		c.JSON(exceptions.NewApiError(exceptions.BadRequest("lane id is required")))
		return
	}

	laneID, err := uuid.Parse(laneIDStr)
	if err != nil {
		c.JSON(exceptions.NewApiError(exceptions.BadRequest("invalid lane id")))
		return
	}

	if err := h.boardService.DeleteLane(c.Request.Context(), laneID); err != nil {
		c.JSON(exceptions.NewApiError(err))
		return
	}

	c.JSON(http.StatusNoContent, nil)
}

func (h *boardHandler) ReorderLanes(c *gin.Context) {
	projectIDStr := c.Param("project_id")
	if projectIDStr == "" {
		c.JSON(exceptions.NewApiError(exceptions.BadRequest("project id is required")))
		return
	}

	projectID, err := uuid.Parse(projectIDStr)
	if err != nil {
		c.JSON(exceptions.NewApiError(exceptions.BadRequest("invalid project id")))
		return
	}

	var req dto.ReorderLanesRequest
	if err = c.ShouldBindJSON(&req); err != nil {
		c.JSON(exceptions.NewApiError(exceptions.BadRequest(err.Error())))
		return
	}

	if err = h.boardService.ReorderLanes(c.Request.Context(), projectID, req); err != nil {
		c.JSON(exceptions.NewApiError(err))
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "lanes reordered"})
}

func (h *boardHandler) CreateColumn(c *gin.Context) {
	projectIDStr := c.Param("project_id")
	projectID, err := uuid.Parse(projectIDStr)
	if err != nil {
		c.JSON(exceptions.NewApiError(exceptions.BadRequest("invalid project id")))
		return
	}

	var req dto.CreateColumnRequest
	if err = c.ShouldBindJSON(&req); err != nil {
		c.JSON(exceptions.NewApiError(exceptions.BadRequest(err.Error())))
		return
	}

	column, err := h.boardService.CreateColumn(c.Request.Context(), projectID, req)
	if err != nil {
		c.JSON(exceptions.NewApiError(err))
		return
	}

	c.JSON(http.StatusCreated, column)
}

func (h *boardHandler) DeleteColumn(c *gin.Context) {
	columnIDStr := c.Param("column_id")
	columnID, err := uuid.Parse(columnIDStr)
	if err != nil {
		c.JSON(exceptions.NewApiError(exceptions.BadRequest("invalid column id")))
		return
	}

	if err = h.boardService.DeleteColumn(c.Request.Context(), columnID); err != nil {
		c.JSON(exceptions.NewApiError(err))
		return
	}

	c.JSON(http.StatusNoContent, nil)
}

func (h *boardHandler) ReorderColumns(c *gin.Context) {
	projectIDStr := c.Param("project_id")
	projectID, err := uuid.Parse(projectIDStr)
	if err != nil {
		c.JSON(exceptions.NewApiError(exceptions.BadRequest("invalid project id")))
		return
	}

	var req dto.ReorderColumnsRequest
	if err = c.ShouldBindJSON(&req); err != nil {
		c.JSON(exceptions.NewApiError(exceptions.BadRequest(err.Error())))
		return
	}

	if err = h.boardService.ReorderColumns(c.Request.Context(), projectID, req); err != nil {
		c.JSON(exceptions.NewApiError(err))
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "columns reordered"})
}
