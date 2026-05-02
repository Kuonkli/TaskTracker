package service

import (
	"context"
	"encoding/json"
	"fmt"
	"github.com/google/uuid"
	"task-tracker/internal/dto"
	"task-tracker/internal/models"
	"task-tracker/internal/uow"
	"task-tracker/pkg/exceptions"
	"time"
)

type TaskService interface {
	Create(ctx context.Context, projectID, userID uuid.UUID, req dto.CreateTaskRequest) (*models.Task, error)
	Update(ctx context.Context, taskID, userID uuid.UUID, req dto.UpdateTaskRequest) error
	Delete(ctx context.Context, taskID uuid.UUID) error

	GetByID(ctx context.Context, taskID uuid.UUID) (*models.Task, error)
	List(ctx context.Context, filter dto.TaskFilter) ([]models.Task, int64, error)
	GetProjectTasks(ctx context.Context, projectID uuid.UUID) ([]models.Task, error)
	GetUserTasks(ctx context.Context, userID uuid.UUID) ([]models.Task, error)
	AddTag(ctx context.Context, taskID uuid.UUID, tagID uuid.UUID) error
	RemoveTag(ctx context.Context, taskID uuid.UUID, tagID uuid.UUID) error
}

type taskService struct {
	uowFactory uow.TaskUoWFactory
}

func NewTaskService(uowFactory uow.TaskUoWFactory) TaskService {
	return &taskService{
		uowFactory: uowFactory,
	}
}

type SubtaskInfo struct {
	ID       uuid.UUID            `json:"id"`
	Title    string               `json:"title"`
	Status   models.ProjectStatus `json:"status"`
	Priority string               `json:"priority"`
}

// Create - создание задачи с использованием проверенного контекста
func (s *taskService) Create(ctx context.Context, projectID uuid.UUID, userID uuid.UUID, req dto.CreateTaskRequest) (*models.Task, error) {
	tx, err := s.uowFactory.NewTransaction(ctx)
	if err != nil {
		return nil, err
	}
	defer func() {
		if r := recover(); r != nil {
			tx.Rollback()
			err = fmt.Errorf("panic: %v", r)
		}
	}()

	project, err := tx.ProjectRepo().GetProjectWithDetails(ctx, projectID)
	if err != nil {
		return nil, err
	}

	if req.AssigneeID != nil {
		found := false
		for _, member := range project.Members {
			if member.UserID == *req.AssigneeID {
				found = true
				break
			}
		}
		if !found {
			tx.Rollback()
			return nil, exceptions.ErrMemberNotFound
		}
	}

	if req.StatusID != nil {
		found := false
		for _, status := range project.Statuses {
			if status.ID == *req.StatusID {
				found = true
				break
			}
		}
		if !found {
			tx.Rollback()
			return nil, exceptions.ErrStatusNotFound
		}
	}

	var parentTask *models.Task
	if req.ParentTaskID != nil {
		parentTask, err = tx.TaskRepo().GetTaskWithDetails(ctx, *req.ParentTaskID)
		if err != nil {
			tx.Rollback()
			return nil, exceptions.ErrParentTaskNotFound
		}
		if parentTask.ProjectID != projectID {
			tx.Rollback()
			return nil, exceptions.ErrParentTaskNotFound
		}
		if parentTask.ParentTaskID != nil {
			tx.Rollback()
			return nil, exceptions.ErrAlreadySubtask
		}
	}

	var tags []*models.Tag
	for _, tagID := range req.TagIDs {
		found := false
		for _, tag := range project.Tags {
			if tag.ID == tagID {
				tags = append(tags, &tag)
				found = true
				break
			}
		}
		if !found {
			tx.Rollback()
			return nil, exceptions.ErrTagNotFound
		}
	}

	priority := req.Priority
	if priority == "" {
		priority = "medium"
	}

	// Создаем задачу
	task := &models.Task{
		ProjectID:    projectID,
		Title:        req.Title,
		Description:  req.Description,
		CreatorID:    userID,
		AssigneeID:   req.AssigneeID,
		StatusID:     req.StatusID,
		Priority:     priority,
		StartDate:    req.StartDate,
		DueDate:      req.DueDate,
		ParentTaskID: req.ParentTaskID,
		Tags:         tags,
	}

	if err = tx.TaskRepo().Create(ctx, task); err != nil {
		tx.Rollback()
		return nil, err
	}

	task, err = tx.TaskRepo().FindByID(ctx, task.ID)
	if err != nil {
		tx.Rollback()
		return nil, exceptions.ErrTaskNotFound
	}

	// Создаем Change
	change := &models.Change{
		TaskID:    task.ID,
		UserID:    userID,
		FieldName: "task",
		NewValue:  toJSON(task),
	}

	if err = tx.ChangeRepo().Create(ctx, change); err != nil {
		tx.Rollback()
		return nil, err
	}

	if task.ParentTaskID != nil && *task.ParentTaskID == task.ID {
		tx.Rollback()
		return nil, exceptions.ErrCircularTaskDependency
	}

	if task.ParentTaskID != nil && parentTask != nil {
		var oldSubtasks []SubtaskInfo
		for _, subtask := range parentTask.Subtasks {
			oldSubtasks = append(oldSubtasks, SubtaskInfo{ID: subtask.ID, Title: subtask.Title, Status: *subtask.Status, Priority: subtask.Priority})
		}
		newSubtasks := append(oldSubtasks, SubtaskInfo{ID: task.ID, Title: task.Title, Status: *task.Status, Priority: task.Priority})
		lastChange, err := tx.ChangeRepo().GetLastChange(ctx, parentTask.ID, "subtask")
		if err != nil {
			tx.Rollback()
			return nil, err
		}
		duration := s.calculateDuration(time.Now(), parentTask.CreatedAt, lastChange)
		change = &models.Change{
			TaskID:       parentTask.ID,
			UserID:       userID,
			FieldName:    "subtask",
			OldValue:     toJSON(oldSubtasks),
			NewValue:     toJSON(newSubtasks),
			TimeDuration: duration,
		}
		if err = tx.ChangeRepo().Create(ctx, change); err != nil {
			tx.Rollback()
			return nil, err
		}
	}

	if err = tx.Commit(ctx); err != nil {
		return nil, err
	}

	return s.GetByID(ctx, task.ID)
}

