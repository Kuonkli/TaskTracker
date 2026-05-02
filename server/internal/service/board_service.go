package service

import (
	"context"
	"github.com/google/uuid"
	"task-tracker/internal/dto"
	"task-tracker/internal/models"
	"task-tracker/internal/uow"
	"task-tracker/pkg/exceptions"
)

type BoardService interface {
	GetBoard(ctx context.Context, projectID uuid.UUID) (*dto.Board, error)
	CreateColumn(ctx context.Context, projectID uuid.UUID, req dto.CreateColumnRequest) (*models.Column, error)
	UpdateColumn(ctx context.Context, columnID uuid.UUID, req dto.UpdateColumnRequest) (*models.Column, error)
	DeleteColumn(ctx context.Context, columnID uuid.UUID) error
	ReorderColumns(ctx context.Context, projectID uuid.UUID, req dto.ReorderColumnsRequest) error
	CreateLane(ctx context.Context, projectID uuid.UUID, req dto.CreateLaneRequest) (*models.Lane, error)
	UpdateLane(ctx context.Context, laneID uuid.UUID, req dto.UpdateLaneRequest) (*models.Lane, error)
	DeleteLane(ctx context.Context, laneID uuid.UUID) error
	ReorderLanes(ctx context.Context, projectID uuid.UUID, req dto.ReorderLanesRequest) error
}

type boardService struct {
	uowFactory uow.BoardUoWFactory
}

func NewBoardService(uowFactory uow.BoardUoWFactory) BoardService {
	return &boardService{uowFactory: uowFactory}
}

