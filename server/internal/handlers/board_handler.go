package handlers

import (
	"net/http"
	"task-tracker/internal/service"
	"task-tracker/pkg/exceptions"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

type BoardHandler interface {
	GetBoard(c *gin.Context)
}

type boardHandler struct {
	boardService service.BoardService
}

func NewBoardHandler(boardService service.BoardService) BoardHandler {
	return &boardHandler{
		boardService: boardService,
	}
}

// GetBoard возвращает структуру доски проекта (колонки и лейны с задачами)
func (h *boardHandler) GetBoard(c *gin.Context) {
	// 1. Получаем project_id из параметра
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

	// 2. Получаем доску
	board, err := h.boardService.GetBoard(c.Request.Context(), projectID)
	if err != nil {
		c.JSON(exceptions.NewApiError(err))
		return
	}

	// 3. Возвращаем ответ
	c.JSON(http.StatusOK, board)
}
