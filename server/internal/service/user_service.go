package service

import (
	"context"
	"crypto/md5"
	"fmt"
	"github.com/google/uuid"
	"golang.org/x/crypto/bcrypt"
	"math"
	"task-tracker/internal/dto"
	"task-tracker/internal/models"
	"task-tracker/internal/uow"
	"task-tracker/pkg/exceptions"
)

type UserService interface {
	Register(ctx context.Context, req dto.RegisterRequest) (*models.User, error)
	Login(ctx context.Context, email, password string) (*models.User, error)
	GetProfile(ctx context.Context, id uuid.UUID) (*models.User, error)
	UpdateProfile(ctx context.Context, id uuid.UUID, req dto.UpdateProfileRequest) error
	SearchUser(ctx context.Context, query string) ([]models.User, error)
}

type userService struct {
	uowFactory uow.UserUoWFactory
}

func NewUserService(uowFactory uow.UserUoWFactory) UserService {
	return &userService{uowFactory: uowFactory}
}

func (s *userService) Register(ctx context.Context, req dto.RegisterRequest) (*models.User, error) {
	uowTx, err := s.uowFactory.NewTransaction(ctx)
	if err != nil {
		return nil, err
	}
	// Проверка существования email
	if existing, _ := uowTx.UserRepo().FindByEmail(ctx, req.Email); existing != nil {
		return nil, exceptions.ErrUserAlreadyExists
	}

	// Проверка существования никнейма
	if existing, _ := uowTx.UserRepo().FindByNickname(ctx, req.Nickname); existing != nil {
		return nil, exceptions.ErrNicknameTaken
	}

	// Проверка сложности пароля (опционально)
	if len(req.Password) < 6 {
		return nil, exceptions.ErrPasswordTooWeak
	}

	// Хеширование пароля
	hashed, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		return nil, exceptions.ErrFailedToHash
	}

	user := &models.User{
		Email:        req.Email,
		PasswordHash: string(hashed),
		FirstName:    req.FirstName,
		LastName:     req.LastName,
		Nickname:     req.Nickname,
		Color:        generateColorFromNickname(req.Nickname),
	}

	err = uowTx.UserRepo().Create(ctx, user)
	if err != nil {
		return nil, exceptions.ErrFailedToCreateUser
	}

	if err = uowTx.Commit(ctx); err != nil {
		return nil, err
	}

	return user, nil
}

func generateColorFromNickname(nickname string) string {
	hash := md5.Sum([]byte(nickname))

	// Используем больше байт для лучшего распределения
	hue := float64(hash[0]^hash[1]) / 255.0

	// Яркость: фиксируем на 65% (оптимальная яркость)
	lightness := 0.65

	// Насыщенность: от 65% до 85%
	saturation := 0.65 + (float64(hash[2]^hash[3])/255.0)*0.2

	// Добавляем небольшое смещение яркости на основе хэша, но в узком диапазоне
	lightnessOffset := (float64(hash[4]^hash[5])/255.0 - 0.5) * 0.1
	lightness += lightnessOffset

	// Ограничиваем диапазон яркости
	if lightness < 0.55 {
		lightness = 0.55
	}
	if lightness > 0.75 {
		lightness = 0.75
	}

	return hslToHex(hue, saturation, lightness)
}

func hslToHex(h, s, l float64) string {
	// Конвертация HSL в RGB
	var r, g, b float64

	if s == 0 {
		r, g, b = l, l, l
	} else {
		var q float64
		if l < 0.5 {
			q = l * (1 + s)
		} else {
			q = l + s - l*s
		}
		p := 2*l - q

		r = hueToRgb(p, q, h+1.0/3.0)
		g = hueToRgb(p, q, h)
		b = hueToRgb(p, q, h-1.0/3.0)
	}

	// Конвертируем в HEX
	return fmt.Sprintf("#%02X%02X%02X",
		int(math.Round(r*255)),
		int(math.Round(g*255)),
		int(math.Round(b*255)))
}

func hueToRgb(p, q, t float64) float64 {
	if t < 0 {
		t += 1
	}
	if t > 1 {
		t -= 1
	}
	if t < 1.0/6.0 {
		return p + (q-p)*6*t
	}
	if t < 1.0/2.0 {
		return q
	}
	if t < 2.0/3.0 {
		return p + (q-p)*(2.0/3.0-t)*6
	}
	return p
}

func (s *userService) Login(ctx context.Context, email, password string) (*models.User, error) {
	uowTx, err := s.uowFactory.NewTransaction(ctx)
	if err != nil {
		return nil, err
	}
	user, err := uowTx.UserRepo().FindByEmail(ctx, email)
	if err != nil {
		return nil, exceptions.ErrInvalidCredentials
	}

	if err = bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(password)); err != nil {
		return nil, exceptions.ErrInvalidCredentials
	}

	if err = uowTx.Commit(ctx); err != nil {
		return nil, err
	}

	return user, nil
}

func (s *userService) GetProfile(ctx context.Context, id uuid.UUID) (*models.User, error) {
	w := s.uowFactory.New()
	user, err := w.UserRepo().FindByID(ctx, id)
	if err != nil {
		return nil, exceptions.ErrUserNotFound
	}
	return user, nil
}

func (s *userService) UpdateProfile(ctx context.Context, id uuid.UUID, req dto.UpdateProfileRequest) error {
	uowTx, err := s.uowFactory.NewTransaction(ctx)
	if err != nil {
		return err
	}
	user, err := uowTx.UserRepo().FindByID(ctx, id)
	if err != nil {
		return exceptions.ErrUserNotFound
	}

	if req.FirstName != "" {
		user.FirstName = req.FirstName
	}
	if req.LastName != "" {
		user.LastName = req.LastName
	}
	if req.Nickname != "" && req.Nickname != user.Nickname {
		// Проверка, что никнейм не занят
		if existing, _ := uowTx.UserRepo().FindByNickname(ctx, req.Nickname); existing != nil {
			return exceptions.ErrNicknameTaken
		}
		user.Nickname = req.Nickname
	}
	if req.Bio != nil {
		user.Bio = req.Bio
	}
	if req.AvatarURL != nil {
		user.AvatarURL = req.AvatarURL
	}

	if err = uowTx.UserRepo().Update(ctx, user); err != nil {
		return err
	}

	if err = uowTx.Commit(ctx); err != nil {
		return err
	}

	return nil
}

func (s *userService) SearchUser(ctx context.Context, query string) ([]models.User, error) {
	w := s.uowFactory.New()
	filter := dto.UserFilter{
		Search: query,
	}
	return w.UserRepo().List(ctx, filter, 50, 0)
}
