package integration

import (
	"os"
	"testing"

	"github.com/gin-gonic/gin"
)

// setupRoutes настраивает все роуты как в основном приложении
func setupRoutes(r *gin.Engine) {
	// Публичные роуты
	r.GET("/health", func(c *gin.Context) {
		c.String(200, "OK")
	})
	r.HEAD("/health", func(c *gin.Context) {
		c.String(200, "OK")
	})
	r.POST("/api/register", mockRegister)
	r.POST("/api/login", mockLogin)

	// Защищенные роуты
	api := r.Group("/api")

	// Пользователь
	api.GET("/profile", mockGetProfile)
	api.PUT("/profile", mockUpdateProfile)

	// Задачи (tasks)
	api.GET("/tasks", mockListTasks)
	api.POST("/tasks", mockCreateTask)
	api.GET("/tasks/:id", mockGetTask)
	api.PUT("/tasks/:id", mockUpdateTask)
	api.DELETE("/tasks/:id", mockDeleteTask)
	api.PUT("/tasks/:id/status", mockUpdateTaskStatus)

	// Проекты
	api.GET("/projects", mockListProjects)
	api.POST("/projects", mockCreateProject)
	api.GET("/projects/:id", mockGetProject)
	api.PUT("/projects/:id", mockUpdateProject)
	api.DELETE("/projects/:id", mockDeleteProject)
}

func TestMain(m *testing.M) {
	// Настройка перед тестами
	gin.SetMode(gin.TestMode)

	// Запуск тестов
	code := m.Run()

	// Очистка после тестов
	os.Exit(code)
}