func (s *boardService) GetBoard(ctx context.Context, projectID uuid.UUID) (*dto.Board, error) {
	w := s.uowFactory.New()

	columns, err := w.BoardRepo().GetColumnsByProjectID(ctx, projectID)
	if err != nil {
		return nil, err
	}

	lanes, err := w.BoardRepo().GetLanesByProjectID(ctx, projectID)
	if err != nil {
		return nil, err
	}

	lanesWithTasks := make([]dto.LaneWithTasksResponse, 0, len(lanes))
	for _, lane := range lanes {
		laneTasks, err := w.BoardRepo().GetLaneTasks(ctx, lane.ID)
		if err != nil {
			return nil, err
		}
		lanesWithTasks = append(lanesWithTasks, dto.LaneWithTasksResponse{
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

	return &dto.Board{
		ProjectID: projectID,
		Columns:   columns,
		Lanes:     lanesWithTasks,
	}, nil
}

func (s *boardService) CreateColumn(ctx context.Context, projectID uuid.UUID, req dto.CreateColumnRequest) (*models.Column, error) {
	uoWTx, err := s.uowFactory.NewTransaction(ctx)
	if err != nil {
		return nil, err
	}
	defer func() {
		if r := recover(); r != nil {
			uoWTx.Rollback()
		}
	}()

	status, err := uoWTx.StatusRepo().FindByID(ctx, req.StatusID)
	if err != nil {
		uoWTx.Rollback()
		return nil, exceptions.ErrStatusNotFound
	}
	if status.ProjectID != projectID {
		uoWTx.Rollback()
		return nil, exceptions.ErrStatusNotFound
	}

	columns, err := uoWTx.BoardRepo().GetColumnsByProjectID(ctx, projectID)
	if err != nil {
		uoWTx.Rollback()
		return nil, err
	}

	position := len(columns) + 1

	column := &models.Column{
		ProjectID: projectID,
		StatusID:  req.StatusID,
		Position:  position,
	}

	if err = uoWTx.BoardRepo().CreateColumn(ctx, column); err != nil {
		uoWTx.Rollback()
		return nil, err
	}

	if err = uoWTx.Commit(ctx); err != nil {
		return nil, err
	}

	return uoWTx.BoardRepo().GetColumnByID(ctx, column.ID)
}

func (s *boardService) UpdateColumn(ctx context.Context, columnID uuid.UUID, req dto.UpdateColumnRequest) (*models.Column, error) {
	uoWTx, err := s.uowFactory.NewTransaction(ctx)
	if err != nil {
		return nil, err
	}
	defer func() {
		if r := recover(); r != nil {
			uoWTx.Rollback()
		}
	}()

	column, err := uoWTx.BoardRepo().GetColumnByID(ctx, columnID)
	if err != nil {
		uoWTx.Rollback()
		return nil, exceptions.ErrColumnNotFound
	}

	if req.StatusID != nil && *req.StatusID != column.StatusID {
		status, err := uoWTx.StatusRepo().FindByID(ctx, *req.StatusID)
		if err != nil {
			uoWTx.Rollback()
			return nil, exceptions.ErrStatusNotFound
		}
		if status.ProjectID != column.ProjectID {
			uoWTx.Rollback()
			return nil, exceptions.ErrStatusNotFound
		}
		column.StatusID = *req.StatusID
	}

	if req.Position != nil {
		column.Position = *req.Position
	}

	if err = uoWTx.BoardRepo().UpdateColumn(ctx, column); err != nil {
		uoWTx.Rollback()
		return nil, err
	}

	if err = uoWTx.Commit(ctx); err != nil {
		return nil, err
	}

	return uoWTx.BoardRepo().GetColumnByID(ctx, column.ID)
}

func (s *boardService) DeleteColumn(ctx context.Context, columnID uuid.UUID) error {
	uoWTx, err := s.uowFactory.NewTransaction(ctx)
	if err != nil {
		return err
	}
	defer func() {
		if r := recover(); r != nil {
			uoWTx.Rollback()
		}
	}()

	if _, err = uoWTx.BoardRepo().GetColumnByID(ctx, columnID); err != nil {
		uoWTx.Rollback()
		return exceptions.ErrColumnNotFound
	}

	if err = uoWTx.BoardRepo().DeleteColumn(ctx, columnID); err != nil {
		uoWTx.Rollback()
		return err
	}

	return uoWTx.Commit(ctx)
}

func (s *boardService) ReorderColumns(ctx context.Context, projectID uuid.UUID, req dto.ReorderColumnsRequest) error {
	uoWTx, err := s.uowFactory.NewTransaction(ctx)
	if err != nil {
		return err
	}
	defer func() {
		if r := recover(); r != nil {
			uoWTx.Rollback()
		}
	}()

	for id := range req.Positions {
		column, err := uoWTx.BoardRepo().GetColumnByID(ctx, id)
		if err != nil {
			uoWTx.Rollback()
			return exceptions.ErrColumnNotFound
		}
		if column.ProjectID != projectID {
			uoWTx.Rollback()
			return exceptions.ErrColumnNotFound
		}
	}

	if err = uoWTx.BoardRepo().ReorderColumns(ctx, projectID, req.Positions); err != nil {
		uoWTx.Rollback()
		return err
	}

	return uoWTx.Commit(ctx)
}

func (s *boardService) CreateLane(ctx context.Context, projectID uuid.UUID, req dto.CreateLaneRequest) (*models.Lane, error) {
	uoWTx, err := s.uowFactory.NewTransaction(ctx)
	if err != nil {
		return nil, err
	}
	defer func() {
		if r := recover(); r != nil {
			uoWTx.Rollback()
		}
	}()

	lanes, err := uoWTx.BoardRepo().GetLanesByProjectID(ctx, projectID)
	if err != nil {
		uoWTx.Rollback()
		return nil, err
	}

	position := len(lanes) + 1

	lane := &models.Lane{
		ProjectID:     projectID,
		Title:         req.Title,
		Description:   req.Description,
		Position:      position,
		Color:         req.Color,
		RuleCondition: req.RuleCondition,
	}

	if err = uoWTx.BoardRepo().CreateLane(ctx, lane); err != nil {
		uoWTx.Rollback()
		return nil, err
	}

	if err = uoWTx.Commit(ctx); err != nil {
		return nil, err
	}

	return uoWTx.BoardRepo().GetLaneByID(ctx, lane.ID)
}

func (s *boardService) UpdateLane(ctx context.Context, laneID uuid.UUID, req dto.UpdateLaneRequest) (*models.Lane, error) {
	uoWTx, err := s.uowFactory.NewTransaction(ctx)
	if err != nil {
		return nil, err
	}
	defer func() {
		if r := recover(); r != nil {
			uoWTx.Rollback()
		}
	}()

	lane, err := uoWTx.BoardRepo().GetLaneByID(ctx, laneID)
	if err != nil {
		uoWTx.Rollback()
		return nil, exceptions.ErrLaneNotFound
	}

	if req.Title != nil {
		lane.Title = *req.Title
	}
	if req.Description != nil {
		lane.Description = req.Description
	}
	if req.Color != nil {
		lane.Color = *req.Color
	}
	if req.RuleCondition != nil {
		lane.RuleCondition = req.RuleCondition
	}
	if req.Position != nil {
		lane.Position = *req.Position
	}

	if err = uoWTx.BoardRepo().UpdateLane(ctx, lane); err != nil {
		uoWTx.Rollback()
		return nil, err
	}

	if err = uoWTx.Commit(ctx); err != nil {
		return nil, err
	}

	return uoWTx.BoardRepo().GetLaneByID(ctx, lane.ID)
}

func (s *boardService) DeleteLane(ctx context.Context, laneID uuid.UUID) error {
	uoWTx, err := s.uowFactory.NewTransaction(ctx)
	if err != nil {
		return err
	}
	defer func() {
		if r := recover(); r != nil {
			uoWTx.Rollback()
		}
	}()

	if _, err = uoWTx.BoardRepo().GetLaneByID(ctx, laneID); err != nil {
		uoWTx.Rollback()
		return exceptions.ErrLaneNotFound
	}

	if err = uoWTx.BoardRepo().DeleteLane(ctx, laneID); err != nil {
		uoWTx.Rollback()
		return err
	}

	return uoWTx.Commit(ctx)
}

func (s *boardService) ReorderLanes(ctx context.Context, projectID uuid.UUID, req dto.ReorderLanesRequest) error {
	uoWTx, err := s.uowFactory.NewTransaction(ctx)
	if err != nil {
		return err
	}
	defer func() {
		if r := recover(); r != nil {
			uoWTx.Rollback()
		}
	}()

	for id := range req.Positions {
		lane, err := uoWTx.BoardRepo().GetLaneByID(ctx, id)
		if err != nil {
			uoWTx.Rollback()
			return exceptions.ErrLaneNotFound
		}
		if lane.ProjectID != projectID {
			uoWTx.Rollback()
			return exceptions.ErrLaneNotFound
		}
	}

	if err = uoWTx.BoardRepo().ReorderLanes(ctx, projectID, req.Positions); err != nil {
		uoWTx.Rollback()
		return err
	}

	return uoWTx.Commit(ctx)
}
