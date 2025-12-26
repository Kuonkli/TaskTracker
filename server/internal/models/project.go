package models

import (
	"github.com/google/uuid"
	"gorm.io/gorm"
	"time"
)

type Project struct {
	ID          uuid.UUID `gorm:"type:uuid;primary_key;default:uuid_generate_v4()" json:"id"`
	CreatedAt   time.Time `gorm:"default:CURRENT_TIMESTAMP" json:"created_at"`
	UpdatedAt   time.Time `gorm:"default:CURRENT_TIMESTAMP" json:"updated_at"`
	Name        string    `gorm:"not null" json:"name"`
	Description string    `json:"description"`
	Color       string    `gorm:"type:varchar(7);default:'#4f46e5'" json:"color"`
	UserID      uuid.UUID `gorm:"type:uuid;not null" json:"user_id"`
	Tasks       []Task    `gorm:"foreignKey:ProjectID" json:"tasks"`
}

func (p *Project) BeforeCreate(tx *gorm.DB) error {
	if p.ID == uuid.Nil {
		p.ID = uuid.New()
	}
	return nil
}
