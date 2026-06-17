package models

import (
	"github.com/google/uuid"
	"gorm.io/datatypes"
	"gorm.io/gorm"
	"time"
)

type Change struct {
	ID           uuid.UUID      `gorm:"type:uuid;primaryKey;default:uuid_generate_v4()" json:"id"`
	TaskID       uuid.UUID      `gorm:"type:uuid;not null" json:"task_id"`
	UserID       uuid.UUID      `gorm:"type:uuid;not null" json:"user_id"`
	FieldName    string         `gorm:"type:varchar(50);not null" json:"field_name"`
	OldValue     datatypes.JSON `gorm:"type:jsonb" json:"old_value,omitempty"`
	NewValue     datatypes.JSON `gorm:"type:jsonb;not null" json:"new_value"`
	Description  *string        `gorm:"type:text;" json:"description,omitempty"`
	TimeDuration int64          `gorm:"type:bigint;not null" json:"time_duration"`
	CreatedAt    time.Time      `gorm:"default:now()" json:"created_at"`

	// Relationships
	Task *Task `gorm:"foreignKey:TaskID" json:"task,omitempty"`
	User *User `gorm:"foreignKey:UserID" json:"user,omitempty"`
}

func (c *Change) BeforeCreate(tx *gorm.DB) error {
	if c.ID == uuid.Nil {
		c.ID = uuid.New()
	}
	return nil
}
