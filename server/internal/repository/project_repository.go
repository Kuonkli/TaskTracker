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

type ProjectRepository interface {
	Create(ctx context.Context, project *models.Project) error
	CreateDefault(ctx context.Context, userID uuid.UUID, req dto.CreateDefaultProjectRequest) (*models.Project, error)
	FindByID(ctx context.Context, id uuid.UUID) (*models.Project, error)
	Update(ctx context.Context, project *models.Project) error
	Delete(ctx context.Context, id uuid.UUID) error
	List(ctx context.Context, filter dto.ProjectFilter, limit, offset int) ([]models.Project, error)
	FindByOwnerID(ctx context.Context, ownerID uuid.UUID) ([]models.Project, error)
	FindByMemberID(ctx context.Context, userID uuid.UUID) ([]models.Project, error)
	GetProjectWithDetails(ctx context.Context, id uuid.UUID) (*models.Project, error)
}

type projectRepo struct {
	db *gorm.DB
}

func NewProjectRepository(db *gorm.DB) ProjectRepository {
	return &projectRepo{db: db}
}

func (r *projectRepo) Create(ctx context.Context, project *models.Project) error {
	return r.db.WithContext(ctx).Create(project).Error
}

func (r *projectRepo) CreateDefault(ctx context.Context, userID uuid.UUID, req dto.CreateDefaultProjectRequest) (*models.Project, error) {
	var createdProject *models.Project
	err := r.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		project := &models.Project{
			OwnerID: userID,
			Name:    req.Name,
		}
		if err := tx.Create(project).Error; err != nil {
			return err
		}

		createdProject = project

		member := &models.ProjectMember{
			ProjectID:       project.ID,
			UserID:          project.OwnerID,
			PermissionLevel: "owner",
		}
		if err := tx.Create(member).Error; err != nil {
			return err
		}

		statuses := []models.ProjectStatus{
			{ProjectID: project.ID, Name: "To Do", StatusType: "todo", Color: "#6B7280"},
			{ProjectID: project.ID, Name: "In Progress", StatusType: "progress", Color: "#3B82F6"},
			{ProjectID: project.ID, Name: "Paused", StatusType: "paused", Color: "#F59E0B"},
			{ProjectID: project.ID, Name: "Done", StatusType: "completed", Color: "#10B981"},
		}

		for i := range statuses {
			if err := tx.Create(&statuses[i]).Error; err != nil {
				return err
			}
		}

		columns := []models.Column{
			{ProjectID: project.ID, StatusID: statuses[0].ID, Position: 1},
			{ProjectID: project.ID, StatusID: statuses[1].ID, Position: 2},
			{ProjectID: project.ID, StatusID: statuses[2].ID, Position: 3},
			{ProjectID: project.ID, StatusID: statuses[3].ID, Position: 4},
		}

		for i := range columns {
			if err := tx.Create(&columns[i]).Error; err != nil {
				return err
			}
		}

		lanes := []struct {
			Title      string
			Color      string
			Position   int
			RuleString string
		}{
			{Title: "Critical Priority", Color: "#EF4444", Position: 1, RuleString: "priority = 'critical'"},
			{Title: "High Priority", Color: "#F97316", Position: 2, RuleString: "priority = 'high'"},
			{Title: "Medium Priority", Color: "#EAB308", Position: 3, RuleString: "priority = 'medium'"},
			{Title: "Low Priority", Color: "#6B7280", Position: 4, RuleString: "priority = 'low'"},
		}

		for _, laneData := range lanes {
			ruleParser := pkg.NewRuleParser(laneData.RuleString)
			node, err := ruleParser.Parse()
			if err != nil {
				return fmt.Errorf("failed to parse rule for lane '%s': %w", laneData.Title, err)
			}

			ruleJSON, err := json.Marshal(node)
			if err != nil {
				return fmt.Errorf("failed to marshal rule for lane '%s': %w", laneData.Title, err)
			}

			lane := models.Lane{
				ProjectID:     project.ID,
				Title:         laneData.Title,
				Position:      laneData.Position,
				Color:         laneData.Color,
				RuleCondition: ruleJSON,
			}

			if err := tx.Create(&lane).Error; err != nil {
				return err
			}
		}

		tags := []models.Tag{
			{ProjectID: project.ID, Title: "urgently", Color: "#EF4444"},
			{ProjectID: project.ID, Title: "run", Color: "#F97316"},
			{ProjectID: project.ID, Title: "blocker", Color: "#DC2626"},
			{ProjectID: project.ID, Title: "discuss", Color: "#8B5CF6"},
			{ProjectID: project.ID, Title: "docs", Color: "#3B82F6"},
		}

		for i := range tags {
			if err := tx.Create(&tags[i]).Error; err != nil {
				return err
			}
		}

		return nil
	})
	if err != nil {
		return nil, err
	}

	return createdProject, nil
}

func (r *projectRepo) FindByID(ctx context.Context, id uuid.UUID) (*models.Project, error) {
	var project models.Project
	err := r.db.WithContext(ctx).Preload("Owner").First(&project, "id = ?", id).Error
	return &project, err
}

func (r *projectRepo) Update(ctx context.Context, project *models.Project) error {
	return r.db.WithContext(ctx).Save(project).Error
}

func (r *projectRepo) Delete(ctx context.Context, id uuid.UUID) error {
	return r.db.WithContext(ctx).Delete(&models.Project{}, "id = ?", id).Error
}

func (r *projectRepo) List(ctx context.Context, filter dto.ProjectFilter, limit, offset int) ([]models.Project, error) {
	var projects []models.Project
	query := r.db.WithContext(ctx).Preload("Owner")

	if filter.OwnerID != nil {
		query = query.Where("owner_id = ?", *filter.OwnerID)
	}
	if filter.Name != "" {
		query = query.Where("name ILIKE ?", "%"+filter.Name+"%")
	}

	err := query.
		Order("created_at DESC").
		Limit(limit).
		Offset(offset).
		Find(&projects).Error

	return projects, err
}

func (r *projectRepo) FindByOwnerID(ctx context.Context, ownerID uuid.UUID) ([]models.Project, error) {
	var projects []models.Project
	err := r.db.WithContext(ctx).Where("owner_id = ?", ownerID).Order("created_at DESC").Find(&projects).Error
	return projects, err
}

func (r *projectRepo) FindByMemberID(ctx context.Context, userID uuid.UUID) ([]models.Project, error) {
	var projects []models.Project
	err := r.db.WithContext(ctx).Joins("JOIN project_members ON project_members.project_id = projects.id").
		Where("project_members.user_id = ?", userID).
		Preload("Owner").
		Preload("Members").
		Preload("Members.User").
		Order("projects.created_at DESC").
		Find(&projects).Error
	return projects, err
}

func (r *projectRepo) GetProjectWithDetails(ctx context.Context, id uuid.UUID) (*models.Project, error) {
	var project models.Project
	err := r.db.WithContext(ctx).Preload("Owner").
		Preload("Members").
		Preload("Members.User").
		Preload("Statuses").
		Preload("Columns").
		Preload("Columns.Status").
		Preload("Lanes").
		Preload("Tags").
		First(&project, "id = ?", id).Error
	return &project, err
}
