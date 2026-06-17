package router

import (
	"bytes"
	"fmt"
	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	"task-tracker/internal/handlers"
	"task-tracker/internal/handlers/middleware"
	"task-tracker/internal/service"
	"time"
)

type Router struct {
	engine    *gin.Engine
	mf        *middleware.Factory
	handlers  *handlers.Handlers
	services  *service.Services
	jwtSecret string
}

func NewRouter(
	handlers *handlers.Handlers,
	services *service.Services,
	jwtSecret string,
) *Router {
	gin.SetMode(gin.ReleaseMode)
	engine := gin.New()
	engine.Use(gin.Recovery())

	mf := middleware.NewMiddlewareFactory(
		services.Project,
		services.Task,
		jwtSecret,
	)

	return &Router{
		engine:    engine,
		mf:        mf,
		handlers:  handlers,
		services:  services,
		jwtSecret: jwtSecret,
	}
}

type responseWriter struct {
	gin.ResponseWriter
	body *bytes.Buffer
}

// Переопределяем метод Write для захвата тела
func (w *responseWriter) Write(b []byte) (int, error) {
	// Сохраняем копию тела в буфер
	w.body.Write(b)
	// Отправляем оригинал клиенту
	return w.ResponseWriter.Write(b)
}

func (w *responseWriter) WriteString(s string) (int, error) {
	w.body.WriteString(s)
	return w.ResponseWriter.WriteString(s)
}

func logger() gin.HandlerFunc {
	return func(c *gin.Context) {
		start := time.Now()

		w := &responseWriter{
			ResponseWriter: c.Writer,
			body:           &bytes.Buffer{},
		}
		c.Writer = w

		c.Next()

		status := c.Writer.Status()
		latency := time.Since(start)
		path := c.Request.URL.Path
		if c.Request.URL.RawQuery != "" {
			path += "?" + c.Request.URL.RawQuery
		}

		// Добавляем \n в конце строки
		fmt.Printf("%s | %3d | %12.6fms | %15s | %-7s %q",
			time.Now().Format("2006/01/02 - 15:04:05"),
			status,
			float64(latency.Nanoseconds())/1e6,
			c.ClientIP(),
			c.Request.Method,
			path,
		)

		// Логируем тело при ошибках
		if status >= 400 && w.body.Len() > 0 {
			fmt.Printf(" | ERROR: %s\n", w.body.String())
		} else {
			fmt.Println()
		}
	}
}

