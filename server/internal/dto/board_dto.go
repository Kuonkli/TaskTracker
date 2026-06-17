package dto

import (
	"github.com/google/uuid"
	"gorm.io/datatypes"
	"task-tracker/internal/models"
)

type Board struct {
	ProjectID uuid.UUID       `json:"project_id"`
	Columns   []models.Column `json:"columns"`
	Lanes     []LaneWithTasks `json:"lanes"`
}

type LaneFilter struct {
	ProjectID *uuid.UUID
	Title     string
}

// Lane DTOs
type CreateLaneRequest struct {
	Title         string  `json:"title" binding:"required,max=100"`
	Description   *string `json:"description,omitempty"`
	Color         string  `json:"color" binding:"omitempty,hexcolor"`
	RuleCondition string  `json:"rule_condition" binding:"required"`
}

type UpdateLaneRequest struct {
	Title         *string `json:"title,omitempty"`
	Description   *string `json:"description,omitempty"`
	Color         *string `json:"color,omitempty"`
	RuleCondition *string `json:"rule_condition,omitempty"`
}

type ReorderLanesRequest struct {
	Positions map[uuid.UUID]int `json:"positions" binding:"required"`
}

type LaneWithTasks struct {
	ID            uuid.UUID         `json:"id"`
	ProjectID     uuid.UUID         `json:"project_id"`
	Title         string            `json:"title"`
	Description   *string           `json:"description,omitempty"`
	Position      int               `json:"position"`
	Color         string            `json:"color"`
	RuleCondition datatypes.JSON    `json:"rule_condition"`
	Tasks         []TaskWithMetrics `json:"tasks,omitempty" binding:"required"`
}

type TaskWithMetrics struct {
	models.Task
	Metrics TaskMetrics `json:"metrics"`
}

type TaskMetrics struct {
	TaskID           uuid.UUID `json:"task_id"`
	CommentsCount    int       `gorm:"comments_count" json:"comments_count"`
	ChangesCount     int       `gorm:"column:changes_count" json:"changes_count"`
	SubtasksCount    int       `gorm:"column:subtasks_count" json:"subtasks_count"`
	AttachmentsCount int       `gorm:"column:attachments_count" json:"attachments_count"`
}

type ColumnFilter struct {
	ProjectID *uuid.UUID
	StatusID  *uuid.UUID
}

type CreateColumnRequest struct {
	StatusID uuid.UUID `json:"status_id" binding:"required"`
}

type UpdateColumnRequest struct {
	StatusID *uuid.UUID `json:"status_id,omitempty"`
	Position *int       `json:"position,omitempty"`
}

type ReorderColumnsRequest struct {
	Positions map[uuid.UUID]int `json:"positions" binding:"required"`
}
