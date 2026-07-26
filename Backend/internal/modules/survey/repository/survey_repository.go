package repository

import (
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"fmt"
	"strings"
	"time"

	"github.com/foydalanuvchilar-bazasi/backend/internal/modules/survey/domain"
)

type SurveyRepository struct {
	db *sql.DB
}

func NewSurveyRepository(db *sql.DB) *SurveyRepository {
	return &SurveyRepository{db: db}
}

const surveyColumns = `id, company_id, slug, title, description, settings, questions, status, sort_order, created_at, updated_at, published_at, closed_at`

func (r *SurveyRepository) Create(ctx context.Context, s *domain.Survey) error {
	query := `
		INSERT INTO surveys (company_id, slug, title, description, settings, questions, status, sort_order)
		VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING ` + surveyColumns
	return scanSurvey(r.db.QueryRowContext(ctx, query, s.CompanyID, s.Slug, s.Title, s.Description, s.Settings, s.Questions, s.Status, s.SortOrder), s)
}

func (r *SurveyRepository) FindByCompany(ctx context.Context, companyID string) ([]domain.Survey, error) {
	query := `
		SELECT ` + surveyColumns + `
		FROM surveys
		WHERE company_id = $1
		ORDER BY sort_order, created_at DESC`

	rows, err := r.db.QueryContext(ctx, query, companyID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	list := make([]domain.Survey, 0)
	for rows.Next() {
		var s domain.Survey
		if err := scanSurvey(rows, &s); err != nil {
			return nil, err
		}
		list = append(list, s)
	}
	return list, rows.Err()
}

func (r *SurveyRepository) FindByRef(ctx context.Context, companyID, ref string) (*domain.Survey, error) {
	query := `SELECT ` + surveyColumns + ` FROM surveys WHERE company_id=$1 AND (id::text=$2 OR slug=$2)`

	var s domain.Survey
	err := scanSurvey(r.db.QueryRowContext(ctx, query, companyID, ref), &s)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, domain.ErrSurveyNotFound
	}
	if err != nil {
		return nil, err
	}
	return &s, nil
}

func (r *SurveyRepository) Update(ctx context.Context, s *domain.Survey) error {
	query := `
		UPDATE surveys
		SET slug=$1,title=$2,description=$3,settings=$4,questions=$5,sort_order=$6,updated_at=NOW()
		WHERE id=$7 AND company_id=$8 AND status <> 'closed' RETURNING ` + surveyColumns
	err := scanSurvey(r.db.QueryRowContext(ctx, query, s.Slug, s.Title, s.Description, s.Settings, s.Questions, s.SortOrder, s.ID, s.CompanyID), s)
	if errors.Is(err, sql.ErrNoRows) {
		return domain.ErrSurveyNotFound
	}
	return err
}

func (r *SurveyRepository) Delete(ctx context.Context, companyID, id string) error {
	result, err := r.db.ExecContext(ctx, `DELETE FROM surveys WHERE id = $1 AND company_id=$2`, id, companyID)
	if err != nil {
		return err
	}
	n, err := result.RowsAffected()
	if err != nil {
		return err
	}
	if n == 0 {
		return domain.ErrSurveyNotFound
	}
	return nil
}

