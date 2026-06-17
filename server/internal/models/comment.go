package models

import (
	"github.com/google/uuid"
	"gorm.io/gorm"
	"time"
)

type Comment struct {
	ID        uuid.UUID `gorm:"type:uuid;primaryKey;default:uuid_generate_v4()" json:"id"`
	CreatedAt time.Time `gorm:"default:now()" json:"created_at"`
	UpdatedAt time.Time `gorm:"default:now()" json:"updated_at"`
	TaskID    uuid.UUID `gorm:"type:uuid;not null" json:"task_id"`
	UserID    uuid.UUID `gorm:"type:uuid;not null" json:"user_id"`
	Content   string    `gorm:"type:text" json:"content"`

	// Relationships
	Task        *Task        `gorm:"foreignKey:TaskID" json:"task,omitempty"`
	User        *User        `gorm:"foreignKey:UserID" json:"user,omitempty"`
	Attachments []Attachment `gorm:"foreignKey:CommentID" json:"attachments,omitempty"`
}

func (c *Comment) BeforeCreate(tx *gorm.DB) error {
	if c.ID == uuid.Nil {
		c.ID = uuid.New()
	}
	return nil
}
