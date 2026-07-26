package service

import (
	"context"
	"time"

	"github.com/foydalanuvchilar-bazasi/backend/internal/modules/survey/dto"
)

func (s *SurveyService) ListResponses(ctx context.Context, companyID, surveyRef string, page, limit int) (*dto.SurveyResponseList, error) {
	surveyID := ""
	if surveyRef != "" {
		x, err := s.repo.FindByRef(ctx, companyID, surveyRef)
		if err != nil {
			return nil, err
		}
		surveyID = x.ID
	}
	rows, total, err := s.repo.ListResponses(ctx, companyID, surveyID, page, limit)
	if err != nil {
		return nil, err
	}
	out := make([]dto.SurveyResponseItem, 0, len(rows))
	for _, r := range rows {
		x, err := s.repo.FindByRef(ctx, companyID, r.SurveyID)
		if err != nil {
			return nil, err
		}
		out = append(out, dto.SurveyResponseItem{
			ID: r.ID, SurveyID: r.SurveyID, SurveySlug: x.Slug, SurveyTitle: x.Title,
			RespondentName: r.RespondentName, RespondentPhone: r.RespondentPhone,
			Answers: r.Answers, CreatedAt: r.CreatedAt.UTC().Format(time.RFC3339),
		})
	}
	if page < 1 {
		page = 1
	}
	if limit < 1 || limit > 100 {
		limit = 20
	}
	return &dto.SurveyResponseList{Data: out, Total: total, Page: page, Limit: limit}, nil
}
func (s *SurveyService) GetResponse(ctx context.Context, companyID, id string) (*dto.SurveyResponseDetail, error) {
	r, x, err := s.repo.ResponseDetail(ctx, companyID, id)
	if err != nil {
		return nil, err
	}
	return &dto.SurveyResponseDetail{
		SurveyResponseItem: dto.SurveyResponseItem{
			ID: r.ID, SurveyID: r.SurveyID, SurveySlug: x.Slug, SurveyTitle: x.Title,
			RespondentName: r.RespondentName, RespondentPhone: r.RespondentPhone,
			Answers: r.Answers, CreatedAt: r.CreatedAt.UTC().Format(time.RFC3339),
		},
		SurveyStatus: x.Status,
		Questions:    x.Questions,
	}, nil
}
func (s *SurveyService) DeleteResponse(ctx context.Context, companyID, id string) error {
	return s.repo.DeleteResponse(ctx, companyID, id)
}
func (s *SurveyService) ResponseSummary(ctx context.Context, companyID, ref string) (*dto.SurveyResponseSummary, error) {
	x, err := s.repo.FindByRef(ctx, companyID, ref)
	if err != nil {
		return nil, err
	}
	total, today, week, first, last, err := s.repo.Summary(ctx, companyID, x.ID)
	if err != nil {
		return nil, err
	}
	out := &dto.SurveyResponseSummary{SurveyID: x.ID, SurveySlug: x.Slug, SurveyTitle: x.Title, SurveyStatus: x.Status, TotalResponses: total, TodayResponses: today, WeekResponses: week}
	if first != nil {
		out.FirstResponseAt = first.UTC().Format(time.RFC3339)
	}
	if last != nil {
		out.LastResponseAt = last.UTC().Format(time.RFC3339)
	}
	return out, nil
}
