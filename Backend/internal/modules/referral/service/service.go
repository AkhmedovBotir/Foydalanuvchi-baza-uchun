package service

import (
	"context"
	"strings"
	"time"

	"github.com/foydalanuvchilar-bazasi/backend/internal/modules/referral/domain"
	"github.com/foydalanuvchilar-bazasi/backend/internal/modules/referral/dto"
	"github.com/foydalanuvchilar-bazasi/backend/internal/modules/referral/repository"
)

type Settings interface {
	GetSurveyLinkBaseURL(ctx context.Context) (string, error)
}

type Service struct {
	repo     *repository.Repository
	settings Settings
}

func NewService(repo *repository.Repository, settings Settings) *Service {
	return &Service{repo: repo, settings: settings}
}

func (s *Service) Create(ctx context.Context, companyID string, req dto.CreateReferralRequest) (*dto.ReferralResponse, error) {
	name := strings.TrimSpace(req.Name)
	phone := strings.TrimSpace(req.Phone)
	specialty := strings.TrimSpace(req.Specialty)
	if len(name) < 2 || len(phone) < 9 || len(specialty) < 2 {
		return nil, domain.ErrInvalidInput
	}
	x := &domain.Referral{
		CompanyID: companyID,
		Name:      name,
		Phone:     phone,
		Specialty: specialty,
	}
	if sid := strings.TrimSpace(req.ServiceID); sid != "" {
		ok, err := s.repo.ServiceBelongs(ctx, companyID, sid)
		if err != nil {
			return nil, err
		}
		if !ok {
			return nil, domain.ErrInvalidInput
		}
		x.ServiceID = &sid
	}
	if err := s.repo.Create(ctx, x); err != nil {
		return nil, err
	}
	return s.Get(ctx, companyID, x.ID)
}

func (s *Service) List(ctx context.Context, companyID string) ([]dto.ReferralResponse, error) {
	items, err := s.repo.List(ctx, companyID)
	if err != nil {
		return nil, err
	}
	base, _ := s.baseURL(ctx)
	out := make([]dto.ReferralResponse, 0, len(items))
	for i := range items {
		out = append(out, *toDTO(&items[i], base))
	}
	return out, nil
}

func (s *Service) Get(ctx context.Context, companyID, id string) (*dto.ReferralResponse, error) {
	x, err := s.repo.Get(ctx, companyID, id)
	if err != nil {
		return nil, err
	}
	base, _ := s.baseURL(ctx)
	return toDTO(x, base), nil
}

func (s *Service) Update(ctx context.Context, companyID, id string, req dto.UpdateReferralRequest) (*dto.ReferralResponse, error) {
	x, err := s.repo.Get(ctx, companyID, id)
	if err != nil {
		return nil, err
	}
	x.Name = strings.TrimSpace(req.Name)
	x.Phone = strings.TrimSpace(req.Phone)
	x.Specialty = strings.TrimSpace(req.Specialty)
	if len(x.Name) < 2 || len(x.Phone) < 9 || len(x.Specialty) < 2 {
		return nil, domain.ErrInvalidInput
	}
	if sid := strings.TrimSpace(req.ServiceID); sid != "" {
		ok, err := s.repo.ServiceBelongs(ctx, companyID, sid)
		if err != nil {
			return nil, err
		}
		if !ok {
			return nil, domain.ErrInvalidInput
		}
		x.ServiceID = &sid
	} else {
		x.ServiceID = nil
	}
	if err := s.repo.Update(ctx, x); err != nil {
		return nil, err
	}
	return s.Get(ctx, companyID, id)
}

func (s *Service) Delete(ctx context.Context, companyID, id string) error {
	return s.repo.Delete(ctx, companyID, id)
}

func (s *Service) AttachCard(ctx context.Context, companyID, id string, req dto.AttachCardRequest) (*dto.ReferralResponse, error) {
	cardID := strings.TrimSpace(req.CardID)
	if cardID == "" {
		return nil, domain.ErrInvalidInput
	}
	ok, err := s.repo.CardBelongs(ctx, companyID, cardID)
	if err != nil {
		return nil, err
	}
	if !ok {
		return nil, domain.ErrInvalidInput
	}
	x, err := s.repo.Get(ctx, companyID, id)
	if err != nil {
		return nil, err
	}
	var serviceID *string
	if sid := strings.TrimSpace(req.ServiceID); sid != "" {
		ok, err := s.repo.ServiceBelongs(ctx, companyID, sid)
		if err != nil {
			return nil, err
		}
		if !ok {
			return nil, domain.ErrInvalidInput
		}
		serviceID = &sid
	} else if x.ServiceID == nil || *x.ServiceID == "" {
		return nil, domain.ErrInvalidInput // QR uchun qabul kerak
	}
	// boshqa referallardan bu kartani yech
	_ = s.repo.ClearCardByCardID(ctx, companyID, cardID)
	if err := s.repo.SetCard(ctx, companyID, id, &cardID, serviceID); err != nil {
		return nil, err
	}
	return s.Get(ctx, companyID, id)
}

func (s *Service) DetachCard(ctx context.Context, companyID, id string) (*dto.ReferralResponse, error) {
	if err := s.repo.ClearCard(ctx, companyID, id); err != nil {
		return nil, err
	}
	return s.Get(ctx, companyID, id)
}

func (s *Service) baseURL(ctx context.Context) (string, error) {
	if s.settings == nil {
		return "http://localhost:5174", nil
	}
	u, err := s.settings.GetSurveyLinkBaseURL(ctx)
	if err != nil {
		return "http://localhost:5174", nil
	}
	return strings.TrimRight(u, "/"), nil
}

func toDTO(x *domain.Referral, base string) *dto.ReferralResponse {
	out := &dto.ReferralResponse{
		ID: x.ID, CompanyID: x.CompanyID, Name: x.Name, Phone: x.Phone, Specialty: x.Specialty,
		ServiceID: x.ServiceID, ServiceSlug: x.ServiceSlug, ServiceTitle: x.ServiceTitle,
		CardID: x.CardID,
		CreatedAt: x.CreatedAt.UTC().Format(time.RFC3339),
		UpdatedAt: x.UpdatedAt.UTC().Format(time.RFC3339),
	}
	if x.ServiceSlug != "" {
		out.BookingURL = base + "/book/" + x.ServiceSlug + "?ref=" + x.ID
	}
	return out
}
