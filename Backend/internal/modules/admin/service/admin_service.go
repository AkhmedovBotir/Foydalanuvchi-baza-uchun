package service

import (
	"context"
	"errors"
	"fmt"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"golang.org/x/crypto/bcrypt"

	"github.com/foydalanuvchilar-bazasi/backend/internal/config"
	"github.com/foydalanuvchilar-bazasi/backend/internal/modules/admin/domain"
	"github.com/foydalanuvchilar-bazasi/backend/internal/modules/admin/dto"
	"github.com/foydalanuvchilar-bazasi/backend/internal/modules/admin/repository"
)

type AdminService struct {
	repo *repository.AdminRepository
	jwt  config.JWTConfig
}

func NewAdminService(repo *repository.AdminRepository, jwtCfg config.JWTConfig) *AdminService {
	return &AdminService{repo: repo, jwt: jwtCfg}
}

// SeedDefaultAdmin — bazada admin bo'lmasa, boshlang'ich admin yaratadi.
func (s *AdminService) SeedDefaultAdmin(ctx context.Context) error {
	count, err := s.repo.Count(ctx)
	if err != nil {
		return err
	}
	if count > 0 {
		return nil
	}

	_, err = s.Create(ctx, dto.CreateAdminRequest{
		Name:     "Super Admin",
		Phone:    "+998900000000",
		Username: "admin",
		Password: "admin123",
	})
	return err
}

func (s *AdminService) Create(ctx context.Context, req dto.CreateAdminRequest) (*dto.AdminResponse, error) {
	if len(req.Password) < 6 {
		return nil, domain.ErrWeakPassword
	}

	hash, err := hashPassword(req.Password)
	if err != nil {
		return nil, err
	}

	admin := &domain.Admin{
		Name:     req.Name,
		Phone:    req.Phone,
		Username: req.Username,
		Password: hash,
	}

	if err := s.repo.Create(ctx, admin); err != nil {
		return nil, err
	}
	return toResponse(admin), nil
}

func (s *AdminService) List(ctx context.Context) ([]dto.AdminResponse, error) {
	admins, err := s.repo.FindAll(ctx)
	if err != nil {
		return nil, err
	}

	result := make([]dto.AdminResponse, 0, len(admins))
	for i := range admins {
		result = append(result, *toResponse(&admins[i]))
	}
	return result, nil
}

func (s *AdminService) GetByID(ctx context.Context, id string) (*dto.AdminResponse, error) {
	admin, err := s.repo.FindByID(ctx, id)
	if err != nil {
		return nil, err
	}
	return toResponse(admin), nil
}

func (s *AdminService) Update(ctx context.Context, id string, req dto.UpdateAdminRequest) (*dto.AdminResponse, error) {
	admin, err := s.repo.FindByID(ctx, id)
	if err != nil {
		return nil, err
	}

	admin.Name = req.Name
	admin.Phone = req.Phone
	admin.Username = req.Username

	if req.Password != "" {
		if len(req.Password) < 6 {
			return nil, domain.ErrWeakPassword
		}
		hash, err := hashPassword(req.Password)
		if err != nil {
			return nil, err
		}
		admin.Password = hash
	}

	if err := s.repo.Update(ctx, admin); err != nil {
		return nil, err
	}
	return toResponse(admin), nil
}

func (s *AdminService) Delete(ctx context.Context, id string) error {
	return s.repo.Delete(ctx, id)
}

func (s *AdminService) Login(ctx context.Context, req dto.LoginRequest) (*dto.LoginResponse, error) {
	admin, err := s.repo.FindByUsername(ctx, req.Username)
	if err != nil {
		if errors.Is(err, domain.ErrAdminNotFound) {
			return nil, domain.ErrInvalidCredentials
		}
		return nil, err
	}

	if err := bcrypt.CompareHashAndPassword([]byte(admin.Password), []byte(req.Password)); err != nil {
		return nil, domain.ErrInvalidCredentials
	}

	token, err := s.generateToken(admin.ID, admin.Username)
	if err != nil {
		return nil, err
	}

	return &dto.LoginResponse{
		Token: token,
		Admin: *toResponse(admin),
	}, nil
}

func (s *AdminService) GetProfile(ctx context.Context, adminID string) (*dto.AdminResponse, error) {
	return s.GetByID(ctx, adminID)
}

func (s *AdminService) UpdateProfile(ctx context.Context, adminID string, req dto.UpdateProfileRequest) (*dto.AdminResponse, error) {
	return s.Update(ctx, adminID, dto.UpdateAdminRequest{
		Name:     req.Name,
		Phone:    req.Phone,
		Username: req.Username,
		Password: req.Password,
	})
}

func (s *AdminService) generateToken(adminID, username string) (string, error) {
	claims := jwt.MapClaims{
		"sub":      adminID,
		"username": username,
		"role":     "admin",
		"exp":      time.Now().Add(s.jwt.ExpireDuration()).Unix(),
		"iat":      time.Now().Unix(),
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	signed, err := token.SignedString([]byte(s.jwt.Secret))
	if err != nil {
		return "", fmt.Errorf("token yaratishda xatolik: %w", err)
	}
	return signed, nil
}

func hashPassword(password string) (string, error) {
	bytes, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	if err != nil {
		return "", err
	}
	return string(bytes), nil
}

func toResponse(a *domain.Admin) *dto.AdminResponse {
	return &dto.AdminResponse{
		ID:        a.ID,
		Name:      a.Name,
		Phone:     a.Phone,
		Username:  a.Username,
		CreatedAt: a.CreatedAt.UTC().Format(time.RFC3339),
		UpdatedAt: a.UpdatedAt.UTC().Format(time.RFC3339),
	}
}
