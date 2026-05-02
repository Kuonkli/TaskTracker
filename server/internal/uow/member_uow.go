package uow

import (
	"context"
	"gorm.io/gorm"
	"task-tracker/internal/repository"
)

// MemberUoW - для работы с проектами и участниками
type MemberUoW interface {
	ProjectRepo() repository.ProjectRepository
	MemberRepo() repository.ProjectMemberRepository
	UserRepo() repository.UserRepository
	TaskRepo() repository.TaskRepository
	ActivityRepo() repository.ActivityRepository
}

// MemberUoWTx - с транзакцией
type MemberUoWTx interface {
	MemberUoW
	Commit(ctx context.Context) error
	Rollback()
}

type memberUoWImpl struct {
	db           *gorm.DB
	projectRepo  repository.ProjectRepository
	memberRepo   repository.ProjectMemberRepository
	userRepo     repository.UserRepository
	taskRepo     repository.TaskRepository
	activityRepo repository.ActivityRepository
}

func (u *memberUoWImpl) ProjectRepo() repository.ProjectRepository      { return u.projectRepo }
func (u *memberUoWImpl) MemberRepo() repository.ProjectMemberRepository { return u.memberRepo }
func (u *memberUoWImpl) UserRepo() repository.UserRepository            { return u.userRepo }
func (u *memberUoWImpl) TaskRepo() repository.TaskRepository            { return u.taskRepo }
func (u *memberUoWImpl) ActivityRepo() repository.ActivityRepository    { return u.activityRepo }

func (u *memberUoWImpl) Commit(ctx context.Context) error {
	return u.db.WithContext(ctx).Commit().Error
}

func (u *memberUoWImpl) Rollback() {
	u.db.Rollback()
}

// MemberUoWFactory - фабрика
type MemberUoWFactory interface {
	New() MemberUoW
	NewTransaction(ctx context.Context) (MemberUoWTx, error)
}

type memberUoWFactory struct {
	db *gorm.DB
}

func NewMemberUoWFactory(db *gorm.DB) MemberUoWFactory {
	return &memberUoWFactory{db: db}
}

func (f *memberUoWFactory) New() MemberUoW {
	return &memberUoWImpl{
		db:           f.db,
		projectRepo:  repository.NewProjectRepository(f.db),
		memberRepo:   repository.NewProjectMemberRepository(f.db),
		userRepo:     repository.NewUserRepository(f.db),
		taskRepo:     repository.NewTaskRepository(f.db),
		activityRepo: repository.NewActivityRepository(f.db),
	}
}

func (f *memberUoWFactory) NewTransaction(ctx context.Context) (MemberUoWTx, error) {
	tx := f.db.WithContext(ctx).Begin()
	if tx.Error != nil {
		return nil, tx.Error
	}

	return &memberUoWImpl{
		db:           tx,
		projectRepo:  repository.NewProjectRepository(tx),
		memberRepo:   repository.NewProjectMemberRepository(tx),
		userRepo:     repository.NewUserRepository(tx),
		taskRepo:     repository.NewTaskRepository(tx),
		activityRepo: repository.NewActivityRepository(tx),
	}, nil
}
