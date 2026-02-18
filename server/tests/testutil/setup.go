package testutil

import (
	"bytes"
	"encoding/json"
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/require"
)

// TestServer обертка для Gin тестов
type TestServer struct {
	Router *gin.Engine
}

// NewTestServer создает тестовый сервер с переданными роутами
func NewTestServer(t *testing.T, setupRoutes func(*gin.Engine)) *TestServer {
	gin.SetMode(gin.TestMode)
	router := gin.New()
	router.Use(gin.Recovery())
	setupRoutes(router)
	return &TestServer{Router: router}
}

// Request выполняет HTTP запрос к тестовому серверу
func (ts *TestServer) Request(method, path string, body interface{}, token string) *httptest.ResponseRecorder {
	var reqBody []byte
	if body != nil {
		reqBody, _ = json.Marshal(body)
	}

	req := httptest.NewRequest(method, path, bytes.NewReader(reqBody))
	req.Header.Set("Content-Type", "application/json")

	if token != "" {
		req.Header.Set("Authorization", "Bearer "+token)
	}

	w := httptest.NewRecorder()
	ts.Router.ServeHTTP(w, req)
	return w
}

// ParseResponse парсит JSON ответ
func ParseResponse(t *testing.T, w *httptest.ResponseRecorder, dest interface{}) {
	err := json.Unmarshal(w.Body.Bytes(), dest)
	require.NoError(t, err, "Failed to parse response: %s", w.Body.String())
}

// RequireSuccess проверяет что статус код 2xx
func RequireSuccess(t *testing.T, w *httptest.ResponseRecorder) {
	require.True(t, w.Code >= 200 && w.Code < 300, "Expected success status code, got %d. Body: %s", w.Code, w.Body.String())
}
