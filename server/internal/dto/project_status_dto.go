package dto

import (
	"github.com/google/uuid"
	"time"
)

type ProjectStatusFilter struct {
	ProjectID  *uuid.UUID
	StatusType string
	Name       string
}

type CreateStatusRequest struct {
	Name       string `json:"name" binding:"required,max=100"`
	StatusType string `json:"status_type" binding:"required,oneof=todo progress paused completed cancelled"`
	Color      string `json:"color" binding:"omitempty,hexcolor"`
}

type UpdateStatusRequest struct {
	Name       *string `json:"name,omitempty"`
	StatusType *string `json:"status_type,omitempty" binding:"omitempty,oneof=todo progress paused completed cancelled"`
	Color      *string `json:"color,omitempty" binding:"omitempty,hexcolor"`
}

type StatusResponse struct {
	ID         uuid.UUID `json:"id"`
	Name       string    `json:"name"`
	StatusType string    `json:"status_type"`
	Color      string    `json:"color"`
	ProjectID  uuid.UUID `json:"project_id"`
	CreatedAt  time.Time `json:"created_at"`
	UpdatedAt  time.Time `json:"updated_at"`
}

type StatusListResponse struct {
	Statuses []StatusResponse `json:"statuses"`
	Total    int64            `json:"total"`
	Limit    int              `json:"limit"`
	Offset   int              `json:"offset"`
}
