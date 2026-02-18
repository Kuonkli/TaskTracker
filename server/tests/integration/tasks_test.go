package integration

import (
	"net/http"
	"testing"

	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/assert"
	"task-tracker/tests/testutil"
)

// Мок данные задач
var mockTasks = []gin.H{
	{"id": 1, "title": "Задача 1", "status": "open", "project_id": 1},
	{"id": 2, "title": "Задача 2", "status": "in_progress", "project_id": 1},
}

func mockListTasks(c *gin.Context) {
	projectID := c.Query("project_id")

	c.JSON(http.StatusOK, gin.H{
		"project_id": projectID,
		"data":       mockTasks,
		"total":      len(mockTasks),
	})
}

func mockCreateTask(c *gin.Context) {
	var req struct {
		ProjectID   uint   `json:"project_id" binding:"required"`
		Title       string `json:"title" binding:"required,min=3"`
		Description string `json:"description"`
		Severity    string `json:"severity"`
		Priority    string `json:"priority"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"id":          3,
		"project_id":  req.ProjectID,
		"title":       req.Title,
		"description": req.Description,
		"severity":    req.Severity,
		"priority":    req.Priority,
		"status":      "open",
	})
}

func mockGetTask(c *gin.Context) {
	id := c.Param("id")

	if id == "1" {
		c.JSON(http.StatusOK, gin.H{
			"id":          1,
			"title":       "Задача 1",
			"description": "Описание задачи 1",
			"status":      "open",
			"severity":    "medium",
			"priority":    "normal",
			"project_id":  1,
		})
		return
	}

	c.JSON(http.StatusNotFound, gin.H{"error": "task not found"})
}

func mockUpdateTask(c *gin.Context) {
	id := c.Param("id")

	var req struct {
		Title       string `json:"title"`
		Description string `json:"description"`
		Severity    string `json:"severity"`
		Priority    string `json:"priority"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if id == "1" {
		c.JSON(http.StatusOK, gin.H{
			"id":          1,
			"title":       req.Title,
			"description": req.Description,
			"severity":    req.Severity,
			"priority":    req.Priority,
		})
		return
	}

	c.JSON(http.StatusNotFound, gin.H{"error": "task not found"})
}

func mockDeleteTask(c *gin.Context) {
	id := c.Param("id")

	if id == "1" {
		c.JSON(http.StatusNoContent, nil)
		return
	}

	c.JSON(http.StatusNotFound, gin.H{"error": "task not found"})
}

func mockUpdateTaskStatus(c *gin.Context) {
	id := c.Param("id")

	var req struct {
		Status string `json:"status" binding:"required,oneof=open in_progress review completed"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if id == "1" {
		c.JSON(http.StatusOK, gin.H{
			"id":     1,
			"status": req.Status,
		})
		return
	}

	c.JSON(http.StatusNotFound, gin.H{"error": "task not found"})
}

func TestTasksEndpoints(t *testing.T) {
	ts := testutil.NewTestServer(t, setupRoutes)
	token := "test-token"

	t.Run("GET /api/tasks - список задач", func(t *testing.T) {
		w := ts.Request("GET", "/api/tasks?project_id=1", nil, token)

		assert.Equal(t, http.StatusOK, w.Code)

		var resp map[string]interface{}
		testutil.ParseResponse(t, w, &resp)

		assert.Contains(t, resp, "data")
	})

	t.Run("POST /api/tasks - создание задачи", func(t *testing.T) {
		req := gin.H{
			"project_id":  1,
			"title":       "Новая задача",
			"description": "Описание задачи",
			"severity":    "high",
			"priority":    "urgent",
		}

		w := ts.Request("POST", "/api/tasks", req, token)

		assert.Equal(t, http.StatusCreated, w.Code)

		var task map[string]interface{}
		testutil.ParseResponse(t, w, &task)

		assert.Equal(t, "Новая задача", task["title"])
		assert.Equal(t, "open", task["status"])
	})

	t.Run("POST /api/tasks - валидация", func(t *testing.T) {
		testCases := []struct {
			name     string
			req      gin.H
			expected int
		}{
			{
				"без project_id",
				gin.H{"title": "Задача"},
				http.StatusBadRequest,
			},
			{
				"пустой title",
				gin.H{"project_id": 1, "title": ""},
				http.StatusBadRequest,
			},
			{
				"title слишком короткий",
				gin.H{"project_id": 1, "title": "ab"},
				http.StatusBadRequest,
			},
		}

		for _, tc := range testCases {
			t.Run(tc.name, func(t *testing.T) {
				w := ts.Request("POST", "/api/tasks", tc.req, token)
				assert.Equal(t, tc.expected, w.Code)
			})
		}
	})

	t.Run("GET /api/tasks/:id - получение задачи", func(t *testing.T) {
		w := ts.Request("GET", "/api/tasks/1", nil, token)

		assert.Equal(t, http.StatusOK, w.Code)

		var task map[string]interface{}
		testutil.ParseResponse(t, w, &task)

		assert.Equal(t, float64(1), task["id"])
	})

	t.Run("PUT /api/tasks/:id/status - обновление статуса", func(t *testing.T) {
		req := gin.H{
			"status": "in_progress",
		}

		w := ts.Request("PUT", "/api/tasks/1/status", req, token)

		assert.Equal(t, http.StatusOK, w.Code)

		var task map[string]interface{}
		testutil.ParseResponse(t, w, &task)

		assert.Equal(t, "in_progress", task["status"])
	})

	t.Run("PUT /api/tasks/:id/status - невалидный статус", func(t *testing.T) {
		req := gin.H{
			"status": "invalid_status",
		}

		w := ts.Request("PUT", "/api/tasks/1/status", req, token)

		assert.Equal(t, http.StatusBadRequest, w.Code)
	})
}
