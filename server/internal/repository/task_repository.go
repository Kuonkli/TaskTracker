package repository

import (
	"context"
	"github.com/google/uuid"
	"gorm.io/gorm"
	"strings"
	"task-tracker/internal/dto"
	"task-tracker/internal/models"
)

type TaskRepository interface {
	// Базовые CRUD
	Create(ctx context.Context, task *models.Task) error
	FindByID(ctx context.Context, id uuid.UUID) (*models.Task, error)
	Update(ctx context.Context, task *models.Task) error
	Delete(ctx context.Context, id uuid.UUID) error

	// Списки
	List(ctx context.Context, filter dto.TaskFilter) ([]models.Task, error)
	Count(ctx context.Context, filter dto.TaskFilter) (int64, error)

	// Специальные выборки
	FindByProjectID(ctx context.Context, projectID uuid.UUID) ([]models.Task, error)
	FindByAssigneeID(ctx context.Context, assigneeID uuid.UUID) ([]models.Task, error)
	FindByCreatorID(ctx context.Context, creatorID uuid.UUID) ([]models.Task, error)
	FindByStatusID(ctx context.Context, statusID uuid.UUID) ([]models.Task, error)
	FindSubtasks(ctx context.Context, parentTaskID uuid.UUID) ([]models.Task, error)
	GetTaskWithDetails(ctx context.Context, id uuid.UUID) (*models.Task, error)
	GetOverdueTasks(ctx context.Context, projectID uuid.UUID) ([]models.Task, error)
	AddTagToTask(ctx context.Context, tagID, taskID uuid.UUID) error
	RemoveTagFromTask(ctx context.Context, tagID, taskID uuid.UUID) error
}

type taskRepo struct {
	db *gorm.DB
}

func NewTaskRepository(db *gorm.DB) TaskRepository {
	return &taskRepo{db: db}
}

func (r *taskRepo) Create(ctx context.Context, task *models.Task) error {
	return r.db.WithContext(ctx).Create(task).Error
}

func (r *taskRepo) FindByID(ctx context.Context, id uuid.UUID) (*models.Task, error) {
	var task models.Task
	err := r.db.WithContext(ctx).
		Preload("Project").
		Preload("Creator").
		Preload("Assignee").
		Preload("Status").
		Preload("ParentTask").
		Preload("Tags").
		First(&task, "id = ?", id).Error
	return &task, err
}

func (r *taskRepo) Update(ctx context.Context, task *models.Task) error {
	return r.db.WithContext(ctx).
		Model(&models.Task{}).
		Where("id = ?", task.ID).
		Select("title", "description", "assignee_id", "status_id", "status_changed_at", "priority", "start_date", "due_date", "closed_at").
		Updates(task).Error
}

func (r *taskRepo) Delete(ctx context.Context, id uuid.UUID) error {
	return r.db.WithContext(ctx).Delete(&models.Task{}, "id = ?", id).Error
}

func (r *taskRepo) List(ctx context.Context, filter dto.TaskFilter) ([]models.Task, error) {
	var tasks []models.Task
	query := r.db.WithContext(ctx).
		Preload("Project").
		Preload("Creator").
		Preload("Assignee").
		Preload("Status").
		Preload("Tags")

	// Применяем все фильтры (те же что и раньше)
	query = r.applyFilters(query, filter)

	// Применяем сортировку
	query = r.applyOrdering(query, filter)

	if len(filter.TagIDs) > 0 {
		groupFields := []string{"tasks.id"}

		if filter.SortField == "status" {
			groupFields = append(groupFields, "project_statuses.status_type")
		}

		query = query.Group(strings.Join(groupFields, ", "))
	}

	// Применяем пагинацию
	if filter.Limit > 0 {
		query = query.Limit(filter.Limit)
	}
	if filter.Offset > 0 {
		query = query.Offset(filter.Offset)
	}

	err := query.Find(&tasks).Error
	return tasks, err
}

func (r *taskRepo) Count(ctx context.Context, filter dto.TaskFilter) (int64, error) {
	var count int64
	query := r.db.WithContext(ctx).Model(&models.Task{})
	query = r.applyFilters(query, filter)

	err := query.Count(&count).Error
	return count, err
}

