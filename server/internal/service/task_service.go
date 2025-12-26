package service

import (
	"github.com/google/uuid"
	"task-tracker/internal/dto"
	"task-tracker/internal/models"
	"task-tracker/internal/repository"
	"time"
)

type CreateTaskRequest struct {
	Title       string
	Description string
	Priority    models.TaskPriority
	DueDate     *time.Time
	ProjectID   *uuid.UUID
}

type UpdateTaskRequest struct {
	Title       string
	Description string
	Priority    models.TaskPriority
	Status      models.TaskStatus
	DueDate     *time.Time
	ProjectID   *uuid.UUID
}

type TaskService interface {
	Create(req CreateTaskRequest, userID uuid.UUID) (*models.Task, error)
	GetByID(id uuid.UUID) (*models.Task, error)
	Update(id uuid.UUID, req UpdateTaskRequest) error
	Delete(id uuid.UUID) error
	List(filter dto.TaskFilter, page, limit int) ([]models.Task, error)
	UpdateStatus(id uuid.UUID, status models.TaskStatus) error
}

type taskService struct {
	repo repository.TaskRepository
}

func NewTaskService(repo repository.TaskRepository) TaskService {
	return &taskService{repo: repo}
}

func (s *taskService) Create(req CreateTaskRequest, userID uuid.UUID) (*models.Task, error) {
	task := &models.Task{
		Title:       req.Title,
		Description: req.Description,
		Priority:    req.Priority,
		DueDate:     req.DueDate,
		UserID:      userID,
		ProjectID:   req.ProjectID,
		Status:      models.StatusTodo,
	}
	return task, s.repo.Create(task)
}

func (s *taskService) GetByID(id uuid.UUID) (*models.Task, error) {
	return s.repo.FindByID(id)
}

func (s *taskService) Update(id uuid.UUID, req UpdateTaskRequest) error {
	task, err := s.repo.FindByID(id)
	if err != nil {
		return err
	}

	if req.Title != "" {
		task.Title = req.Title
	}
	if req.Description != "" {
		task.Description = req.Description
	}
	if req.Priority != "" {
		task.Priority = req.Priority
	}
	if req.Status != "" {
		task.Status = req.Status
	}
	if req.DueDate != nil {
		task.DueDate = req.DueDate
	}
	if req.ProjectID != nil {
		task.ProjectID = req.ProjectID // nil → отвязать
	}

	return s.repo.Update(task)
}

func (s *taskService) Delete(id uuid.UUID) error {
	return s.repo.Delete(id)
}

func (s *taskService) List(filter dto.TaskFilter, page, limit int) ([]models.Task, error) {
	offset := (page - 1) * limit
	return s.repo.List(filter, limit, offset)
}

func (s *taskService) UpdateStatus(id uuid.UUID, status models.TaskStatus) error {
	task, err := s.repo.FindByID(id)
	if err != nil {
		return err
	}
	task.Status = status
	return s.repo.Update(task)
}