// Update - обновление задачи с использованием проверенного контекста
func (s *taskService) Update(ctx context.Context, taskID, userID uuid.UUID, req dto.UpdateTaskRequest) error {
	// Начинаем транзакцию
	tx, err := s.uowFactory.NewTransaction(ctx)
	if err != nil {
		return err
	}
	defer func() {
		if r := recover(); r != nil {
			tx.Rollback()
		}
	}()

	task, err := tx.TaskRepo().FindByID(ctx, taskID)
	if err != nil {
		return err
	}
	project, err := tx.ProjectRepo().GetProjectWithDetails(ctx, task.ProjectID)
	if err != nil {
		return err
	}

	fields := []string{"title", "description", "assignee", "status", "priority", "start_date", "due_date"}
	lastChanges := make(map[string]*models.Change)

	for _, field := range fields {
		lastChange, err := tx.ChangeRepo().GetLastChange(ctx, taskID, field)
		if err != nil {
			tx.Rollback()
			return err
		}
		if lastChange != nil {
			lastChanges[field] = lastChange
		}
	}

	// Сохраняем старые значения
	oldTitle := task.Title
	oldDescription := task.Description
	oldAssigneeID := task.AssigneeID
	oldStatusID := task.StatusID
	oldPriority := task.Priority
	oldStartDate := task.StartDate
	oldDueDate := task.DueDate

	if req.AssigneeID != nil && *req.AssigneeID != uuid.Nil {
		found := false
		for _, member := range project.Members {
			if member.UserID == *req.AssigneeID {
				found = true
				break
			}
		}
		if !found {
			tx.Rollback()
			return exceptions.ErrMemberNotFound
		}
	}

	var reqStatus models.ProjectStatus
	if req.StatusID != nil {
		found := false
		for _, status := range project.Statuses {
			if status.ID == *req.StatusID {
				reqStatus = status
				found = true
				break
			}
		}
		if !found {
			tx.Rollback()
			return exceptions.ErrStatusNotFound
		}
	}

	// Применяем изменения
	if req.Title != nil {
		task.Title = *req.Title
	}
	if req.Description != nil {
		task.Description = req.Description
	}
	if req.AssigneeID != nil {
		if *req.AssigneeID == uuid.Nil {
			task.AssigneeID = nil
		} else {
			task.AssigneeID = req.AssigneeID
		}
	}
	if req.StatusID != nil {
		if reqStatus.StatusType == "completed" || reqStatus.StatusType == "cancelled" {
			now := time.Now().UTC()
			task.ClosedAt = &now
		} else {
			task.ClosedAt = nil
		}
		task.StatusID = req.StatusID
	}
	if req.Priority != nil {
		task.Priority = *req.Priority
	}
	if req.StartDate != nil {
		task.StartDate = req.StartDate
	}
	if req.DueDate != nil {
		task.DueDate = req.DueDate
	}

	// Сохраняем задачу
	if err = tx.TaskRepo().Update(ctx, task); err != nil {
		tx.Rollback()
		return err
	}

	now := time.Now().UTC()

	// Создаем Change для каждого измененного поля
	// (код создания Change такой же, как был, только без лишних запросов к БД)

	// Title
	if req.Title != nil && *req.Title != oldTitle {
		duration := s.calculateDuration(now, task.CreatedAt, lastChanges["title"])
		change := &models.Change{
			TaskID:       taskID,
			UserID:       userID,
			FieldName:    "title",
			OldValue:     toJSON(oldTitle),
			NewValue:     toJSON(*req.Title),
			TimeDuration: duration,
			CreatedAt:    now,
		}
		if err = tx.ChangeRepo().Create(ctx, change); err != nil {
			tx.Rollback()
			return err
		}
	}

	// Description
	if req.Description != nil {
		oldDesc := ""
		if oldDescription != nil {
			oldDesc = *oldDescription
		}
		newDesc := *req.Description
		if oldDesc != newDesc {
			duration := s.calculateDuration(now, task.CreatedAt, lastChanges["description"])
			change := &models.Change{
				TaskID:       taskID,
				UserID:       userID,
				FieldName:    "description",
				OldValue:     toJSON(oldDesc),
				NewValue:     toJSON(newDesc),
				TimeDuration: duration,
				CreatedAt:    now,
			}
			if err = tx.ChangeRepo().Create(ctx, change); err != nil {
				tx.Rollback()
				return err
			}
		}
	}

	// Assignee
	if req.AssigneeID != nil {
		oldID := uuid.Nil
		if oldAssigneeID != nil {
			oldID = *oldAssigneeID
		}
		newID := *req.AssigneeID

		if oldID != newID {
			duration := s.calculateDuration(now, task.CreatedAt, lastChanges["assignee"])

			var oldUser interface{}
			if oldID != uuid.Nil {
				for _, member := range project.Members {
					if member.UserID == oldID {
						oldUser = member.User
						break
					}
				}
			}

			var newUser interface{}
			if newID != uuid.Nil {
				for _, member := range project.Members {
					if member.UserID == newID {
						newUser = member.User
						break
					}
				}
			}

			change := &models.Change{
				TaskID:       taskID,
				UserID:       userID,
				FieldName:    "assignee",
				OldValue:     toJSON(oldUser),
				NewValue:     toJSON(newUser),
				TimeDuration: duration,
				CreatedAt:    now,
			}
			if err = tx.ChangeRepo().Create(ctx, change); err != nil {
				tx.Rollback()
				return err
			}
		}
	}

	// Status
	if req.StatusID != nil {
		oldID := uuid.Nil
		if oldStatusID != nil {
			oldID = *oldStatusID
		}
		newID := *req.StatusID

		if oldID != newID {
			duration := s.calculateDuration(now, task.CreatedAt, lastChanges["status"])

			var oldStatus interface{}
			if oldID != uuid.Nil {
				for _, status := range project.Statuses {
					if status.ID == oldID {
						oldStatus = &status
						break
					}
				}
			}

			var newStatus interface{}
			for _, status := range project.Statuses {
				if status.ID == newID {
					newStatus = &status
					break
				}
			}

			change := &models.Change{
				TaskID:       taskID,
				UserID:       userID,
				FieldName:    "status",
				OldValue:     toJSON(oldStatus),
				NewValue:     toJSON(newStatus),
				TimeDuration: duration,
				CreatedAt:    now,
			}
			if err = tx.ChangeRepo().Create(ctx, change); err != nil {
				tx.Rollback()
				return err
			}
		}
	}

	// Priority
	if req.Priority != nil && *req.Priority != oldPriority {
		duration := s.calculateDuration(now, task.CreatedAt, lastChanges["priority"])
		change := &models.Change{
			TaskID:       taskID,
			UserID:       userID,
			FieldName:    "priority",
			OldValue:     toJSON(oldPriority),
			NewValue:     toJSON(*req.Priority),
			TimeDuration: duration,
			CreatedAt:    now,
		}
		if err = tx.ChangeRepo().Create(ctx, change); err != nil {
			tx.Rollback()
			return err
		}
	}

	// Start Date
	if req.StartDate != nil {
		oldDate := oldStartDate
		newDate := req.StartDate
		if (oldDate == nil && newDate != nil) || (oldDate != nil && newDate != nil && !oldDate.Equal(*newDate)) {
			duration := s.calculateDuration(now, task.CreatedAt, lastChanges["start_date"])
			change := &models.Change{
				TaskID:       taskID,
				UserID:       userID,
				FieldName:    "start_date",
				OldValue:     toJSON(oldDate),
				NewValue:     toJSON(newDate),
				TimeDuration: duration,
				CreatedAt:    now,
			}
			if err = tx.ChangeRepo().Create(ctx, change); err != nil {
				tx.Rollback()
				return err
			}
		}
	}

	// Due Date
	if req.DueDate != nil {
		oldDate := oldDueDate
		newDate := req.DueDate
		if (oldDate == nil && newDate != nil) || (oldDate != nil && newDate != nil && !oldDate.Equal(*newDate)) {
			duration := s.calculateDuration(now, task.CreatedAt, lastChanges["due_date"])
			change := &models.Change{
				TaskID:       taskID,
				UserID:       userID,
				FieldName:    "due_date",
				OldValue:     toJSON(oldDate),
				NewValue:     toJSON(newDate),
				TimeDuration: duration,
				CreatedAt:    now,
			}
			if err = tx.ChangeRepo().Create(ctx, change); err != nil {
				tx.Rollback()
				return err
			}
		}
	}

	return tx.Commit(ctx)
}

