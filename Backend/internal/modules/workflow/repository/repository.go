package repository

import (
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"fmt"
	"strings"
	"time"

	"github.com/foydalanuvchilar-bazasi/backend/internal/modules/workflow/domain"
)

type Repository struct {
	db *sql.DB
}

func NewRepository(db *sql.DB) *Repository {
	return &Repository{db: db}
}

type DoctorRow struct {
	ID, Name, Specialty, Phone string
}

func (r *Repository) ListDoctors(ctx context.Context, companyID string) ([]DoctorRow, error) {
	rows, err := r.db.QueryContext(ctx, `
		SELECT id, name, specialty, phone FROM company_doctors
		WHERE company_id=$1 ORDER BY name ASC`, companyID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := make([]DoctorRow, 0)
	for rows.Next() {
		var d DoctorRow
		if err := rows.Scan(&d.ID, &d.Name, &d.Specialty, &d.Phone); err != nil {
			return nil, err
		}
		out = append(out, d)
	}
	return out, rows.Err()
}

func (r *Repository) DoctorInCompany(ctx context.Context, companyID, doctorID string) (bool, error) {
	var ok bool
	err := r.db.QueryRowContext(ctx, `
		SELECT EXISTS(SELECT 1 FROM company_doctors WHERE id=$1 AND company_id=$2)`,
		doctorID, companyID).Scan(&ok)
	return ok, err
}

// ——— Survey responses ———

func (r *Repository) ListSurveyCases(ctx context.Context, companyID, doctorID, status string, page, limit int) ([]domain.CaseItem, int, error) {
	if page < 1 {
		page = 1
	}
	if limit < 1 || limit > 100 {
		limit = 20
	}
	where := []string{"s.company_id=$1"}
	args := []any{companyID}
	n := 2
	if doctorID != "" {
		where = append(where, fmt.Sprintf("r.assigned_doctor_id=$%d", n))
		args = append(args, doctorID)
		n++
	}
	if status != "" {
		where = append(where, fmt.Sprintf("r.workflow_status=$%d", n))
		args = append(args, status)
		n++
	}
	w := strings.Join(where, " AND ")
	var total int
	if err := r.db.QueryRowContext(ctx, `
		SELECT COUNT(*) FROM survey_responses r
		JOIN surveys s ON s.id=r.survey_id WHERE `+w, args...).Scan(&total); err != nil {
		return nil, 0, err
	}
	args = append(args, limit, (page-1)*limit)
	q := fmt.Sprintf(`
		SELECT r.id, s.company_id, r.id, s.title, r.respondent_name, r.respondent_phone,
			COALESCE(r.workflow_status,'pending'), r.assigned_doctor_id, COALESCE(d.name,''),
			r.registrator_id, r.payment_amount, COALESCE(r.payment_note,''), r.paid_at,
			COALESCE(r.doctor_conclusion,''), r.doctor_concluded_at,
			s.slug, r.answers, r.created_at
		FROM survey_responses r
		JOIN surveys s ON s.id=r.survey_id
		LEFT JOIN company_doctors d ON d.id=r.assigned_doctor_id
		WHERE %s
		ORDER BY r.created_at DESC
		LIMIT $%d OFFSET $%d`, w, n, n+1)
	rows, err := r.db.QueryContext(ctx, q, args...)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()
	out := make([]domain.CaseItem, 0)
	for rows.Next() {
		item, err := scanSurveyCase(rows)
		if err != nil {
			return nil, 0, err
		}
		out = append(out, *item)
	}
	return out, total, rows.Err()
}

func (r *Repository) GetSurveyCase(ctx context.Context, companyID, id string) (*domain.CaseItem, error) {
	row := r.db.QueryRowContext(ctx, `
		SELECT r.id, s.company_id, r.id, s.title, r.respondent_name, r.respondent_phone,
			COALESCE(r.workflow_status,'pending'), r.assigned_doctor_id, COALESCE(d.name,''),
			r.registrator_id, r.payment_amount, COALESCE(r.payment_note,''), r.paid_at,
			COALESCE(r.doctor_conclusion,''), r.doctor_concluded_at,
			s.slug, r.answers, r.created_at
		FROM survey_responses r
		JOIN surveys s ON s.id=r.survey_id
		LEFT JOIN company_doctors d ON d.id=r.assigned_doctor_id
		WHERE r.id=$1 AND s.company_id=$2`, id, companyID)
	return scanSurveyCase(row)
}

func (r *Repository) UpdateSurveyWorkflow(ctx context.Context, companyID, id string,
	status string, doctorID, regID *string, amount *float64, note string, paidAt *time.Time,
	conclusion string, concludedAt *time.Time,
) error {
	res, err := r.db.ExecContext(ctx, `
		UPDATE survey_responses r SET
			workflow_status=$3,
			assigned_doctor_id=COALESCE($4, r.assigned_doctor_id),
			registrator_id=COALESCE($5, r.registrator_id),
			payment_amount=COALESCE($6, r.payment_amount),
			payment_note=CASE WHEN $7<>'' THEN $7 ELSE r.payment_note END,
			paid_at=COALESCE($8, r.paid_at),
			doctor_conclusion=CASE WHEN $9<>'' THEN $9 ELSE r.doctor_conclusion END,
			doctor_concluded_at=COALESCE($10, r.doctor_concluded_at)
		FROM surveys s
		WHERE r.survey_id=s.id AND r.id=$1 AND s.company_id=$2`,
		id, companyID, status, nullStr(doctorID), nullStr(regID), amount, note, nullTime(paidAt), conclusion, nullTime(concludedAt),
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

// ——— Bookings ———

func (r *Repository) ListBookingCases(ctx context.Context, companyID, doctorID, status string, page, limit int) ([]domain.CaseItem, int, error) {
	if page < 1 {
		page = 1
	}
	if limit < 1 || limit > 100 {
		limit = 20
	}
	where := []string{"b.company_id=$1"}
	args := []any{companyID}
	n := 2
	if doctorID != "" {
		where = append(where, fmt.Sprintf("b.assigned_doctor_id=$%d", n))
		args = append(args, doctorID)
		n++
	}
	if status != "" {
		where = append(where, fmt.Sprintf("b.workflow_status=$%d", n))
		args = append(args, status)
		n++
	}
	w := strings.Join(where, " AND ")
	var total int
	if err := r.db.QueryRowContext(ctx, `SELECT COUNT(*) FROM appointment_bookings b WHERE `+w, args...).Scan(&total); err != nil {
		return nil, 0, err
	}
	args = append(args, limit, (page-1)*limit)
	q := fmt.Sprintf(`
		SELECT b.id, b.company_id, b.id, svc.title, b.respondent_name, b.respondent_phone, b.purpose,
			COALESCE(b.workflow_status,'pending'), b.assigned_doctor_id, COALESCE(d.name,''),
			b.registrator_id, b.payment_amount, COALESCE(b.payment_note,''), b.paid_at,
			COALESCE(b.conclusion,''), b.concluded_at,
			b.booking_date::text, b.slot_start::text, b.slot_end::text, b.created_at, b.updated_at,
			b.referral_id, COALESCE(ref.name,''), COALESCE(ref.phone,''), COALESCE(ref.specialty,'')
		FROM appointment_bookings b
		JOIN appointment_services svc ON svc.id=b.service_id
		LEFT JOIN company_doctors d ON d.id=b.assigned_doctor_id
		LEFT JOIN company_referrals ref ON ref.id=b.referral_id
		WHERE %s
		ORDER BY b.booking_date DESC, b.slot_start DESC
		LIMIT $%d OFFSET $%d`, w, n, n+1)
	rows, err := r.db.QueryContext(ctx, q, args...)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()
	out := make([]domain.CaseItem, 0)
	for rows.Next() {
		item, err := scanBookingCase(rows)
		if err != nil {
			return nil, 0, err
		}
		out = append(out, *item)
	}
	return out, total, rows.Err()
}

func (r *Repository) GetBookingCase(ctx context.Context, companyID, id string) (*domain.CaseItem, error) {
	row := r.db.QueryRowContext(ctx, `
		SELECT b.id, b.company_id, b.id, svc.title, b.respondent_name, b.respondent_phone, b.purpose,
			COALESCE(b.workflow_status,'pending'), b.assigned_doctor_id, COALESCE(d.name,''),
			b.registrator_id, b.payment_amount, COALESCE(b.payment_note,''), b.paid_at,
			COALESCE(b.conclusion,''), b.concluded_at,
			b.booking_date::text, b.slot_start::text, b.slot_end::text, b.created_at, b.updated_at,
			b.referral_id, COALESCE(ref.name,''), COALESCE(ref.phone,''), COALESCE(ref.specialty,'')
		FROM appointment_bookings b
		JOIN appointment_services svc ON svc.id=b.service_id
		LEFT JOIN company_doctors d ON d.id=b.assigned_doctor_id
		LEFT JOIN company_referrals ref ON ref.id=b.referral_id
		WHERE b.id=$1 AND b.company_id=$2`, id, companyID)
	return scanBookingCase(row)
}

func (r *Repository) UpdateBookingWorkflow(ctx context.Context, companyID, id string,
	workflowStatus, bookingStatus string, doctorID, regID *string,
	amount *float64, note string, paidAt *time.Time,
	conclusion string, concludedAt *time.Time,
) error {
	res, err := r.db.ExecContext(ctx, `
		UPDATE appointment_bookings SET
			workflow_status=$3,
			status=CASE WHEN $4<>'' THEN $4 ELSE status END,
			assigned_doctor_id=COALESCE($5, assigned_doctor_id),
			registrator_id=COALESCE($6, registrator_id),
			payment_amount=COALESCE($7, payment_amount),
			payment_note=CASE WHEN $8<>'' THEN $8 ELSE payment_note END,
			paid_at=COALESCE($9, paid_at),
			conclusion=CASE WHEN $10<>'' THEN $10 ELSE conclusion END,
			concluded_at=COALESCE($11, concluded_at),
			updated_at=NOW()
		WHERE id=$1 AND company_id=$2`,
		id, companyID, workflowStatus, bookingStatus,
		nullStr(doctorID), nullStr(regID), amount, note, nullTime(paidAt), conclusion, nullTime(concludedAt),
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

func (r *Repository) RegistratorSummary(ctx context.Context, companyID string) (pending, assigned, paid, noShow, todayPaid int, err error) {
	err = r.db.QueryRowContext(ctx, `
		SELECT
			(SELECT COUNT(*)::int FROM survey_responses r JOIN surveys s ON s.id=r.survey_id
				WHERE s.company_id=$1 AND COALESCE(r.workflow_status,'pending')='pending')
			+(SELECT COUNT(*)::int FROM appointment_bookings WHERE company_id=$1 AND COALESCE(workflow_status,'pending')='pending'),
			(SELECT COUNT(*)::int FROM survey_responses r JOIN surveys s ON s.id=r.survey_id
				WHERE s.company_id=$1 AND r.workflow_status='assigned')
			+(SELECT COUNT(*)::int FROM appointment_bookings WHERE company_id=$1 AND workflow_status='assigned'),
			(SELECT COUNT(*)::int FROM survey_responses r JOIN surveys s ON s.id=r.survey_id
				WHERE s.company_id=$1 AND r.workflow_status='paid')
			+(SELECT COUNT(*)::int FROM appointment_bookings WHERE company_id=$1 AND workflow_status='paid'),
			(SELECT COUNT(*)::int FROM survey_responses r JOIN surveys s ON s.id=r.survey_id
				WHERE s.company_id=$1 AND r.workflow_status IN ('no_show','doctor_no_show'))
			+(SELECT COUNT(*)::int FROM appointment_bookings WHERE company_id=$1 AND workflow_status IN ('no_show','doctor_no_show')),
			(SELECT COUNT(*)::int FROM survey_responses r JOIN surveys s ON s.id=r.survey_id
				WHERE s.company_id=$1 AND r.workflow_status='paid' AND r.paid_at::date=CURRENT_DATE)
			+(SELECT COUNT(*)::int FROM appointment_bookings WHERE company_id=$1 AND workflow_status='paid' AND paid_at::date=CURRENT_DATE)
	`, companyID).Scan(&pending, &assigned, &paid, &noShow, &todayPaid)
	return
}

func (r *Repository) DoctorSummary(ctx context.Context, companyID, doctorID string) (myQueue, concluded, noShow int, err error) {
	err = r.db.QueryRowContext(ctx, `
		SELECT
			(SELECT COUNT(*)::int FROM survey_responses r JOIN surveys s ON s.id=r.survey_id
				WHERE s.company_id=$1 AND r.assigned_doctor_id=$2 AND r.workflow_status IN ('assigned','paid'))
			+(SELECT COUNT(*)::int FROM appointment_bookings
				WHERE company_id=$1 AND assigned_doctor_id=$2 AND workflow_status IN ('assigned','paid')),
			(SELECT COUNT(*)::int FROM survey_responses r JOIN surveys s ON s.id=r.survey_id
				WHERE s.company_id=$1 AND r.assigned_doctor_id=$2 AND r.workflow_status='concluded')
			+(SELECT COUNT(*)::int FROM appointment_bookings
				WHERE company_id=$1 AND assigned_doctor_id=$2 AND workflow_status='concluded'),
			(SELECT COUNT(*)::int FROM survey_responses r JOIN surveys s ON s.id=r.survey_id
				WHERE s.company_id=$1 AND r.assigned_doctor_id=$2 AND r.workflow_status IN ('no_show','doctor_no_show','cancelled'))
			+(SELECT COUNT(*)::int FROM appointment_bookings
				WHERE company_id=$1 AND assigned_doctor_id=$2 AND workflow_status IN ('no_show','doctor_no_show','cancelled'))
	`, companyID, doctorID).Scan(&myQueue, &concluded, &noShow)
	return
}

type scannable interface {
	Scan(dest ...any) error
}

func scanSurveyCase(s scannable) (*domain.CaseItem, error) {
	var x domain.CaseItem
	var doctorID, regID sql.NullString
	var amount sql.NullFloat64
	var paidAt, concludedAt sql.NullTime
	var raw json.RawMessage
	err := s.Scan(
		&x.ID, &x.CompanyID, &x.SourceID, &x.Title, &x.PatientName, &x.PatientPhone,
		&x.WorkflowStatus, &doctorID, &x.DoctorName, &regID, &amount, &x.PaymentNote, &paidAt,
		&x.Conclusion, &concludedAt, &x.SurveySlug, &raw, &x.CreatedAt,
	)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, domain.ErrNotFound
	}
	if err != nil {
		return nil, err
	}
	x.Source = domain.SourceSurvey
	if doctorID.Valid {
		x.AssignedDoctorID = &doctorID.String
	}
	if regID.Valid {
		x.RegistratorID = &regID.String
	}
	if amount.Valid {
		v := amount.Float64
		x.PaymentAmount = &v
	}
	if paidAt.Valid {
		t := paidAt.Time
		x.PaidAt = &t
	}
	if concludedAt.Valid {
		t := concludedAt.Time
		x.ConcludedAt = &t
	}
	if len(raw) > 0 {
		_ = json.Unmarshal(raw, &x.Answers)
	}
	if x.Answers == nil {
		x.Answers = map[string]any{}
	}
	return &x, nil
}

func scanBookingCase(s scannable) (*domain.CaseItem, error) {
	var x domain.CaseItem
	var doctorID, regID, referralID sql.NullString
	var amount sql.NullFloat64
	var paidAt, concludedAt sql.NullTime
	err := s.Scan(
		&x.ID, &x.CompanyID, &x.SourceID, &x.Title, &x.PatientName, &x.PatientPhone, &x.Purpose,
		&x.WorkflowStatus, &doctorID, &x.DoctorName, &regID, &amount, &x.PaymentNote, &paidAt,
		&x.Conclusion, &concludedAt, &x.Date, &x.SlotStart, &x.SlotEnd, &x.CreatedAt, &x.UpdatedAt,
		&referralID, &x.ReferralName, &x.ReferralPhone, &x.ReferralSpecialty,
	)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, domain.ErrNotFound
	}
	if err != nil {
		return nil, err
	}
	x.Source = domain.SourceBooking
	if len(x.SlotStart) >= 5 {
		x.SlotStart = x.SlotStart[:5]
	}
	if len(x.SlotEnd) >= 5 {
		x.SlotEnd = x.SlotEnd[:5]
	}
	if doctorID.Valid {
		x.AssignedDoctorID = &doctorID.String
	}
	if regID.Valid {
		x.RegistratorID = &regID.String
	}
	if referralID.Valid {
		x.ReferralID = &referralID.String
	}
	if amount.Valid {
		v := amount.Float64
		x.PaymentAmount = &v
	}
	if paidAt.Valid {
		t := paidAt.Time
		x.PaidAt = &t
	}
	if concludedAt.Valid {
		t := concludedAt.Time
		x.ConcludedAt = &t
	}
	return &x, nil
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
