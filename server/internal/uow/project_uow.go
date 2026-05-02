package uow

import (
	"context"
	"gorm.io/gorm"
	"task-tracker/internal/repository"
)

// ProjectUoW - для работы с проектами и участниками
type ProjectUoW interface {
	ProjectRepo() repository.ProjectRepository
	MemberRepo() repository.ProjectMemberRepository
	StatusRepo() repository.ProjectStatusRepository
	TagRepo() repository.TagRepository
	BoardRepo() repository.BoardRepository
	UserRepo() repository.UserRepository
}

// ProjectUoWTx - с транзакцией
type ProjectUoWTx interface {
	ProjectUoW
	Commit(ctx context.Context) error
	Rollback()
}

type projectUoWImpl struct {
	db          *gorm.DB
	projectRepo repository.ProjectRepository
	memberRepo  repository.ProjectMemberRepository
	statusRepo  repository.ProjectStatusRepository
	tagRepo     repository.TagRepository
	boardRepo   repository.BoardRepository
	userRepo    repository.UserRepository
}

func (u *projectUoWImpl) ProjectRepo() repository.ProjectRepository      { return u.projectRepo }
func (u *projectUoWImpl) MemberRepo() repository.ProjectMemberRepository { return u.memberRepo }
func (u *projectUoWImpl) StatusRepo() repository.ProjectStatusRepository { return u.statusRepo }
func (u *projectUoWImpl) TagRepo() repository.TagRepository              { return u.tagRepo }
func (u *projectUoWImpl) BoardRepo() repository.BoardRepository          { return u.boardRepo }
func (u *projectUoWImpl) UserRepo() repository.UserRepository            { return u.userRepo }

func (u *projectUoWImpl) Commit(ctx context.Context) error {
	return u.db.WithContext(ctx).Commit().Error
}

func (u *projectUoWImpl) Rollback() {
	u.db.Rollback()
}

// ProjectUoWFactory - фабрика
type ProjectUoWFactory interface {
	New() ProjectUoW
	NewTransaction(ctx context.Context) (ProjectUoWTx, error)
}

type projectUoWFactory struct {
	db *gorm.DB
}

func NewProjectUoWFactory(db *gorm.DB) ProjectUoWFactory {
	return &projectUoWFactory{db: db}
}

func (f *projectUoWFactory) New() ProjectUoW {
	return &projectUoWImpl{
		db:          f.db,
		projectRepo: repository.NewProjectRepository(f.db),
		memberRepo:  repository.NewProjectMemberRepository(f.db),
		statusRepo:  repository.NewProjectStatusRepository(f.db),
		tagRepo:     repository.NewTagRepository(f.db),
		boardRepo:   repository.NewBoardRepository(f.db),
		userRepo:    repository.NewUserRepository(f.db),
	}
}

func (f *projectUoWFactory) NewTransaction(ctx context.Context) (ProjectUoWTx, error) {
	tx := f.db.WithContext(ctx).Begin()
	if tx.Error != nil {
		return nil, tx.Error
	}

	return &projectUoWImpl{
		db:          tx,
		projectRepo: repository.NewProjectRepository(tx),
		memberRepo:  repository.NewProjectMemberRepository(tx),
		statusRepo:  repository.NewProjectStatusRepository(tx),
		tagRepo:     repository.NewTagRepository(tx),
		boardRepo:   repository.NewBoardRepository(tx),
		userRepo:    repository.NewUserRepository(tx),
	}, nil
}
