package repository

import (
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"time"

	"github.com/foydalanuvchilar-bazasi/backend/internal/modules/card/domain"
)

type Repository struct {
	db *sql.DB
}

func NewRepository(db *sql.DB) *Repository {
	return &Repository{db: db}
}

// --- Templates ---

func (r *Repository) CreateTemplate(ctx context.Context, t *domain.CardTemplate) error {
	_, err := r.db.ExecContext(ctx, `
		INSERT INTO card_templates (
			id, name, image_path, image_width, image_height, image_content_type,
			qr_x, qr_y, qr_width, qr_height, text_fields, created_at, updated_at
		) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)`,
		t.ID, t.Name, t.ImagePath, t.ImageWidth, t.ImageHeight, t.ImageContentType,
		t.QRX, t.QRY, t.QRWidth, t.QRHeight, domain.TextFieldsJSON(t.TextFields),
		t.CreatedAt, t.UpdatedAt,
	)
	return err
}

func (r *Repository) UpdateTemplate(ctx context.Context, t *domain.CardTemplate) error {
	res, err := r.db.ExecContext(ctx, `
		UPDATE card_templates SET
			name=$2, qr_x=$3, qr_y=$4, qr_width=$5, qr_height=$6,
			text_fields=$7, updated_at=$8
		WHERE id=$1`,
		t.ID, t.Name, t.QRX, t.QRY, t.QRWidth, t.QRHeight,
		domain.TextFieldsJSON(t.TextFields), t.UpdatedAt,
	)
	if err != nil {
		return err
	}
	n, _ := res.RowsAffected()
	if n == 0 {
		return domain.ErrNotFound
	}
	return nil
}

func (r *Repository) GetTemplate(ctx context.Context, id string) (*domain.CardTemplate, error) {
	row := r.db.QueryRowContext(ctx, `
		SELECT id, name, image_path, image_width, image_height, image_content_type,
			qr_x, qr_y, qr_width, qr_height, text_fields, created_at, updated_at
		FROM card_templates WHERE id=$1`, id)
	return scanTemplate(row)
}

