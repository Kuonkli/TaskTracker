package uow

import (
	"context"
	"gorm.io/gorm"
	"task-tracker/internal/repository"
)

// StatusUoW - для работы со статусами
type StatusUoW interface {
	StatusRepo() repository.ProjectStatusRepository
	ProjectRepo() repository.ProjectRepository
}

// StatusUoWTx - с транзакцией
type StatusUoWTx interface {
	StatusUoW
	Commit(ctx context.Context) error
	Rollback()
}

type statusUoWImpl struct {
	db          *gorm.DB
	statusRepo  repository.ProjectStatusRepository
	projectRepo repository.ProjectRepository
}

func (u *statusUoWImpl) StatusRepo() repository.ProjectStatusRepository { return u.statusRepo }
func (u *statusUoWImpl) ProjectRepo() repository.ProjectRepository      { return u.projectRepo }

func (u *statusUoWImpl) Commit(ctx context.Context) error {
	return u.db.WithContext(ctx).Commit().Error
}

func (u *statusUoWImpl) Rollback() {
	u.db.Rollback()
}

// StatusUoWFactory - фабрика
type StatusUoWFactory interface {
	New() StatusUoW
	NewTransaction(ctx context.Context) (StatusUoWTx, error)
}

type statusUoWFactory struct {
	db *gorm.DB
}

func NewStatusUoWFactory(db *gorm.DB) StatusUoWFactory {
	return &statusUoWFactory{db: db}
}

func (f *statusUoWFactory) New() StatusUoW {
	return &statusUoWImpl{
		db:          f.db,
		statusRepo:  repository.NewProjectStatusRepository(f.db),
		projectRepo: repository.NewProjectRepository(f.db),
	}
}

func (f *statusUoWFactory) NewTransaction(ctx context.Context) (StatusUoWTx, error) {
	tx := f.db.WithContext(ctx).Begin()
	if tx.Error != nil {
		return nil, tx.Error
	}

	return &statusUoWImpl{
		db:          tx,
		statusRepo:  repository.NewProjectStatusRepository(tx),
		projectRepo: repository.NewProjectRepository(tx),
	}, nil
}
