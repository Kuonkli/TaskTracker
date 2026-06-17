package repository

import (
	"context"
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
	"task-tracker/internal/dto"
	"task-tracker/internal/models"
)

type SummaryRepository interface {
	GetMetrics(ctx context.Context, projectID uuid.UUID, startDate, endDate, prevStartDate, prevEndDate time.Time) (*dto.SummaryMetrics, error)
	GetBurnupData(ctx context.Context, projectID uuid.UUID, startDate, endDate time.Time) ([]dto.BurnupPoint, error)
	GetStatusDistribution(ctx context.Context, projectID uuid.UUID, startDate, endDate time.Time) ([]dto.StatusDistribution, error)
	GetTopMembers(ctx context.Context, projectID uuid.UUID, startDate, endDate time.Time) ([]dto.TopMember, error)
	GetPriorityBreakdown(ctx context.Context, projectID uuid.UUID, startDate, endDate time.Time) ([]dto.PriorityBreakdown, error)
	GetOverdueTasks(ctx context.Context, projectID uuid.UUID) ([]dto.OverdueTask, error)
	GetCompletedByWeek(ctx context.Context, projectID uuid.UUID, startDate, endDate time.Time) ([]dto.CompletedByWeek, error)
	GetRecentActivity(ctx context.Context, projectID uuid.UUID, limit int) ([]dto.RecentActivity, error)
}

type summaryRepo struct {
	db *gorm.DB
}

func NewSummaryRepository(db *gorm.DB) SummaryRepository {
	return &summaryRepo{db: db}
}

// GetMetrics возвращает ключевые метрики проекта
func (r *summaryRepo) GetMetrics(ctx context.Context, projectID uuid.UUID, startDate, endDate, prevStartDate, prevEndDate time.Time) (*dto.SummaryMetrics, error) {
	var metrics dto.SummaryMetrics
	db := r.db.WithContext(ctx)

	// Created — создано ЗА ПЕРИОД
	var createdThisPeriod int64
	if err := db.Model(&models.Task{}).
		Where("project_id = ? AND created_at >= ? AND created_at < ?", projectID, startDate, endDate).
		Count(&createdThisPeriod).Error; err != nil {
		return nil, err
	}
	metrics.Created = int(createdThisPeriod)

	// Created change vs предыдущий период
	var createdPrevPeriod int64
	if err := db.Model(&models.Task{}).
		Where("project_id = ? AND created_at >= ? AND created_at < ?", projectID, prevStartDate, startDate).
		Count(&createdPrevPeriod).Error; err != nil {
		return nil, err
	}
	metrics.CreatedChange = int(createdThisPeriod) - int(createdPrevPeriod)

	// Active — ВСЕ незакрытые задачи на конец периода (созданы до endDate и не закрыты ИЛИ закрыты после endDate)
	if err := db.Model(&models.Task{}).
		Where("project_id = ? AND created_at < ? AND (closed_at IS NULL OR closed_at >= ?)", projectID, endDate, endDate).
		Count(&metrics.Active).Error; err != nil {
		return nil, err
	}

	// Completed — завершено ЗА ПЕРИОД
	if err := db.Model(&models.Task{}).
		Where("project_id = ? AND closed_at IS NOT NULL AND closed_at >= ? AND closed_at < ?", projectID, startDate, endDate).
		Count(&metrics.Completed).Error; err != nil {
		return nil, err
	}

	// Completed change vs предыдущий период
	var completedPrevPeriod int64
	if err := db.Model(&models.Task{}).
		Where("project_id = ? AND closed_at IS NOT NULL AND closed_at >= ? AND closed_at < ?", projectID, prevStartDate, startDate).
		Count(&completedPrevPeriod).Error; err != nil {
		return nil, err
	}
	metrics.CompletedChange = int(metrics.Completed) - int(completedPrevPeriod)

	// Среднее время выполнения для завершенных ЗА ПЕРИОД
	var avgDays float64
	if err := db.Model(&models.Task{}).
		Select("COALESCE(AVG(EXTRACT(EPOCH FROM (closed_at - created_at))/86400), 0)").
		Where("project_id = ? AND closed_at IS NOT NULL AND closed_at >= ? AND closed_at < ?", projectID, startDate, endDate).
		Scan(&avgDays).Error; err != nil {
		return nil, err
	}
	metrics.AvgCompletionDays = avgDays

	return &metrics, nil
}

