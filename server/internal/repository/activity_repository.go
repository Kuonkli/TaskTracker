package repository

import (
	"context"
	"encoding/json"
	"fmt"
	"github.com/google/uuid"
	"gorm.io/gorm"
	"task-tracker/internal/dto"
	"task-tracker/internal/models"
	"time"
)

type ActivityRepository interface {
	GetTaskActivities(ctx context.Context, projectID, taskID uuid.UUID, limit int, offset int) ([]dto.ActivityItem, int64, error)
	GetProjectActivities(ctx context.Context, projectID uuid.UUID, limit, offset int) ([]dto.ActivityItem, int64, error)
	GetUserActivities(ctx context.Context, projectID, userID uuid.UUID, limit, offset int) ([]dto.ActivityItem, int64, error)
}

type activityRepository struct {
	db *gorm.DB
}

func NewActivityRepository(db *gorm.DB) ActivityRepository {
	return &activityRepository{db: db}
}

type flatActivityItem struct {
	ID        string     `gorm:"id" json:"id"`
	Type      string     `gorm:"record_type" json:"record_type"`
	CreatedAt time.Time  `gorm:"created_at" json:"created_at"`
	UserID    *uuid.UUID `gorm:"user_id" json:"user_id"`
	TaskID    *uuid.UUID `gorm:"task_id" json:"task_id"`

	// Comment fields
	CommentID *uuid.UUID `gorm:"column:comment_id"`
	Content   *string    `gorm:"column:content"`

	// Change fields
	ChangeID     *uuid.UUID `gorm:"column:change_id"`
	FieldName    *string    `gorm:"column:field_name"`
	OldValue     *string    `gorm:"column:old_value"`
	NewValue     *string    `gorm:"column:new_value"`
	Description  *string    `gorm:"column:description"`
	TimeDuration *int64     `gorm:"column:time_duration"`
}

// extractUniqueIDs извлекает уникальные ID из слайса
func extractUniqueIDs[T any](items []T, getID func(T) *uuid.UUID) []uuid.UUID {
	seen := make(map[uuid.UUID]bool)
	result := make([]uuid.UUID, 0)

	for _, item := range items {
		id := getID(item)
		if id != nil && !seen[*id] {
			seen[*id] = true
			result = append(result, *id)
		}
	}
	return result
}

// loadUsers загружает пользователей по ID и возвращает map
func (r *activityRepository) loadUsers(ctx context.Context, userIDs []uuid.UUID) (map[uuid.UUID]*models.User, error) {
	if len(userIDs) == 0 {
		return make(map[uuid.UUID]*models.User), nil
	}

	var users []models.User
	err := r.db.WithContext(ctx).Where("id IN ?", userIDs).Find(&users).Error
	if err != nil {
		return nil, err
	}

	userMap := make(map[uuid.UUID]*models.User, len(users))
	for i := range users {
		userMap[users[i].ID] = &users[i]
	}
	return userMap, nil
}

// loadTasks загружает задачи по ID и возвращает map
func (r *activityRepository) loadTasks(ctx context.Context, taskIDs []uuid.UUID) (map[uuid.UUID]*models.Task, error) {
	if len(taskIDs) == 0 {
		return make(map[uuid.UUID]*models.Task), nil
	}

	var tasks []models.Task
	err := r.db.WithContext(ctx).Where("id IN ?", taskIDs).Find(&tasks).Error
	if err != nil {
		return nil, err
	}

	taskMap := make(map[uuid.UUID]*models.Task, len(tasks))
	for i := range tasks {
		taskMap[tasks[i].ID] = &tasks[i]
	}
	return taskMap, nil
}

// loadAttachments загружает вложения для комментариев
func (r *activityRepository) loadAttachments(ctx context.Context, commentIDs []uuid.UUID) (map[uuid.UUID][]models.Attachment, error) {
	if len(commentIDs) == 0 {
		return make(map[uuid.UUID][]models.Attachment), nil
	}

	var attachments []models.Attachment
	err := r.db.WithContext(ctx).Where("comment_id IN ?", commentIDs).Find(&attachments).Error
	if err != nil {
		return nil, err
	}

	attachmentsMap := make(map[uuid.UUID][]models.Attachment)
	for _, att := range attachments {
		if att.CommentID != nil {
			attachmentsMap[*att.CommentID] = append(attachmentsMap[*att.CommentID], att)
		}
	}
	return attachmentsMap, nil
}

