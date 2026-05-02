package uow

import (
	"context"
	"gorm.io/gorm"
	"task-tracker/internal/repository"
)

// ActivityUoW - для работы с активностью (комментарии и изменения)
type ActivityUoW interface {
	ActivityRepo() repository.ActivityRepository
	CommentRepo() repository.CommentRepository
	ChangeRepo() repository.ChangeRepository
	TaskRepo() repository.TaskRepository
}

// ActivityUoWTx - с транзакцией
type ActivityUoWTx interface {
	ActivityUoW
	Commit(ctx context.Context) error
	Rollback()
}

type activityUoWImpl struct {
	db           *gorm.DB
	activityRepo repository.ActivityRepository
	commentRepo  repository.CommentRepository
	changeRepo   repository.ChangeRepository
	taskRepo     repository.TaskRepository
}

func (u *activityUoWImpl) ActivityRepo() repository.ActivityRepository { return u.activityRepo }
func (u *activityUoWImpl) CommentRepo() repository.CommentRepository   { return u.commentRepo }
func (u *activityUoWImpl) ChangeRepo() repository.ChangeRepository     { return u.changeRepo }
func (u *activityUoWImpl) TaskRepo() repository.TaskRepository         { return u.taskRepo }

func (u *activityUoWImpl) Commit(ctx context.Context) error {
	return u.db.WithContext(ctx).Commit().Error
}

func (u *activityUoWImpl) Rollback() {
	u.db.Rollback()
}

// ActivityUoWFactory - фабрика
type ActivityUoWFactory interface {
	New() ActivityUoW
	NewTransaction(ctx context.Context) (ActivityUoWTx, error)
}

type activityUoWFactory struct {
	db *gorm.DB
}

func NewActivityUoWFactory(db *gorm.DB) ActivityUoWFactory {
	return &activityUoWFactory{db: db}
}

func (f *activityUoWFactory) New() ActivityUoW {
	return &activityUoWImpl{
		db:           f.db,
		activityRepo: repository.NewActivityRepository(f.db),
		commentRepo:  repository.NewCommentRepository(f.db),
		changeRepo:   repository.NewChangeRepository(f.db),
		taskRepo:     repository.NewTaskRepository(f.db),
	}
}

func (f *activityUoWFactory) NewTransaction(ctx context.Context) (ActivityUoWTx, error) {
	tx := f.db.WithContext(ctx).Begin()
	if tx.Error != nil {
		return nil, tx.Error
	}

	return &activityUoWImpl{
		db:          tx,
		commentRepo: repository.NewCommentRepository(tx),
		changeRepo:  repository.NewChangeRepository(tx),
		taskRepo:    repository.NewTaskRepository(tx),
	}, nil
}
