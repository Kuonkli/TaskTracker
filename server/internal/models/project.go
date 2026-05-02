package models

import (
	"github.com/google/uuid"
	"gorm.io/gorm"
	"time"
)

type Project struct {
	ID          uuid.UUID `gorm:"type:uuid;primaryKey;default:uuid_generate_v4()" json:"id"`
	OwnerID     uuid.UUID `gorm:"type:uuid;not null" json:"owner_id"`
	Name        string    `gorm:"type:varchar(255)" json:"name"`
	Description string    `gorm:"type:text" json:"description"`
	CreatedAt   time.Time `gorm:"default:now()" json:"created_at"`
	UpdatedAt   time.Time `gorm:"default:now()" json:"updated_at"`

	// Relationships
	Owner    *User           `gorm:"foreignKey:OwnerID" json:"owner,omitempty"`
	Members  []ProjectMember `gorm:"foreignKey:ProjectID" json:"members,omitempty"`
	Statuses []ProjectStatus `gorm:"foreignKey:ProjectID" json:"statuses,omitempty"`
	Columns  []Column        `gorm:"foreignKey:ProjectID" json:"columns,omitempty"`
	Lanes    []Lane          `gorm:"foreignKey:ProjectID" json:"lanes,omitempty"`
	Tasks    []Task          `gorm:"foreignKey:ProjectID" json:"tasks,omitempty"`
	Tags     []Tag           `gorm:"foreignKey:ProjectID" json:"tags,omitempty"`
}

func (p *Project) BeforeCreate(tx *gorm.DB) error {
	if p.ID == uuid.Nil {
		p.ID = uuid.New()
	}
	return nil
}
