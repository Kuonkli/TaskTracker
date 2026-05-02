package models

import (
	"github.com/google/uuid"
	"gorm.io/gorm"
	"time"
)

type User struct {
	ID           uuid.UUID `gorm:"type:uuid;primaryKey;default:uuid_generate_v4()" json:"id"`
	Email        string    `gorm:"type:varchar(255);uniqueIndex;not null" json:"email"`
	PasswordHash string    `gorm:"type:varchar(255);not null" json:"-"`
	FirstName    string    `gorm:"type:varchar(100);not null" json:"first_name"`
	LastName     string    `gorm:"type:varchar(100);not null" json:"last_name"`
	Nickname     string    `gorm:"type:varchar(100);uniqueIndex;not null" json:"nickname"`
	AvatarURL    *string   `gorm:"type:text" json:"avatar_url,omitempty"`
	Bio          *string   `gorm:"type:text" json:"bio,omitempty"`
	Color        string    `gorm:"type:varchar(7);default:'#8B5CF6'" json:"color"`
	CreatedAt    time.Time `gorm:"default:now()" json:"created_at"`
	UpdatedAt    time.Time `gorm:"default:now()" json:"updated_at"`

	// Relationships
	OwnedProjects []Project       `gorm:"foreignKey:OwnerID" json:"-"`
	ProjectMember []ProjectMember `gorm:"foreignKey:UserID" json:"-"`
	CreatedTasks  []Task          `gorm:"foreignKey:CreatorID" json:"-"`
	AssignedTasks []Task          `gorm:"foreignKey:AssigneeID" json:"-"`
	Comments      []Comment       `gorm:"foreignKey:UserID" json:"-"`
	Changes       []Change        `gorm:"foreignKey:UserID" json:"-"`
}

func (u *User) BeforeCreate(tx *gorm.DB) error {
	if u.ID == uuid.Nil {
		u.ID = uuid.New()
	}
	return nil
}

func (u *User) BeforeUpdate(tx *gorm.DB) error {
	u.UpdatedAt = time.Now()
	return nil
}
