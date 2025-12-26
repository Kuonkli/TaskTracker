package service

import (
	"github.com/google/uuid"
	"task-tracker/internal/dto"
	"task-tracker/internal/models"
	"task-tracker/internal/repository"
)

type CreateProjectRequest struct {
	Name        string
	Description string
	Color       string
}

type UpdateProjectRequest struct {
	Name        string
	Description string
	Color       string
}

type ProjectService interface {
	Create(req CreateProjectRequest, userID uuid.UUID) (*models.Project, error)
	GetByID(id uuid.UUID) (*models.Project, error)
	Update(id uuid.UUID, req UpdateProjectRequest) error
	Delete(id uuid.UUID) error
	List(userID uuid.UUID, page, limit int) ([]dto.ListProjectsResponse, error)
}

type projectService struct {
	repo     repository.ProjectRepository
	userRepo repository.UserRepository
}

func NewProjectService(repo repository.ProjectRepository, userRepo repository.UserRepository) ProjectService {
	return &projectService{
		repo:     repo,
		userRepo: userRepo,
	}
}

func (s *projectService) Create(req CreateProjectRequest, userID uuid.UUID) (*models.Project, error) {
	project := &models.Project{
		Name:        req.Name,
		Description: req.Description,
		Color:       req.Color,
		UserID:      userID,
	}

	err := s.repo.Create(project)
	return project, err
}

func (s *projectService) GetByID(id uuid.UUID) (*models.Project, error) {
	return s.repo.FindByID(id)
}

func (s *projectService) Update(id uuid.UUID, req UpdateProjectRequest) error {
	project, err := s.repo.FindByID(id)
	if err != nil {
		return err
	}

	if req.Name != "" {
		project.Name = req.Name
	}
	if req.Description != "" {
		project.Description = req.Description
	}
	if req.Color != "" {
		project.Color = req.Color
	}

	return s.repo.Update(project)
}

func (s *projectService) Delete(id uuid.UUID) error {
	return s.repo.Delete(id)
}

func (s *projectService) List(userID uuid.UUID, page, limit int) ([]dto.ListProjectsResponse, error) {
	offset := (page - 1) * limit
	return s.repo.List(userID, limit, offset)
}
