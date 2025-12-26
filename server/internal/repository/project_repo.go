package repository

import (
	"github.com/google/uuid"
	"gorm.io/gorm"
	"task-tracker/internal/dto"
	"task-tracker/internal/models"
)

type ProjectRepository interface {
	Create(project *models.Project) error
	FindByID(id uuid.UUID) (*models.Project, error)
	Update(project *models.Project) error
	Delete(id uuid.UUID) error
	List(userID uuid.UUID, limit, offset int) ([]dto.ListProjectsResponse, error)
}

type projectRepo struct {
	db *gorm.DB
}

func NewProjectRepository(db *gorm.DB) ProjectRepository {
	return &projectRepo{db: db}
}

func (r *projectRepo) Create(project *models.Project) error {
	return r.db.Create(project).Error
}

func (r *projectRepo) FindByID(id uuid.UUID) (*models.Project, error) {
	var project models.Project
	err := r.db.Preload("Tasks").First(&project, "id = ?", id).Error
	return &project, err
}

func (r *projectRepo) Update(project *models.Project) error {
	return r.db.Save(project).Error
}

func (r *projectRepo) Delete(id uuid.UUID) error {
	// Начинаем транзакцию
	tx := r.db.Begin()

	// Сначала удаляем все задачи проекта
	if err := tx.Where("project_id = ?", id).Delete(&models.Task{}).Error; err != nil {
		tx.Rollback()
		return err
	}

	// Затем удаляем сам проект
	if err := tx.Delete(&models.Project{}, "id = ?", id).Error; err != nil {
		tx.Rollback()
		return err
	}

	// Коммитим транзакцию
	return tx.Commit().Error
}

func (r *projectRepo) List(userID uuid.UUID, limit, offset int) ([]dto.ListProjectsResponse, error) {
	var projects []dto.ListProjectsResponse

	err := r.db.Model(&models.Project{}).
		Select(`
        projects.*,
        COUNT(tasks.id) as total_tasks,
        SUM(CASE WHEN tasks.status = 'done' THEN 1 ELSE 0 END) as completed_tasks
    `).
		Joins("LEFT JOIN tasks ON tasks.project_id = projects.id").
		Where("projects.user_id = ?", userID).
		Group("projects.id").
		Order("projects.created_at DESC").
		Limit(limit).Offset(offset).
		Scan(&projects).Error

	return projects, err
}
