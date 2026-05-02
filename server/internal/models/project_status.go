package models

import (
	"github.com/google/uuid"
	"gorm.io/gorm"
	"time"
)

type ProjectStatus struct {
	ID         uuid.UUID `gorm:"type:uuid;primaryKey;default:uuid_generate_v4()" json:"id"`
	CreatedAt  time.Time `gorm:"default:now()" json:"created_at"`
	UpdatedAt  time.Time `gorm:"default:now()" json:"updated_at"`
	ProjectID  uuid.UUID `gorm:"type:uuid;not null" json:"project_id"`
	Name       string    `gorm:"type:varchar(100);not null" json:"name"`
	StatusType string    `gorm:"type:varchar(50);not null" json:"status_type"`
	Color      string    `gorm:"type:varchar(7);default:'#8B5CF6'" json:"color"`

	// Relationships
	Project *Project `gorm:"foreignKey:ProjectID" json:"project,omitempty"`
	Columns []Column `gorm:"foreignKey:StatusID" json:"columns,omitempty"`
	Tasks   []Task   `gorm:"foreignKey:StatusID" json:"tasks,omitempty"`
}

func (ps *ProjectStatus) BeforeCreate(tx *gorm.DB) error {
	if ps.ID == uuid.Nil {
		ps.ID = uuid.New()
	}
	return nil
}
