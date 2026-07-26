package service

import (
	"context"
	"net/url"
	"strings"

	"github.com/foydalanuvchilar-bazasi/backend/internal/modules/setting/domain"
	"github.com/foydalanuvchilar-bazasi/backend/internal/modules/setting/dto"
	"github.com/foydalanuvchilar-bazasi/backend/internal/modules/setting/repository"
)

type SettingService struct {
	repo *repository.SettingRepository
}

func NewSettingService(repo *repository.SettingRepository) *SettingService {
	return &SettingService{repo: repo}
}

func (s *SettingService) GetSurveyLinkBase(ctx context.Context) (*dto.SurveyLinkBaseResponse, error) {
	setting, err := s.repo.Get(ctx, domain.KeySurveyLinkBaseURL)
	if err != nil {
		return nil, err
	}
	return &dto.SurveyLinkBaseResponse{
		Key:       setting.Key,
		BaseURL:   strings.TrimRight(setting.Value, "/"),
		UpdatedAt: setting.UpdatedAt,
	}, nil
}

func (s *SettingService) UpdateSurveyLinkBase(ctx context.Context, req dto.UpdateSurveyLinkBaseRequest) (*dto.SurveyLinkBaseResponse, error) {
	base := strings.TrimSpace(req.BaseURL)
	base = strings.TrimRight(base, "/")

	if err := validateURL(base); err != nil {
		return nil, err
	}

	setting, err := s.repo.Upsert(ctx, domain.KeySurveyLinkBaseURL, base)
	if err != nil {
		return nil, err
	}
	return &dto.SurveyLinkBaseResponse{
		Key:       setting.Key,
		BaseURL:   setting.Value,
		UpdatedAt: setting.UpdatedAt,
	}, nil
}

// GetSurveyLinkBaseURL — boshqa modullar (survey) uchun qisqa helper.
func (s *SettingService) GetSurveyLinkBaseURL(ctx context.Context) (string, error) {
	resp, err := s.GetSurveyLinkBase(ctx)
	if err != nil {
		return "", err
	}
	return resp.BaseURL, nil
}

func validateURL(raw string) error {
	u, err := url.ParseRequestURI(raw)
	if err != nil || u.Scheme == "" || u.Host == "" {
		return domain.ErrInvalidBaseURL
	}
	if u.Scheme != "http" && u.Scheme != "https" {
		return domain.ErrInvalidBaseURL
	}
	return nil
}
