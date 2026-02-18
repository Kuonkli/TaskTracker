package integration

import (
	"net/http"
	"testing"

	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/assert"
	"task-tracker/tests/testutil"
)

// Реальная проверка авторизации для тестов
func testAuthMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		authHeader := c.GetHeader("Authorization")
		if authHeader == "" {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "no authorization header"})
			return
		}

		// Проверяем формат Bearer token
		if len(authHeader) < 7 || authHeader[:7] != "Bearer " {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "invalid authorization format"})
			return
		}

		token := authHeader[7:]
		if token == "" {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "empty token"})
			return
		}

		// Для тестов пропускаем с валидным токеном "test-token"
		if token != "test-token" {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "invalid token"})
			return
		}

		// Устанавливаем данные пользователя в контекст
		c.Set("userID", uint(1))
		c.Set("userRole", "engineer")
		c.Next()
	}
}

// Тестовая функция с реальной авторизацией
func setupRoutesWithAuth(r *gin.Engine) {
	// Публичные роуты
	r.POST("/api/login", mockLogin)

	// Защищенные роуты
	api := r.Group("/api")
	api.Use(testAuthMiddleware()) // Реальная проверка токена

	api.GET("/profile", mockGetProfile)
	api.PUT("/profile", mockUpdateProfile)
}

func TestAuthMiddleware(t *testing.T) {
	ts := testutil.NewTestServer(t, setupRoutesWithAuth)

	t.Run("доступ без токена", func(t *testing.T) {
		w := ts.Request("GET", "/api/profile", nil, "")
		assert.Equal(t, http.StatusUnauthorized, w.Code)

		var resp map[string]interface{}
		testutil.ParseResponse(t, w, &resp)
		assert.Contains(t, resp, "error")
	})

	t.Run("доступ с неверным форматом токена", func(t *testing.T) {
		w := ts.Request("GET", "/api/profile", nil, "Basic token")
		assert.Equal(t, http.StatusUnauthorized, w.Code)
	})

	t.Run("доступ с пустым токеном", func(t *testing.T) {
		w := ts.Request("GET", "/api/profile", nil, "Bearer ")
		assert.Equal(t, http.StatusUnauthorized, w.Code)
	})

	t.Run("доступ с неверным токеном", func(t *testing.T) {
		w := ts.Request("GET", "/api/profile", nil, "Bearer wrong-token")
		assert.Equal(t, http.StatusUnauthorized, w.Code)
	})

	t.Run("доступ с правильным токеном", func(t *testing.T) {
		w := ts.Request("GET", "/api/profile", nil, "Bearer test-token")
		assert.Equal(t, http.StatusOK, w.Code)
	})
}
