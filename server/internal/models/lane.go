package models

import (
	"github.com/google/uuid"
	"gorm.io/datatypes"
	"gorm.io/gorm"
	"time"
)

type Lane struct {
	ID            uuid.UUID      `gorm:"type:uuid;primaryKey;default:uuid_generate_v4()" json:"id"`
	ProjectID     uuid.UUID      `gorm:"type:uuid;not null" json:"project_id"`
	Title         string         `gorm:"type:varchar(100);not null" json:"title"`
	Description   *string        `gorm:"type:text" json:"description,omitempty"`
	Position      int            `gorm:"not null" json:"position"`
	Color         string         `gorm:"type:varchar(7);default:'#8b5cf6'" json:"color"`
	RuleCondition datatypes.JSON `gorm:"type:jsonb;not null" json:"rule_condition"`
	CreatedAt     time.Time      `gorm:"default:now()" json:"created_at"`
	UpdatedAt     time.Time      `gorm:"default:now()" json:"updated_at"`

	// Relationships
	Project *Project `gorm:"foreignKey:ProjectID" json:"project,omitempty"`
}

func (l *Lane) BeforeCreate(tx *gorm.DB) error {
	if l.ID == uuid.Nil {
		l.ID = uuid.New()
	}
	return nil
}
