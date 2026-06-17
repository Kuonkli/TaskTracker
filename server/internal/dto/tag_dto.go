package dto

import (
	"github.com/google/uuid"
	"time"
)

type TagFilter struct {
	ProjectID *uuid.UUID
	Title     string
}

type TagIDRequest struct {
	TagID string `json:"tag_id" form:"tag_id"`
}

type CreateTagRequest struct {
	Title string `json:"title" binding:"required,max=100"`
	Color string `json:"color" binding:"omitempty,hexcolor"`
}

type UpdateTagRequest struct {
	Title *string `json:"title,omitempty"`
	Color *string `json:"color,omitempty" binding:"omitempty,hexcolor"`
}

type TagResponse struct {
	ID        uuid.UUID `json:"id"`
	Title     string    `json:"title"`
	Color     string    `json:"color"`
	ProjectID uuid.UUID `json:"project_id"`
	CreatedAt time.Time `json:"created_at"`
}

type TagListResponse struct {
	Tags   []TagResponse `json:"tags"`
	Total  int64         `json:"total"`
	Limit  int           `json:"limit"`
	Offset int           `json:"offset"`
}
