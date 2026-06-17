package repository

import (
	"context"
	"github.com/google/uuid"
	"gorm.io/gorm"
	"task-tracker/internal/dto"
	"task-tracker/internal/models"
)

type TagRepository interface {
	Create(ctx context.Context, tag *models.Tag) error
	FindByID(ctx context.Context, id uuid.UUID) (*models.Tag, error)
	Delete(ctx context.Context, id uuid.UUID) error
	List(ctx context.Context, filter dto.TagFilter, limit, offset int) ([]models.Tag, error)
	FindByProjectID(ctx context.Context, projectID uuid.UUID) ([]models.Tag, error)
}

type tagRepo struct {
	db *gorm.DB
}

func NewTagRepository(db *gorm.DB) TagRepository {
	return &tagRepo{db: db}
}

func (r *tagRepo) Create(ctx context.Context, tag *models.Tag) error {
	return r.db.WithContext(ctx).Create(tag).Error
}

func (r *tagRepo) FindByID(ctx context.Context, id uuid.UUID) (*models.Tag, error) {
	var tag models.Tag
	err := r.db.WithContext(ctx).Preload("Project").First(&tag, "id = ?", id).Error
	return &tag, err
}

func (r *tagRepo) Delete(ctx context.Context, id uuid.UUID) error {
	return r.db.WithContext(ctx).Delete(&models.Tag{}, "id = ?", id).Error
}

func (r *tagRepo) List(ctx context.Context, filter dto.TagFilter, limit, offset int) ([]models.Tag, error) {
	var tags []models.Tag
	query := r.db.WithContext(ctx).Preload("Project")

	if filter.ProjectID != nil {
		query = query.Where("project_id = ?", *filter.ProjectID)
	}
	if filter.Title != "" {
		query = query.Where("title ILIKE ?", "%"+filter.Title+"%")
	}

	err := query.
		Order("title ASC").
		Limit(limit).
		Offset(offset).
		Find(&tags).Error

	return tags, err
}

func (r *tagRepo) FindByProjectID(ctx context.Context, projectID uuid.UUID) ([]models.Tag, error) {
	var tags []models.Tag
	err := r.db.WithContext(ctx).Where("project_id = ?", projectID).Order("title ASC").Find(&tags).Error
	return tags, err
}
