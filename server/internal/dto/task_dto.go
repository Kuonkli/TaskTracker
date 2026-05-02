package dto

import (
	"fmt"
	"github.com/google/uuid"
	"strings"
	"time"
)

type CreateTaskRequest struct {
	Title        string      `json:"title" binding:"required,max=255"`
	Description  *string     `json:"description,omitempty" binding:"omitempty,max=5000"`
	AssigneeID   *uuid.UUID  `json:"assignee_id,omitempty"`
	StatusID     *uuid.UUID  `json:"status_id,omitempty" binding:"required"`
	Priority     string      `json:"priority,omitempty" binding:"omitempty,oneof=low medium high critical"`
	StartDate    *time.Time  `json:"start_date,omitempty"`
	DueDate      *time.Time  `json:"due_date,omitempty" binding:"omitempty,gtfield=StartDate"`
	ParentTaskID *uuid.UUID  `json:"parent_task_id,omitempty"`
	TagIDs       []uuid.UUID `json:"tag_ids,omitempty" binding:"omitempty,dive,uuid"`
}

type UpdateTaskRequest struct {
	Title       *string    `json:"title,omitempty" binding:"omitempty,max=255"`
	Description *string    `json:"description,omitempty" binding:"omitempty,max=5000"`
	AssigneeID  *uuid.UUID `json:"assignee_id,omitempty"`
	StatusID    *uuid.UUID `json:"status_id,omitempty"`
	Priority    *string    `json:"priority,omitempty" binding:"omitempty,oneof=low medium high critical"`
	StartDate   *time.Time `json:"start_date,omitempty"`
	DueDate     *time.Time `json:"due_date,omitempty" binding:"omitempty,gtfield=StartDate"`
}

// QueryFilter - структура для парсинга query параметров из URL
type QueryFilter struct {
	// Основные фильтры
	CreatorID  string `form:"creatorId"`
	AssigneeID string `form:"assigneeId"`
	StatusID   string `form:"statusId"`
	Priority   string `form:"priority"`
	Search     string `form:"search"`

	// Множественный выбор (формат: priorities=low,medium,high)
	StatusIDsStr  string `form:"statusIds"`  // example: "id1,id2,id3"
	PrioritiesStr string `form:"priorities"` // example: "low,medium,high"
	TagIDsStr     string `form:"tagIds"`     // example: "id1,id2,id3"

	// Фильтр по родительской задаче
	ParentTaskIDStr string `form:"parentTaskId"`
	IsSubtaskStr    string `form:"isSubtask"` // "true" или "false"

	// Диапазоны дат (формат: "2024-01-01/2024-12-31")
	CreatedAtRange string `form:"createdAt"` // example: "2024-01-01/2024-12-31"
	StartDateRange string `form:"startDate"` // example: "2024-01-01/2024-12-31"
	DueDateRange   string `form:"dueDate"`   // example: "2024-01-01/2024-12-31"
	ClosedAtRange  string `form:"closedAt"`  // example: "2024-01-01/2024-12-31"

	// Сортировка
	SortField string `form:"sortField"` // created_at, priority, start_date, due_date
	SortOrder string `form:"sortOrder"` // ASC, DESC

	// Пагинация
	Page int `form:"page"` // номер страницы (начиная с 1)
	Len  int `form:"len"`  // количество задач на странице
}

// TaskFilter - финальная структура для использования в репозитории
type TaskFilter struct {
	ProjectID    *uuid.UUID
	CreatorID    *uuid.UUID
	AssigneeID   *uuid.UUID
	IsUnassigned bool
	IsAssigned   bool
	StatusID     *uuid.UUID
	Priority     string
	Search       string

	// Множественный выбор
	StatusIDs  []uuid.UUID
	Priorities []string
	TagIDs     []uuid.UUID

	// Фильтр по родительской задаче
	ParentTaskID *uuid.UUID
	IsSubtask    *bool

	// Диапазоны дат
	CreatedAtFrom *time.Time
	CreatedAtTo   *time.Time
	StartDateFrom *time.Time
	StartDateTo   *time.Time
	DueDateFrom   *time.Time
	DueDateTo     *time.Time
	ClosedAtFrom  *time.Time
	ClosedAtTo    *time.Time

	// Сортировка
	SortField string
	SortOrder string

	// Пагинация
	Limit  int
	Offset int
}

func parseUUID(uuidStr string) (*uuid.UUID, error) {
	if uuidStr == "" {
		return nil, nil
	}
	id, err := uuid.Parse(uuidStr)
	if err != nil {
		return nil, err
	}
	return &id, nil
}