// GetBurnupData возвращает данные для графика Created vs Completed за период
func (r *summaryRepo) GetBurnupData(ctx context.Context, projectID uuid.UUID, startDate, endDate time.Time) ([]dto.BurnupPoint, error) {
	var points []dto.BurnupPoint

	err := r.db.WithContext(ctx).Raw(`
        SELECT 
            d.date::text as date,
            COUNT(t_created.id) as created,
            COUNT(t_completed.id) as completed
        FROM generate_series(?::date, ?::date, '1 day') d(date)
        LEFT JOIN tasks t_created 
            ON t_created.created_at::date = d.date 
            AND t_created.project_id = ?
        LEFT JOIN tasks t_completed 
            ON t_completed.closed_at::date = d.date 
            AND t_completed.project_id = ?
        GROUP BY d.date
        ORDER BY d.date
    `, startDate, endDate, projectID, projectID).Scan(&points).Error

	return points, err
}

// GetStatusDistribution возвращает распределение ВСЕХ незакрытых задач по КОНКРЕТНЫМ статусам на конец периода
func (r *summaryRepo) GetStatusDistribution(ctx context.Context, projectID uuid.UUID, startDate, endDate time.Time) ([]dto.StatusDistribution, error) {
	var distribution []dto.StatusDistribution

	err := r.db.WithContext(ctx).
		Model(&models.ProjectStatus{}).
		Select("project_statuses.name, project_statuses.color, COUNT(tasks.id) as count").
		Joins(`LEFT JOIN tasks ON tasks.status_id = project_statuses.id 
            AND tasks.project_id = ? 
            AND tasks.created_at < ?
            AND (tasks.closed_at IS NULL OR tasks.closed_at >= ?)`, projectID, endDate, startDate).
		Where("project_statuses.project_id = ?", projectID).
		Group("project_statuses.id, project_statuses.name, project_statuses.color").
		Order("project_statuses.created_at ASC").
		Scan(&distribution).Error

	return distribution, err
}

// GetTopMembers возвращает топ участников по количеству изменений за период
func (r *summaryRepo) GetTopMembers(ctx context.Context, projectID uuid.UUID, startDate, endDate time.Time) ([]dto.TopMember, error) {
	type memberResult struct {
		models.User
		ChangesCount int `gorm:"column:changes_count"`
	}

	var results []memberResult

	err := r.db.WithContext(ctx).
		Model(&models.Change{}).
		Select("users.*, COUNT(changes.id) as changes_count").
		Joins("JOIN tasks ON tasks.id = changes.task_id").
		Joins("JOIN users ON users.id = changes.user_id").
		Where("tasks.project_id = ? AND changes.created_at >= ? AND changes.created_at < ?", projectID, startDate, endDate).
		Group("users.id").
		Order("changes_count DESC").
		Limit(5).
		Scan(&results).Error

	if err != nil {
		return nil, err
	}

	members := make([]dto.TopMember, len(results))
	for i, r := range results {
		user := r.User
		members[i] = dto.TopMember{
			User:         &user,
			ChangesCount: r.ChangesCount,
		}
	}

	return members, nil
}

// GetPriorityBreakdown возвращает распределение ВСЕХ незакрытых задач по приоритетам на конец периода
func (r *summaryRepo) GetPriorityBreakdown(ctx context.Context, projectID uuid.UUID, startDate, endDate time.Time) ([]dto.PriorityBreakdown, error) {
	var breakdown []dto.PriorityBreakdown

	err := r.db.WithContext(ctx).
		Model(&models.Task{}).
		Select("priority, COUNT(*) as count").
		Where("project_id = ? AND created_at < ? AND (closed_at IS NULL OR closed_at >= ?)", projectID, endDate, startDate).
		Group("priority").
		Order(`CASE priority 
            WHEN 'critical' THEN 1 
            WHEN 'high' THEN 2 
            WHEN 'medium' THEN 3 
            WHEN 'low' THEN 4 
        END`).
		Scan(&breakdown).Error

	return breakdown, err
}