func (r *Repository) ListTemplates(ctx context.Context) ([]domain.CardTemplate, error) {
	rows, err := r.db.QueryContext(ctx, `
		SELECT id, name, image_path, image_width, image_height, image_content_type,
			qr_x, qr_y, qr_width, qr_height, text_fields, created_at, updated_at
		FROM card_templates ORDER BY created_at DESC`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := make([]domain.CardTemplate, 0)
	for rows.Next() {
		t, err := scanTemplate(rows)
		if err != nil {
			return nil, err
		}
		out = append(out, *t)
	}
	return out, rows.Err()
}

func (r *Repository) DeleteTemplate(ctx context.Context, id string) error {
	res, err := r.db.ExecContext(ctx, `DELETE FROM card_templates WHERE id=$1`, id)
	if err != nil {
		return err
	}
	n, _ := res.RowsAffected()
	if n == 0 {
		return domain.ErrNotFound
	}
	return nil
}

// --- Company cards ---

func (r *Repository) CreateCard(ctx context.Context, c *domain.CompanyCard) error {
	_, err := r.db.ExecContext(ctx, `
		INSERT INTO company_cards (
			id, company_id, template_id, source, name, image_path, image_width, image_height,
			image_content_type, qr_x, qr_y, qr_width, qr_height, text_fields,
			orientation, cols, rows, margin_mm, gap_mm, created_at, updated_at
		) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21)`,
		c.ID, c.CompanyID, nullStr(c.TemplateID), c.Source, c.Name, c.ImagePath,
		c.ImageWidth, c.ImageHeight, c.ImageContentType,
		c.QRX, c.QRY, c.QRWidth, c.QRHeight, domain.TextFieldsJSON(c.TextFields),
		c.Orientation, c.Cols, c.Rows, c.MarginMM, c.GapMM, c.CreatedAt, c.UpdatedAt,
	)
	return err
}

func (r *Repository) UpdateCard(ctx context.Context, c *domain.CompanyCard) error {
	res, err := r.db.ExecContext(ctx, `
		UPDATE company_cards SET
			name=$3, qr_x=$4, qr_y=$5, qr_width=$6, qr_height=$7, text_fields=$8,
			orientation=$9, cols=$10, rows=$11, margin_mm=$12, gap_mm=$13, updated_at=$14
		WHERE id=$1 AND company_id=$2`,
		c.ID, c.CompanyID, c.Name, c.QRX, c.QRY, c.QRWidth, c.QRHeight,
		domain.TextFieldsJSON(c.TextFields), c.Orientation, c.Cols, c.Rows,
		c.MarginMM, c.GapMM, c.UpdatedAt,
	)
	if err != nil {
		return err
	}
	n, _ := res.RowsAffected()
	if n == 0 {
		return domain.ErrNotFound
	}
	return nil
}

func (r *Repository) GetCard(ctx context.Context, companyID, id string) (*domain.CompanyCard, error) {
	row := r.db.QueryRowContext(ctx, `
		SELECT id, company_id, template_id, source, name, image_path, image_width, image_height,
			image_content_type, qr_x, qr_y, qr_width, qr_height, text_fields,
			orientation, cols, rows, margin_mm, gap_mm, created_at, updated_at
		FROM company_cards WHERE id=$1 AND company_id=$2`, id, companyID)
	return scanCard(row)
}

func (r *Repository) GetCardByID(ctx context.Context, id string) (*domain.CompanyCard, error) {
	row := r.db.QueryRowContext(ctx, `
		SELECT id, company_id, template_id, source, name, image_path, image_width, image_height,
			image_content_type, qr_x, qr_y, qr_width, qr_height, text_fields,
			orientation, cols, rows, margin_mm, gap_mm, created_at, updated_at
		FROM company_cards WHERE id=$1`, id)
	return scanCard(row)
}

func (r *Repository) ListCards(ctx context.Context, companyID string) ([]domain.CompanyCard, error) {
	rows, err := r.db.QueryContext(ctx, `
		SELECT id, company_id, template_id, source, name, image_path, image_width, image_height,
			image_content_type, qr_x, qr_y, qr_width, qr_height, text_fields,
			orientation, cols, rows, margin_mm, gap_mm, created_at, updated_at
		FROM company_cards WHERE company_id=$1 ORDER BY created_at DESC`, companyID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := make([]domain.CompanyCard, 0)
	for rows.Next() {
		c, err := scanCard(rows)
		if err != nil {
			return nil, err
		}
		out = append(out, *c)
	}
	return out, rows.Err()
}

func (r *Repository) DeleteCard(ctx context.Context, companyID, id string) error {
	// detach surveys first
	_, _ = r.db.ExecContext(ctx, `UPDATE surveys SET card_id=NULL WHERE card_id=$1 AND company_id=$2`, id, companyID)
	res, err := r.db.ExecContext(ctx, `DELETE FROM company_cards WHERE id=$1 AND company_id=$2`, id, companyID)
	if err != nil {
		return err
	}
	n, _ := res.RowsAffected()
	if n == 0 {
		return domain.ErrNotFound
	}
	return nil
}

// Survey binding

type SurveyLink struct {
	SurveyID    string
	Slug        string
	Title       string
	CompanyID   string
	ResponseURL string // filled by service with base
}

func (r *Repository) AttachCard(ctx context.Context, companyID, surveyRef, cardID string) (*SurveyLink, error) {
	// verify card
	if _, err := r.GetCard(ctx, companyID, cardID); err != nil {
		return nil, err
	}
	// find survey
	var s SurveyLink
	err := r.db.QueryRowContext(ctx, `
		SELECT id, company_id, slug, title FROM surveys
		WHERE company_id=$1 AND (id::text=$2 OR slug=$2)`, companyID, surveyRef,
	).Scan(&s.SurveyID, &s.CompanyID, &s.Slug, &s.Title)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, domain.ErrNotFound
	}
	if err != nil {
		return nil, err
	}
	_, err = r.db.ExecContext(ctx, `UPDATE surveys SET card_id=$1, updated_at=NOW() WHERE id=$2`, cardID, s.SurveyID)
	if err != nil {
		return nil, err
	}
	return &s, nil
}

func (r *Repository) DetachCard(ctx context.Context, companyID, surveyRef string) error {
	res, err := r.db.ExecContext(ctx, `
		UPDATE surveys SET card_id=NULL, updated_at=NOW()
		WHERE company_id=$1 AND (id::text=$2 OR slug=$2)`, companyID, surveyRef)
	if err != nil {
		return err
	}
	n, _ := res.RowsAffected()
	if n == 0 {
		return domain.ErrNotFound
	}
	return nil
}

func (r *Repository) SurveyByCard(ctx context.Context, companyID, cardID string) (*SurveyLink, error) {
	var s SurveyLink
	err := r.db.QueryRowContext(ctx, `
		SELECT id, company_id, slug, title FROM surveys
		WHERE company_id=$1 AND card_id=$2 LIMIT 1`, companyID, cardID,
	).Scan(&s.SurveyID, &s.CompanyID, &s.Slug, &s.Title)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	return &s, nil
}

// AppointmentLink — qabul xizmati linki (vizitka QR uchun).
type AppointmentLink struct {
	ServiceID string
	Slug      string
	Title     string
	CompanyID string
}

func (r *Repository) AppointmentByCard(ctx context.Context, companyID, cardID string) (*AppointmentLink, error) {
	var a AppointmentLink
	err := r.db.QueryRowContext(ctx, `
		SELECT id, company_id, slug, title FROM appointment_services
		WHERE company_id=$1 AND card_id=$2 LIMIT 1`, companyID, cardID,
	).Scan(&a.ServiceID, &a.CompanyID, &a.Slug, &a.Title)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	return &a, nil
}

func (r *Repository) SurveyCardID(ctx context.Context, companyID, surveyRef string) (*string, *SurveyLink, error) {
	var cardID sql.NullString
	var s SurveyLink
	err := r.db.QueryRowContext(ctx, `
		SELECT id, company_id, slug, title, card_id FROM surveys
		WHERE company_id=$1 AND (id::text=$2 OR slug=$2)`, companyID, surveyRef,
	).Scan(&s.SurveyID, &s.CompanyID, &s.Slug, &s.Title, &cardID)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, nil, domain.ErrNotFound
	}
	if err != nil {
		return nil, nil, err
	}
	if !cardID.Valid || cardID.String == "" {
		return nil, &s, nil
	}
	id := cardID.String
	return &id, &s, nil
}

