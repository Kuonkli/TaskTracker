package models

import (
	"github.com/google/uuid"
	"gorm.io/gorm"
	"time"
)

type Column struct {
	ID        uuid.UUID `gorm:"type:uuid;primaryKey;default:uuid_generate_v4()" json:"id"`
	ProjectID uuid.UUID `gorm:"type:uuid;not null" json:"project_id"`
	StatusID  uuid.UUID `gorm:"type:uuid;not null" json:"status_id"`
	Position  int       `gorm:"not null" json:"position"`
	CreatedAt time.Time `gorm:"default:now()" json:"created_at"`
	UpdatedAt time.Time `gorm:"default:now()" json:"updated_at"`

	// Relationships
	Project *Project       `gorm:"foreignKey:ProjectID" json:"project,omitempty"`
	Status  *ProjectStatus `gorm:"foreignKey:StatusID" json:"status,omitempty"`
}

func (c *Column) BeforeCreate(tx *gorm.DB) error {
	if c.ID == uuid.Nil {
		c.ID = uuid.New()
	}
	return nil
}