func (r *activityRepository) enrichActivities(
	items []flatActivityItem,
	userMap map[uuid.UUID]*models.User,
	taskMap map[uuid.UUID]*models.Task,
	attachmentsMap map[uuid.UUID][]models.Attachment,
) ([]dto.ActivityItem, error) {
	result := make([]dto.ActivityItem, 0, len(items))
	for _, flat := range items {
		item := dto.ActivityItem{
			ID:           flat.ID,
			Type:         flat.Type,
			CreatedAt:    flat.CreatedAt,
			UserID:       *flat.UserID, // Явно копируем UserID
			TaskID:       *flat.TaskID, // Явно копируем TaskID
			CommentID:    flat.CommentID,
			ChangeID:     flat.ChangeID,
			FieldName:    flat.FieldName,
			Description:  flat.Description,
			TimeDuration: flat.TimeDuration,
			Content:      flat.Content,
		}

		// Заполняем User объект, если есть
		if flat.UserID != nil {
			if user, ok := userMap[*flat.UserID]; ok {
				item.User = user
			}
		}

		// Заполняем Task объект, если есть
		if flat.TaskID != nil {
			if task, ok := taskMap[*flat.TaskID]; ok {
				item.Task = task
			}
		}

		// Заполняем поля в зависимости от типа
		if flat.Type == "comment" {
			if flat.CommentID != nil {
				if atts, ok := attachmentsMap[*flat.CommentID]; ok {
					item.Attachments = &atts
				}
			}
		} else {
			// Преобразуем JSON строки для изменений
			if flat.OldValue != nil && *flat.OldValue != "" {
				var oldValue interface{}
				if err := json.Unmarshal([]byte(*flat.OldValue), &oldValue); err == nil {
					item.OldValue = oldValue
				}
			}

			if flat.NewValue != nil && *flat.NewValue != "" {
				var newValue interface{}
				if err := json.Unmarshal([]byte(*flat.NewValue), &newValue); err == nil {
					item.NewValue = newValue
				}
			}
		}

		result = append(result, item)
	}

	return result, nil
}

func (r *activityRepository) GetTaskActivities(ctx context.Context, projectID, taskID uuid.UUID, limit, offset int) ([]dto.ActivityItem, int64, error) {
	var flatItems []flatActivityItem
	var total int64

	// 1. Подсчет общего количества активностей
	countSQL := `
        SELECT COUNT(*) FROM (
            SELECT 1 FROM tasks t
            JOIN changes ch ON t.id = ch.task_id
            WHERE t.project_id = $1 AND t.id = $2
            
            UNION ALL
            
            SELECT 1 FROM tasks t
            JOIN comments c ON t.id = c.task_id
            WHERE t.project_id = $1 AND t.id = $2
        ) as total
    `

	err := r.db.WithContext(ctx).Raw(countSQL, projectID, taskID).Scan(&total).Error
	if err != nil {
		return nil, 0, err
	}

	// 2. Основной запрос с пагинацией
	mainSQL := `
        SELECT * FROM (
            SELECT 
                CONCAT(CAST(c.id AS TEXT), '_change') as id,
                'change' as type,
                c.created_at,
                c.user_id,
                tsk.id as task_id,
                NULL as comment_id,
                c.id as change_id,
                c.field_name,
                c.description,
                CAST(c.old_value AS TEXT) as old_value,
                CAST(c.new_value AS TEXT) as new_value,
                c.time_duration,
                NULL as content
            FROM tasks tsk
            JOIN changes c ON tsk.id = c.task_id
            WHERE tsk.project_id = $1 AND tsk.id = $2
            
            UNION ALL
            
            SELECT 
                CONCAT(CAST(com.id AS TEXT), '_comment') as id,
                'comment' as type,
                com.created_at,
                com.user_id,
                tsk.id as task_id,
                com.id as comment_id,
                NULL as change_id,
                NULL as field_name,
                NULL as description,
                NULL as old_value,
                NULL as new_value,
                NULL as time_duration,
                com.content
            FROM tasks tsk
            JOIN comments com ON tsk.id = com.task_id
            WHERE tsk.project_id = $1 AND tsk.id = $2
        ) as activities
        ORDER BY activities.created_at DESC
        LIMIT $3 OFFSET $4
    `

	err = r.db.WithContext(ctx).Raw(mainSQL, projectID, taskID, limit, offset).Scan(&flatItems).Error
	if err != nil {
		return nil, 0, err
	}

	// 3. Собираем уникальные ID
	userIDs := extractUniqueIDs(flatItems, func(item flatActivityItem) *uuid.UUID { return item.UserID })
	taskIDs := extractUniqueIDs(flatItems, func(item flatActivityItem) *uuid.UUID { return item.TaskID })

	commentIDs := make([]uuid.UUID, 0)
	for _, item := range flatItems {
		if item.Type == "comment" && item.CommentID != nil {
			commentIDs = append(commentIDs, *item.CommentID)
		}
	}

	// 4. Загружаем все данные
	userMap, err := r.loadUsers(ctx, userIDs)
	if err != nil {
		return nil, 0, err
	}

	taskMap, err := r.loadTasks(ctx, taskIDs)
	if err != nil {
		return nil, 0, err
	}

	attachmentsMap, err := r.loadAttachments(ctx, commentIDs)
	if err != nil {
		return nil, 0, err
	}

	result, err := r.enrichActivities(flatItems, userMap, taskMap, attachmentsMap)
	if err != nil {
		return nil, 0, err
	}

	return result, total, nil
}