type scannable interface {
	Scan(dest ...any) error
}

func scanTemplate(s scannable) (*domain.CardTemplate, error) {
	var t domain.CardTemplate
	var raw []byte
	var created, updated time.Time
	err := s.Scan(
		&t.ID, &t.Name, &t.ImagePath, &t.ImageWidth, &t.ImageHeight, &t.ImageContentType,
		&t.QRX, &t.QRY, &t.QRWidth, &t.QRHeight, &raw, &created, &updated,
	)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, domain.ErrNotFound
	}
	if err != nil {
		return nil, err
	}
	t.TextFields = domain.ParseTextFields(json.RawMessage(raw))
	t.CreatedAt = created
	t.UpdatedAt = updated
	return &t, nil
}

func scanCard(s scannable) (*domain.CompanyCard, error) {
	var c domain.CompanyCard
	var tpl sql.NullString
	var raw []byte
	var created, updated time.Time
	err := s.Scan(
		&c.ID, &c.CompanyID, &tpl, &c.Source, &c.Name, &c.ImagePath, &c.ImageWidth, &c.ImageHeight,
		&c.ImageContentType, &c.QRX, &c.QRY, &c.QRWidth, &c.QRHeight, &raw,
		&c.Orientation, &c.Cols, &c.Rows, &c.MarginMM, &c.GapMM, &created, &updated,
	)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, domain.ErrNotFound
	}
	if err != nil {
		return nil, err
	}
	if tpl.Valid {
		c.TemplateID = &tpl.String
	}
	c.TextFields = domain.ParseTextFields(json.RawMessage(raw))
	c.CreatedAt = created
	c.UpdatedAt = updated
	return &c, nil
}

func nullStr(p *string) any {
	if p == nil || *p == "" {
		return nil
	}
	return *p
}
