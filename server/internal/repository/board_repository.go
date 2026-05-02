package repository

import (
	"context"
	"encoding/json"
	"fmt"
	"github.com/google/uuid"
	"gorm.io/gorm"
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
	GetLaneTasks(ctx context.Context, laneID uuid.UUID) ([]models.Task, error)
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
		for id, position := range positions {
			if err := tx.Model(&models.Column{}).
				Where("id = ? AND project_id = ?", id, projectID).
				Update("position", position).Error; err != nil {
				return err
			}
		}
		return nil
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
		for id, position := range positions {
			if err := tx.Model(&models.Lane{}).
				Where("id = ? AND project_id = ?", id, projectID).
				Update("position", position).Error; err != nil {
				return err
			}
		}
		return nil
	})
}

func (r *boardRepo) GetLaneTasks(ctx context.Context, laneID uuid.UUID) ([]models.Task, error) {
	var lane models.Lane
	err := r.db.WithContext(ctx).Where("id = ?", laneID).First(&lane).Error
	if err != nil {
		return nil, err
	}

	if len(lane.RuleCondition) == 0 {
		var tasks []models.Task
		err = r.db.WithContext(ctx).
			Preload("Project").
			Preload("Creator").
			Preload("Assignee").
			Preload("Status").
			Preload("ParentTask").
			Preload("Tags").
			Where("project_id = ?", lane.ProjectID).
			Order("tasks.created_at DESC").
			Find(&tasks).Error
		return tasks, err
	}

	var node pkg.ConditionNode
	if err = json.Unmarshal(lane.RuleCondition, &node); err != nil {
		return nil, fmt.Errorf("failed to parse rule condition: %w", err)
	}

	sqlGen := pkg.NewSQLGenerator()
	conditionSQL, joins, err := sqlGen.Generate(string(lane.RuleCondition))
	if err != nil {
		return nil, fmt.Errorf("failed to generate SQL: %w", err)
	}

	query := r.db.WithContext(ctx).Table("tasks").
		Where("tasks.project_id = ?", lane.ProjectID).
		Where(conditionSQL)

	for _, join := range joins {
		query = query.Joins(join)
	}

	var tasks []models.Task
	err = query.
		Preload("Project").
		Preload("Creator").
		Preload("Assignee").
		Preload("Status").
		Preload("ParentTask").
		Preload("Tags").
		Preload("Changes").
		Order("tasks.created_at DESC").
		Find(&tasks).Error

	if err != nil {
		return nil, err
	}
	return tasks, nil
}
