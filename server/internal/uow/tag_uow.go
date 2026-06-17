package uow

import (
	"context"
	"gorm.io/gorm"
	"task-tracker/internal/repository"
)

// TagUoW - для работы с тегами
type TagUoW interface {
	TagRepo() repository.TagRepository
	ProjectRepo() repository.ProjectRepository
}

// TagUoWTx - с транзакцией
type TagUoWTx interface {
	TagUoW
	Commit(ctx context.Context) error
	Rollback()
}

type tagUoWImpl struct {
	db          *gorm.DB
	tagRepo     repository.TagRepository
	projectRepo repository.ProjectRepository
}

func (u *tagUoWImpl) TagRepo() repository.TagRepository         { return u.tagRepo }
func (u *tagUoWImpl) ProjectRepo() repository.ProjectRepository { return u.projectRepo }

func (u *tagUoWImpl) Commit(ctx context.Context) error {
	return u.db.WithContext(ctx).Commit().Error
}

func (u *tagUoWImpl) Rollback() {
	u.db.Rollback()
}

// TagUoWFactory - фабрика
type TagUoWFactory interface {
	New() TagUoW
	NewTransaction(ctx context.Context) (TagUoWTx, error)
}

type tagUoWFactory struct {
	db *gorm.DB
}

func NewTagUoWFactory(db *gorm.DB) TagUoWFactory {
	return &tagUoWFactory{db: db}
}

func (f *tagUoWFactory) New() TagUoW {
	return &tagUoWImpl{
		db:          f.db,
		tagRepo:     repository.NewTagRepository(f.db),
		projectRepo: repository.NewProjectRepository(f.db),
	}
}

func (f *tagUoWFactory) NewTransaction(ctx context.Context) (TagUoWTx, error) {
	tx := f.db.WithContext(ctx).Begin()
	if tx.Error != nil {
		return nil, tx.Error
	}

	return &tagUoWImpl{
		db:          tx,
		tagRepo:     repository.NewTagRepository(tx),
		projectRepo: repository.NewProjectRepository(tx),
	}, nil
}
