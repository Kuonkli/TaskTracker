package models

import (
	"github.com/google/uuid"
	"gorm.io/gorm"
	"time"
)

type ProjectMember struct {
	ID              uuid.UUID  `gorm:"type:uuid;primaryKey;default:uuid_generate_v4()" json:"id"`
	ProjectID       uuid.UUID  `gorm:"type:uuid;not null" json:"project_id"`
	UserID          uuid.UUID  `gorm:"type:uuid;not null" json:"user_id"`
	RoleInTeam      *string    `gorm:"type:text" json:"role_in_team,omitempty"`
	JoinedAt        time.Time  `gorm:"default:now()" json:"joined_at"`
	PermissionLevel string     `gorm:"type:varchar(20);not null" json:"permission_level"`
	GrantedAt       time.Time  `gorm:"default:now()" json:"granted_at"`
	GrantedByID     *uuid.UUID `gorm:"type:uuid;column:granted_by" json:"granted_by_id,omitempty"` // указываем column
	LastSeenAt      time.Time  `gorm:"default:now()" json:"last_seen_at"`

	// Relationships
	Project   *Project `gorm:"foreignKey:ProjectID" json:"project,omitempty"`
	User      User     `gorm:"foreignKey:UserID" json:"user,omitempty"`
	GrantedBy *User    `gorm:"foreignKey:GrantedByID;references:ID" json:"granted_by,omitempty"` // исправляем foreignKey
}

func (pm *ProjectMember) BeforeCreate(tx *gorm.DB) error {
	if pm.ID == uuid.Nil {
		pm.ID = uuid.New()
	}
	return nil
}
