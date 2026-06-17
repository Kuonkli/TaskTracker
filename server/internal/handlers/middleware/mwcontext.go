package middleware

import (
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

// ValidationContext хранит только минимальные данные для авторизации и доступа
type ValidationContext struct {
	// ID для быстрого доступа
	UserID    uuid.UUID
	ProjectID uuid.UUID
	TaskID    uuid.UUID
	MemberID  uuid.UUID
	StatusID  uuid.UUID
	TagID     uuid.UUID

	// Уровень доступа (member/admin/owner)
	AccessLevel string

	// Дополнительные данные (только для временного хранения в рамках одного запроса)
	Extra map[string]interface{}
}

const ValidationContextKey = "validation_ctx"

// GetValidationContext извлекает ValidationContext из gin.Context
func GetValidationContext(c *gin.Context) *ValidationContext {
	if val, exists := c.Get(ValidationContextKey); exists {
		if ctx, ok := val.(*ValidationContext); ok {
			return ctx
		}
	}
	return &ValidationContext{
		Extra: make(map[string]interface{}),
	}
}

// SetValidationContext сохраняет ValidationContext в gin.Context
func SetValidationContext(c *gin.Context, ctx *ValidationContext) {
	c.Set(ValidationContextKey, ctx)
}

func (ctx *ValidationContext) GetUserID() uuid.UUID {
	return ctx.UserID
}

func (ctx *ValidationContext) GetProjectID() uuid.UUID {
	return ctx.ProjectID
}

func (ctx *ValidationContext) GetTaskID() uuid.UUID {
	return ctx.TaskID
}

func (ctx *ValidationContext) IsOwner() bool {
	return ctx.AccessLevel == "owner"
}

func (ctx *ValidationContext) IsAdmin() bool {
	return ctx.AccessLevel == "admin" || ctx.AccessLevel == "owner"
}

func (ctx *ValidationContext) IsMember() bool {
	return ctx.AccessLevel == "member" || ctx.IsAdmin()
}

func (ctx *ValidationContext) HasAccess(level string) bool {
	switch level {
	case "owner":
		return ctx.IsOwner()
	case "admin":
		return ctx.IsAdmin()
	case "member":
		return ctx.IsMember()
	default:
		return false
	}
}
