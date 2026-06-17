package dto

import (
	"github.com/google/uuid"
)

type ProjectMemberFilter struct {
	ProjectID       *uuid.UUID
	UserID          *uuid.UUID
	PermissionLevel string
}
