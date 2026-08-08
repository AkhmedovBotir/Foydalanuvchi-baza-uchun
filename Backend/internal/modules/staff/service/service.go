package service

import (
	"context"
	"errors"
	"fmt"
	"strings"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"golang.org/x/crypto/bcrypt"

	"github.com/foydalanuvchilar-bazasi/backend/internal/config"
	"github.com/foydalanuvchilar-bazasi/backend/internal/modules/staff/domain"
	"github.com/foydalanuvchilar-bazasi/backend/internal/modules/staff/dto"
	"github.com/foydalanuvchilar-bazasi/backend/internal/modules/staff/repository"
)

type Service struct {
	repo *repository.Repository
	jwt  config.JWTConfig
}

func NewService(repo *repository.Repository, jwtCfg config.JWTConfig) *Service {
	return &Service{repo: repo, jwt: jwtCfg}
}

func (s *Service) LoginRegistrator(ctx context.Context, req dto.LoginRequest) (*dto.RegistratorLoginResponse, error) {
	x, err := s.repo.FindRegistratorByUsername(ctx, strings.TrimSpace(req.Username))
	if err != nil {
		if errors.Is(err, domain.ErrRegistratorNotFound) {
			return nil, domain.ErrInvalidCredentials
		}
		return nil, err
	}
	if err := bcrypt.CompareHashAndPassword([]byte(x.Password), []byte(req.Password)); err != nil {
		return nil, domain.ErrInvalidCredentials
	}
	token, err := s.generateToken(x.ID, x.CompanyID, x.Username, "registrator")
	if err != nil {
		return nil, err
	}
	return &dto.RegistratorLoginResponse{Token: token, Registrator: *registratorDTO(x)}, nil
}

func (s *Service) LoginDoctor(ctx context.Context, req dto.LoginRequest) (*dto.DoctorLoginResponse, error) {
	x, err := s.repo.FindDoctorByUsername(ctx, strings.TrimSpace(req.Username))
	if err != nil {
		if errors.Is(err, domain.ErrDoctorNotFound) {
			return nil, domain.ErrInvalidCredentials
		}
		return nil, err
	}
	if err := bcrypt.CompareHashAndPassword([]byte(x.Password), []byte(req.Password)); err != nil {
		return nil, domain.ErrInvalidCredentials
	}
	token, err := s.generateToken(x.ID, x.CompanyID, x.Username, "doctor")
	if err != nil {
		return nil, err
	}
	return &dto.DoctorLoginResponse{Token: token, Doctor: *doctorDTO(x)}, nil
}

func (s *Service) GetRegistratorProfile(ctx context.Context, id string) (*dto.RegistratorResponse, error) {
	x, err := s.repo.FindRegistratorByID(ctx, id)
	if err != nil {
		return nil, err
	}
	return registratorDTO(x), nil
}

func (s *Service) GetDoctorProfile(ctx context.Context, id string) (*dto.DoctorResponse, error) {
	x, err := s.repo.FindDoctorByID(ctx, id)
	if err != nil {
		return nil, err
	}
	return doctorDTO(x), nil
}

func (s *Service) generateToken(staffID, companyID, username, role string) (string, error) {
	claims := jwt.MapClaims{
		"sub":        staffID,
		"company_id": companyID,
		"username":   username,
		"role":       role,
		"exp":        time.Now().Add(s.jwt.ExpireDuration()).Unix(),
		"iat":        time.Now().Unix(),
	}
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	signed, err := token.SignedString([]byte(s.jwt.Secret))
	if err != nil {
		return "", fmt.Errorf("token yaratishda xatolik: %w", err)
	}
	return signed, nil
}

func (s *Service) CreateRegistrator(ctx context.Context, companyID string, req dto.CreateRegistratorRequest) (*dto.RegistratorResponse, error) {
	if len(req.Password) < 6 {
		return nil, domain.ErrWeakPassword
	}
	hash, err := hashPassword(req.Password)
	if err != nil {
		return nil, err
	}
	x := &domain.Registrator{
		CompanyID: companyID,
		Name:      strings.TrimSpace(req.Name),
		Phone:     strings.TrimSpace(req.Phone),
		Username:  strings.TrimSpace(req.Username),
		Password:  hash,
	}
	if err := s.repo.CreateRegistrator(ctx, x); err != nil {
		return nil, err
	}
	return registratorDTO(x), nil
}

func (s *Service) ListRegistrators(ctx context.Context, companyID string) ([]dto.RegistratorResponse, error) {
	items, err := s.repo.ListRegistrators(ctx, companyID)
	if err != nil {
		return nil, err
	}
	out := make([]dto.RegistratorResponse, 0, len(items))
	for i := range items {
		out = append(out, *registratorDTO(&items[i]))
	}
	return out, nil
}

