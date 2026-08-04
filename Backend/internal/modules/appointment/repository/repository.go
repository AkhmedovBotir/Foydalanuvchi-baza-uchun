package repository

import (
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"fmt"
	"strings"
	"time"

	"github.com/foydalanuvchilar-bazasi/backend/internal/modules/appointment/domain"
	"github.com/lib/pq"
)

type Repository struct {
	db *sql.DB
}

func NewRepository(db *sql.DB) *Repository {
	return &Repository{db: db}
}

func (r *Repository) CreateService(ctx context.Context, s *domain.Service) error {
	sched, _ := json.Marshal(s.Schedule)
	_, err := r.db.ExecContext(ctx, `
		INSERT INTO appointment_services (
			id, company_id, slug, title, description, status, slot_interval_minutes,
			schedule, max_days_ahead, card_id, created_at, updated_at
		) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
		s.ID, s.CompanyID, s.Slug, s.Title, s.Description, s.Status, s.SlotIntervalMinutes,
		sched, s.MaxDaysAhead, nullStr(s.CardID), s.CreatedAt, s.UpdatedAt,
	)
	if err != nil {
		return mapPQ(err)
	}
	return nil
}

func (r *Repository) UpdateService(ctx context.Context, s *domain.Service) error {
	sched, _ := json.Marshal(s.Schedule)
	res, err := r.db.ExecContext(ctx, `
		UPDATE appointment_services SET
			slug=$3, title=$4, description=$5, status=$6, slot_interval_minutes=$7,
			schedule=$8, max_days_ahead=$9, card_id=$10, updated_at=$11,
			published_at=$12, closed_at=$13
		WHERE id=$1 AND company_id=$2`,
		s.ID, s.CompanyID, s.Slug, s.Title, s.Description, s.Status, s.SlotIntervalMinutes,
		sched, s.MaxDaysAhead, nullStr(s.CardID), s.UpdatedAt, nullTime(s.PublishedAt), nullTime(s.ClosedAt),
	)
	if err != nil {
		return mapPQ(err)
	}
	n, _ := res.RowsAffected()
	if n == 0 {
		return domain.ErrNotFound
	}
	return nil
}

func (r *Repository) GetService(ctx context.Context, companyID, ref string) (*domain.Service, error) {
	row := r.db.QueryRowContext(ctx, `
		SELECT id, company_id, slug, title, description, status, slot_interval_minutes,
			schedule, max_days_ahead, card_id, created_at, updated_at, published_at, closed_at
		FROM appointment_services
		WHERE company_id=$1 AND (id::text=$2 OR slug=$2)`, companyID, ref)
	return scanService(row)
}

func (r *Repository) GetServicePublic(ctx context.Context, slug string) (*domain.Service, error) {
	row := r.db.QueryRowContext(ctx, `
		SELECT id, company_id, slug, title, description, status, slot_interval_minutes,
			schedule, max_days_ahead, card_id, created_at, updated_at, published_at, closed_at
		FROM appointment_services WHERE slug=$1`, slug)
	return scanService(row)
}

func (r *Repository) ListServices(ctx context.Context, companyID string) ([]domain.Service, error) {
	rows, err := r.db.QueryContext(ctx, `
		SELECT id, company_id, slug, title, description, status, slot_interval_minutes,
			schedule, max_days_ahead, card_id, created_at, updated_at, published_at, closed_at
		FROM appointment_services WHERE company_id=$1 ORDER BY created_at DESC`, companyID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := make([]domain.Service, 0)
	for rows.Next() {
		s, err := scanService(rows)
		if err != nil {
			return nil, err
		}
		out = append(out, *s)
	}
	return out, rows.Err()
}

func (r *Repository) DeleteService(ctx context.Context, companyID, id string) error {
	res, err := r.db.ExecContext(ctx, `DELETE FROM appointment_services WHERE id=$1 AND company_id=$2`, id, companyID)
	if err != nil {
		return err
	}
	n, _ := res.RowsAffected()
	if n == 0 {
		return domain.ErrNotFound
	}
	return nil
}

func (r *Repository) SlugExists(ctx context.Context, slug, excludeID string) (bool, error) {
	var exists bool
	err := r.db.QueryRowContext(ctx, `
		SELECT EXISTS(
			SELECT 1 FROM appointment_services WHERE LOWER(slug)=LOWER($1) AND ($2='' OR id::text<>$2)
		)`, slug, excludeID).Scan(&exists)
	return exists, err
}

func (r *Repository) SetCard(ctx context.Context, companyID, serviceID string, cardID *string) error {
	res, err := r.db.ExecContext(ctx, `
		UPDATE appointment_services SET card_id=$3, updated_at=NOW()
		WHERE id=$1 AND company_id=$2`, serviceID, companyID, nullStr(cardID))
	if err != nil {
		return err
	}
	n, _ := res.RowsAffected()
	if n == 0 {
		return domain.ErrNotFound
	}
	return nil
}

func (r *Repository) CardBelongsToCompany(ctx context.Context, companyID, cardID string) (bool, error) {
	var ok bool
	err := r.db.QueryRowContext(ctx, `
		SELECT EXISTS(SELECT 1 FROM company_cards WHERE id=$1 AND company_id=$2)`,
		cardID, companyID).Scan(&ok)
	return ok, err
}

func (r *Repository) ServiceByCard(ctx context.Context, companyID, cardID string) (*domain.Service, error) {
	row := r.db.QueryRowContext(ctx, `
		SELECT id, company_id, slug, title, description, status, slot_interval_minutes,
			schedule, max_days_ahead, card_id, created_at, updated_at, published_at, closed_at
		FROM appointment_services WHERE company_id=$1 AND card_id=$2 LIMIT 1`, companyID, cardID)
	s, err := scanService(row)
	if errors.Is(err, domain.ErrNotFound) {
		return nil, nil
	}
	return s, err
}

// Bookings

func (r *Repository) CreateBooking(ctx context.Context, b *domain.Booking) error {
	_, err := r.db.ExecContext(ctx, `
		INSERT INTO appointment_bookings (
			id, service_id, company_id, booking_date, slot_start, slot_end,
			respondent_name, respondent_phone, purpose, status, conclusion, created_at, updated_at
		) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)`,
		b.ID, b.ServiceID, b.CompanyID, b.BookingDate.Format("2006-01-02"),
		b.SlotStart, b.SlotEnd, b.RespondentName, b.RespondentPhone, b.Purpose,
		b.Status, b.Conclusion, b.CreatedAt, b.UpdatedAt,
	)
	if err != nil {
		return mapPQ(err)
	}
	return nil
}

func (r *Repository) UpdateBooking(ctx context.Context, b *domain.Booking) error {
	res, err := r.db.ExecContext(ctx, `
		UPDATE appointment_bookings SET
			status=$3, conclusion=$4, concluded_at=$5, updated_at=$6
		WHERE id=$1 AND company_id=$2`,
		b.ID, b.CompanyID, b.Status, b.Conclusion, nullTime(b.ConcludedAt), b.UpdatedAt,
	)
	if err != nil {
		return err
	}
	n, _ := res.RowsAffected()
	if n == 0 {
		return domain.ErrBookingNotFound
	}
	return nil
}

func (r *Repository) GetBooking(ctx context.Context, companyID, id string) (*domain.Booking, error) {
	row := r.db.QueryRowContext(ctx, `
		SELECT id, service_id, company_id, booking_date, slot_start::text, slot_end::text,
			respondent_name, respondent_phone, purpose, status, conclusion,
			concluded_at, created_at, updated_at
		FROM appointment_bookings WHERE id=$1 AND company_id=$2`, id, companyID)
	return scanBooking(row)
}

func (r *Repository) ListBookings(ctx context.Context, companyID, serviceID, status string, page, limit int) ([]domain.Booking, int, error) {
	if page < 1 {
		page = 1
	}
	if limit < 1 || limit > 100 {
		limit = 20
	}
	offset := (page - 1) * limit
	where := []string{"company_id=$1"}
	args := []any{companyID}
	n := 2
	if serviceID != "" {
		where = append(where, fmt.Sprintf("service_id=$%d", n))
		args = append(args, serviceID)
		n++
	}
	if status != "" {
		where = append(where, fmt.Sprintf("status=$%d", n))
		args = append(args, status)
		n++
	}
	w := strings.Join(where, " AND ")
	var total int
	if err := r.db.QueryRowContext(ctx, `SELECT COUNT(*) FROM appointment_bookings WHERE `+w, args...).Scan(&total); err != nil {
		return nil, 0, err
	}
	args = append(args, limit, offset)
	q := fmt.Sprintf(`
		SELECT id, service_id, company_id, booking_date, slot_start::text, slot_end::text,
			respondent_name, respondent_phone, purpose, status, conclusion,
			concluded_at, created_at, updated_at
		FROM appointment_bookings WHERE %s
		ORDER BY booking_date DESC, slot_start DESC
		LIMIT $%d OFFSET $%d`, w, n, n+1)
	rows, err := r.db.QueryContext(ctx, q, args...)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()
	out := make([]domain.Booking, 0)
	for rows.Next() {
		b, err := scanBooking(rows)
		if err != nil {
			return nil, 0, err
		}
		out = append(out, *b)
	}
	return out, total, rows.Err()
}

func (r *Repository) BookedStarts(ctx context.Context, serviceID string, date time.Time) (map[string]bool, error) {
	rows, err := r.db.QueryContext(ctx, `
		SELECT slot_start::text FROM appointment_bookings
		WHERE service_id=$1 AND booking_date=$2 AND status<>'cancelled'`,
		serviceID, date.Format("2006-01-02"))
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := map[string]bool{}
	for rows.Next() {
		var s string
		if err := rows.Scan(&s); err != nil {
			return nil, err
		}
		out[normalizeTime(s)] = true
	}
	return out, rows.Err()
}

func (r *Repository) Summary(ctx context.Context, companyID, serviceID string) (total, pending, confirmed, completed, cancelled, today, week int, err error) {
	q := `
		SELECT
			COUNT(*)::int,
			COUNT(*) FILTER (WHERE status='pending')::int,
			COUNT(*) FILTER (WHERE status='confirmed')::int,
			COUNT(*) FILTER (WHERE status='completed')::int,
			COUNT(*) FILTER (WHERE status='cancelled')::int,
			COUNT(*) FILTER (WHERE booking_date = CURRENT_DATE AND status<>'cancelled')::int,
			COUNT(*) FILTER (WHERE booking_date >= date_trunc('week', CURRENT_DATE)::date
				AND booking_date < date_trunc('week', CURRENT_DATE)::date + 7
				AND status<>'cancelled')::int
		FROM appointment_bookings WHERE company_id=$1`
	args := []any{companyID}
	if serviceID != "" {
		q += ` AND service_id=$2`
		args = append(args, serviceID)
	}
	err = r.db.QueryRowContext(ctx, q, args...).Scan(
		&total, &pending, &confirmed, &completed, &cancelled, &today, &week,
	)
	return
}

type scannable interface {
	Scan(dest ...any) error
}

func scanService(s scannable) (*domain.Service, error) {
	var x domain.Service
	var raw []byte
	var card sql.NullString
	var pub, clo sql.NullTime
	err := s.Scan(
		&x.ID, &x.CompanyID, &x.Slug, &x.Title, &x.Description, &x.Status, &x.SlotIntervalMinutes,
		&raw, &x.MaxDaysAhead, &card, &x.CreatedAt, &x.UpdatedAt, &pub, &clo,
	)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, domain.ErrNotFound
	}
	if err != nil {
		return nil, err
	}
	if len(raw) > 0 {
		_ = json.Unmarshal(raw, &x.Schedule)
	}
	if x.Schedule == nil {
		x.Schedule = []domain.DaySchedule{}
	}
	if card.Valid {
		x.CardID = &card.String
	}
	if pub.Valid {
		t := pub.Time
		x.PublishedAt = &t
	}
	if clo.Valid {
		t := clo.Time
		x.ClosedAt = &t
	}
	return &x, nil
}

func scanBooking(s scannable) (*domain.Booking, error) {
	var b domain.Booking
	var date time.Time
	var concluded sql.NullTime
	err := s.Scan(
		&b.ID, &b.ServiceID, &b.CompanyID, &date, &b.SlotStart, &b.SlotEnd,
		&b.RespondentName, &b.RespondentPhone, &b.Purpose, &b.Status, &b.Conclusion,
		&concluded, &b.CreatedAt, &b.UpdatedAt,
	)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, domain.ErrBookingNotFound
	}
	if err != nil {
		return nil, err
	}
	b.BookingDate = date
	b.SlotStart = normalizeTime(b.SlotStart)
	b.SlotEnd = normalizeTime(b.SlotEnd)
	if concluded.Valid {
		t := concluded.Time
		b.ConcludedAt = &t
	}
	return &b, nil
}

func normalizeTime(s string) string {
	s = strings.TrimSpace(s)
	// postgres time: 09:00:00
	if len(s) >= 5 {
		return s[:5]
	}
	return s
}

func nullStr(p *string) any {
	if p == nil || *p == "" {
		return nil
	}
	return *p
}

func nullTime(t *time.Time) any {
	if t == nil {
		return nil
	}
	return *t
}

func mapPQ(err error) error {
	var pqErr *pq.Error
	if errors.As(err, &pqErr) {
		if pqErr.Code == "23505" {
			if strings.Contains(pqErr.Constraint, "slug") {
				return fmt.Errorf("%w: slug band", domain.ErrInvalidInput)
			}
			return domain.ErrSlotTaken
		}
	}
	return err
}
