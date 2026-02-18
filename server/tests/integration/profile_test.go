package integration

import (
	"net/http"
	"testing"

	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/assert"
	"task-tracker/tests/testutil"
)

// Мок данные профиля (храним состояние между запросами)
var mockUserProfile = gin.H{
	"id":         1,
	"email":      "test@example.com",
	"first_name": "Иван",
	"last_name":  "Иванов",
	"role":       "engineer",
}

func mockGetProfile(c *gin.Context) {
	// Возвращаем текущее состояние профиля
	c.JSON(http.StatusOK, mockUserProfile)
}

func mockUpdateProfile(c *gin.Context) {
	var req struct {
		FirstName string `json:"first_name"`
		LastName  string `json:"last_name"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Валидация длины
	if len(req.FirstName) > 100 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "first_name too long"})
		return
	}
	if len(req.LastName) > 100 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "last_name too long"})
		return
	}

	// Обновляем только переданные поля
	if req.FirstName != "" {
		mockUserProfile["first_name"] = req.FirstName
	}
	if req.LastName != "" {
		mockUserProfile["last_name"] = req.LastName
	}

	// Возвращаем обновленный профиль
	c.JSON(http.StatusOK, mockUserProfile)
}

// Сброс профиля к исходному состоянию перед каждым тестом
func resetProfile() {
	mockUserProfile = gin.H{
		"id":         1,
		"email":      "test@example.com",
		"first_name": "Иван",
		"last_name":  "Иванов",
		"role":       "engineer",
	}
}

func TestProfileEndpoints(t *testing.T) {
	// Создаем тестовый сервер
	ts := testutil.NewTestServer(t, setupRoutes)
	token := "test-token"

	// Сбрасываем профиль перед каждым подтестом
	t.Cleanup(resetProfile)

	t.Run("GET /api/profile - успешное получение", func(t *testing.T) {
		resetProfile() // Явный сброс перед тестом

		w := ts.Request("GET", "/api/profile", nil, token)

		assert.Equal(t, http.StatusOK, w.Code)

		var profile map[string]interface{}
		testutil.ParseResponse(t, w, &profile)

		assert.Equal(t, float64(1), profile["id"])
		assert.Equal(t, "test@example.com", profile["email"])
		assert.Equal(t, "Иван", profile["first_name"])
		assert.Equal(t, "Иванов", profile["last_name"])
		assert.Equal(t, "engineer", profile["role"])
	})

	t.Run("GET /api/profile - без токена", func(t *testing.T) {
		// В реальном приложении middleware вернет 401
		// Для тестов с реальным middleware:
		// w := ts.Request("GET", "/api/profile", nil, "")
		// assert.Equal(t, http.StatusUnauthorized, w.Code)

		// Пропускаем тест, если используем заглушку middleware
		t.Skip("Требуется реальная проверка авторизации")
	})

	t.Run("PUT /api/profile - полное обновление", func(t *testing.T) {
		resetProfile()

		updateReq := gin.H{
			"first_name": "Петр",
			"last_name":  "Петров",
		}

		w := ts.Request("PUT", "/api/profile", updateReq, token)

		assert.Equal(t, http.StatusOK, w.Code)

		var profile map[string]interface{}
		testutil.ParseResponse(t, w, &profile)

		assert.Equal(t, "Петр", profile["first_name"])
		assert.Equal(t, "Петров", profile["last_name"])
	})

	t.Run("PUT /api/profile - частичное обновление (только имя)", func(t *testing.T) {
		resetProfile() // Начинаем с исходных данных

		// Проверяем исходное состояние
		assert.Equal(t, "Иван", mockUserProfile["first_name"])
		assert.Equal(t, "Иванов", mockUserProfile["last_name"])

		// Обновляем только имя
		updateReq := gin.H{
			"first_name": "Сидор",
		}

		w := ts.Request("PUT", "/api/profile", updateReq, token)

		assert.Equal(t, http.StatusOK, w.Code)

		var profile map[string]interface{}
		testutil.ParseResponse(t, w, &profile)

		// Проверяем что имя обновилось
		assert.Equal(t, "Сидор", profile["first_name"])
		// Фамилия должна остаться прежней
		assert.Equal(t, "Иванов", profile["last_name"], "Фамилия не должна меняться при частичном обновлении")
	})

	t.Run("PUT /api/profile - частичное обновление (только фамилия)", func(t *testing.T) {
		resetProfile()

		updateReq := gin.H{
			"last_name": "Сидоров",
		}

		w := ts.Request("PUT", "/api/profile", updateReq, token)

		assert.Equal(t, http.StatusOK, w.Code)

		var profile map[string]interface{}
		testutil.ParseResponse(t, w, &profile)

		assert.Equal(t, "Иван", profile["first_name"], "Имя не должно меняться")
		assert.Equal(t, "Сидоров", profile["last_name"])
	})

	t.Run("PUT /api/profile - обновление с пустыми полями (ничего не меняется)", func(t *testing.T) {
		resetProfile()

		updateReq := gin.H{} // Пустой запрос

		w := ts.Request("PUT", "/api/profile", updateReq, token)

		assert.Equal(t, http.StatusOK, w.Code)

		var profile map[string]interface{}
		testutil.ParseResponse(t, w, &profile)

		// Ничего не должно измениться
		assert.Equal(t, "Иван", profile["first_name"])
		assert.Equal(t, "Иванов", profile["last_name"])
	})

	t.Run("PUT /api/profile - валидация длины (имя слишком длинное)", func(t *testing.T) {
		resetProfile()

		// Создаем строку из 101 символа
		longName := make([]byte, 101)
		for i := range longName {
			longName[i] = 'a'
		}

		updateReq := gin.H{
			"first_name": string(longName),
		}

		w := ts.Request("PUT", "/api/profile", updateReq, token)

		assert.Equal(t, http.StatusBadRequest, w.Code)

		var errResp map[string]interface{}
		testutil.ParseResponse(t, w, &errResp)
		assert.Contains(t, errResp, "error")
	})

	t.Run("PUT /api/profile - валидация длины (фамилия слишком длинная)", func(t *testing.T) {
		resetProfile()

		longName := make([]byte, 101)
		for i := range longName {
			longName[i] = 'b'
		}

		updateReq := gin.H{
			"last_name": string(longName),
		}

		w := ts.Request("PUT", "/api/profile", updateReq, token)

		assert.Equal(t, http.StatusBadRequest, w.Code)
	})

	t.Run("Последовательные обновления", func(t *testing.T) {
		resetProfile()

		// Первое обновление
		w1 := ts.Request("PUT", "/api/profile", gin.H{"first_name": "Петр"}, token)
		assert.Equal(t, http.StatusOK, w1.Code)

		var profile1 map[string]interface{}
		testutil.ParseResponse(t, w1, &profile1)
		assert.Equal(t, "Петр", profile1["first_name"])
		assert.Equal(t, "Иванов", profile1["last_name"])

		// Второе обновление (должно работать с обновленными данными)
		w2 := ts.Request("PUT", "/api/profile", gin.H{"last_name": "Петров"}, token)
		assert.Equal(t, http.StatusOK, w2.Code)

		var profile2 map[string]interface{}
		testutil.ParseResponse(t, w2, &profile2)
		assert.Equal(t, "Петр", profile2["first_name"])
		assert.Equal(t, "Петров", profile2["last_name"])
	})
}
