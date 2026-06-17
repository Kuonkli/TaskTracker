package dto

import "github.com/google/uuid"

type AttachmentFilter struct {
	TaskID     *uuid.UUID
	CommentID  *uuid.UUID
	UploadedBy *uuid.UUID
}