func (r *Router) Setup() *gin.Engine {
	config := cors.Config{
		AllowOrigins:     []string{"http://85.239.61.190", "http://85.239.61.190:80", "http://localhost:3000", "http://localhost", "http://127.0.0.1", "http://localhost:80"},
		AllowMethods:     []string{"GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"},
		AllowHeaders:     []string{"Origin", "Authorization", "X-Refresh-Token", "Content-Type"},
		ExposeHeaders:    []string{"Authorization", "X-Refresh-Token"},
		AllowCredentials: true,
		MaxAge:           12 * time.Hour,
	}
	r.engine.Use(cors.New(config))
	r.engine.Use(logger())

	registrar := NewRouteRegistrar(r.engine, r.mf)

	// ========================================
	// Публичные маршруты
	// ========================================
	registrar.RegisterPublic("GET", "/health", func(c *gin.Context) { c.JSON(200, "OK") })
	registrar.RegisterPublic("HEAD", "/health", func(c *gin.Context) { c.JSON(200, "OK") })
	registrar.RegisterPublic("POST", "/api/register", r.handlers.User.Register)
	registrar.RegisterPublic("POST", "/api/login", r.handlers.User.Login)

	// ========================================
	// Защищенные маршруты (требуют авторизацию)
	// ========================================

	// User routes
	registrar.RegisterProtected("GET", "/api/users/search", r.handlers.User.SearchUser)
	registrar.RegisterProtected("GET", "/api/user/profile", r.handlers.User.GetProfile)
	registrar.RegisterProtected("PUT", "/api/user/profile", r.handlers.User.UpdateProfile)
	registrar.RegisterProtected("GET", "/api/user/tasks", r.handlers.Task.GetUserTasks)
	registrar.RegisterProtected("GET", "/api/user/projects", r.handlers.Project.GetUserProjects)
	registrar.RegisterProtected("POST", "/api/logout", r.handlers.User.Logout)

	// Project creation
	registrar.RegisterProtected("POST", "/api/projects", r.handlers.Project.CreateCustomProject)
	registrar.RegisterProtected("POST", "/api/projects/default", r.handlers.Project.CreateDefaultProject)

	// ========================================
	// Project routes (с автоматической проверкой доступа)
	// ========================================

	// Project CRUD
	registrar.RegisterProtected("GET", "/api/projects/:project_id", r.handlers.Project.GetProject)
	registrar.RegisterProtected("PUT", "/api/projects/:project_id", r.handlers.Project.UpdateProject)
	registrar.RegisterProtected("DELETE", "/api/projects/:project_id", r.handlers.Project.DeleteProject)
	registrar.RegisterProtected("GET", "/api/projects/:project_id/board", r.handlers.Board.GetBoard)
	registrar.RegisterProtected("POST", "/api/projects/:project_id/leave", r.handlers.Member.LeaveProject)
	registrar.RegisterProtected("POST", "/api/projects/:project_id/transfer-ownership", r.handlers.Member.TransferOwnership)
	registrar.RegisterProtected("GET", "/api/projects/:project_id/activities", r.handlers.TaskActivity.GetProjectActivities)

	// Members
	registrar.RegisterProtected("GET", "/api/projects/:project_id/profile", r.handlers.Member.GetUserProjectProfile)
	registrar.RegisterProtected("GET", "/api/projects/:project_id/members/:user_id", r.handlers.Member.GetMemberProfile)
	registrar.RegisterProtected("GET", "/api/projects/:project_id/members", r.handlers.Project.GetProjectMembers)
	registrar.RegisterProtected("POST", "/api/projects/:project_id/members", r.handlers.Member.AddMember)
	registrar.RegisterProtected("DELETE", "/api/projects/:project_id/members/:user_id", r.handlers.Member.RemoveMember)
	registrar.RegisterProtected("PUT", "/api/projects/:project_id/members/:user_id", r.handlers.Member.UpdateMember)
	registrar.RegisterProtected("GET", "/api/projects/:project_id/members/:user_id/activities", r.handlers.TaskActivity.GetUserActivities)

	// Statuses
	registrar.RegisterProtected("GET", "/api/projects/:project_id/statuses", r.handlers.Status.GetProjectStatuses)
	registrar.RegisterProtected("POST", "/api/projects/:project_id/statuses", r.handlers.Status.CreateStatus)
	registrar.RegisterProtected("GET", "/api/projects/:project_id/statuses/:status_id", r.handlers.Status.GetStatus)
	registrar.RegisterProtected("PUT", "/api/projects/:project_id/statuses/:status_id", r.handlers.Status.UpdateStatus)
	registrar.RegisterProtected("DELETE", "/api/projects/:project_id/statuses/:status_id", r.handlers.Status.DeleteStatus)

	// Tags
	registrar.RegisterProtected("GET", "/api/projects/:project_id/tags", r.handlers.Tag.GetProjectTags)
	registrar.RegisterProtected("POST", "/api/projects/:project_id/tags", r.handlers.Tag.CreateTag)
	registrar.RegisterProtected("GET", "/api/projects/:project_id/tags/:tag_id", r.handlers.Tag.GetTag)
	registrar.RegisterProtected("DELETE", "/api/projects/:project_id/tags/:tag_id", r.handlers.Tag.DeleteTag)

	// Tasks
	registrar.RegisterProtected("GET", "/api/projects/:project_id/tasks", r.handlers.Task.GetProjectTasks)
	registrar.RegisterProtected("POST", "/api/projects/:project_id/tasks", r.handlers.Task.CreateTask)
	registrar.RegisterProtected("GET", "/api/projects/:project_id/tasks/:task_id", r.handlers.Task.GetTask)
	registrar.RegisterProtected("PUT", "/api/projects/:project_id/tasks/:task_id", r.handlers.Task.UpdateTask)
	registrar.RegisterProtected("DELETE", "/api/projects/:project_id/tasks/:task_id", r.handlers.Task.DeleteTask)
	registrar.RegisterProtected("POST", "/api/projects/:project_id/tasks/:task_id/tags", r.handlers.Task.AddTag)
	registrar.RegisterProtected("DELETE", "/api/projects/:project_id/tasks/:task_id/tags", r.handlers.Task.RemoveTag)
	registrar.RegisterProtected("GET", "/api/projects/:project_id/tasks/:task_id/activities", r.handlers.TaskActivity.GetTaskActivities)
	registrar.RegisterProtected("GET", "/api/projects/:project_id/tasks/:task_id/comments", r.handlers.TaskActivity.GetTaskComments)
	registrar.RegisterProtected("GET", "/api/projects/:project_id/tasks/:task_id/changes", r.handlers.TaskActivity.GetTaskChanges)

	//registrar.RegisterProtected("GET", "/api/projects/:project_id/tasks/:task_id/comments/:comment_id", r.handlers.TaskActivity.)
	registrar.RegisterProtected("POST", "/api/projects/:project_id/tasks/:task_id/comments", r.handlers.TaskActivity.AddComment)
	registrar.RegisterProtected("PUT", "/api/projects/:project_id/tasks/:task_id/comments/:comment_id", r.handlers.TaskActivity.UpdateComment)
	registrar.RegisterProtected("DELETE", "/api/projects/:project_id/tasks/:task_id/comments/:comment_id", r.handlers.TaskActivity.DeleteComment)

	// TODO: Реализовать
	// Lanes (Kanban дорожки)
	//registrar.RegisterProtected("GET", "/api/projects/:project_id/lanes", r.handlers.Board.GetProjectLanes)
	registrar.RegisterProtected("POST", "/api/projects/:project_id/lanes", r.handlers.Board.CreateLane)
	//registrar.RegisterProtected("GET", "/api/projects/:project_id/lanes/:lane_id", r.handlers.Lane.GetLane)
	registrar.RegisterProtected("PUT", "/api/projects/:project_id/lanes/reorder", r.handlers.Board.ReorderLanes)
	registrar.RegisterProtected("PUT", "/api/projects/:project_id/lanes/:lane_id", r.handlers.Board.UpdateLane)
	registrar.RegisterProtected("DELETE", "/api/projects/:project_id/lanes/:lane_id", r.handlers.Board.DeleteLane)

	// Columns
	//registrar.RegisterProtected("GET", "/api/projects/:project_id/columns", r.handlers.Column.GetProjectColumns)
	registrar.RegisterProtected("POST", "/api/projects/:project_id/columns", r.handlers.Board.CreateColumn)
	//registrar.RegisterProtected("GET", "/api/projects/:project_id/columns/:column_id", r.handlers.Column.GetColumn)
	//registrar.RegisterProtected("PUT", "/api/projects/:project_id/columns/:column_id", r.handlers.Column.UpdateColumn)
	registrar.RegisterProtected("DELETE", "/api/projects/:project_id/columns/:column_id", r.handlers.Board.DeleteColumn)
	registrar.RegisterProtected("PUT", "/api/projects/:project_id/columns/reorder", r.handlers.Board.ReorderColumns)

	// Attachments
	registrar.RegisterProtected("GET", "/api/projects/:project_id/tasks/:task_id/attachments", r.handlers.Attachment.ListByTask)
	registrar.RegisterProtected("POST", "/api/projects/:project_id/tasks/:task_id/attachments", r.handlers.Attachment.Upload)
	registrar.RegisterProtected("GET", "/api/projects/:project_id/tasks/:task_id/attachments/:attachment_id", r.handlers.Attachment.Download)
	registrar.RegisterProtected("DELETE", "/api/projects/:project_id/tasks/:task_id/attachments/:attachment_id", r.handlers.Attachment.Delete)

	registrar.RegisterProtected("GET", "/api/projects/:project_id/summary", r.handlers.Project.GetSummary)

	return r.engine
}
