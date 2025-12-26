package models

import (
	"github.com/google/uuid"
	"gorm.io/gorm"
	"time"
)

type TaskStatus string

const (
	StatusTodo       TaskStatus = "todo"
	StatusInProgress TaskStatus = "in_progress"
	StatusDone       TaskStatus = "done"
)

type TaskPriority string

const (
	PriorityLow    TaskPriority = "low"
	PriorityMedium TaskPriority = "medium"
	PriorityHigh   TaskPriority = "high"
)

type Task struct {
	ID        uuid.UUID `gorm:"type:uuid;primaryKey;default:uuid_generate_v4()" json:"id"`
	CreatedAt time.Time `gorm:"default:CURRENT_TIMESTAMP" json:"created_at"`
	UpdatedAt time.Time `gorm:"default:CURRENT_TIMESTAMP;constraint:onUpdate:CURRENT_TIMESTAMP" json:"updated_at"`

	Title       string `gorm:"not null" json:"title"`
	Description string `json:"description"`

	Status   TaskStatus   `gorm:"type:varchar(20);default:'todo'" json:"status"`
	Priority TaskPriority `gorm:"type:varchar(10);default:'medium'" json:"priority"`
	DueDate  *time.Time   `json:"due_date"`

	UserID uuid.UUID `gorm:"type:uuid;not null" json:"user_id"`

	ProjectID *uuid.UUID `gorm:"type:uuid" json:"project_id"`
	Project   *Project   `gorm:"constraint:OnDelete:CASCADE;" json:"project,omitempty"`
}

func (t *Task) BeforeCreate(tx *gorm.DB) error {
	if t.ID == uuid.Nil {
		t.ID = uuid.New()
	}
	return nil
}
