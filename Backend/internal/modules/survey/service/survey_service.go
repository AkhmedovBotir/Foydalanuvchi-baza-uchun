package service

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"mime/multipart"
	"regexp"
	"strings"
	"time"

	settingService "github.com/foydalanuvchilar-bazasi/backend/internal/modules/setting/service"
	"github.com/foydalanuvchilar-bazasi/backend/internal/modules/survey/domain"
	"github.com/foydalanuvchilar-bazasi/backend/internal/modules/survey/dto"
	"github.com/foydalanuvchilar-bazasi/backend/internal/modules/survey/repository"
	"github.com/foydalanuvchilar-bazasi/backend/internal/platform/upload"
)

var (
	ErrInvalidSurvey = errors.New("so'rovnoma ma'lumotlari noto'g'ri")
	ErrSurveyClosed  = errors.New("yopilgan so'rovnomani tahrirlab bo'lmaydi")
	ErrNotDraft      = errors.New("faqat draft so'rovnoma nashr qilinadi")
	ErrNotPublished  = errors.New("faqat published so'rovnoma yopiladi")
	ErrNotAccepting  = errors.New("so'rovnoma javob qabul qilmayapti")
)
var slugPattern = regexp.MustCompile(`^[a-z0-9]+(?:-[a-z0-9]+)*$`)

type SurveyService struct {
	repo     *repository.SurveyRepository
	settings *settingService.SettingService
	storage  *upload.Storage
}

func NewSurveyService(repo *repository.SurveyRepository, settings *settingService.SettingService, storage *upload.Storage) *SurveyService {
	return &SurveyService{repo: repo, settings: settings, storage: storage}
}

func (s *SurveyService) Create(ctx context.Context, companyID string, req dto.CreateSurveyRequest) (*dto.SurveyResponse, error) {
	if err := validateRequest(req); err != nil {
		return nil, err
	}
	exists, err := s.repo.SlugExists(ctx, req.Slug, "")
	if err != nil {
		return nil, err
	}
	if exists {
		return nil, fmt.Errorf("%w: slug mavjud", ErrInvalidSurvey)
	}
	survey := &domain.Survey{CompanyID: companyID, Title: strings.TrimSpace(req.Title), Description: strings.TrimSpace(req.Description), Slug: strings.TrimSpace(req.Slug), Settings: normalSettings(req.Settings), Questions: req.Questions, Status: domain.SurveyStatusDraft, SortOrder: req.SortOrder}
	if err := s.repo.Create(ctx, survey); err != nil {
		return nil, err
	}
	return s.toResponse(ctx, survey, true)
}

func (s *SurveyService) List(ctx context.Context, companyID string) ([]dto.SurveyResponse, error) {
	items, err := s.repo.FindByCompany(ctx, companyID)
	if err != nil {
		return nil, err
	}

	base, err := s.settings.GetSurveyLinkBaseURL(ctx)
	if err != nil {
		return nil, err
	}

	result := make([]dto.SurveyResponse, 0, len(items))
	for i := range items {
		result = append(result, *toResponseWithBase(&items[i], base, false))
	}
	return result, nil
}

func (s *SurveyService) GetByID(ctx context.Context, companyID, id string) (*dto.SurveyResponse, error) {
	survey, err := s.repo.FindByRef(ctx, companyID, id)
	if err != nil {
		return nil, err
	}
	return s.toResponse(ctx, survey, true)
}

