package dto

import "github.com/google/uuid"

type TaskActivityFilter struct {
	TaskID *uuid.UUID
	UserID *uuid.UUID
	Type   string
}
