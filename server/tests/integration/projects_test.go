package integration

import (
	"net/http"
	"testing"

	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/assert"
	"task-tracker/tests/testutil"
)

// Мок данные проектов
var mockProjects = []gin.H{
	{"id": 1, "name": "Проект Alpha", "status": "active"},
	{"id": 2, "name": "Проект Beta", "status": "active"},
}

func mockListProjects(c *gin.Context) {
	page := c.DefaultQuery("page", "1")
	limit := c.DefaultQuery("limit", "10")

	// Просто возвращаем мок данные
	c.JSON(http.StatusOK, gin.H{
		"data": mockProjects,
		"pagination": gin.H{
			"page":  page,
			"limit": limit,
			"total": len(mockProjects),
		},
	})
}

func mockCreateProject(c *gin.Context) {
	var req struct {
		Name        string `json:"name" binding:"required"`
		Description string `json:"description"`
		Status      string `json:"status"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Валидация
	if len(req.Name) < 3 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "name must be at least 3 characters"})
		return
	}

	// Создаем проект
	c.JSON(http.StatusCreated, gin.H{
		"id":          3,
		"name":        req.Name,
		"description": req.Description,
		"status":      req.Status,
		"created_by":  1,
	})
}

func mockGetProject(c *gin.Context) {
	id := c.Param("id")

	if id == "1" {
		c.JSON(http.StatusOK, gin.H{
			"id":          1,
			"name":        "Проект Alpha",
			"description": "Описание проекта Alpha",
			"status":      "active",
		})
		return
	}

	c.JSON(http.StatusNotFound, gin.H{"error": "project not found"})
}

func mockUpdateProject(c *gin.Context) {
	id := c.Param("id")

	var req struct {
		Name        string `json:"name"`
		Description string `json:"description"`
		Status      string `json:"status"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if id == "1" {
		c.JSON(http.StatusOK, gin.H{
			"id":          1,
			"name":        req.Name,
			"description": req.Description,
			"status":      req.Status,
		})
		return
	}

	c.JSON(http.StatusNotFound, gin.H{"error": "project not found"})
}

func mockDeleteProject(c *gin.Context) {
	id := c.Param("id")

	if id == "1" {
		c.JSON(http.StatusNoContent, nil)
		return
	}

	c.JSON(http.StatusNotFound, gin.H{"error": "project not found"})
}

func TestProjectsEndpoints(t *testing.T) {
	ts := testutil.NewTestServer(t, setupRoutes)
	token := "test-token"

	t.Run("GET /api/projects - список проектов", func(t *testing.T) {
		w := ts.Request("GET", "/api/projects?page=1&limit=10", nil, token)

		assert.Equal(t, http.StatusOK, w.Code)

		var resp map[string]interface{}
		testutil.ParseResponse(t, w, &resp)

		// Проверяем структуру ответа
		assert.Contains(t, resp, "data")
		assert.Contains(t, resp, "pagination")

		data := resp["data"].([]interface{})
		assert.GreaterOrEqual(t, len(data), 1)
	})

	t.Run("GET /api/projects - пагинация", func(t *testing.T) {
		// Проверяем что параметры пагинации передаются
		w := ts.Request("GET", "/api/projects?page=2&limit=5", nil, token)

		assert.Equal(t, http.StatusOK, w.Code)

		var resp map[string]interface{}
		testutil.ParseResponse(t, w, &resp)

		pagination := resp["pagination"].(map[string]interface{})
		assert.Equal(t, "2", pagination["page"])
		assert.Equal(t, "5", pagination["limit"])
	})

	t.Run("POST /api/projects - создание проекта", func(t *testing.T) {
		req := gin.H{
			"name":        "Новый проект",
			"description": "Описание нового проекта",
			"status":      "active",
		}

		w := ts.Request("POST", "/api/projects", req, token)

		assert.Equal(t, http.StatusCreated, w.Code)

		var project map[string]interface{}
		testutil.ParseResponse(t, w, &project)

		assert.Equal(t, "Новый проект", project["name"])
		assert.Equal(t, "active", project["status"])
		assert.Contains(t, project, "id")
	})

	t.Run("POST /api/projects - валидация имени", func(t *testing.T) {
		req := gin.H{
			"name": "Ab", // меньше 3 символов
		}

		w := ts.Request("POST", "/api/projects", req, token)

		assert.Equal(t, http.StatusBadRequest, w.Code)
	})

	t.Run("GET /api/projects/:id - существующий проект", func(t *testing.T) {
		w := ts.Request("GET", "/api/projects/1", nil, token)

		assert.Equal(t, http.StatusOK, w.Code)

		var project map[string]interface{}
		testutil.ParseResponse(t, w, &project)

		assert.Equal(t, float64(1), project["id"])
		assert.Equal(t, "Проект Alpha", project["name"])
	})

	t.Run("GET /api/projects/:id - несуществующий проект", func(t *testing.T) {
		w := ts.Request("GET", "/api/projects/999", nil, token)

		assert.Equal(t, http.StatusNotFound, w.Code)
	})

	t.Run("PUT /api/projects/:id - обновление проекта", func(t *testing.T) {
		req := gin.H{
			"name":   "Обновленный проект",
			"status": "completed",
		}

		w := ts.Request("PUT", "/api/projects/1", req, token)

		assert.Equal(t, http.StatusOK, w.Code)

		var project map[string]interface{}
		testutil.ParseResponse(t, w, &project)

		assert.Equal(t, "Обновленный проект", project["name"])
		assert.Equal(t, "completed", project["status"])
	})

	t.Run("DELETE /api/projects/:id - удаление проекта", func(t *testing.T) {
		w := ts.Request("DELETE", "/api/projects/1", nil, token)

		assert.Equal(t, http.StatusNoContent, w.Code)
	})
}
