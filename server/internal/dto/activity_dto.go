package dto

import (
	"github.com/google/uuid"
	"task-tracker/internal/models"
	"time"
)

type CommentFilter struct {
	UserID  *uuid.UUID
	TaskID  *uuid.UUID
	Content string `form:"content"`
	Offset  int    `form:"offset"`
	Limit   int    `form:"limit"`
}

type ChangeFilter struct {
	UserID    *uuid.UUID
	TaskID    *uuid.UUID
	FieldName string `form:"fieldName"`
	Offset    int    `form:"offset"`
	Limit     int    `form:"limit"`
}

type ActivityItem struct {
	ID        string       `json:"id"`
	Type      string       `json:"type"`
	CreatedAt time.Time    `json:"created_at"`
	UserID    uuid.UUID    `json:"user_id"`
	TaskID    uuid.UUID    `json:"task_id"`
	User      *models.User `json:"user"`
	Task      *models.Task `json:"task"`

	// Comment fields
	CommentID   *uuid.UUID           `json:"comment_id,omitempty"`
	Content     *string              `json:"content,omitempty"`
	Attachments *[]models.Attachment `json:"attachments,omitempty"`

	// Change fields
	ChangeID     *uuid.UUID  `json:"change_id,omitempty"`
	FieldName    *string     `json:"field_name,omitempty"`
	OldValue     interface{} `json:"old_value,omitempty"`
	NewValue     interface{} `json:"new_value,omitempty"`
	Description  *string     `json:"description,omitempty"`
	TimeDuration *int64      `json:"time_duration,omitempty"` // в секундах
}