func (s *SurveyService) Update(ctx context.Context, companyID, id string, req dto.UpdateSurveyRequest) (*dto.SurveyResponse, error) {
	survey, err := s.repo.FindByRef(ctx, companyID, id)
	if err != nil {
		return nil, err
	}
	if survey.Status == domain.SurveyStatusClosed {
		return nil, ErrSurveyClosed
	}
	if err := validateRequest(req); err != nil {
		return nil, err
	}
	exists, err := s.repo.SlugExists(ctx, req.Slug, survey.ID)
	if err != nil {
		return nil, err
	}
	if exists {
		return nil, ErrInvalidSurvey
	}
	survey.Title = strings.TrimSpace(req.Title)
	survey.Description = strings.TrimSpace(req.Description)
	survey.Slug = strings.TrimSpace(req.Slug)
	survey.Settings = normalSettings(req.Settings)
	survey.Questions = req.Questions
	survey.SortOrder = req.SortOrder

	if err := s.repo.Update(ctx, survey); err != nil {
		return nil, err
	}
	return s.toResponse(ctx, survey, true)
}

func (s *SurveyService) Delete(ctx context.Context, companyID, id string) error {
	survey, err := s.repo.FindByRef(ctx, companyID, id)
	if err != nil {
		return err
	}
	return s.repo.Delete(ctx, companyID, survey.ID)
}

func (s *SurveyService) Publish(ctx context.Context, companyID, id string) (*dto.SurveyResponse, error) {
	x, err := s.repo.FindByRef(ctx, companyID, id)
	if err != nil {
		return nil, err
	}
	if x.Status != domain.SurveyStatusDraft {
		return nil, ErrNotDraft
	}
	if answerable(x.Questions) == 0 {
		return nil, ErrInvalidSurvey
	}
	x, err = s.repo.Publish(ctx, companyID, x.ID)
	if err != nil {
		return nil, err
	}
	return s.toResponse(ctx, x, true)
}
func (s *SurveyService) Close(ctx context.Context, companyID, id string) (*dto.SurveyResponse, error) {
	x, err := s.repo.FindByRef(ctx, companyID, id)
	if err != nil {
		return nil, err
	}
	if x.Status != domain.SurveyStatusPublished {
		return nil, ErrNotPublished
	}
	x, err = s.repo.Close(ctx, companyID, x.ID)
	if err != nil {
		return nil, err
	}
	return s.toResponse(ctx, x, true)
}
func (s *SurveyService) FileFormats() []domain.SurveyFileFormat { return domain.SurveyFileFormats }
func (s *SurveyService) toResponse(ctx context.Context, survey *domain.Survey, full bool) (*dto.SurveyResponse, error) {
	base, err := s.settings.GetSurveyLinkBaseURL(ctx)
	if err != nil {
		return nil, err
	}
	return toResponseWithBase(survey, base, full), nil
}

func toResponseWithBase(x *domain.Survey, base string, full bool) *dto.SurveyResponse {
	r := &dto.SurveyResponse{
		ID: x.ID, CompanyID: x.CompanyID, Slug: x.Slug, Title: x.Title, Description: x.Description,
		Status: x.Status, SortOrder: x.SortOrder, QuestionCount: answerable(x.Questions),
		ResponseURL:      strings.TrimRight(base, "/") + "/surveys/" + x.Slug,
		RespondentFields: dto.DefaultRespondentFields(),
		CreatedAt:        x.CreatedAt.UTC().Format(time.RFC3339),
		UpdatedAt:        x.UpdatedAt.UTC().Format(time.RFC3339),
	}
	if x.PublishedAt != nil {
		r.PublishedAt = x.PublishedAt.UTC().Format(time.RFC3339)
	}
	if x.ClosedAt != nil {
		r.ClosedAt = x.ClosedAt.UTC().Format(time.RFC3339)
	}
	if full {
		r.Settings = x.Settings
		r.Questions = x.Questions
	}
	return r
}

func (s *SurveyService) PublicList(ctx context.Context) ([]dto.PublicSurveyListItem, error) {
	items, err := s.repo.ListPublished(ctx)
	if err != nil {
		return nil, err
	}
	out := make([]dto.PublicSurveyListItem, 0, len(items))
	for _, x := range items {
		out = append(out, dto.PublicSurveyListItem{ID: x.Slug, Title: x.Title, Description: x.Description, QuestionCount: answerable(x.Questions)})
	}
	return out, nil
}
func (s *SurveyService) PublicGet(ctx context.Context, id string) (*dto.PublicSurveyResponse, error) {
	x, err := s.repo.PublicByRef(ctx, id)
	if err != nil {
		return nil, err
	}
	return &dto.PublicSurveyResponse{
		ID:               x.Slug,
		Title:            x.Title,
		Description:      x.Description,
		Settings:         publicSettings(x.Settings),
		Questions:        x.Questions,
		Status:           x.Status,
		RespondentFields: dto.DefaultRespondentFields(),
	}, nil
}