func (r *SurveyRepository) SlugExists(ctx context.Context, slug, excludeID string) (bool, error) {
	var exists bool
	err := r.db.QueryRowContext(ctx, `SELECT EXISTS(SELECT 1 FROM surveys WHERE slug=$1 AND id::text<>$2)`, slug, excludeID).Scan(&exists)
	return exists, err
}
func (r *SurveyRepository) Publish(ctx context.Context, companyID, id string) (*domain.Survey, error) {
	return r.changeStatus(ctx, companyID, id, "draft", "published", "published_at")
}
func (r *SurveyRepository) Close(ctx context.Context, companyID, id string) (*domain.Survey, error) {
	return r.changeStatus(ctx, companyID, id, "published", "closed", "closed_at")
}
func (r *SurveyRepository) changeStatus(ctx context.Context, companyID, id, from, to, column string) (*domain.Survey, error) {
	var s domain.Survey
	err := scanSurvey(r.db.QueryRowContext(ctx, fmt.Sprintf(`UPDATE surveys SET status=$1,%s=NOW(),updated_at=NOW() WHERE id=$2 AND company_id=$3 AND status=$4 RETURNING %s`, column, surveyColumns), to, id, companyID, from), &s)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, domain.ErrSurveyNotFound
	}
	return &s, err
}
func (r *SurveyRepository) ListPublished(ctx context.Context) ([]domain.Survey, error) {
	rows, err := r.db.QueryContext(ctx, `SELECT `+surveyColumns+` FROM surveys WHERE status='published' ORDER BY sort_order,created_at DESC`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []domain.Survey
	for rows.Next() {
		var s domain.Survey
		if err := scanSurvey(rows, &s); err != nil {
			return nil, err
		}
		out = append(out, s)
	}
	return out, rows.Err()
}
func (r *SurveyRepository) PublicByRef(ctx context.Context, ref string) (*domain.Survey, error) {
	var s domain.Survey
	err := scanSurvey(r.db.QueryRowContext(ctx, `SELECT `+surveyColumns+` FROM surveys WHERE (id::text=$1 OR slug=$1) AND status IN ('published','closed')`, ref), &s)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, domain.ErrSurveyNotFound
	}
	return &s, err
}
func (r *SurveyRepository) CreateResponse(ctx context.Context, surveyID, name, phone string, answers json.RawMessage) (*domain.SurveyResponse, error) {
	var x domain.SurveyResponse
	err := r.db.QueryRowContext(ctx, `
		INSERT INTO survey_responses(survey_id, respondent_name, respondent_phone, answers)
		VALUES($1,$2,$3,$4)
		RETURNING id, survey_id, respondent_name, respondent_phone, answers, created_at`,
		surveyID, name, phone, answers,
	).Scan(&x.ID, &x.SurveyID, &x.RespondentName, &x.RespondentPhone, &x.Answers, &x.CreatedAt)
	return &x, err
}
func scanSurvey(row interface{ Scan(...any) error }, s *domain.Survey) error {
	return row.Scan(&s.ID, &s.CompanyID, &s.Slug, &s.Title, &s.Description, &s.Settings, &s.Questions, &s.Status, &s.SortOrder, &s.CreatedAt, &s.UpdatedAt, &s.PublishedAt, &s.ClosedAt)
}
func (r *SurveyRepository) ListResponses(ctx context.Context, companyID string, surveyID string, page, limit int) ([]domain.SurveyResponse, int, error) {
	if page < 1 {
		page = 1
	}
	if limit < 1 || limit > 100 {
		limit = 20
	}
	where := "s.company_id=$1"
	args := []any{companyID}
	if surveyID != "" {
		where += " AND r.survey_id=$2"
		args = append(args, surveyID)
	}
	var total int
	if err := r.db.QueryRowContext(ctx, `SELECT COUNT(*) FROM survey_responses r JOIN surveys s ON s.id=r.survey_id WHERE `+where, args...).Scan(&total); err != nil {
		return nil, 0, err
	}
	args = append(args, limit, (page-1)*limit)
	rows, err := r.db.QueryContext(ctx, `SELECT r.id,r.survey_id,r.respondent_name,r.respondent_phone,r.answers,r.created_at FROM survey_responses r JOIN surveys s ON s.id=r.survey_id WHERE `+where+fmt.Sprintf(` ORDER BY r.created_at DESC LIMIT $%d OFFSET $%d`, len(args)-1, len(args)), args...)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()
	out := []domain.SurveyResponse{}
	for rows.Next() {
		var x domain.SurveyResponse
		if err := rows.Scan(&x.ID, &x.SurveyID, &x.RespondentName, &x.RespondentPhone, &x.Answers, &x.CreatedAt); err != nil {
			return nil, 0, err
		}
		out = append(out, x)
	}
	return out, total, rows.Err()
}
func (r *SurveyRepository) ResponseDetail(ctx context.Context, companyID, id string) (*domain.SurveyResponse, *domain.Survey, error) {
	var x domain.SurveyResponse
	var s domain.Survey
	query := `
		SELECT
			r.id, r.survey_id, r.respondent_name, r.respondent_phone, r.answers, r.created_at,
			s.id, s.company_id, s.slug, s.title, s.description, s.settings, s.questions,
			s.status, s.sort_order, s.created_at, s.updated_at, s.published_at, s.closed_at
		FROM survey_responses r
		JOIN surveys s ON s.id = r.survey_id
		WHERE r.id = $1 AND s.company_id = $2`
	err := r.db.QueryRowContext(ctx, query, id, companyID).Scan(
		&x.ID, &x.SurveyID, &x.RespondentName, &x.RespondentPhone, &x.Answers, &x.CreatedAt,
		&s.ID, &s.CompanyID, &s.Slug, &s.Title, &s.Description, &s.Settings, &s.Questions,
		&s.Status, &s.SortOrder, &s.CreatedAt, &s.UpdatedAt, &s.PublishedAt, &s.ClosedAt,
	)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, nil, domain.ErrResponseNotFound
	}
	return &x, &s, err
}
func (r *SurveyRepository) DeleteResponse(ctx context.Context, companyID, id string) error {
	result, err := r.db.ExecContext(ctx, `DELETE FROM survey_responses r USING surveys s WHERE r.survey_id=s.id AND r.id=$1 AND s.company_id=$2`, id, companyID)
	if err != nil {
		return err
	}
	n, _ := result.RowsAffected()
	if n == 0 {
		return domain.ErrResponseNotFound
	}
	return nil
}
func (r *SurveyRepository) Summary(ctx context.Context, companyID, surveyID string) (int, int, int, *time.Time, *time.Time, error) {
	var a, b, c int
	var first, last *time.Time
	err := r.db.QueryRowContext(ctx, `SELECT count(*),count(*) FILTER(WHERE r.created_at>=CURRENT_DATE),count(*) FILTER(WHERE r.created_at>=CURRENT_DATE-INTERVAL '7 days'),min(r.created_at),max(r.created_at) FROM survey_responses r JOIN surveys s ON s.id=r.survey_id WHERE s.company_id=$1 AND r.survey_id=$2`, companyID, surveyID).Scan(&a, &b, &c, &first, &last)
	return a, b, c, first, last, err
}

var _ = strings.TrimSpace
