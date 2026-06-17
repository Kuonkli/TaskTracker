package repository

import (
	"context"
	"github.com/google/uuid"
	"gorm.io/gorm"
	"task-tracker/internal/dto"
	"task-tracker/internal/models"
)

type ProjectStatusRepository interface {
	Create(ctx context.Context, status *models.ProjectStatus) error
	FindByID(ctx context.Context, id uuid.UUID) (*models.ProjectStatus, error)
	Update(ctx context.Context, status *models.ProjectStatus) error
	Delete(ctx context.Context, id uuid.UUID) error
	List(ctx context.Context, filter dto.ProjectStatusFilter, limit, offset int) ([]models.ProjectStatus, error)
	FindByProjectID(ctx context.Context, projectID uuid.UUID) ([]models.ProjectStatus, error)
	FindByType(ctx context.Context, projectID uuid.UUID, statusType string) ([]models.ProjectStatus, error)
}

type projectStatusRepo struct {
	db *gorm.DB
}

func NewProjectStatusRepository(db *gorm.DB) ProjectStatusRepository {
	return &projectStatusRepo{db: db}
}

func (r *projectStatusRepo) Create(ctx context.Context, status *models.ProjectStatus) error {
	return r.db.WithContext(ctx).Create(status).Error
}

func (r *projectStatusRepo) FindByID(ctx context.Context, id uuid.UUID) (*models.ProjectStatus, error) {
	var status models.ProjectStatus
	err := r.db.WithContext(ctx).Preload("Project").First(&status, "id = ?", id).Error
	return &status, err
}

func (r *projectStatusRepo) Update(ctx context.Context, status *models.ProjectStatus) error {
	return r.db.WithContext(ctx).Save(status).Error
}

func (r *projectStatusRepo) Delete(ctx context.Context, id uuid.UUID) error {
	return r.db.WithContext(ctx).Delete(&models.ProjectStatus{}, "id = ?", id).Error
}

func (r *projectStatusRepo) List(ctx context.Context, filter dto.ProjectStatusFilter, limit, offset int) ([]models.ProjectStatus, error) {
	var statuses []models.ProjectStatus
	query := r.db.WithContext(ctx).Preload("Project")

	if filter.ProjectID != nil {
		query = query.Where("project_id = ?", *filter.ProjectID)
	}
	if filter.StatusType != "" {
		query = query.Where("status_type = ?", filter.StatusType)
	}
	if filter.Name != "" {
		query = query.Where("name ILIKE ?", "%"+filter.Name+"%")
	}

	err := query.
		Order("created_at ASC").
		Limit(limit).
		Offset(offset).
		Find(&statuses).Error

	return statuses, err
}

func (r *projectStatusRepo) FindByProjectID(ctx context.Context, projectID uuid.UUID) ([]models.ProjectStatus, error) {
	var statuses []models.ProjectStatus
	err := r.db.WithContext(ctx).Where("project_id = ?", projectID).Order("created_at ASC").Find(&statuses).Error
	return statuses, err
}

func (r *projectStatusRepo) FindByType(ctx context.Context, projectID uuid.UUID, statusType string) ([]models.ProjectStatus, error) {
	var statuses []models.ProjectStatus
	err := r.db.WithContext(ctx).Where("project_id = ? AND status_type = ?", projectID, statusType).Find(&statuses).Error
	return statuses, err
}
