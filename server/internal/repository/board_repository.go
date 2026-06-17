package repository

import (
	"context"
	"fmt"
	"github.com/google/uuid"
	"gorm.io/gorm"
	"strings"
	"task-tracker/internal/dto"
	"task-tracker/internal/models"
	pkg "task-tracker/pkg/parser"
)

type BoardRepository interface {
	// Column methods
	CreateColumn(ctx context.Context, column *models.Column) error
	GetColumnByID(ctx context.Context, id uuid.UUID) (*models.Column, error)
	UpdateColumn(ctx context.Context, column *models.Column) error
	DeleteColumn(ctx context.Context, id uuid.UUID) error
	ListColumns(ctx context.Context, filter dto.ColumnFilter, limit, offset int) ([]models.Column, error)
	GetColumnsByProjectID(ctx context.Context, projectID uuid.UUID) ([]models.Column, error)
	GetColumnByStatusID(ctx context.Context, statusID uuid.UUID) (*models.Column, error)
	ReorderColumns(ctx context.Context, projectID uuid.UUID, positions map[uuid.UUID]int) error

	// Lane methods
	CreateLane(ctx context.Context, lane *models.Lane) error
	GetLaneByID(ctx context.Context, id uuid.UUID) (*models.Lane, error)
	UpdateLane(ctx context.Context, lane *models.Lane) error
	DeleteLane(ctx context.Context, id uuid.UUID) error
	ListLanes(ctx context.Context, filter dto.LaneFilter, limit, offset int) ([]models.Lane, error)
	GetLanesByProjectID(ctx context.Context, projectID uuid.UUID) ([]models.Lane, error)
	ReorderLanes(ctx context.Context, projectID uuid.UUID, positions map[uuid.UUID]int) error
	GetLanesWithTasks(ctx context.Context, projectID uuid.UUID) ([]dto.LaneWithTasks, error)
}

type boardRepo struct {
	db *gorm.DB
}

func NewBoardRepository(db *gorm.DB) BoardRepository {
	return &boardRepo{db: db}
}

// ==================== Column Methods ====================

func (r *boardRepo) CreateColumn(ctx context.Context, column *models.Column) error {
	return r.db.WithContext(ctx).Create(column).Error
}

func (r *boardRepo) GetColumnByID(ctx context.Context, id uuid.UUID) (*models.Column, error) {
	var column models.Column
	err := r.db.WithContext(ctx).Preload("Project").Preload("Status").First(&column, "id = ?", id).Error
	return &column, err
}

func (r *boardRepo) UpdateColumn(ctx context.Context, column *models.Column) error {
	return r.db.WithContext(ctx).Save(column).Error
}

func (r *boardRepo) DeleteColumn(ctx context.Context, id uuid.UUID) error {
	return r.db.WithContext(ctx).Delete(&models.Column{}, "id = ?", id).Error
}

func (r *boardRepo) ListColumns(ctx context.Context, filter dto.ColumnFilter, limit, offset int) ([]models.Column, error) {
	var columns []models.Column
	query := r.db.WithContext(ctx).Preload("Project").Preload("Status")

	if filter.ProjectID != nil {
		query = query.Where("project_id = ?", *filter.ProjectID)
	}
	if filter.StatusID != nil {
		query = query.Where("status_id = ?", *filter.StatusID)
	}

	err := query.
		Order("position ASC").
		Limit(limit).
		Offset(offset).
		Find(&columns).Error

	return columns, err
}

func (r *boardRepo) GetColumnsByProjectID(ctx context.Context, projectID uuid.UUID) ([]models.Column, error) {
	var columns []models.Column
	err := r.db.WithContext(ctx).Preload("Status").
		Where("project_id = ?", projectID).
		Order("position ASC").
		Find(&columns).Error
	return columns, err
}

func (r *boardRepo) GetColumnByStatusID(ctx context.Context, statusID uuid.UUID) (*models.Column, error) {
	var column models.Column
	err := r.db.WithContext(ctx).Where("status_id = ?", statusID).First(&column).Error
	return &column, err
}

func (r *boardRepo) ReorderColumns(ctx context.Context, projectID uuid.UUID, positions map[uuid.UUID]int) error {
	return r.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		// Шаг 1: одним запросом делаем все позиции отрицательными
		if err := tx.Model(&models.Column{}).
			Where("project_id = ?", projectID).
			Update("position", gorm.Expr("-position")).Error; err != nil {
			return err
		}

		// Шаг 2: собираем ID и строим CASE прямо в SQL
		caseParts := make([]string, 0, len(positions))
		for id, pos := range positions {
			caseParts = append(caseParts, fmt.Sprintf("WHEN '%s' THEN %d", id.String(), pos))
		}

		caseSQL := fmt.Sprintf("CASE id %s END", strings.Join(caseParts, " "))

		return tx.Model(&models.Column{}).
			Where("id IN ?", getKeys(positions)).
			Update("position", gorm.Expr(caseSQL)).Error
	})
}

