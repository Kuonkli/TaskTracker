package repository

import (
	"github.com/google/uuid"
	"gorm.io/gorm"
	"task-tracker/internal/dto"
	"task-tracker/internal/models"
)

type TaskRepository interface {
	Create(task *models.Task) error
	FindByID(id uuid.UUID) (*models.Task, error)
	Update(task *models.Task) error
	Delete(id uuid.UUID) error
	List(filter dto.TaskFilter, limit, offset int) ([]models.Task, error)
}

type taskRepo struct {
	db *gorm.DB
}

func NewTaskRepository(db *gorm.DB) TaskRepository {
	return &taskRepo{db: db}
}

func (r *taskRepo) Create(task *models.Task) error {
	return r.db.Create(task).Error
}

func (r *taskRepo) FindByID(id uuid.UUID) (*models.Task, error) {
	var task models.Task
	err := r.db.Preload("Project").First(&task, "id = ?", id).Error
	return &task, err
}

func (r *taskRepo) Update(task *models.Task) error {
	return r.db.Save(task).Error
}

func (r *taskRepo) Delete(id uuid.UUID) error {
	return r.db.Delete(&models.Task{}, "id = ?", id).Error
}

func (r *taskRepo) List(filter dto.TaskFilter, limit, offset int) ([]models.Task, error) {
	var tasks []models.Task
	query := r.db.Preload("Project")

	if filter.UserID != nil {
		query = query.Where("user_id = ?", *filter.UserID)
	}
	if filter.ProjectID != nil {
		query = query.Where("project_id = ?", *filter.ProjectID)
	}
	if filter.Status != "" {
		query = query.Where("status = ?", filter.Status)
	}
	if filter.Priority != "" {
		query = query.Where("priority = ?", filter.Priority)
	}
	if filter.Search != "" {
		query = query.Where(
			"title ILIKE ? OR description ILIKE ?",
			"%"+filter.Search+"%",
			"%"+filter.Search+"%",
		)
	}

	err := query.
		Order("created_at DESC").
		Limit(limit).
		Offset(offset).
		Find(&tasks).Error

	return tasks, err
}