// Delete - удаление задачи с использованием проверенного контекста
func (s *taskService) Delete(ctx context.Context, taskID uuid.UUID) error {
	tx, err := s.uowFactory.NewTransaction(ctx)
	if err != nil {
		return err
	}
	defer func() {
		if r := recover(); r != nil {
			tx.Rollback()
		}
	}()

	if err = tx.TaskRepo().Delete(ctx, taskID); err != nil {
		tx.Rollback()
		return err
	}

	return tx.Commit(ctx)
}

// GetByID - чтение без транзакции
func (s *taskService) GetByID(ctx context.Context, taskID uuid.UUID) (*models.Task, error) {
	tx := s.uowFactory.New()
	return tx.TaskRepo().GetTaskWithDetails(ctx, taskID)
}

// List - список задач (чтение без транзакции)
func (s *taskService) List(ctx context.Context, filter dto.TaskFilter) ([]models.Task, int64, error) {
	tx := s.uowFactory.New()

	tasks, err := tx.TaskRepo().List(ctx, filter)
	if err != nil {
		return nil, 0, err
	}

	total, err := tx.TaskRepo().Count(ctx, filter)
	if err != nil {
		return nil, 0, err
	}

	return tasks, total, nil
}

// GetProjectTasks - чтение без транзакции
func (s *taskService) GetProjectTasks(ctx context.Context, projectID uuid.UUID) ([]models.Task, error) {
	tx := s.uowFactory.New()
	return tx.TaskRepo().FindByProjectID(ctx, projectID)
}

