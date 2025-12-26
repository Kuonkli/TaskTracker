package service

import (
	"github.com/google/uuid"
	"golang.org/x/crypto/bcrypt"
	"task-tracker/internal/models"
	"task-tracker/internal/repository"
)

type UserService interface {
	Register(email, password, firstName, lastName string) (*models.User, error)
	Login(email, password string) (*models.User, error)
	GetProfile(id uuid.UUID) (*models.User, error)
	UpdateProfile(id uuid.UUID, firstName, lastName string) error
}

type userService struct {
	repo repository.UserRepository
}

func NewUserService(repo repository.UserRepository) UserService {
	return &userService{repo: repo}
}

func (s *userService) Register(email, password, firstName, lastName string) (*models.User, error) {
	hashed, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	if err != nil {
		return nil, err
	}

	user := &models.User{
		Email:     email,
		Password:  string(hashed),
		FirstName: firstName,
		LastName:  lastName,
	}

	err = s.repo.Create(user)
	return user, err
}

func (s *userService) Login(email, password string) (*models.User, error) {
	user, err := s.repo.FindByEmail(email)
	if err != nil {
		return nil, err
	}

	if err := bcrypt.CompareHashAndPassword([]byte(user.Password), []byte(password)); err != nil {
		return nil, err
	}

	return user, nil
}

func (s *userService) GetProfile(id uuid.UUID) (*models.User, error) {
	return s.repo.FindByID(id)
}

func (s *userService) UpdateProfile(id uuid.UUID, firstName, lastName string) error {
	user, err := s.repo.FindByID(id)
	if err != nil {
		return err
	}

	if firstName != "" {
		user.FirstName = firstName
	}
	if lastName != "" {
		user.LastName = lastName
	}

	return s.repo.Update(user)
}
