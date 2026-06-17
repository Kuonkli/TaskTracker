package models

import (
	"github.com/google/uuid"
	"gorm.io/gorm"
	"time"
)

type Tag struct {
	ID        uuid.UUID `gorm:"type:uuid;primaryKey;default:uuid_generate_v4()" json:"id"`
	ProjectID uuid.UUID `gorm:"type:uuid;not null" json:"project_id"`
	Title     string    `gorm:"type:varchar(100);not null" json:"title"`
	Color     string    `gorm:"type:varchar(7);default:'#8b5cf6'" json:"color"`
	CreatedAt time.Time `gorm:"default:now()" json:"created_at"`

	// Relationships
	Project *Project `gorm:"foreignKey:ProjectID" json:"project,omitempty"`
	Tasks   []*Task  `gorm:"many2many:task_tags;" json:"tasks,omitempty"`
}

func (t *Tag) BeforeCreate(tx *gorm.DB) error {
	if t.ID == uuid.Nil {
		t.ID = uuid.New()
	}
	return nil
}
