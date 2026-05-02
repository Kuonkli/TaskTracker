package middleware

import (
	"context"
	"fmt"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"strings"
	"task-tracker/internal/models"
	"task-tracker/internal/service"
	ex "task-tracker/pkg/exceptions"
	"task-tracker/pkg/utils"
	"time"
)

// roleLevel - единый словарь уровней доступа
var roleLevel = map[string]int{
	"member": 1,
	"admin":  2,
	"owner":  3,
}

// maxRole возвращает более высокий уровень доступа
func maxRole(a, b string) string {
	if a == "" {
		return b
	}
	if b == "" {
		return a
	}
	if roleLevel[a] > roleLevel[b] {
		return a
	}
	return b
}

// hasAccessLevel проверяет, достаточно ли у пользователя прав
func hasAccessLevel(userLevel string, requiredLevel string) bool {
	if requiredLevel == "" {
		return true
	}
	return roleLevel[userLevel] >= roleLevel[requiredLevel]
}

// Factory создает middleware для защиты маршрутов
type Factory struct {
	projectService service.ProjectService
	taskService    service.TaskService
	jwtSecret      string
}

// NewMiddlewareFactory создает новую фабрику middleware
func NewMiddlewareFactory(
	projectService service.ProjectService,
	taskService service.TaskService,
	jwtSecret string,
) *Factory {
	return &Factory{
		projectService: projectService,
		taskService:    taskService,
		jwtSecret:      jwtSecret,
	}
}

// RouteRequirements описывает, какие middleware нужны для маршрута
type RouteRequirements struct {
	NeedAuth     bool
	NeedProject  bool
	NeedTask     bool
	NeedStatus   bool
	NeedTag      bool
	NeedMember   bool
	RequiredRole string
	ProjectParam string
	TaskParam    string
	StatusParam  string
	TagParam     string
	MemberParam  string
}

// BuildForRoute анализирует путь и метод, возвращает цепочку middleware
func (mf *Factory) BuildForRoute(path string, method string) []gin.HandlerFunc {
	var chain []gin.HandlerFunc

	chain = append(chain, mf.initContext())

	req := mf.parseRequirements(path, method)

	if req.NeedAuth {
		chain = append(chain, mf.authMiddleware())
	}

	if req.NeedProject {
		param := req.ProjectParam
		if param == "" {
			param = "project_id"
		}
		chain = append(chain, mf.loadProject(param, req.RequiredRole))
	}

	if req.NeedTask {
		param := req.TaskParam
		if param == "" {
			param = "task_id"
		}
		chain = append(chain, mf.loadTask(param))
	}

	if req.NeedStatus {
		param := req.StatusParam
		if param == "" {
			param = "status_id"
		}
		chain = append(chain, mf.loadStatus(param))
	}

	if req.NeedTag {
		param := req.TagParam
		if param == "" {
			param = "tag_id"
		}
		chain = append(chain, mf.loadTag(param))
	}

	if req.NeedMember {
		param := req.MemberParam
		if param == "" {
			param = "user_id"
		}
		chain = append(chain, mf.loadMember(param))
	}

	return chain
}

// initContext инициализирует ValidationContext для запроса
func (mf *Factory) initContext() gin.HandlerFunc {
	return func(c *gin.Context) {
		ctx := GetValidationContext(c)
		ctx.UserID = uuid.Nil
		ctx.ProjectID = uuid.Nil
		ctx.TaskID = uuid.Nil
		ctx.MemberID = uuid.Nil
		ctx.StatusID = uuid.Nil
		ctx.TagID = uuid.Nil
		ctx.AccessLevel = ""
		SetValidationContext(c, ctx)
		c.Next()
	}
}

