package uow

import (
	"context"
	"gorm.io/gorm"
	"task-tracker/internal/repository"
)

// UserUoW - для работы с пользователями
type UserUoW interface {
	UserRepo() repository.UserRepository
}

// UserUoWTx - с транзакцией
type UserUoWTx interface {
	UserUoW
	Commit(ctx context.Context) error
	Rollback()
}

type userUoWImpl struct {
	db       *gorm.DB
	userRepo repository.UserRepository
}

func (u *userUoWImpl) UserRepo() repository.UserRepository {
	return u.userRepo
}

func (u *userUoWImpl) Commit(ctx context.Context) error {
	return u.db.WithContext(ctx).Commit().Error
}

func (u *userUoWImpl) Rollback() {
	u.db.Rollback()
}

// UserUoWFactory - фабрика
type UserUoWFactory interface {
	New() UserUoW
	NewTransaction(ctx context.Context) (UserUoWTx, error)
}

type userUoWFactory struct {
	db *gorm.DB
}

func NewUserUoWFactory(db *gorm.DB) UserUoWFactory {
	return &userUoWFactory{db: db}
}

func (f *userUoWFactory) New() UserUoW {
	return &userUoWImpl{
		db:       f.db,
		userRepo: repository.NewUserRepository(f.db),
	}
}

func (f *userUoWFactory) NewTransaction(ctx context.Context) (UserUoWTx, error) {
	tx := f.db.WithContext(ctx).Begin()
	if tx.Error != nil {
		return nil, tx.Error
	}

	return &userUoWImpl{
		db:       tx,
		userRepo: repository.NewUserRepository(tx),
	}, nil
}