// GetUserTasks - чтение без транзакции
func (s *taskService) GetUserTasks(ctx context.Context, userID uuid.UUID) ([]models.Task, error) {
	tx := s.uowFactory.New()
	return tx.TaskRepo().FindByAssigneeID(ctx, userID)
}

// AddTag - добавление тега к задаче
func (s *taskService) AddTag(ctx context.Context, taskID uuid.UUID, tagID uuid.UUID) error {
	tx, err := s.uowFactory.NewTransaction(ctx)
	if err != nil {
		return err
	}
	defer func() {
		if r := recover(); r != nil {
			tx.Rollback()
		}
	}()

	// Проверяем, что задача существует
	_, err = tx.TaskRepo().FindByID(ctx, taskID)
	if err != nil {
		tx.Rollback()
		return exceptions.ErrTaskNotFound
	}

	// Добавляем тег к задаче
	if err = tx.TaskRepo().AddTagToTask(ctx, tagID, taskID); err != nil {
		tx.Rollback()
		return err
	}

	return tx.Commit(ctx)
}

// RemoveTag - удаление тега из задачи
func (s *taskService) RemoveTag(ctx context.Context, taskID uuid.UUID, tagID uuid.UUID) error {
	tx, err := s.uowFactory.NewTransaction(ctx)
	if err != nil {
		return err
	}
	defer func() {
		if r := recover(); r != nil {
			tx.Rollback()
		}
	}()

	if err = tx.TaskRepo().RemoveTagFromTask(ctx, tagID, taskID); err != nil {
		tx.Rollback()
		return err
	}

	return tx.Commit(ctx)
}

// calculateDuration - вычисляет время между изменениями
func (s *taskService) calculateDuration(now time.Time, createdAt time.Time, lastChange *models.Change) int64 {
	if lastChange != nil {
		return int64(now.Sub(lastChange.CreatedAt).Seconds())
	}
	return int64(now.Sub(createdAt).Seconds())
}

// toJSON - вспомогательная функция для Change
func toJSON(v interface{}) []byte {
	if v == nil {
		return []byte("null")
	}
	data, err := json.Marshal(v)
	if err != nil {
		return []byte("null")
	}
	return data
}