func (r *activityRepository) GetProjectActivities(ctx context.Context, projectID uuid.UUID, limit, offset int) ([]dto.ActivityItem, int64, error) {
	var flatItems []flatActivityItem
	var total int64

	// 1. Подсчет общего количества активностей
	countSQL := `
		SELECT COUNT(*) FROM (
			SELECT 1 FROM tasks t
			JOIN changes ch ON t.id = ch.task_id
			WHERE t.project_id = ?

			UNION ALL

			SELECT 1 FROM tasks t
			JOIN comments c ON t.id = c.task_id
			WHERE t.project_id = ?
		) AS total
	`

	err := r.db.WithContext(ctx).Raw(countSQL, projectID, projectID).Scan(&total).Error
	if err != nil {
		return nil, 0, fmt.Errorf("failed to count project activities: %w", err)
	}

	// 2. Основной запрос с пагинацией
	mainSQL := `
		SELECT * FROM (
			SELECT 
				CONCAT('change_', c.id) AS id,
				'change' AS type,
				c.created_at,
				c.user_id,
				t.id AS task_id,
				NULL AS comment_id,
				c.id AS change_id,
				c.field_name,
				c.description,
				CAST(c.old_value AS TEXT) AS old_value,
				CAST(c.new_value AS TEXT) AS new_value,
				c.time_duration,
				NULL AS content
			FROM tasks t
			JOIN changes c ON t.id = c.task_id
			WHERE t.project_id = ?

			UNION ALL

			SELECT 
				CONCAT('comment_', com.id) AS id,
				'comment' AS type,
				com.created_at,
				com.user_id,
				t.id AS task_id,
				com.id AS comment_id,
				NULL AS change_id,
				NULL AS field_name,
				NULL AS description,
				NULL AS old_value,
				NULL AS new_value,
				NULL AS time_duration,
				com.content
			FROM tasks t
			JOIN comments com ON t.id = com.task_id
			WHERE t.project_id = ?
		) AS activities
		ORDER BY activities.created_at DESC
		LIMIT ? OFFSET ?
	`

	err = r.db.WithContext(ctx).Raw(mainSQL, projectID, projectID, limit, offset).Scan(&flatItems).Error
	if err != nil {
		return nil, 0, fmt.Errorf("failed to get project activities: %w", err)
	}

	// 3. Собираем уникальные ID
	userIDs := extractUniqueIDs(flatItems, func(item flatActivityItem) *uuid.UUID { return item.UserID })
	taskIDs := extractUniqueIDs(flatItems, func(item flatActivityItem) *uuid.UUID { return item.TaskID })

	commentIDs := make([]uuid.UUID, 0)
	for _, item := range flatItems {
		if item.Type == "comment" && item.CommentID != nil {
			commentIDs = append(commentIDs, *item.CommentID)
		}
	}

	// 4. Загружаем связанные данные
	userMap, err := r.loadUsers(ctx, userIDs)
	if err != nil {
		return nil, 0, fmt.Errorf("failed to load users: %w", err)
	}

	taskMap, err := r.loadTasks(ctx, taskIDs)
	if err != nil {
		return nil, 0, fmt.Errorf("failed to load tasks: %w", err)
	}

	attachmentsMap, err := r.loadAttachments(ctx, commentIDs)
	if err != nil {
		return nil, 0, fmt.Errorf("failed to load attachments: %w", err)
	}

	// 5. Обогащаем данные
	result, err := r.enrichActivities(flatItems, userMap, taskMap, attachmentsMap)
	if err != nil {
		return nil, 0, fmt.Errorf("failed to enrich activities: %w", err)
	}

	return result, total, nil
}

