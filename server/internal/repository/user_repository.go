package repository

import (
	"context"
	"errors"
	"github.com/google/uuid"
	"gorm.io/gorm"
	"task-tracker/internal/dto"
	"task-tracker/internal/models"
	"task-tracker/pkg/exceptions"
)

type UserRepository interface {
	Create(ctx context.Context, user *models.User) error
	FindByID(ctx context.Context, id uuid.UUID) (*models.User, error)
	FindByEmail(ctx context.Context, email string) (*models.User, error)
	FindByNickname(ctx context.Context, nickname string) (*models.User, error)
	Update(ctx context.Context, user *models.User) error
	Delete(ctx context.Context, id uuid.UUID) error
	List(ctx context.Context, filter dto.UserFilter, limit, offset int) ([]models.User, error)
	SearchUsers(ctx context.Context, query string, limit int) ([]models.User, error)
}

type userRepo struct {
	db *gorm.DB
}

func NewUserRepository(db *gorm.DB) UserRepository {
	return &userRepo{db: db}
}

func (r *userRepo) Create(ctx context.Context, user *models.User) error {
	return r.db.WithContext(ctx).Create(user).Error
}

func (r *userRepo) FindByID(ctx context.Context, id uuid.UUID) (*models.User, error) {
	var user models.User
	err := r.db.WithContext(ctx).First(&user, "id = ?", id).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, exceptions.ErrUserNotFound
		}
		return nil, err
	}
	return &user, nil
}

func (r *userRepo) FindByEmail(ctx context.Context, email string) (*models.User, error) {
	var user models.User
	err := r.db.WithContext(ctx).Where("email = ?", email).First(&user).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, exceptions.ErrUserNotFound
		}
		return nil, err
	}
	return &user, nil
}

func (r *userRepo) FindByNickname(ctx context.Context, nickname string) (*models.User, error) {
	var user models.User
	err := r.db.WithContext(ctx).Where("nickname = ?", nickname).First(&user).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, exceptions.ErrUserNotFound
		}
		return nil, err
	}
	return &user, nil
}

func (r *userRepo) Update(ctx context.Context, user *models.User) error {
	return r.db.WithContext(ctx).Save(user).Error
}

func (r *userRepo) Delete(ctx context.Context, id uuid.UUID) error {
	return r.db.WithContext(ctx).Delete(&models.User{}, "id = ?", id).Error
}

func (r *userRepo) List(ctx context.Context, filter dto.UserFilter, limit, offset int) ([]models.User, error) {
	var users []models.User
	query := r.db.WithContext(ctx)

	if filter.Email != "" {
		query = query.Where("email ILIKE ?", "%"+filter.Email+"%")
	}
	if filter.FirstName != "" {
		query = query.Where("first_name ILIKE ?", "%"+filter.FirstName+"%")
	}
	if filter.LastName != "" {
		query = query.Where("last_name ILIKE ?", "%"+filter.LastName+"%")
	}
	if filter.Nickname != "" {
		query = query.Where("nickname ILIKE ?", "%"+filter.Nickname+"%")
	}
	if filter.Search != "" {
		searchTerm := "%" + filter.Search + "%"
		query = query.Where("nickname ILIKE ?", searchTerm).
			Or("email ILIKE ?", searchTerm).
			Or("CONCAT(first_name, ' ', last_name) ILIKE ?", searchTerm)
	}

	err := query.
		Order("created_at DESC").
		Limit(limit).
		Offset(offset).
		Find(&users).Error

	return users, err
}

func (r *userRepo) SearchUsers(ctx context.Context, query string, limit int) ([]models.User, error) {
	var users []models.User
	err := r.db.WithContext(ctx).Where("email ILIKE ? OR first_name ILIKE ? OR last_name ILIKE ? OR nickname ILIKE ?",
		"%"+query+"%", "%"+query+"%", "%"+query+"%", "%"+query+"%").
		Limit(limit).
		Find(&users).Error
	return users, err
}
