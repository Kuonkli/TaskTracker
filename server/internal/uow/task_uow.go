package uow

import (
	"context"
	"gorm.io/gorm"
	"task-tracker/internal/repository"
)

// TaskUoW - для работы с репозиториями
type TaskUoW interface {
	ProjectRepo() repository.ProjectRepository
	TaskRepo() repository.TaskRepository
	ChangeRepo() repository.ChangeRepository
	CommentRepo() repository.CommentRepository
	TagRepo() repository.TagRepository
}

// TaskUoWTx - то же самое, но с методами транзакции
type TaskUoWTx interface {
	TaskUoW
	Commit(ctx context.Context) error
	Rollback()
}

// taskUoWImpl - одна реализация для всего
type taskUoWImpl struct {
	db          *gorm.DB
	projectRepo repository.ProjectRepository
	taskRepo    repository.TaskRepository
	changeRepo  repository.ChangeRepository
	commentRepo repository.CommentRepository
	tagRepo     repository.TagRepository
}

func (u *taskUoWImpl) ProjectRepo() repository.ProjectRepository { return u.projectRepo }
func (u *taskUoWImpl) TaskRepo() repository.TaskRepository       { return u.taskRepo }
func (u *taskUoWImpl) ChangeRepo() repository.ChangeRepository   { return u.changeRepo }
func (u *taskUoWImpl) CommentRepo() repository.CommentRepository { return u.commentRepo }
func (u *taskUoWImpl) TagRepo() repository.TagRepository         { return u.tagRepo }

func (u *taskUoWImpl) Commit(ctx context.Context) error {
	return u.db.WithContext(ctx).Commit().Error
}

func (u *taskUoWImpl) Rollback() {
	u.db.Rollback()
}

// TaskUoWFactory - фабрика для создания UoW
type TaskUoWFactory interface {
	// New - для операций без транзакции (чтение)
	New() TaskUoW

	// NewTransaction - для операций с транзакцией (запись)
	NewTransaction(ctx context.Context) (TaskUoWTx, error)
}

type taskUoWFactory struct {
	db *gorm.DB
}

func NewTaskUoWFactory(db *gorm.DB) TaskUoWFactory {
	return &taskUoWFactory{db: db}
}

// New - без транзакции
func (f *taskUoWFactory) New() TaskUoW {
	return &taskUoWImpl{
		db:          f.db,
		projectRepo: repository.NewProjectRepository(f.db),
		taskRepo:    repository.NewTaskRepository(f.db),
		changeRepo:  repository.NewChangeRepository(f.db),
		commentRepo: repository.NewCommentRepository(f.db),
		tagRepo:     repository.NewTagRepository(f.db),
	}
}

// NewTransaction - с транзакцией
func (f *taskUoWFactory) NewTransaction(ctx context.Context) (TaskUoWTx, error) {
	tx := f.db.WithContext(ctx).Begin()
	if tx.Error != nil {
		return nil, tx.Error
	}

	// Та же самая структура, но с tx вместо db
	return &taskUoWImpl{
		db:          tx,
		projectRepo: repository.NewProjectRepository(tx),
		taskRepo:    repository.NewTaskRepository(tx),
		changeRepo:  repository.NewChangeRepository(tx),
		commentRepo: repository.NewCommentRepository(tx),
		tagRepo:     repository.NewTagRepository(tx),
	}, nil
}