func (r *activityRepository) GetUserActivities(ctx context.Context, projectID, userID uuid.UUID, limit, offset int) ([]dto.ActivityItem, int64, error) {
	var flatItems []flatActivityItem
	var total int64

	// 1. Подсчет общего количества активностей пользователя в проекте
	countSQL := `
		SELECT COUNT(*) FROM (
			SELECT 1 FROM changes ch
			JOIN tasks t ON t.id = ch.task_id
			WHERE ch.user_id = ? AND t.project_id = ?

			UNION ALL

			SELECT 1 FROM comments c
			JOIN tasks t ON t.id = c.task_id
			WHERE c.user_id = ? AND t.project_id = ?
		) AS total
	`

	err := r.db.WithContext(ctx).Raw(countSQL, userID, projectID, userID, projectID).Scan(&total).Error
	if err != nil {
		return nil, 0, fmt.Errorf("failed to count user activities: %w", err)
	}

	// 2. Основной запрос с пагинацией
	mainSQL := `
		SELECT * FROM (
            SELECT 
                CONCAT(CAST(c.id AS TEXT), '_change') as id,
                'change' as type,
                c.created_at,
                c.user_id,
                tsk.id as task_id,
                NULL as comment_id,
                c.id as change_id,
                c.field_name,
                c.description,
                CAST(c.old_value AS TEXT) as old_value,
                CAST(c.new_value AS TEXT) as new_value,
                c.time_duration,
                NULL as content
            FROM tasks tsk
            JOIN changes c ON tsk.id = c.task_id
            WHERE tsk.project_id = $1 AND c.user_id = $2
            
            UNION ALL
            
            SELECT 
                CONCAT(CAST(com.id AS TEXT), '_comment') as id,
                'comment' as type,
                com.created_at,
                com.user_id,
                tsk.id as task_id,
                com.id as comment_id,
                NULL as change_id,
                NULL as field_name,
                NULL as description,
                NULL as old_value,
                NULL as new_value,
                NULL as time_duration,
                com.content
            FROM tasks tsk
            JOIN comments com ON tsk.id = com.task_id
            WHERE tsk.project_id = $1 AND com.user_id = $2
        ) as activities
        ORDER BY activities.created_at DESC
        LIMIT $3 OFFSET $4
	`

	err = r.db.WithContext(ctx).Raw(mainSQL, projectID, userID, limit, offset).Scan(&flatItems).Error
	if err != nil {
		return nil, 0, fmt.Errorf("failed to get user activities: %w", err)
	}

	// 3. Собираем уникальные ID
	userIDs := extractUniqueIDs(flatItems, func(item flatActivityItem) *uuid.UUID { return item.UserID })
	taskIDs := extractUniqueIDs(flatItems, func(item flatActivityItem) *uuid.UUID { return item.TaskID })

	commentIDs := make([]uuid.UUID, 0)
	for _, item := range flatItems {
		if item.Type == "comment" && item.CommentID != nil {
			commentIDs = append(commentIDs, *item.CommentID)
		}
	}

	// 4. Загружаем связанные данные
	userMap, err := r.loadUsers(ctx, userIDs)
	if err != nil {
		return nil, 0, fmt.Errorf("failed to load users: %w", err)
	}

	taskMap, err := r.loadTasks(ctx, taskIDs)
	if err != nil {
		return nil, 0, fmt.Errorf("failed to load tasks: %w", err)
	}

	attachmentsMap, err := r.loadAttachments(ctx, commentIDs)
	if err != nil {
		return nil, 0, fmt.Errorf("failed to load attachments: %w", err)
	}

	// 5. Обогащаем данные
	result, err := r.enrichActivities(flatItems, userMap, taskMap, attachmentsMap)
	if err != nil {
		return nil, 0, fmt.Errorf("failed to enrich activities: %w", err)
	}

	return result, total, nil
}
