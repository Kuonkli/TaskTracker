package dto

import (
	"github.com/google/uuid"
	"task-tracker/internal/models"
)

type RegisterRequest struct {
	Email     string `json:"email" binding:"required,email"`
	Password  string `json:"password" binding:"required,min=6"`
	FirstName string `json:"first_name" binding:"required"`
	LastName  string `json:"last_name" binding:"required"`
}

type LoginRequest struct {
	Email    string `json:"email" binding:"required,email"`
	Password string `json:"password" binding:"required"`
}

type UpdateProfileRequest struct {
	FirstName string `json:"first_name"`
	LastName  string `json:"last_name"`
}

type ListProjectsResponse struct {
	*models.Project     // Встраиваем всю структуру Project
	TotalTasks      int `json:"total_tasks"`
	CompletedTasks  int `json:"completed_tasks"`
}

type TaskFilter struct {
	UserID    *uuid.UUID
	ProjectID *uuid.UUID
	Status    models.TaskStatus
	Priority  models.TaskPriority
	Search    string
}