// parseRequirements разбирает путь и определяет требования к middleware
func (mf *Factory) parseRequirements(path string, method string) RouteRequirements {
	parts := strings.Split(strings.Trim(path, "/"), "/")

	req := RouteRequirements{
		NeedAuth:     true,
		RequiredRole: "",
	}

	for i, part := range parts {
		switch part {
		case "api":
			continue

		case "register", "login", "health":
			req.NeedAuth = false
			req.RequiredRole = ""

		case "user":
			req.RequiredRole = ""

		case "projects":
			if i+1 < len(parts) && strings.HasPrefix(parts[i+1], ":") {
				req.NeedProject = true
				req.ProjectParam = strings.TrimPrefix(parts[i+1], ":")

				role := "member"
				if i == len(parts)-2 {
					switch method {
					case "DELETE":
						role = "owner"
					case "PUT", "PATCH":
						role = "admin"
					}
				}
				req.RequiredRole = maxRole(req.RequiredRole, role)
			}
			// Если нет параметра (например /api/projects/default или /api/user/projects) - ничего не делаем

		case "members":
			if i+1 < len(parts) && strings.HasPrefix(parts[i+1], ":") {
				req.NeedMember = true
				req.MemberParam = strings.TrimPrefix(parts[i+1], ":")

				if method == "PUT" {
					req.NeedMember = true
					req.RequiredRole = maxRole(req.RequiredRole, "owner")
				}
				if method == "DELETE" {
					req.NeedMember = true
					req.RequiredRole = maxRole(req.RequiredRole, "admin")
				}
			} else if method == "POST" {
				// POST /projects/:project_id/members - без параметра
				req.RequiredRole = maxRole(req.RequiredRole, "admin")
			}

		case "tasks":
			if i+1 < len(parts) && strings.HasPrefix(parts[i+1], ":") {
				req.NeedTask = true
				req.TaskParam = strings.TrimPrefix(parts[i+1], ":")
			}

		case "statuses":
			if i+1 < len(parts) && strings.HasPrefix(parts[i+1], ":") {
				req.NeedStatus = true
				req.StatusParam = strings.TrimPrefix(parts[i+1], ":")
			}
			if method == "POST" || method == "PUT" || method == "DELETE" {
				req.RequiredRole = maxRole(req.RequiredRole, "admin")
			}

		case "tags":
			if i+1 < len(parts) && strings.HasPrefix(parts[i+1], ":") {
				req.NeedTag = true
				req.TagParam = strings.TrimPrefix(parts[i+1], ":")
			}
			if method == "POST" || method == "DELETE" {
				req.RequiredRole = maxRole(req.RequiredRole, "admin")
			}

		case "lanes", "columns":
			if method == "POST" || method == "PUT" || method == "DELETE" {
				req.RequiredRole = maxRole(req.RequiredRole, "admin")
			}

		case "leave":
			if method == "POST" {
				req.RequiredRole = maxRole(req.RequiredRole, "member")
			}

		case "transfer-ownership":
			if method == "POST" {
				req.RequiredRole = maxRole(req.RequiredRole, "owner")
			}
		}
	}

	return req
}

// authMiddleware проверяет JWT токены и обновляет их при необходимости
func (mf *Factory) authMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		ctx := GetValidationContext(c)

		// Пытаемся получить access токен из куки
		accessToken, err := c.Cookie("access_token")

		if err == nil && accessToken != "" {
			claims, err := utils.ParseToken(accessToken, mf.jwtSecret)
			if err == nil {
				userID, err := uuid.Parse(claims.UserID)
				if err != nil {
					c.AbortWithStatusJSON(ex.NewApiError(err))
					return
				}
				ctx.UserID = userID
				SetValidationContext(c, ctx)
				c.Next()
				return
			}
		}

		// Пробуем обновить через refresh токен
		refreshToken, err := c.Cookie("refresh_token")
		if err != nil || refreshToken == "" {
			c.AbortWithStatusJSON(ex.NewApiError(err))
			return
		}

		refreshClaims, err := utils.ParseToken(refreshToken, mf.jwtSecret)
		if err != nil {
			c.AbortWithStatusJSON(ex.NewApiError(err))
			return
		}

		// Генерируем новые токены
		newAccess, err := utils.GenerateAccess(refreshClaims.UserID, mf.jwtSecret)
		if err != nil {
			c.AbortWithStatusJSON(ex.NewApiError(err))
			return
		}

		newRefresh, err := utils.GenerateRefresh(refreshClaims.UserID, mf.jwtSecret)
		if err != nil {
			c.AbortWithStatusJSON(ex.NewApiError(err))
			return
		}

		// Обновляем куки
		c.SetCookie("access_token", newAccess, 900, "/", "", false, true)
		c.SetCookie("refresh_token", newRefresh, 259200, "/", "", false, true)

		userID, err := uuid.Parse(refreshClaims.UserID)
		if err != nil {
			c.AbortWithStatusJSON(ex.NewApiError(err))
			return
		}
		ctx.UserID = userID
		SetValidationContext(c, ctx)

		c.Next()
	}
}

