package integration

import (
	"net/http"
	"testing"

	"github.com/stretchr/testify/assert"
	"task-tracker/tests/testutil"
)

func TestHealthEndpoints(t *testing.T) {
	ts := testutil.NewTestServer(t, setupRoutes)

	t.Run("GET /health returns OK", func(t *testing.T) {
		w := ts.Request("GET", "/health", nil, "")

		assert.Equal(t, http.StatusOK, w.Code)
		assert.Equal(t, "OK", w.Body.String())
	})

	t.Run("HEAD /health returns OK without body", func(t *testing.T) {
		w := ts.Request("HEAD", "/health", nil, "")

		assert.Equal(t, http.StatusOK, w.Code)
		assert.Equal(t, "OK", w.Body.String())
	})
}
