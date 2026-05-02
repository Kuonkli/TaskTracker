package dto

import (
	"github.com/google/uuid"
	"time"
)

type ProjectFilter struct {
	OwnerID *uuid.UUID
	Name    string
}

// CreateCustomProjectRequest - DTO для создания кастомного проекта
type CreateCustomProjectRequest struct {
	Name        string                `json:"name" binding:"required"`
	Description string                `json:"description"`
	Statuses    []CustomStatusRequest `json:"statuses" binding:"required,min=1"`
	Lanes       []CustomLaneRequest   `json:"lanes" binding:"required,min=1"`
	Tags        []CustomTagRequest    `json:"tags"`
}

type CustomStatusRequest struct {
	Name          string `json:"name" binding:"required"`
	StatusType    string `json:"status_type" binding:"required,oneof=todo progress paused completed cancelled"`
	Color         string `json:"color" binding:"required"`
	BoardPosition *int   `json:"board_position,omitempty"` // nil если не на доске
}

type CustomLaneRequest struct {
	Title         string `json:"title" binding:"required"`
	Description   string `json:"description"`
	Color         string `json:"color" binding:"required"`
	Position      int    `json:"position" binding:"required"`
	RuleCondition string `json:"rule_condition" binding:"required"` // Строка правила
}

type CustomTagRequest struct {
	Title string `json:"title" binding:"required"`
	Color string `json:"color" binding:"required"`
}

// ProjectResponse - ответ с данными проекта
type ProjectResponse struct {
	ID        uuid.UUID `json:"id"`
	Name      string    `json:"name"`
	OwnerID   uuid.UUID `json:"owner_id"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

type UpdateProjectRequest struct {
	Name string `json:"name,omitempty" binding:"omitempty,max=255"`
}

type CreateDefaultProjectRequest struct {
	Name string `json:"name" binding:"required,max=255"`
}

// Member Requests
type AddMemberRequest struct {
	UserID          uuid.UUID `json:"user_id" binding:"required"`
	RoleInTeam      string    `json:"role_in_team,omitempty"`
	PermissionLevel string    `json:"permission_level" binding:"required,oneof=admin member"`
}

type UpdateMemberRequest struct {
	RoleInTeam      string `json:"role_in_team,omitempty"`
	PermissionLevel string `json:"permission_level,omitempty" binding:"omitempty,oneof=admin member"`
}