// loadProject загружает проект и проверяет доступ
func (mf *Factory) loadProject(projectIDParam string, requiredLevel string) gin.HandlerFunc {
	return func(c *gin.Context) {
		ctx := GetValidationContext(c)

		projectIDStr := c.Param(projectIDParam)
		if projectIDStr == "" {
			projectIDStr = c.Param("project_id")
		}

		if projectIDStr == "" {
			c.AbortWithStatusJSON(ex.NewApiError(ex.BadRequest("project_id is required")))
			return
		}

		projectID, err := uuid.Parse(projectIDStr)
		if err != nil {
			c.AbortWithStatusJSON(ex.NewApiError(ex.BadRequest("invalid project_id")))
			return
		}

		// Получаем проект с членами
		project, err := mf.projectService.GetByID(c.Request.Context(), projectID)
		if err != nil {
			c.AbortWithStatusJSON(ex.NewApiError(err))
			return
		}

		// Проверяем доступ через members
		hasAccess := false
		var accessLevel string
		for i := range project.Members {
			if project.Members[i].UserID == ctx.UserID {
				hasAccess = true
				accessLevel = project.Members[i].PermissionLevel
				break
			}
		}

		if !hasAccess {
			c.AbortWithStatusJSON(ex.NewApiError(ex.NotFound("project not found")))
			return
		}

		// Проверяем требуемый уровень доступа
		if !hasAccessLevel(accessLevel, requiredLevel) {
			c.AbortWithStatusJSON(ex.NewApiError(ex.Forbidden("Required level: " + requiredLevel + ", you have: " + accessLevel)))
			return
		}

		// Сохраняем только ID и уровень доступа (не полную структуру!)
		ctx.ProjectID = projectID
		ctx.AccessLevel = accessLevel
		SetValidationContext(c, ctx)

		// Обновляем время последнего визита пользователя в проект
		defer func() {
			// Обновляем только при успешных запросах (2xx)
			if c.Writer.Status() >= 200 && c.Writer.Status() < 300 {
				go func(pid, uid uuid.UUID) {
					updateCtx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
					defer cancel()

					if err = mf.projectService.UpdateUserLastSeen(updateCtx, pid, uid); err != nil {
						// Логируем ошибку, но не влияем на ответ клиента
						fmt.Printf("[WARN] Failed to update last_seen for project %s, user %s: %v\n", pid, uid, err)
					}
				}(projectID, ctx.UserID)
			}
		}()

		c.Next()
	}
}

// loadTask загружает задачу и проверяет принадлежность проекту
func (mf *Factory) loadTask(taskIDParam string) gin.HandlerFunc {
	return func(c *gin.Context) {
		ctx := GetValidationContext(c)

		taskIDStr := c.Param(taskIDParam)
		if taskIDStr == "" {
			taskIDStr = c.Param("task_id")
		}
		if taskIDStr == "" {
			c.AbortWithStatusJSON(ex.NewApiError(ex.BadRequest("task_id is required")))
			return
		}

		taskID, err := uuid.Parse(taskIDStr)
		if err != nil {
			c.AbortWithStatusJSON(ex.NewApiError(ex.BadRequest("invalid task_id")))
			return
		}

		// Проверяем, что проект уже загружен
		if ctx.ProjectID == uuid.Nil {
			c.AbortWithStatusJSON(ex.NewApiError(ex.BadRequest("project_id required before task")))
			return
		}

		task, err := mf.taskService.GetByID(c.Request.Context(), taskID)
		if err != nil || task.ProjectID != ctx.ProjectID {
			c.AbortWithStatusJSON(ex.NewApiError(err))
			return
		}

		// Сохраняем только ID задачи
		ctx.TaskID = taskID
		SetValidationContext(c, ctx)

		c.Next()
	}
}

