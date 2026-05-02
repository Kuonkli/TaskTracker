package router

import (
	"github.com/gin-gonic/gin"
	"task-tracker/internal/handlers/middleware"
)

type RouteRegistrar struct {
	engine *gin.Engine
	mf     *middleware.Factory
}

func NewRouteRegistrar(engine *gin.Engine, mf *middleware.Factory) *RouteRegistrar {
	return &RouteRegistrar{
		engine: engine,
		mf:     mf,
	}
}

// RegisterPublic - для публичных маршрутов (без авторизации)
func (rr *RouteRegistrar) RegisterPublic(method, path string, handler gin.HandlerFunc) {
	switch method {
	case "GET":
		rr.engine.GET(path, handler)
	case "POST":
		rr.engine.POST(path, handler)
	case "PUT":
		rr.engine.PUT(path, handler)
	case "DELETE":
		rr.engine.DELETE(path, handler)
	case "PATCH":
		rr.engine.PATCH(path, handler)
	default:
		rr.engine.HEAD(path, handler)
	}
}

// RegisterProtected - для защищенных маршрутов (фабрика сама добавит auth и проверки)
func (rr *RouteRegistrar) RegisterProtected(method, path string, handler gin.HandlerFunc) {
	// Фабрика анализирует путь и метод, возвращает готовую цепочку middleware
	// В цепочку уже включен AuthMiddleware, если нужно
	middlewares := rr.mf.BuildForRoute(path, method)

	// Объединяем middleware и хендлер
	handlers := append(middlewares, handler)

	switch method {
	case "GET":
		rr.engine.GET(path, handlers...)
	case "POST":
		rr.engine.POST(path, handlers...)
	case "PUT":
		rr.engine.PUT(path, handlers...)
	case "DELETE":
		rr.engine.DELETE(path, handlers...)
	case "PATCH":
		rr.engine.PATCH(path, handlers...)
	default:
		rr.engine.HEAD(path, handlers...)
	}
}
