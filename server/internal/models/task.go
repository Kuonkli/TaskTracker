package models

import (
	"github.com/google/uuid"
	"gorm.io/gorm"
	"time"
)

type Task struct {
	ID           uuid.UUID  `gorm:"type:uuid;primaryKey;default:uuid_generate_v4()" json:"id"`
	CreatedAt    time.Time  `gorm:"default:now()" json:"created_at"`
	UpdatedAt    time.Time  `gorm:"default:now()" json:"updated_at"`
	ProjectID    uuid.UUID  `gorm:"type:uuid;not null" json:"project_id"`
	Title        string     `gorm:"type:varchar(255);not null" json:"title"`
	Description  *string    `gorm:"type:text" json:"description,omitempty"`
	CreatorID    uuid.UUID  `gorm:"type:uuid;not null" json:"creator_id"`
	AssigneeID   *uuid.UUID `gorm:"type:uuid" json:"assignee_id,omitempty"`
	StatusID     *uuid.UUID `gorm:"type:uuid" json:"status_id,omitempty"`
	Priority     string     `gorm:"type:varchar(100);default:'medium'" json:"priority"`
	StartDate    *time.Time `gorm:"default:now()" json:"start_date,omitempty"`
	DueDate      *time.Time `json:"due_date,omitempty"`
	ClosedAt     *time.Time `json:"closed_at,omitempty"`
	ParentTaskID *uuid.UUID `gorm:"type:uuid" json:"parent_task_id,omitempty"`

	// Relationships
	Project     *Project       `gorm:"foreignKey:ProjectID" json:"project,omitempty"`
	Creator     *User          `gorm:"foreignKey:CreatorID" json:"creator,omitempty"`
	Assignee    *User          `gorm:"foreignKey:AssigneeID" json:"assignee,omitempty"`
	Status      *ProjectStatus `gorm:"foreignKey:StatusID" json:"status,omitempty"`
	ParentTask  *Task          `gorm:"foreignKey:ParentTaskID" json:"parent_task,omitempty"`
	Subtasks    []*Task        `gorm:"foreignKey:ParentTaskID" json:"subtasks,omitempty"`
	Tags        []*Tag         `gorm:"many2many:task_tags;" json:"tags,omitempty"`
	Comments    []Comment      `gorm:"foreignKey:TaskID" json:"comments,omitempty"`
	Changes     []Change       `gorm:"foreignKey:TaskID" json:"changes,omitempty"`
	Attachments []Attachment   `gorm:"foreignKey:TaskID" json:"attachments,omitempty"`
}

func (t *Task) BeforeCreate(tx *gorm.DB) error {
	if t.ID == uuid.Nil {
		t.ID = uuid.New()
	}
	return nil
}