// loadStatus проверяет, что статус принадлежит проекту
func (mf *Factory) loadStatus(statusIDParam string) gin.HandlerFunc {
	return func(c *gin.Context) {
		ctx := GetValidationContext(c)

		statusIDStr := c.Param(statusIDParam)
		if statusIDStr == "" {
			statusIDStr = c.Param("status_id")
		}
		if statusIDStr == "" {
			c.AbortWithStatusJSON(ex.NewApiError(ex.BadRequest("status_id is required")))
			return
		}

		statusID, err := uuid.Parse(statusIDStr)
		if err != nil {
			c.AbortWithStatusJSON(ex.NewApiError(ex.BadRequest("invalid status_id")))
			return
		}

		// Проверяем, что проект уже загружен
		if ctx.ProjectID == uuid.Nil {
			c.AbortWithStatusJSON(ex.NewApiError(ex.BadRequest("project required before status")))
			return
		}

		// Проверяем существование статуса через сервис
		project, err := mf.projectService.GetByID(c.Request.Context(), ctx.ProjectID)
		if err != nil {
			c.AbortWithStatusJSON(ex.NewApiError(err))
			return
		}

		var status models.ProjectStatus
		for _, s := range project.Statuses {
			if s.ID == statusID {
				status = s
				break
			}
		}

		if status.ProjectID != ctx.ProjectID {
			c.AbortWithStatusJSON(ex.NewApiError(ex.NotFound("Status")))
			return
		}

		ctx.StatusID = statusID
		SetValidationContext(c, ctx)

		c.Next()
	}
}

// loadTag проверяет, что тег принадлежит проекту
func (mf *Factory) loadTag(tagIDParam string) gin.HandlerFunc {
	return func(c *gin.Context) {
		ctx := GetValidationContext(c)

		tagIDStr := c.Param(tagIDParam)
		if tagIDStr == "" {
			tagIDStr = c.Param("tag_id")
		}
		if tagIDStr == "" {
			c.AbortWithStatusJSON(ex.NewApiError(ex.BadRequest("tag_id is required")))
			return
		}

		tagID, err := uuid.Parse(tagIDStr)
		if err != nil {
			c.AbortWithStatusJSON(ex.NewApiError(ex.BadRequest("invalid tag_id")))
			return
		}

		// Проверяем, что проект уже загружен
		if ctx.ProjectID == uuid.Nil {
			c.AbortWithStatusJSON(ex.NewApiError(ex.BadRequest("project required before tag")))
			return
		}

		// Проверяем существование тега через сервис
		project, err := mf.projectService.GetByID(c.Request.Context(), ctx.ProjectID)
		if err != nil {
			c.AbortWithStatusJSON(ex.NewApiError(err))
			return
		}

		var tag models.Tag
		for _, t := range project.Tags {
			if t.ID == tagID {
				tag = t
				break
			}
		}

		if tag.ProjectID != ctx.ProjectID {
			c.AbortWithStatusJSON(ex.NewApiError(ex.NotFound("Tag")))
			return
		}

		ctx.TagID = tagID
		SetValidationContext(c, ctx)

		c.Next()
	}
}

// loadMember проверяет, что пользователь является участником проекта
func (mf *Factory) loadMember(memberIDParam string) gin.HandlerFunc {
	return func(c *gin.Context) {
		ctx := GetValidationContext(c)

		memberIDStr := c.Param(memberIDParam)
		if memberIDStr == "" {
			memberIDStr = c.Param("user_id")
		}
		if memberIDStr == "" {
			c.AbortWithStatusJSON(ex.NewApiError(ex.BadRequest("user_id is required")))
			return
		}

		memberID, err := uuid.Parse(memberIDStr)
		if err != nil {
			c.AbortWithStatusJSON(ex.NewApiError(ex.BadRequest("invalid user_id")))
			return
		}

		// Проверяем, что проект уже загружен
		if ctx.ProjectID == uuid.Nil {
			c.AbortWithStatusJSON(ex.NewApiError(ex.BadRequest("project required before member check")))
			return
		}

		// Проверяем, является ли пользователь участником проекта
		project, err := mf.projectService.GetByID(c.Request.Context(), ctx.ProjectID)
		if err != nil {
			c.AbortWithStatusJSON(ex.NewApiError(err))
			return
		}

		var member models.ProjectMember
		for _, m := range project.Members {
			if m.UserID == memberID {
				member = m
				break
			}
		}

		if member.UserID == uuid.Nil || member.ProjectID != ctx.ProjectID {
			c.AbortWithStatusJSON(ex.NewApiError(ex.NotFound("User")))
			return
		}

		ctx.MemberID = memberID
		SetValidationContext(c, ctx)

		c.Next()
	}
}
