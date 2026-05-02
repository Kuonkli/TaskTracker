package uow

import (
	"context"
	"gorm.io/gorm"
	"task-tracker/internal/repository"
)

// BoardUoW - для работы с доской (колонки и лейны)
type BoardUoW interface {
	BoardRepo() repository.BoardRepository
	StatusRepo() repository.ProjectStatusRepository
}

// BoardUoWTx - с транзакцией
type BoardUoWTx interface {
	BoardUoW
	Commit(ctx context.Context) error
	Rollback()
}

type boardUoWImpl struct {
	db         *gorm.DB
	boardRepo  repository.BoardRepository
	statusRepo repository.ProjectStatusRepository
}

func (u *boardUoWImpl) BoardRepo() repository.BoardRepository          { return u.boardRepo }
func (u *boardUoWImpl) StatusRepo() repository.ProjectStatusRepository { return u.statusRepo }

func (u *boardUoWImpl) Commit(ctx context.Context) error {
	return u.db.WithContext(ctx).Commit().Error
}

func (u *boardUoWImpl) Rollback() {
	u.db.Rollback()
}

// BoardUoWFactory - фабрика
type BoardUoWFactory interface {
	New() BoardUoW
	NewTransaction(ctx context.Context) (BoardUoWTx, error)
}

type boardUoWFactory struct {
	db *gorm.DB
}

func NewBoardUoWFactory(db *gorm.DB) BoardUoWFactory {
	return &boardUoWFactory{db: db}
}

func (f *boardUoWFactory) New() BoardUoW {
	return &boardUoWImpl{
		db:         f.db,
		boardRepo:  repository.NewBoardRepository(f.db),
		statusRepo: repository.NewProjectStatusRepository(f.db),
	}
}

func (f *boardUoWFactory) NewTransaction(ctx context.Context) (BoardUoWTx, error) {
	tx := f.db.WithContext(ctx).Begin()
	if tx.Error != nil {
		return nil, tx.Error
	}

	return &boardUoWImpl{
		db:         tx,
		boardRepo:  repository.NewBoardRepository(tx),
		statusRepo: repository.NewProjectStatusRepository(tx),
	}, nil
}
