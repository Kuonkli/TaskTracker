package integration

import (
	"net/http"
	"testing"

	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/assert"
	"task-tracker/tests/testutil"
)

// Мок обработчики (в реальном коде здесь будут вызовы ваших хендлеров)
func mockRegister(c *gin.Context) {
	var req struct {
		Email     string `json:"email" binding:"required,email"`
		Password  string `json:"password" binding:"required,min=6"`
		FirstName string `json:"first_name"`
		LastName  string `json:"last_name"`
		Role      string `json:"role"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Имитация создания пользователя
	c.JSON(http.StatusCreated, gin.H{
		"id":         1,
		"email":      req.Email,
		"first_name": req.FirstName,
		"last_name":  req.LastName,
		"role":       req.Role,
	})
}

func mockLogin(c *gin.Context) {
	var req struct {
		Email    string `json:"email" binding:"required,email"`
		Password string `json:"password" binding:"required"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Проверка credentials (упрощенно)
	if req.Email == "test@example.com" && req.Password == "password123" {
		c.JSON(http.StatusOK, gin.H{
			"token": "test.jwt.token",
			"user": gin.H{
				"id":    1,
				"email": req.Email,
				"role":  "engineer",
			},
		})
		return
	}

	c.JSON(http.StatusUnauthorized, gin.H{"error": "invalid credentials"})
}

func TestAuthEndpoints(t *testing.T) {
	ts := testutil.NewTestServer(t, setupRoutes)

	t.Run("POST /api/register - успешная регистрация", func(t *testing.T) {
		req := gin.H{
			"email":      "newuser@example.com",
			"password":   "password123",
			"first_name": "Иван",
			"last_name":  "Иванов",
			"role":       "engineer",
		}

		w := ts.Request("POST", "/api/register", req, "")

		assert.Equal(t, http.StatusCreated, w.Code)

		var resp map[string]interface{}
		testutil.ParseResponse(t, w, &resp)

		assert.Equal(t, "newuser@example.com", resp["email"])
		assert.Equal(t, "Иван", resp["first_name"])
		assert.Equal(t, "Иванов", resp["last_name"])
	})

	t.Run("POST /api/register - валидация email", func(t *testing.T) {
		testCases := []struct {
			name     string
			email    string
			expected int
		}{
			{"пустой email", "", http.StatusBadRequest},
			{"неверный формат", "not-an-email", http.StatusBadRequest},
			{"без домена", "user@", http.StatusBadRequest},
		}

		for _, tc := range testCases {
			t.Run(tc.name, func(t *testing.T) {
				req := gin.H{
					"email":      tc.email,
					"password":   "password123",
					"first_name": "Иван",
					"last_name":  "Иванов",
				}
				w := ts.Request("POST", "/api/register", req, "")
				assert.Equal(t, tc.expected, w.Code)
			})
		}
	})

	t.Run("POST /api/register - валидация пароля", func(t *testing.T) {
		testCases := []struct {
			name     string
			password string
			expected int
		}{
			{"пустой пароль", "", http.StatusBadRequest},
			{"меньше 6 символов", "12345", http.StatusBadRequest},
		}

		for _, tc := range testCases {
			t.Run(tc.name, func(t *testing.T) {
				req := gin.H{
					"email":      "test@example.com",
					"password":   tc.password,
					"first_name": "Иван",
					"last_name":  "Иванов",
				}
				w := ts.Request("POST", "/api/register", req, "")
				assert.Equal(t, tc.expected, w.Code)
			})
		}
	})

	t.Run("POST /api/login - успешный вход", func(t *testing.T) {
		req := gin.H{
			"email":    "test@example.com",
			"password": "password123",
		}

		w := ts.Request("POST", "/api/login", req, "")

		assert.Equal(t, http.StatusOK, w.Code)

		var resp map[string]interface{}
		testutil.ParseResponse(t, w, &resp)

		// Проверяем наличие токена
		assert.Contains(t, resp, "token")
		assert.NotEmpty(t, resp["token"])

		// Проверяем данные пользователя
		user, ok := resp["user"].(map[string]interface{})
		assert.True(t, ok)
		assert.Equal(t, "test@example.com", user["email"])
	})

	t.Run("POST /api/login - неверные данные", func(t *testing.T) {
		testCases := []struct {
			name     string
			email    string
			password string
			expected int
		}{
			{"неверный пароль", "test@example.com", "wrongpass", http.StatusUnauthorized},
			{"несуществующий пользователь", "nonexistent@example.com", "password123", http.StatusUnauthorized},
		}

		for _, tc := range testCases {
			t.Run(tc.name, func(t *testing.T) {
				req := gin.H{
					"email":    tc.email,
					"password": tc.password,
				}
				w := ts.Request("POST", "/api/login", req, "")
				assert.Equal(t, tc.expected, w.Code)
			})
		}
	})
}
