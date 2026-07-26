package service

import (
	"context"
	"errors"
	"fmt"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"golang.org/x/crypto/bcrypt"

	"github.com/foydalanuvchilar-bazasi/backend/internal/config"
	"github.com/foydalanuvchilar-bazasi/backend/internal/modules/company/domain"
	"github.com/foydalanuvchilar-bazasi/backend/internal/modules/company/dto"
	"github.com/foydalanuvchilar-bazasi/backend/internal/modules/company/repository"
)

type CompanyService struct {
	repo *repository.CompanyRepository
	jwt  config.JWTConfig
}

func NewCompanyService(repo *repository.CompanyRepository, jwtCfg config.JWTConfig) *CompanyService {
	return &CompanyService{repo: repo, jwt: jwtCfg}
}

func (s *CompanyService) Create(ctx context.Context, req dto.CreateCompanyRequest) (*dto.CompanyResponse, error) {
	if len(req.Password) < 6 {
		return nil, domain.ErrWeakPassword
	}

	hash, err := hashPassword(req.Password)
	if err != nil {
		return nil, err
	}

	company := &domain.Company{
		Name:     req.Name,
		Phone:    req.Phone,
		Username: req.Username,
		Password: hash,
	}

	if err := s.repo.Create(ctx, company); err != nil {
		return nil, err
	}
	return toResponse(company), nil
}

func (s *CompanyService) List(ctx context.Context) ([]dto.CompanyResponse, error) {
	companies, err := s.repo.FindAll(ctx)
	if err != nil {
		return nil, err
	}

	result := make([]dto.CompanyResponse, 0, len(companies))
	for i := range companies {
		result = append(result, *toResponse(&companies[i]))
	}
	return result, nil
}

func (s *CompanyService) GetByID(ctx context.Context, id string) (*dto.CompanyResponse, error) {
	company, err := s.repo.FindByID(ctx, id)
	if err != nil {
		return nil, err
	}
	return toResponse(company), nil
}

func (s *CompanyService) Update(ctx context.Context, id string, req dto.UpdateCompanyRequest) (*dto.CompanyResponse, error) {
	company, err := s.repo.FindByID(ctx, id)
	if err != nil {
		return nil, err
	}

	company.Name = req.Name
	company.Phone = req.Phone
	company.Username = req.Username

	if req.Password != "" {
		if len(req.Password) < 6 {
			return nil, domain.ErrWeakPassword
		}
		hash, err := hashPassword(req.Password)
		if err != nil {
			return nil, err
		}
		company.Password = hash
	}

	if err := s.repo.Update(ctx, company); err != nil {
		return nil, err
	}
	return toResponse(company), nil
}

func (s *CompanyService) Delete(ctx context.Context, id string) error {
	return s.repo.Delete(ctx, id)
}

func (s *CompanyService) Login(ctx context.Context, req dto.LoginRequest) (*dto.LoginResponse, error) {
	company, err := s.repo.FindByUsername(ctx, req.Username)
	if err != nil {
		if errors.Is(err, domain.ErrCompanyNotFound) {
			return nil, domain.ErrInvalidCredentials
		}
		return nil, err
	}

	if err := bcrypt.CompareHashAndPassword([]byte(company.Password), []byte(req.Password)); err != nil {
		return nil, domain.ErrInvalidCredentials
	}

	token, err := s.generateToken(company.ID, company.Username)
	if err != nil {
		return nil, err
	}

	return &dto.LoginResponse{
		Token:   token,
		Company: *toResponse(company),
	}, nil
}

func (s *CompanyService) GetProfile(ctx context.Context, companyID string) (*dto.CompanyResponse, error) {
	return s.GetByID(ctx, companyID)
}

func (s *CompanyService) UpdateProfile(ctx context.Context, companyID string, req dto.UpdateProfileRequest) (*dto.CompanyResponse, error) {
	return s.Update(ctx, companyID, dto.UpdateCompanyRequest{
		Name:     req.Name,
		Phone:    req.Phone,
		Username: req.Username,
		Password: req.Password,
	})
}

func (s *CompanyService) generateToken(companyID, username string) (string, error) {
	claims := jwt.MapClaims{
		"sub":      companyID,
		"username": username,
		"role":     "company",
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

func toResponse(c *domain.Company) *dto.CompanyResponse {
	return &dto.CompanyResponse{
		ID:        c.ID,
		Name:      c.Name,
		Phone:     c.Phone,
		Username:  c.Username,
		CreatedAt: c.CreatedAt.UTC().Format(time.RFC3339),
		UpdatedAt: c.UpdatedAt.UTC().Format(time.RFC3339),
	}
}