// ==================== Lane Methods ====================

func (r *boardRepo) CreateLane(ctx context.Context, lane *models.Lane) error {
	return r.db.WithContext(ctx).Create(lane).Error
}

func (r *boardRepo) GetLaneByID(ctx context.Context, id uuid.UUID) (*models.Lane, error) {
	var lane models.Lane
	err := r.db.WithContext(ctx).Preload("Project").First(&lane, "id = ?", id).Error
	return &lane, err
}

func (r *boardRepo) UpdateLane(ctx context.Context, lane *models.Lane) error {
	return r.db.WithContext(ctx).Save(lane).Error
}

func (r *boardRepo) DeleteLane(ctx context.Context, id uuid.UUID) error {
	return r.db.WithContext(ctx).Delete(&models.Lane{}, "id = ?", id).Error
}

func (r *boardRepo) ListLanes(ctx context.Context, filter dto.LaneFilter, limit, offset int) ([]models.Lane, error) {
	var lanes []models.Lane
	query := r.db.WithContext(ctx).Preload("Project")

	if filter.ProjectID != nil {
		query = query.Where("project_id = ?", *filter.ProjectID)
	}
	if filter.Title != "" {
		query = query.Where("title ILIKE ?", "%"+filter.Title+"%")
	}

	err := query.
		Order("position ASC").
		Limit(limit).
		Offset(offset).
		Find(&lanes).Error

	return lanes, err
}

func (r *boardRepo) GetLanesByProjectID(ctx context.Context, projectID uuid.UUID) ([]models.Lane, error) {
	var lanes []models.Lane
	err := r.db.WithContext(ctx).Where("project_id = ?", projectID).
		Order("position ASC").
		Find(&lanes).Error
	return lanes, err
}

func (r *boardRepo) ReorderLanes(ctx context.Context, projectID uuid.UUID, positions map[uuid.UUID]int) error {
	return r.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		// Шаг 1: одним запросом делаем все позиции отрицательными
		if err := tx.Model(&models.Lane{}).
			Where("project_id = ?", projectID).
			Update("position", gorm.Expr("-position")).Error; err != nil {
			return err
		}

		// Шаг 2: собираем ID и строим CASE прямо в SQL
		caseParts := make([]string, 0, len(positions))
		for id, pos := range positions {
			caseParts = append(caseParts, fmt.Sprintf("WHEN '%s' THEN %d", id.String(), pos))
		}

		caseSQL := fmt.Sprintf("CASE id %s END", strings.Join(caseParts, " "))

		return tx.Model(&models.Lane{}).
			Where("id IN ?", getKeys(positions)).
			Update("position", gorm.Expr(caseSQL)).Error
	})
}

// Хелпер
func getKeys(m map[uuid.UUID]int) []uuid.UUID {
	keys := make([]uuid.UUID, 0, len(m))
	for k := range m {
		keys = append(keys, k)
	}
	return keys
}

