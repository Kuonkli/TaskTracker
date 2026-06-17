package dto

import (
	"github.com/google/uuid"
	"task-tracker/internal/models"
	"time"
)

type ProjectSummary struct {
	Period          string               `json:"period"`
	StartDate       time.Time            `json:"start_date"`
	EndDate         time.Time            `json:"end_date"`
	Metrics         *SummaryMetrics      `json:"metrics"`
	Burnup          []BurnupPoint        `json:"burnup"`
	ByStatus        []StatusDistribution `json:"byStatus"`
	TopMembers      []TopMember          `json:"topMembers"`
	ByPriority      []PriorityBreakdown  `json:"byPriority"`
	Overdue         []OverdueTask        `json:"overdue"`
	CompletedByWeek []CompletedByWeek    `json:"completedByWeek"`
	RecentActivity  []RecentActivity     `json:"recentActivity,omitempty"`
}

type SummaryMetrics struct {
	Created           int     `json:"created"`
	CreatedChange     int     `json:"createdChange"`
	Active            int64   `json:"active"`
	Completed         int64   `json:"completed"`
	CompletedChange   int     `json:"completedChange"`
	AvgCompletionDays float64 `json:"avgCompletionDays"`
}

type BurnupPoint struct {
	Date      string `json:"date"`
	Created   int    `json:"created"`
	Completed int    `json:"completed"`
}

type StatusDistribution struct {
	Name  string `json:"name"`
	Color string `json:"color"`
	Count int    `json:"count"`
}

type TopMember struct {
	User         *models.User `json:"user"`
	ChangesCount int          `json:"changes_count"`
}

type PriorityBreakdown struct {
	Priority string `json:"priority"`
	Count    int    `json:"count"`
}

type OverdueTask struct {
	ID          uuid.UUID    `json:"id"`
	Title       string       `json:"title"`
	DueDate     *time.Time   `json:"due_date"`
	DaysOverdue int          `json:"days_overdue"`
	Priority    string       `json:"priority"`
	Assignee    *models.User `json:"assignee,omitempty"`
}

type CompletedByWeek struct {
	Week  string `json:"week"`
	Count int    `json:"count"`
}

type RecentActivity struct {
	Type      string    `json:"type"`
	FieldName string    `json:"field_name,omitempty"`
	TaskID    uuid.UUID `json:"task_id"`
	TaskTitle string    `json:"task_title"`
	CreatedAt time.Time `json:"created_at"`
}
