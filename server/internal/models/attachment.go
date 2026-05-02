package models

import (
	"github.com/google/uuid"
	"gorm.io/gorm"
	"time"
)

type Attachment struct {
	ID         uuid.UUID  `gorm:"type:uuid;primaryKey;default:uuid_generate_v4()" json:"id"`
	CreatedAt  time.Time  `gorm:"default:now()" json:"created_at"`
	CommentID  *uuid.UUID `gorm:"type:uuid" json:"comment_id,omitempty"`
	TaskID     *uuid.UUID `gorm:"type:uuid" json:"task_id,omitempty"`
	Filename   string     `gorm:"type:varchar(255);not null" json:"filename"`
	FileURL    string     `gorm:"type:text;not null" json:"file_url"`
	FileSize   *int       `json:"file_size,omitempty"`
	FileType   *string    `gorm:"type:varchar(100)" json:"file_type,omitempty"`
	UploadedBy uuid.UUID  `gorm:"type:uuid;not null" json:"uploaded_by"`

	// Relationships
	Comment  *Comment `gorm:"foreignKey:CommentID" json:"comment,omitempty"`
	Task     *Task    `gorm:"foreignKey:TaskID" json:"task,omitempty"`
	Uploader User     `gorm:"foreignKey:UploadedBy" json:"uploader,omitempty"`
}

func (a *Attachment) BeforeCreate(tx *gorm.DB) error {
	if a.ID == uuid.Nil {
		a.ID = uuid.New()
	}
	return nil
}