// applyFilters применяет все фильтры к query
func (r *taskRepo) applyFilters(query *gorm.DB, filter dto.TaskFilter) *gorm.DB {
	if filter.ProjectID != nil {
		query = query.Where("tasks.project_id = ?", *filter.ProjectID)
	}
	if filter.CreatorID != nil {
		query = query.Where("tasks.creator_id = ?", *filter.CreatorID)
	}

	if filter.IsUnassigned {
		query = query.Where("tasks.assignee_id IS NULL")
	} else if filter.IsAssigned {
		query = query.Where("tasks.assignee_id IS NOT NULL")
	} else if filter.AssigneeID != nil {
		query = query.Where("tasks.assignee_id = ?", *filter.AssigneeID)
	}

	if len(filter.StatusIDs) > 0 {
		query = query.Where("tasks.status_id IN ?", filter.StatusIDs)
	} else if filter.StatusID != nil {
		query = query.Where("tasks.status_id = ?", *filter.StatusID)
	}
	if len(filter.Priorities) > 0 {
		query = query.Where("tasks.priority IN ?", filter.Priorities)
	} else if filter.Priority != "" {
		query = query.Where("tasks.priority = ?", filter.Priority)
	}
	if len(filter.TagIDs) > 0 {
		query = query.Joins("JOIN task_tags ON task_tags.task_id = tasks.id").
			Where("task_tags.tag_id IN ?", filter.TagIDs)
	}
	if filter.ParentTaskID != nil {
		query = query.Where("tasks.parent_task_id = ?", *filter.ParentTaskID)
	}
	if filter.IsSubtask != nil {
		if *filter.IsSubtask {
			query = query.Where("tasks.parent_task_id IS NOT NULL")
		} else {
			query = query.Where("tasks.parent_task_id IS NULL")
		}
	}
	if filter.CreatedAtFrom != nil {
		query = query.Where("tasks.created_at >= ?", filter.CreatedAtFrom)
	}
	if filter.CreatedAtTo != nil {
		query = query.Where("tasks.created_at <= ?", filter.CreatedAtTo)
	}
	if filter.StartDateFrom != nil {
		query = query.Where("tasks.start_date >= ?", filter.StartDateFrom)
	}
	if filter.StartDateTo != nil {
		query = query.Where("tasks.start_date <= ?", filter.StartDateTo)
	}
	if filter.DueDateFrom != nil {
		query = query.Where("tasks.due_date >= ?", filter.DueDateFrom)
	}
	if filter.DueDateTo != nil {
		query = query.Where("tasks.due_date <= ?", filter.DueDateTo)
	}
	if filter.IsOpened {
		query = query.Where("tasks.closed_at IS NULL")
	}
	if filter.IsClosed {
		query = query.Where("tasks.closed_at IS NOT NULL")
	}
	if filter.ClosedAtFrom != nil {
		query = query.Where("tasks.closed_at >= ?", filter.ClosedAtFrom)
	}
	if filter.ClosedAtTo != nil {
		query = query.Where("tasks.closed_at <= ?", filter.ClosedAtTo)
	}
	if filter.Search != "" {
		query = query.Where("tasks.title ILIKE ? OR tasks.description ILIKE ?", "%"+filter.Search+"%", "%"+filter.Search+"%")
	}

	return query
}

func (r *taskRepo) applyOrdering(query *gorm.DB, filter dto.TaskFilter) *gorm.DB {
	if filter.SortField == "" {
		return query.Order("tasks.created_at DESC")
	}

	// Карта для маппинга полей сортировки в SQL выражения
	orderExpressions := map[string]string{
		"priority": `CASE tasks.priority
            WHEN 'critical' THEN 1
            WHEN 'high' THEN 2
            WHEN 'medium' THEN 3
            WHEN 'low' THEN 4
            ELSE 5
        END`,
		"status": `CASE project_statuses.status_type
            WHEN 'backlog' THEN 1
            WHEN 'todo' THEN 2
            WHEN 'paused' THEN 3
            WHEN 'progress' THEN 4
            WHEN 'completed' THEN 5
            ELSE 6
        END`,
		"start_date": "tasks.start_date",
		"due_date":   "tasks.due_date",
		"created_at": "tasks.created_at",
		"title":      "tasks.title",
	}

	orderExpr, ok := orderExpressions[filter.SortField]
	if !ok {
		orderExpr = "tasks." + filter.SortField
	}

	orderDirection := "ASC"
	if filter.SortOrder == "DESC" {
		orderDirection = "DESC"
	}

	// Для status нужно JOIN со статусами
	if filter.SortField == "status" {
		query = query.Joins("LEFT JOIN project_statuses ON project_statuses.id = tasks.status_id")
	}

	return query.Order(orderExpr + " " + orderDirection)
}