// GetOverdueTasks возвращает текущие просроченные задачи (всегда актуальное состояние)
func (r *summaryRepo) GetOverdueTasks(ctx context.Context, projectID uuid.UUID) ([]dto.OverdueTask, error) {
	type overdueResult struct {
		ID          uuid.UUID  `gorm:"column:id"`
		Title       string     `gorm:"column:title"`
		DueDate     *time.Time `gorm:"column:due_date"`
		Priority    string     `gorm:"column:priority"`
		DaysOverdue int        `gorm:"column:days_overdue"`
		AssigneeID  *uuid.UUID `gorm:"column:assignee_id"`
		models.User `gorm:"embedded;embeddedPrefix:user_"`
	}

	var results []overdueResult

	err := r.db.WithContext(ctx).
		Model(&models.Task{}).
		Select(`
            tasks.id, 
            tasks.title, 
            tasks.due_date, 
            tasks.priority,
            tasks.assignee_id,
            EXTRACT(DAY FROM (NOW() - tasks.due_date))::int as days_overdue,
            users.id as user_id, 
            users.email as user_email,
            users.first_name as user_first_name, 
            users.last_name as user_last_name,
            users.nickname as user_nickname, 
            users.color as user_color,
            users.created_at as user_created_at, 
            users.updated_at as user_updated_at
        `).
		Joins("LEFT JOIN users ON users.id = tasks.assignee_id").
		Where("tasks.project_id = ?", projectID).
		Where("tasks.closed_at IS NULL").
		Where("tasks.due_date IS NOT NULL").
		Where("tasks.due_date < NOW()").
		Order("days_overdue DESC").
		Limit(10).
		Scan(&results).Error

	if err != nil {
		return nil, err
	}

	tasks := make([]dto.OverdueTask, len(results))
	for i, r := range results {
		task := dto.OverdueTask{
			ID:          r.ID,
			Title:       r.Title,
			DueDate:     r.DueDate,
			DaysOverdue: r.DaysOverdue,
			Priority:    r.Priority,
		}
		if r.AssigneeID != nil {
			user := r.User
			task.Assignee = &user
		}
		tasks[i] = task
	}

	return tasks, nil
}

// GetCompletedByWeek возвращает количество завершенных задач по неделям за период
func (r *summaryRepo) GetCompletedByWeek(ctx context.Context, projectID uuid.UUID, startDate, endDate time.Time) ([]dto.CompletedByWeek, error) {
	var weeks []dto.CompletedByWeek

	err := r.db.WithContext(ctx).
		Model(&models.Task{}).
		Select("date_trunc('week', closed_at)::text as week, COUNT(*) as count").
		Where("project_id = ? AND closed_at IS NOT NULL AND closed_at >= ? AND closed_at < ?", projectID, startDate, endDate).
		Group("week").
		Order("week").
		Scan(&weeks).Error

	return weeks, err
}

// GetRecentActivity возвращает последнюю активность в проекте
func (r *summaryRepo) GetRecentActivity(ctx context.Context, projectID uuid.UUID, limit int) ([]dto.RecentActivity, error) {
	var activities []dto.RecentActivity

	err := r.db.WithContext(ctx).Raw(`
        SELECT * FROM (
            SELECT 
                'change' as type,
                c.field_name,
                c.task_id,
                t.title as task_title,
                c.created_at
            FROM changes c
            JOIN tasks t ON c.task_id = t.id
            WHERE t.project_id = ?
            
            UNION ALL
            
            SELECT 
                'comment' as type,
                '' as field_name,
                com.task_id,
                t.title as task_title,
                com.created_at
            FROM comments com
            JOIN tasks t ON com.task_id = t.id
            WHERE t.project_id = ?
        ) as activities
        ORDER BY created_at DESC
        LIMIT ?
    `, projectID, projectID, limit).Scan(&activities).Error

	return activities, err
}