func (s *Service) GetRegistrator(ctx context.Context, companyID, id string) (*dto.RegistratorResponse, error) {
	x, err := s.repo.GetRegistrator(ctx, companyID, id)
	if err != nil {
		return nil, err
	}
	return registratorDTO(x), nil
}

func (s *Service) UpdateRegistrator(ctx context.Context, companyID, id string, req dto.UpdateRegistratorRequest) (*dto.RegistratorResponse, error) {
	x, err := s.repo.GetRegistrator(ctx, companyID, id)
	if err != nil {
		return nil, err
	}
	x.Name = strings.TrimSpace(req.Name)
	x.Phone = strings.TrimSpace(req.Phone)
	x.Username = strings.TrimSpace(req.Username)
	if req.Password != "" {
		if len(req.Password) < 6 {
			return nil, domain.ErrWeakPassword
		}
		hash, err := hashPassword(req.Password)
		if err != nil {
			return nil, err
		}
		x.Password = hash
	}
	if err := s.repo.UpdateRegistrator(ctx, x); err != nil {
		return nil, err
	}
	return registratorDTO(x), nil
}

func (s *Service) DeleteRegistrator(ctx context.Context, companyID, id string) error {
	return s.repo.DeleteRegistrator(ctx, companyID, id)
}

func (s *Service) CreateDoctor(ctx context.Context, companyID string, req dto.CreateDoctorRequest) (*dto.DoctorResponse, error) {
	if len(req.Password) < 6 {
		return nil, domain.ErrWeakPassword
	}
	hash, err := hashPassword(req.Password)
	if err != nil {
		return nil, err
	}
	x := &domain.Doctor{
		CompanyID: companyID,
		Name:      strings.TrimSpace(req.Name),
		Specialty: strings.TrimSpace(req.Specialty),
		Phone:     strings.TrimSpace(req.Phone),
		Username:  strings.TrimSpace(req.Username),
		Password:  hash,
	}
	if err := s.repo.CreateDoctor(ctx, x); err != nil {
		return nil, err
	}
	return doctorDTO(x), nil
}

func (s *Service) ListDoctors(ctx context.Context, companyID string) ([]dto.DoctorResponse, error) {
	items, err := s.repo.ListDoctors(ctx, companyID)
	if err != nil {
		return nil, err
	}
	out := make([]dto.DoctorResponse, 0, len(items))
	for i := range items {
		out = append(out, *doctorDTO(&items[i]))
	}
	return out, nil
}

func (s *Service) GetDoctor(ctx context.Context, companyID, id string) (*dto.DoctorResponse, error) {
	x, err := s.repo.GetDoctor(ctx, companyID, id)
	if err != nil {
		return nil, err
	}
	return doctorDTO(x), nil
}

func (s *Service) UpdateDoctor(ctx context.Context, companyID, id string, req dto.UpdateDoctorRequest) (*dto.DoctorResponse, error) {
	x, err := s.repo.GetDoctor(ctx, companyID, id)
	if err != nil {
		return nil, err
	}
	x.Name = strings.TrimSpace(req.Name)
	x.Specialty = strings.TrimSpace(req.Specialty)
	x.Phone = strings.TrimSpace(req.Phone)
	x.Username = strings.TrimSpace(req.Username)
	if req.Password != "" {
		if len(req.Password) < 6 {
			return nil, domain.ErrWeakPassword
		}
		hash, err := hashPassword(req.Password)
		if err != nil {
			return nil, err
		}
		x.Password = hash
	}
	if err := s.repo.UpdateDoctor(ctx, x); err != nil {
		return nil, err
	}
	return doctorDTO(x), nil
}

func (s *Service) DeleteDoctor(ctx context.Context, companyID, id string) error {
	return s.repo.DeleteDoctor(ctx, companyID, id)
}

func hashPassword(p string) (string, error) {
	b, err := bcrypt.GenerateFromPassword([]byte(p), bcrypt.DefaultCost)
	if err != nil {
		return "", err
	}
	return string(b), nil
}

func registratorDTO(x *domain.Registrator) *dto.RegistratorResponse {
	return &dto.RegistratorResponse{
		ID: x.ID, CompanyID: x.CompanyID, Name: x.Name, Phone: x.Phone, Username: x.Username,
		CreatedAt: x.CreatedAt.UTC().Format(time.RFC3339),
		UpdatedAt: x.UpdatedAt.UTC().Format(time.RFC3339),
	}
}

func doctorDTO(x *domain.Doctor) *dto.DoctorResponse {
	return &dto.DoctorResponse{
		ID: x.ID, CompanyID: x.CompanyID, Name: x.Name, Specialty: x.Specialty,
		Phone: x.Phone, Username: x.Username,
		CreatedAt: x.CreatedAt.UTC().Format(time.RFC3339),
		UpdatedAt: x.UpdatedAt.UTC().Format(time.RFC3339),
	}
}
