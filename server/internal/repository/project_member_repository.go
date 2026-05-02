package repository

import (
	"context"
	"github.com/google/uuid"
	"gorm.io/gorm"
	"task-tracker/internal/dto"
	"task-tracker/internal/models"
	"time"
)

type ProjectMemberRepository interface {
	Create(ctx context.Context, member *models.ProjectMember) error
	FindByID(ctx context.Context, id uuid.UUID) (*models.ProjectMember, error)
	Update(ctx context.Context, member *models.ProjectMember) error
	Delete(ctx context.Context, id uuid.UUID) error
	DeleteByProjectAndUser(ctx context.Context, projectID, userID uuid.UUID) error
	List(ctx context.Context, filter dto.ProjectMemberFilter, limit, offset int) ([]models.ProjectMember, error)
	FindByProjectID(ctx context.Context, projectID uuid.UUID) ([]models.ProjectMember, error)
	FindByUserID(ctx context.Context, userID uuid.UUID) ([]models.ProjectMember, error)
	FindByProjectAndUser(ctx context.Context, projectID, userID uuid.UUID) (*models.ProjectMember, error)
	TransferOwnership(ctx context.Context, projectID uuid.UUID, userID uuid.UUID, newOwnerMember *models.ProjectMember) error
	UpdateUserLastSeen(ctx context.Context, projectID, userID uuid.UUID) error
}

type projectMemberRepo struct {
	db *gorm.DB
}

func NewProjectMemberRepository(db *gorm.DB) ProjectMemberRepository {
	return &projectMemberRepo{db: db}
}

func (r *projectMemberRepo) Create(ctx context.Context, member *models.ProjectMember) error {
	return r.db.WithContext(ctx).Create(member).Error
}

func (r *projectMemberRepo) FindByID(ctx context.Context, id uuid.UUID) (*models.ProjectMember, error) {
	var member models.ProjectMember
	err := r.db.WithContext(ctx).Preload("Project").Preload("User").Preload("GrantedBy").First(&member, "id = ?", id).Error
	return &member, err
}

func (r *projectMemberRepo) Update(ctx context.Context, member *models.ProjectMember) error {
	return r.db.WithContext(ctx).Save(member).Error
}

func (r *projectMemberRepo) Delete(ctx context.Context, id uuid.UUID) error {
	return r.db.WithContext(ctx).Delete(&models.ProjectMember{}, "id = ?", id).Error
}

func (r *projectMemberRepo) DeleteByProjectAndUser(ctx context.Context, projectID, userID uuid.UUID) error {
	return r.db.WithContext(ctx).Where("project_id = ? AND user_id = ?", projectID, userID).Delete(&models.ProjectMember{}).Error
}

func (r *projectMemberRepo) List(ctx context.Context, filter dto.ProjectMemberFilter, limit, offset int) ([]models.ProjectMember, error) {
	var members []models.ProjectMember
	query := r.db.WithContext(ctx).Preload("User").Preload("GrantedBy")

	if filter.ProjectID != nil {
		query = query.Where("project_id = ?", *filter.ProjectID)
	}
	if filter.UserID != nil {
		query = query.Where("user_id = ?", *filter.UserID)
	}
	if filter.PermissionLevel != "" {
		query = query.Where("permission_level = ?", filter.PermissionLevel)
	}

	err := query.
		Limit(limit).
		Offset(offset).
		Find(&members).Error

	return members, err
}

func (r *projectMemberRepo) FindByProjectID(ctx context.Context, projectID uuid.UUID) ([]models.ProjectMember, error) {
	var members []models.ProjectMember
	err := r.db.WithContext(ctx).Preload("User").Where("project_id = ?", projectID).Find(&members).Error
	return members, err
}

func (r *projectMemberRepo) FindByUserID(ctx context.Context, userID uuid.UUID) ([]models.ProjectMember, error) {
	var members []models.ProjectMember
	err := r.db.WithContext(ctx).Preload("Project").Where("user_id = ?", userID).Find(&members).Error
	return members, err
}

func (r *projectMemberRepo) FindByProjectAndUser(ctx context.Context, projectID, userID uuid.UUID) (*models.ProjectMember, error) {
	var member models.ProjectMember
	err := r.db.WithContext(ctx).Preload("User").Preload("GrantedBy").Where("project_id = ? AND user_id = ?", projectID, userID).First(&member).Error
	if err != nil {
		return nil, err
	}
	return &member, err
}

func (r *projectMemberRepo) TransferOwnership(ctx context.Context, projectID uuid.UUID, userID uuid.UUID, newOwnerMember *models.ProjectMember) error {
	return r.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		if err := tx.Model(&models.Project{}).Where("id = ?", projectID).Update("owner_id", newOwnerMember.UserID).Error; err != nil {
			return err
		}

		if err := tx.Model(&models.ProjectMember{}).Where("id = ?", newOwnerMember.ID).Update("permission_level", "owner").Error; err != nil {
			return err
		}

		var oldOwnerMember models.ProjectMember
		err := tx.Model(&models.ProjectMember{}).Where("project_id = ? AND user_id = ?", projectID, userID).First(&oldOwnerMember).Error
		if err != nil {
			return err
		}
		if err = tx.Model(&models.ProjectMember{}).Where("id = ?", oldOwnerMember.ID).Update("permission_level", "admin").Error; err != nil {
			return err
		}

		return nil
	})
}

func (r *projectMemberRepo) UpdateUserLastSeen(ctx context.Context, projectID, userID uuid.UUID) error {
	return r.db.WithContext(ctx).
		Model(&models.ProjectMember{}).
		Where("project_id = ? AND user_id = ?", projectID, userID).
		Update("last_seen_at", time.Now().UTC()).Error
}