func (r *boardRepo) GetLanesWithTasks(ctx context.Context, projectID uuid.UUID) ([]dto.LaneWithTasks, error) {
	// 1. Получаем линии
	var lanes []models.Lane
	err := r.db.WithContext(ctx).
		Where("project_id = ?", projectID).
		Order("position ASC").
		Find(&lanes).Error
	if err != nil {
		return nil, err
	}

	if len(lanes) == 0 {
		return []dto.LaneWithTasks{}, nil
	}

	// 2. Получаем только пары (task_id, lane_id) через UNION ALL + ROW_NUMBER
	sqlGen := pkg.NewSQLGenerator()
	var unionParts []string
	var args []interface{}
	argCounter := 1

	for i, lane := range lanes {
		conditionSQL, joins, requiresGroupBy, err := sqlGen.Generate(string(lane.RuleCondition))
		if err != nil {
			return nil, err
		}

		joinClause := ""
		if len(joins) > 0 {
			joinClause = "\n" + strings.Join(joins, "\n")
		}

		groupByClause := ""
		if requiresGroupBy {
			groupByClause = "\n    GROUP BY tasks.id"
		}

		part := fmt.Sprintf(`
            SELECT 
                $%d::uuid as lane_id,
                $%d::int as lane_position,
                tasks.id as task_id
            FROM tasks%s
            WHERE tasks.project_id = $%d
              AND (%s)%s`,
			argCounter, argCounter+1, joinClause, argCounter+2, conditionSQL, groupByClause,
		)

		unionParts = append(unionParts, part)
		args = append(args, lane.ID, i, projectID)
		argCounter += 3
	}

	fullQuery := fmt.Sprintf(`
        WITH all_assignments AS (%s
        ),
        ranked_assignments AS (
            SELECT *,
                   ROW_NUMBER() OVER (PARTITION BY task_id ORDER BY lane_position) as rn
            FROM all_assignments
        )
        SELECT lane_id, task_id
        FROM ranked_assignments
        WHERE rn = 1`,
		strings.Join(unionParts, "\nUNION ALL"))

	// 3. Выполняем запрос, получаем пары (lane_id, task_id)
	type assignment struct {
		LaneID uuid.UUID `gorm:"column:lane_id"`
		TaskID uuid.UUID `gorm:"column:task_id"`
	}

	var assignments []assignment
	err = r.db.WithContext(ctx).Raw(fullQuery, args...).Scan(&assignments).Error
	if err != nil {
		return nil, err
	}

	if len(assignments) == 0 {
		result := make([]dto.LaneWithTasks, len(lanes))
		for i, lane := range lanes {
			result[i] = dto.LaneWithTasks{
				ID:            lane.ID,
				ProjectID:     lane.ProjectID,
				Title:         lane.Title,
				Description:   lane.Description,
				Position:      lane.Position,
				Color:         lane.Color,
				RuleCondition: lane.RuleCondition,
				Tasks:         []dto.TaskWithMetrics{},
			}
		}
		return result, nil
	}

	// 4. Собираем все ID задач
	taskIDs := make([]uuid.UUID, len(assignments))
	for i, a := range assignments {
		taskIDs[i] = a.TaskID
	}

	// 5. ОДНИМ запросом загружаем ВСЕ задачи с Preload'ами и метриками
	var tasks []models.Task
	err = r.db.WithContext(ctx).
		Table("tasks").
		Where("tasks.id IN ?", taskIDs).
		Preload("Project").
		Preload("Creator").
		Preload("Assignee").
		Preload("Status").
		Preload("ParentTask").
		Preload("Tags").
		Order("tasks.created_at DESC").
		Find(&tasks).Error
	if err != nil {
		return nil, err
	}

	// 6. Создаём мапу задач по ID
	tasksMap := make(map[uuid.UUID]models.Task, len(tasks))
	for _, task := range tasks {
		tasksMap[task.ID] = task
	}

	var metrics []dto.TaskMetrics
	err = r.db.WithContext(ctx).Table("tasks t").
		Select(`
        t.id as task_id,
        COALESCE(com.cnt, 0) as comments_count,
        COALESCE(sub.cnt, 0) as subtasks_count,
        COALESCE(att.cnt, 0) as attachments_count
    `).
		Joins(`LEFT JOIN (
        SELECT task_id, COUNT(*) as cnt FROM comments GROUP BY task_id
    ) com ON com.task_id = t.id`).
		Joins(`LEFT JOIN (
        SELECT parent_task_id, COUNT(*) as cnt 
        FROM tasks 
        WHERE parent_task_id IS NOT NULL 
        GROUP BY parent_task_id
    ) sub ON sub.parent_task_id = t.id`).
		Joins(`LEFT JOIN (
        SELECT task_id, COUNT(*) as cnt FROM attachments GROUP BY task_id
    ) att ON att.task_id = t.id`).
		Where("t.id IN ?", taskIDs).
		Scan(&metrics).Error
	if err != nil {
		return nil, err
	}

	// Создаём мапу метрик
	metricsMap := make(map[uuid.UUID]dto.TaskMetrics)
	for _, m := range metrics {
		metricsMap[m.TaskID] = m
	}

	// 8. Группируем задачи по lane_id с метриками
	tasksByLane := make(map[uuid.UUID][]dto.TaskWithMetrics)
	for _, a := range assignments {
		task, ok := tasksMap[a.TaskID]
		if !ok {
			continue
		}

		metricsM := metricsMap[a.TaskID]
		taskWithMetrics := dto.TaskWithMetrics{
			Task: task,
			Metrics: dto.TaskMetrics{
				TaskID:           a.TaskID,
				CommentsCount:    metricsM.CommentsCount,
				ChangesCount:     0,
				SubtasksCount:    metricsM.SubtasksCount,
				AttachmentsCount: metricsM.AttachmentsCount,
			},
		}
		tasksByLane[a.LaneID] = append(tasksByLane[a.LaneID], taskWithMetrics)
	}

	// 9. Формируем результат
	result := make([]dto.LaneWithTasks, 0, len(lanes))
	for _, lane := range lanes {
		laneTasks := tasksByLane[lane.ID]
		if laneTasks == nil {
			laneTasks = []dto.TaskWithMetrics{}
		}
		result = append(result, dto.LaneWithTasks{
			ID:            lane.ID,
			ProjectID:     lane.ProjectID,
			Title:         lane.Title,
			Description:   lane.Description,
			Position:      lane.Position,
			Color:         lane.Color,
			RuleCondition: lane.RuleCondition,
			Tasks:         laneTasks,
		})
	}

	return result, nil
}