func (r *taskRepo) FindByProjectID(ctx context.Context, projectID uuid.UUID) ([]models.Task, error) {
	var tasks []models.Task
	err := r.db.WithContext(ctx).
		Preload("Creator").
		Preload("Assignee").
		Preload("Status").
		Preload("Tags").
		Where("project_id = ?", projectID).
		Order("created_at DESC").
		Find(&tasks).Error
	return tasks, err
}

func (r *taskRepo) FindByAssigneeID(ctx context.Context, assigneeID uuid.UUID) ([]models.Task, error) {
	var tasks []models.Task
	err := r.db.WithContext(ctx).
		Preload("Project").
		Preload("Creator").
		Preload("Status").
		Preload("Tags").
		Where("assignee_id = ?", assigneeID).
		Order("due_date ASC, created_at DESC").
		Find(&tasks).Error
	return tasks, err
}

func (r *taskRepo) FindByCreatorID(ctx context.Context, creatorID uuid.UUID) ([]models.Task, error) {
	var tasks []models.Task
	err := r.db.WithContext(ctx).
		Preload("Project").
		Preload("Assignee").
		Preload("Status").
		Preload("Tags").
		Where("creator_id = ?", creatorID).
		Order("created_at DESC").
		Find(&tasks).Error
	return tasks, err
}

func (r *taskRepo) FindByStatusID(ctx context.Context, statusID uuid.UUID) ([]models.Task, error) {
	var tasks []models.Task
	err := r.db.WithContext(ctx).
		Preload("Project").
		Preload("Creator").
		Preload("Assignee").
		Preload("Tags").
		Where("status_id = ?", statusID).
		Order("created_at DESC").
		Find(&tasks).Error
	return tasks, err
}

func (r *taskRepo) FindSubtasks(ctx context.Context, parentTaskID uuid.UUID) ([]models.Task, error) {
	var subtasks []models.Task
	err := r.db.WithContext(ctx).
		Preload("Creator").
		Preload("Assignee").
		Preload("Status").
		Preload("Tags").
		Where("parent_task_id = ?", parentTaskID).
		Order("created_at ASC").
		Find(&subtasks).Error
	return subtasks, err
}

func (r *taskRepo) GetTaskWithDetails(ctx context.Context, id uuid.UUID) (*models.Task, error) {
	var task models.Task
	err := r.db.WithContext(ctx).
		Preload("Project").
		Preload("Project.Owner").
		Preload("Creator").
		Preload("Assignee").
		Preload("Status").
		Preload("ParentTask").
		Preload("Subtasks").
		Preload("Subtasks.Creator").
		Preload("Subtasks.Assignee").
		Preload("Subtasks.Status").
		Preload("Tags").
		Preload("Attachments").
		Preload("Attachments.Uploader").
		First(&task, "id = ?", id).Error
	return &task, err
}

func (r *taskRepo) GetOverdueTasks(ctx context.Context, projectID uuid.UUID) ([]models.Task, error) {
	var tasks []models.Task
	err := r.db.WithContext(ctx).
		Preload("Project").
		Preload("Creator").
		Preload("Assignee").
		Preload("Status").
		Where("project_id = ? AND due_date < NOW() AND closed_at IS NULL", projectID).
		Order("due_date ASC").
		Find(&tasks).Error
	return tasks, err
}

func (r *taskRepo) AddTagToTask(ctx context.Context, tagID, taskID uuid.UUID) error {
	return r.db.WithContext(ctx).Exec("INSERT INTO task_tags (task_id, tag_id) VALUES (?, ?) ON CONFLICT DO NOTHING", taskID, tagID).Error
}

func (r *taskRepo) RemoveTagFromTask(ctx context.Context, tagID, taskID uuid.UUID) error {
	return r.db.WithContext(ctx).Exec(`DELETE FROM task_tags WHERE task_id = ? AND tag_id = ?`, taskID, tagID).Error
}
