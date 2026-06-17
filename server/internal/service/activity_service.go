package service

import (
	"context"
	"github.com/google/uuid"
	"task-tracker/internal/dto"
	"task-tracker/internal/models"
	"task-tracker/internal/uow"
)

type ActivityService interface {
	GetProjectActivities(ctx context.Context, projectID uuid.UUID, limit, offset int) (*[]dto.ActivityItem, int64, error)
	GetTaskActivities(ctx context.Context, projectID, taskID uuid.UUID, limit, offset int) (*[]dto.ActivityItem, int64, error)
	GetUserActivities(ctx context.Context, projectID, userID uuid.UUID, limit, offset int) (*[]dto.ActivityItem, int64, error)
	AddComment(ctx context.Context, taskID, userID uuid.UUID, content string) (*models.Comment, error)
	UpdateComment(ctx context.Context, commentID uuid.UUID, content string) (*models.Comment, error)
	DeleteComment(ctx context.Context, commentID uuid.UUID) error
	GetCommentByID(ctx context.Context, commentID uuid.UUID) (*models.Comment, error)
	GetTaskComments(ctx context.Context, taskID uuid.UUID, limit, offset int) ([]models.Comment, int64, error)
	GetChangeByID(ctx context.Context, changeID uuid.UUID) (*models.Change, error)
	GetTaskChanges(ctx context.Context, taskID uuid.UUID, fieldName string, limit, offset int) ([]models.Change, int64, error)
}

type activityService struct {
	uowFactory uow.ActivityUoWFactory
}

func NewActivityService(uowFactory uow.ActivityUoWFactory) ActivityService {
	return &activityService{uowFactory: uowFactory}
}

func (s *activityService) GetProjectActivities(ctx context.Context, projectID uuid.UUID, limit, offset int) (*[]dto.ActivityItem, int64, error) {
	w := s.uowFactory.New()
	activities, total, err := w.ActivityRepo().GetProjectActivities(ctx, projectID, limit, offset)
	if err != nil {
		return nil, total, err
	}
	return &activities, total, nil
}

func (s *activityService) GetTaskActivities(ctx context.Context, projectID, taskID uuid.UUID, limit, offset int) (*[]dto.ActivityItem, int64, error) {
	w := s.uowFactory.New()
	activities, total, err := w.ActivityRepo().GetTaskActivities(ctx, projectID, taskID, limit, offset)
	if err != nil {
		return nil, 0, err
	}
	return &activities, total, nil
}

func (s *activityService) GetUserActivities(ctx context.Context, projectID, userID uuid.UUID, limit, offset int) (*[]dto.ActivityItem, int64, error) {
	w := s.uowFactory.New()
	activities, total, err := w.ActivityRepo().GetUserActivities(ctx, projectID, userID, limit, offset)
	if err != nil {
		return nil, 0, err
	}
	return &activities, total, nil
}

func (s *activityService) AddComment(ctx context.Context, taskID, userID uuid.UUID, content string) (*models.Comment, error) {
	uoWTx, err := s.uowFactory.NewTransaction(ctx)
	if err != nil {
		return nil, err
	}
	defer func() {
		if r := recover(); r != nil {
			uoWTx.Rollback()
		}
	}()

	comment := &models.Comment{
		TaskID:  taskID,
		UserID:  userID,
		Content: content,
	}

	if err = uoWTx.CommentRepo().Create(ctx, comment); err != nil {
		uoWTx.Rollback()
		return nil, err
	}

	if err = uoWTx.Commit(ctx); err != nil {
		return nil, err
	}

	w := s.uowFactory.New()
	return w.CommentRepo().FindByID(ctx, comment.ID)
}

func (s *activityService) UpdateComment(ctx context.Context, commentID uuid.UUID, content string) (*models.Comment, error) {
	uoWTx, err := s.uowFactory.NewTransaction(ctx)
	if err != nil {
		return nil, err
	}
	defer func() {
		if r := recover(); r != nil {
			uoWTx.Rollback()
		}
	}()

	comment, err := uoWTx.CommentRepo().FindByID(ctx, commentID)
	if err != nil {
		uoWTx.Rollback()
		return nil, err
	}

	comment.Content = content

	if err = uoWTx.CommentRepo().Update(ctx, comment); err != nil {
		uoWTx.Rollback()
		return nil, err
	}

	if err = uoWTx.Commit(ctx); err != nil {
		return nil, err
	}

	return uoWTx.CommentRepo().FindByID(ctx, commentID)
}

func (s *activityService) DeleteComment(ctx context.Context, commentID uuid.UUID) error {
	uoWTx, err := s.uowFactory.NewTransaction(ctx)
	if err != nil {
		return err
	}
	defer func() {
		if r := recover(); r != nil {
			uoWTx.Rollback()
		}
	}()

	if err = uoWTx.CommentRepo().Delete(ctx, commentID); err != nil {
		uoWTx.Rollback()
		return err
	}

	return uoWTx.Commit(ctx)
}

func (s *activityService) GetCommentByID(ctx context.Context, commentID uuid.UUID) (*models.Comment, error) {
	w := s.uowFactory.New()
	return w.CommentRepo().FindByID(ctx, commentID)
}

func (s *activityService) GetTaskComments(ctx context.Context, taskID uuid.UUID, limit, offset int) ([]models.Comment, int64, error) {
	w := s.uowFactory.New()
	filter := dto.CommentFilter{TaskID: &taskID, Limit: limit, Offset: offset}
	return w.CommentRepo().List(ctx, filter)
}

func (s *activityService) GetChangeByID(ctx context.Context, changeID uuid.UUID) (*models.Change, error) {
	w := s.uowFactory.New()
	return w.ChangeRepo().FindByID(ctx, changeID)
}

func (s *activityService) GetTaskChanges(ctx context.Context, taskID uuid.UUID, fieldName string, limit, offset int) ([]models.Change, int64, error) {
	w := s.uowFactory.New()
	filter := dto.ChangeFilter{TaskID: &taskID, FieldName: fieldName, Limit: limit, Offset: offset}
	return w.ChangeRepo().List(ctx, filter)
}