// FormGet — tokensiz forma: faqat published/closed so'rovnomani qaytaradi.
func (s *SurveyService) FormGet(ctx context.Context, slug string) (*dto.PublicSurveyResponse, error) {
	return s.PublicGet(ctx, slug)
}

func (s *SurveyService) FormSubmit(ctx context.Context, slug string, req dto.FormSubmitRequest) (*dto.FormSubmitResult, error) {
	name := strings.TrimSpace(req.Name)
	phone := strings.TrimSpace(req.Phone)
	if name == "" || len(name) < 2 {
		return nil, fmt.Errorf("%w: ism majburiy", ErrInvalidSurvey)
	}
	if phone == "" || len(phone) < 9 {
		return nil, fmt.Errorf("%w: telefon majburiy", ErrInvalidSurvey)
	}

	x, err := s.repo.PublicByRef(ctx, slug)
	if err != nil {
		return nil, err
	}
	if x.Status != domain.SurveyStatusPublished {
		return nil, ErrNotAccepting
	}
	answers, err := validateAnswers(x.Questions, req.Answers)
	if err != nil {
		return nil, err
	}
	r, err := s.repo.CreateResponse(ctx, x.ID, name, phone, answers)
	if err != nil {
		return nil, err
	}
	return &dto.FormSubmitResult{
		ID:                  r.ID,
		Name:                r.RespondentName,
		Phone:               r.RespondentPhone,
		ConfirmationMessage: confirmation(x.Settings),
		CreatedAt:           r.CreatedAt.UTC().Format(time.RFC3339),
	}, nil
}

func (s *SurveyService) Submit(ctx context.Context, id string, req dto.SubmitSurveyResponseRequest) (*dto.SubmitSurveyResponseResult, error) {
	result, err := s.FormSubmit(ctx, id, dto.FormSubmitRequest{
		Name:    req.Name,
		Phone:   req.Phone,
		Answers: req.Answers,
	})
	if err != nil {
		return nil, err
	}
	return &dto.SubmitSurveyResponseResult{
		ID:                  result.ID,
		Name:                result.Name,
		Phone:               result.Phone,
		ConfirmationMessage: result.ConfirmationMessage,
		CreatedAt:           result.CreatedAt,
	}, nil
}
func (s *SurveyService) Upload(ctx context.Context, id, questionID string, file *multipart.FileHeader) (*upload.SavedFile, error) {
	x, err := s.repo.PublicByRef(ctx, id)
	if err != nil {
		return nil, err
	}
	if x.Status != domain.SurveyStatusPublished {
		return nil, ErrNotAccepting
	}
	var qs []struct {
		ID, Type string
		Config   struct {
			MaxFileSizeMb     int      `json:"maxFileSizeMb"`
			AllowedExtensions []string `json:"allowedExtensions"`
		} `json:"config"`
	}
	if json.Unmarshal(x.Questions, &qs) != nil {
		return nil, ErrInvalidSurvey
	}
	for _, q := range qs {
		if q.ID == questionID && domain.IsSurveyFileType(q.Type) {
			allowed := map[string]struct{}{}
			for _, e := range q.Config.AllowedExtensions {
				allowed["."+strings.TrimPrefix(strings.ToLower(e), ".")] = struct{}{}
			}
			return s.storage.SaveSurveyResponseFile(file, allowed, int64(q.Config.MaxFileSizeMb)*1024*1024)
		}
	}
	return nil, ErrInvalidSurvey
}