// Parse - парсит QueryFilter в TaskFilter
func (qf *QueryFilter) Parse() (*TaskFilter, error) {
	CreatorUUID, err := parseUUID(qf.CreatorID)
	if err != nil && qf.CreatorID != "" {
		return nil, err
	}
	StatusUUID, err := parseUUID(qf.StatusID)
	if err != nil {
		return nil, err
	}

	tf := &TaskFilter{
		CreatorID: CreatorUUID,
		StatusID:  StatusUUID,
		Priority:  qf.Priority,
		Search:    qf.Search,
		SortField: qf.SortField,
		SortOrder: qf.SortOrder,
	}

	switch qf.AssigneeID {
	case "null":
		tf.IsUnassigned = true
		tf.IsAssigned = false
	case "notnull":
		tf.IsAssigned = true
		tf.IsUnassigned = false
	default:
		AssigneeUUID, err := parseUUID(qf.AssigneeID)
		if err != nil {
			return nil, fmt.Errorf("invalid assigneeId: %w", err)
		}
		tf.AssigneeID = AssigneeUUID
	}

	// Устанавливаем значения по умолчанию для сортировки
	if tf.SortField == "" {
		tf.SortField = "created_at"
	}
	if tf.SortOrder == "" {
		tf.SortOrder = "DESC"
	}

	// Вычисляем limit и offset из page и len
	page := qf.Page
	length := qf.Len

	if page < 1 {
		page = 1
	}
	if length < 1 {
		length = 20 // значение по умолчанию
	}
	if length > 100 {
		length = 100 // максимальное значение
	}

	tf.Limit = length
	tf.Offset = (page - 1) * length

	// Парсим множественные статусы
	if qf.StatusIDsStr != "" {
		ids := strings.Split(qf.StatusIDsStr, ",")
		for _, idStr := range ids {
			if id, err := uuid.Parse(strings.TrimSpace(idStr)); err == nil {
				tf.StatusIDs = append(tf.StatusIDs, id)
			}
		}
	}

	// Парсим множественные приоритеты
	if qf.PrioritiesStr != "" {
		priorities := strings.Split(qf.PrioritiesStr, ",")
		for _, p := range priorities {
			trimmed := strings.TrimSpace(p)
			if trimmed != "" {
				tf.Priorities = append(tf.Priorities, trimmed)
			}
		}
	}

	// Парсим множественные теги
	if qf.TagIDsStr != "" {
		ids := strings.Split(qf.TagIDsStr, ",")
		for _, idStr := range ids {
			if id, err := uuid.Parse(strings.TrimSpace(idStr)); err == nil {
				tf.TagIDs = append(tf.TagIDs, id)
			}
		}
	}

	// Парсим parent_task_id
	if qf.ParentTaskIDStr != "" {
		if id, err := uuid.Parse(qf.ParentTaskIDStr); err == nil {
			tf.ParentTaskID = &id
		}
	}

	// Парсим is_subtask
	if qf.IsSubtaskStr != "" {
		isSubtask := qf.IsSubtaskStr == "true"
		tf.IsSubtask = &isSubtask
	}

	// Парсим диапазоны дат (формат: "2024-01-01/2024-12-31")
	tf.CreatedAtFrom, tf.CreatedAtTo, err = parseDateRange(qf.CreatedAtRange)
	if err != nil {
		return nil, err
	}

	tf.StartDateFrom, tf.StartDateTo, err = parseDateRange(qf.StartDateRange)
	if err != nil {
		return nil, err
	}

	tf.DueDateFrom, tf.DueDateTo, err = parseDateRange(qf.DueDateRange)
	if err != nil {
		return nil, err
	}

	tf.ClosedAtFrom, tf.ClosedAtTo, err = parseDateRange(qf.ClosedAtRange)
	if err != nil {
		return nil, err
	}

	return tf, nil
}

// parseDateRange парсит строку вида "2024-01-01/2024-12-31" в два времени
func parseDateRange(rangeStr string) (*time.Time, *time.Time, error) {
	if rangeStr == "" {
		return nil, nil, nil
	}

	parts := strings.Split(rangeStr, "/")
	if len(parts) != 2 {
		return nil, nil, nil
	}

	var from, to *time.Time

	if parts[0] != "" {
		t, err := time.Parse("2006-01-02", strings.TrimSpace(parts[0]))
		if err == nil {
			from = &t
		}
	}

	if parts[1] != "" {
		t, err := time.Parse("2006-01-02", strings.TrimSpace(parts[1]))
		if err == nil {
			// Устанавливаем время на конец дня для to
			endOfDay := time.Date(t.Year(), t.Month(), t.Day(), 23, 59, 59, 999999999, t.Location())
			to = &endOfDay
		}
	}

	return from, to, nil
}
