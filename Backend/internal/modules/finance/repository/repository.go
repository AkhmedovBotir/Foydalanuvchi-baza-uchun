package repository

import (
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"fmt"
	"strings"
	"time"

	"github.com/foydalanuvchilar-bazasi/backend/internal/modules/finance/domain"
	"github.com/lib/pq"
)

type Repository struct {
	db *sql.DB
}

func NewRepository(db *sql.DB) *Repository {
	return &Repository{db: db}
}

func (r *Repository) DB() *sql.DB { return r.db }

// ——— Schemes ———

func (r *Repository) ListSchemes(ctx context.Context, companyID string) ([]domain.Scheme, error) {
	rows, err := r.db.QueryContext(ctx, `
		SELECT id, company_id, name, description,
			worker_pct, ads_pct, doctor_pct, owner_pct, referral_pct,
			owner_sales_pct, owner_deposit_pct, is_active, COALESCE(lines, '[]'::jsonb), created_at, updated_at
		FROM finance_schemes WHERE company_id=$1
		ORDER BY is_active DESC, created_at DESC`, companyID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := make([]domain.Scheme, 0)
	for rows.Next() {
		s, err := scanScheme(rows)
		if err != nil {
			return nil, err
		}
		out = append(out, *s)
	}
	return out, rows.Err()
}

func (r *Repository) GetScheme(ctx context.Context, companyID, id string) (*domain.Scheme, error) {
	row := r.db.QueryRowContext(ctx, `
		SELECT id, company_id, name, description,
			worker_pct, ads_pct, doctor_pct, owner_pct, referral_pct,
			owner_sales_pct, owner_deposit_pct, is_active, COALESCE(lines, '[]'::jsonb), created_at, updated_at
		FROM finance_schemes WHERE id=$1 AND company_id=$2`, id, companyID)
	s, err := scanScheme(row)
	if err != nil {
		return nil, err
	}
	if err := r.loadSchemeChildren(ctx, s); err != nil {
		return nil, err
	}
	return s, nil
}

func (r *Repository) GetActiveScheme(ctx context.Context, companyID string) (*domain.Scheme, error) {
	row := r.db.QueryRowContext(ctx, `
		SELECT id, company_id, name, description,
			worker_pct, ads_pct, doctor_pct, owner_pct, referral_pct,
			owner_sales_pct, owner_deposit_pct, is_active, COALESCE(lines, '[]'::jsonb), created_at, updated_at
		FROM finance_schemes WHERE company_id=$1 AND is_active=true
		LIMIT 1`, companyID)
	s, err := scanScheme(row)
	if err != nil {
		return nil, err
	}
	if err := r.loadSchemeChildren(ctx, s); err != nil {
		return nil, err
	}
	return s, nil
}

func (r *Repository) loadSchemeChildren(ctx context.Context, s *domain.Scheme) error {
	drows, err := r.db.QueryContext(ctx, `
		SELECT d.doctor_id, COALESCE(cd.name,''), d.pct
		FROM finance_scheme_doctors d
		LEFT JOIN company_doctors cd ON cd.id=d.doctor_id
		WHERE d.scheme_id=$1 ORDER BY d.pct DESC`, s.ID)
	if err != nil {
		return err
	}
	defer drows.Close()
	s.Doctors = nil
	for drows.Next() {
		var x domain.SchemeDoctor
		if err := drows.Scan(&x.DoctorID, &x.DoctorName, &x.Pct); err != nil {
			return err
		}
		s.Doctors = append(s.Doctors, x)
	}
	rrows, err := r.db.QueryContext(ctx, `
		SELECT r.referral_id, COALESCE(cr.name,''), r.pct
		FROM finance_scheme_referrals r
		LEFT JOIN company_referrals cr ON cr.id=r.referral_id
		WHERE r.scheme_id=$1 ORDER BY r.pct DESC`, s.ID)
	if err != nil {
		return err
	}
	defer rrows.Close()
	s.Referrals = nil
	for rrows.Next() {
		var x domain.SchemeReferral
		if err := rrows.Scan(&x.ReferralID, &x.ReferralName, &x.Pct); err != nil {
			return err
		}
		s.Referrals = append(s.Referrals, x)
	}
	return nil
}

func (r *Repository) CreateScheme(ctx context.Context, s *domain.Scheme) error {
	tx, err := r.db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	defer func() { _ = tx.Rollback() }()

	if s.IsActive {
		if _, err := tx.ExecContext(ctx, `UPDATE finance_schemes SET is_active=false WHERE company_id=$1`, s.CompanyID); err != nil {
			return err
		}
	}
	linesJSON, err := json.Marshal(s.Lines)
	if err != nil {
		return err
	}
	err = tx.QueryRowContext(ctx, `
		INSERT INTO finance_schemes (
			company_id, name, description, worker_pct, ads_pct, doctor_pct, owner_pct, referral_pct,
			owner_sales_pct, owner_deposit_pct, is_active, lines
		) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
		RETURNING id, created_at, updated_at`,
		s.CompanyID, s.Name, s.Description, s.WorkerPct, s.AdsPct, s.DoctorPct, s.OwnerPct, s.ReferralPct,
		s.OwnerSalesPct, s.OwnerDepositPct, s.IsActive, linesJSON,
	).Scan(&s.ID, &s.CreatedAt, &s.UpdatedAt)
	if err != nil {
		return err
	}
	if err := r.replaceChildrenTx(ctx, tx, s); err != nil {
		return err
	}
	return tx.Commit()
}

func (r *Repository) UpdateScheme(ctx context.Context, s *domain.Scheme) error {
	tx, err := r.db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	defer func() { _ = tx.Rollback() }()

	if s.IsActive {
		if _, err := tx.ExecContext(ctx, `
			UPDATE finance_schemes SET is_active=false WHERE company_id=$1 AND id<>$2`, s.CompanyID, s.ID); err != nil {
			return err
		}
	}
	linesJSON, err := json.Marshal(s.Lines)
	if err != nil {
		return err
	}
	res, err := tx.ExecContext(ctx, `
		UPDATE finance_schemes SET
			name=$3, description=$4, worker_pct=$5, ads_pct=$6, doctor_pct=$7, owner_pct=$8, referral_pct=$9,
			owner_sales_pct=$10, owner_deposit_pct=$11, is_active=$12, lines=$13, updated_at=NOW()
		WHERE id=$1 AND company_id=$2`,
		s.ID, s.CompanyID, s.Name, s.Description, s.WorkerPct, s.AdsPct, s.DoctorPct, s.OwnerPct, s.ReferralPct,
		s.OwnerSalesPct, s.OwnerDepositPct, s.IsActive, linesJSON,
	)
	if err != nil {
		return err
	}
	n, _ := res.RowsAffected()
	if n == 0 {
		return domain.ErrNotFound
	}
	if _, err := tx.ExecContext(ctx, `DELETE FROM finance_scheme_doctors WHERE scheme_id=$1`, s.ID); err != nil {
		return err
	}
	if _, err := tx.ExecContext(ctx, `DELETE FROM finance_scheme_referrals WHERE scheme_id=$1`, s.ID); err != nil {
		return err
	}
	if err := r.replaceChildrenTx(ctx, tx, s); err != nil {
		return err
	}
	return tx.Commit()
}

func (r *Repository) replaceChildrenTx(ctx context.Context, tx *sql.Tx, s *domain.Scheme) error {
	for _, d := range s.Doctors {
		if _, err := tx.ExecContext(ctx, `
			INSERT INTO finance_scheme_doctors (scheme_id, doctor_id, pct) VALUES ($1,$2,$3)`,
			s.ID, d.DoctorID, d.Pct); err != nil {
			return err
		}
	}
	for _, ref := range s.Referrals {
		if _, err := tx.ExecContext(ctx, `
			INSERT INTO finance_scheme_referrals (scheme_id, referral_id, pct) VALUES ($1,$2,$3)`,
			s.ID, ref.ReferralID, ref.Pct); err != nil {
			return err
		}
	}
	return nil
}

func (r *Repository) DeleteScheme(ctx context.Context, companyID, id string) error {
	res, err := r.db.ExecContext(ctx, `DELETE FROM finance_schemes WHERE id=$1 AND company_id=$2`, id, companyID)
	if err != nil {
		return err
	}
	n, _ := res.RowsAffected()
	if n == 0 {
		return domain.ErrNotFound
	}
	return nil
}

func (r *Repository) DoctorName(ctx context.Context, companyID, id string) (string, error) {
	var name string
	err := r.db.QueryRowContext(ctx, `SELECT name FROM company_doctors WHERE id=$1 AND company_id=$2`, id, companyID).Scan(&name)
	if errors.Is(err, sql.ErrNoRows) {
		return "", domain.ErrInvalidInput
	}
	return name, err
}

func (r *Repository) ReferralName(ctx context.Context, companyID, id string) (string, error) {
	var name string
	err := r.db.QueryRowContext(ctx, `SELECT name FROM company_referrals WHERE id=$1 AND company_id=$2`, id, companyID).Scan(&name)
	if errors.Is(err, sql.ErrNoRows) {
		return "", domain.ErrInvalidInput
	}
	return name, err
}

// ——— Income + allocations ———

func (r *Repository) ExistsIncome(ctx context.Context, companyID, source, sourceID string) (bool, error) {
	var n int
	err := r.db.QueryRowContext(ctx, `
		SELECT COUNT(*) FROM finance_incomes
		WHERE company_id=$1 AND source=$2 AND source_id=$3`, companyID, source, sourceID).Scan(&n)
	return n > 0, err
}

func (r *Repository) CreateIncomeWithAllocations(ctx context.Context, income *domain.Income, allocs []domain.Allocation) error {
	tx, err := r.db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	defer func() { _ = tx.Rollback() }()

	err = tx.QueryRowContext(ctx, `
		INSERT INTO finance_incomes (
			company_id, scheme_id, source, source_id, amount, has_referral, referral_id,
			doctor_id, registrator_id, patient_name, patient_phone, note, paid_at
		) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
		RETURNING id, created_at`,
		income.CompanyID, income.SchemeID, income.Source, income.SourceID, income.Amount, income.HasReferral,
		nullStr(income.ReferralID), nullStr(income.DoctorID), nullStr(income.RegistratorID),
		income.PatientName, income.PatientPhone, income.Note, income.PaidAt,
	).Scan(&income.ID, &income.CreatedAt)
	if err != nil {
		if pqErr, ok := err.(*pq.Error); ok && pqErr.Code == "23505" {
			return domain.ErrAlreadyExist
		}
		return err
	}
	for i := range allocs {
		a := &allocs[i]
		a.CompanyID = income.CompanyID
		a.IncomeID = income.ID
		err := tx.QueryRowContext(ctx, `
			INSERT INTO finance_allocations (
				company_id, income_id, category, beneficiary_type, beneficiary_id, beneficiary_name, amount, status
			) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
			RETURNING id, created_at`,
			a.CompanyID, a.IncomeID, a.Category, a.BeneficiaryType, nullStr(a.BeneficiaryID),
			a.BeneficiaryName, a.Amount, domain.AllocPending,
		).Scan(&a.ID, &a.CreatedAt)
		if err != nil {
			return err
		}
	}
	return tx.Commit()
}

func (r *Repository) ListIncomes(ctx context.Context, companyID string, day *time.Time, page, limit int) ([]domain.Income, int, error) {
	if page < 1 {
		page = 1
	}
	if limit < 1 || limit > 100 {
		limit = 20
	}
	where := []string{"i.company_id=$1"}
	args := []any{companyID}
	n := 2
	if day != nil {
		where = append(where, fmt.Sprintf("i.paid_at::date=$%d", n))
		args = append(args, day.Format("2006-01-02"))
		n++
	}
	w := strings.Join(where, " AND ")
	var total int
	if err := r.db.QueryRowContext(ctx, `SELECT COUNT(*) FROM finance_incomes i WHERE `+w, args...).Scan(&total); err != nil {
		return nil, 0, err
	}
	args = append(args, limit, (page-1)*limit)
	q := fmt.Sprintf(`
		SELECT i.id, i.company_id, i.scheme_id, COALESCE(s.name,''), i.source, i.source_id, i.amount,
			i.has_referral, i.referral_id, COALESCE(cr.name,''), i.doctor_id, COALESCE(cd.name,''),
			i.registrator_id, i.patient_name, i.patient_phone, i.note, i.paid_at, i.created_at
		FROM finance_incomes i
		LEFT JOIN finance_schemes s ON s.id=i.scheme_id
		LEFT JOIN company_referrals cr ON cr.id=i.referral_id
		LEFT JOIN company_doctors cd ON cd.id=i.doctor_id
		WHERE %s
		ORDER BY i.paid_at DESC
		LIMIT $%d OFFSET $%d`, w, n, n+1)
	rows, err := r.db.QueryContext(ctx, q, args...)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()
	out := make([]domain.Income, 0)
	for rows.Next() {
		item, err := scanIncome(rows)
		if err != nil {
			return nil, 0, err
		}
		out = append(out, *item)
	}
	return out, total, rows.Err()
}

func (r *Repository) ListAllocations(ctx context.Context, companyID, status, category string, day *time.Time, page, limit int) ([]domain.Allocation, int, error) {
	if page < 1 {
		page = 1
	}
	if limit < 1 || limit > 200 {
		limit = 50
	}
	where := []string{"a.company_id=$1"}
	args := []any{companyID}
	n := 2
	if status != "" {
		where = append(where, fmt.Sprintf("a.status=$%d", n))
		args = append(args, status)
		n++
	}
	if category != "" {
		where = append(where, fmt.Sprintf("a.category=$%d", n))
		args = append(args, category)
		n++
	}
	if day != nil {
		where = append(where, fmt.Sprintf("i.paid_at::date=$%d", n))
		args = append(args, day.Format("2006-01-02"))
		n++
	}
	w := strings.Join(where, " AND ")
	var total int
	if err := r.db.QueryRowContext(ctx, `
		SELECT COUNT(*) FROM finance_allocations a
		JOIN finance_incomes i ON i.id=a.income_id WHERE `+w, args...).Scan(&total); err != nil {
		return nil, 0, err
	}
	args = append(args, limit, (page-1)*limit)
	q := fmt.Sprintf(`
		SELECT a.id, a.company_id, a.income_id, a.category, a.beneficiary_type, a.beneficiary_id,
			a.beneficiary_name, a.amount, a.status, a.payout_note, a.paid_out_at, a.created_at,
			i.patient_name, i.source, i.amount, i.paid_at
		FROM finance_allocations a
		JOIN finance_incomes i ON i.id=a.income_id
		WHERE %s
		ORDER BY a.created_at DESC
		LIMIT $%d OFFSET $%d`, w, n, n+1)
	rows, err := r.db.QueryContext(ctx, q, args...)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()
	out := make([]domain.Allocation, 0)
	for rows.Next() {
		item, err := scanAllocation(rows)
		if err != nil {
			return nil, 0, err
		}
		out = append(out, *item)
	}
	return out, total, rows.Err()
}

func (r *Repository) PayAllocations(ctx context.Context, companyID string, ids []string, note string) (int, error) {
	if len(ids) == 0 {
		return 0, nil
	}
	res, err := r.db.ExecContext(ctx, `
		UPDATE finance_allocations SET
			status='paid', payout_note=CASE WHEN $3<>'' THEN $3 ELSE payout_note END,
			paid_out_at=NOW()
		WHERE company_id=$1 AND status='pending' AND id = ANY($2)`,
		companyID, pq.Array(ids), note,
	)
	if err != nil {
		return 0, err
	}
	n, _ := res.RowsAffected()
	return int(n), nil
}

func (r *Repository) PayAllocation(ctx context.Context, companyID, id, note string) error {
	res, err := r.db.ExecContext(ctx, `
		UPDATE finance_allocations SET
			status='paid', payout_note=CASE WHEN $3<>'' THEN $3 ELSE payout_note END,
			paid_out_at=NOW()
		WHERE id=$1 AND company_id=$2 AND status='pending'`, id, companyID, note)
	if err != nil {
		return err
	}
	n, _ := res.RowsAffected()
	if n == 0 {
		return domain.ErrNotFound
	}
	return nil
}

func (r *Repository) Summary(ctx context.Context, companyID string) (*domain.Summary, error) {
	var s domain.Summary
	err := r.db.QueryRowContext(ctx, `
		SELECT
			COALESCE((SELECT SUM(amount) FROM finance_incomes WHERE company_id=$1 AND paid_at::date=CURRENT_DATE),0),
			COALESCE((SELECT SUM(a.amount) FROM finance_allocations a
				JOIN finance_incomes i ON i.id=a.income_id
				WHERE a.company_id=$1 AND a.status='pending' AND i.paid_at::date=CURRENT_DATE),0),
			COALESCE((SELECT SUM(a.amount) FROM finance_allocations a
				JOIN finance_incomes i ON i.id=a.income_id
				WHERE a.company_id=$1 AND a.status='paid' AND i.paid_at::date=CURRENT_DATE),0),
			COALESCE((SELECT SUM(amount) FROM finance_allocations WHERE company_id=$1 AND status='pending'),0),
			COALESCE((SELECT SUM(amount) FROM finance_allocations WHERE company_id=$1 AND status='paid'),0),
			COALESCE((SELECT SUM(amount) FROM finance_allocations WHERE company_id=$1 AND status='pending' AND category='worker'),0),
			COALESCE((SELECT SUM(amount) FROM finance_allocations WHERE company_id=$1 AND status='pending' AND category='ads'),0),
			COALESCE((SELECT SUM(amount) FROM finance_allocations WHERE company_id=$1 AND status='pending' AND category='doctor'),0),
			COALESCE((SELECT SUM(amount) FROM finance_allocations WHERE company_id=$1 AND status='pending' AND category IN ('owner_sales','owner_deposit')),0),
			COALESCE((SELECT SUM(amount) FROM finance_allocations WHERE company_id=$1 AND status='pending' AND category='referral'),0)
	`, companyID).Scan(
		&s.TodayIncome, &s.TodayPending, &s.TodayPaidOut,
		&s.PendingTotal, &s.PaidOutTotal,
		&s.WorkerPending, &s.AdsPending, &s.DoctorPending, &s.OwnerPending, &s.ReferralPending,
	)
	return &s, err
}

type scannable interface {
	Scan(dest ...any) error
}

func scanScheme(s scannable) (*domain.Scheme, error) {
	var x domain.Scheme
	var linesRaw []byte
	err := s.Scan(
		&x.ID, &x.CompanyID, &x.Name, &x.Description,
		&x.WorkerPct, &x.AdsPct, &x.DoctorPct, &x.OwnerPct, &x.ReferralPct,
		&x.OwnerSalesPct, &x.OwnerDepositPct, &x.IsActive, &linesRaw, &x.CreatedAt, &x.UpdatedAt,
	)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, domain.ErrNotFound
	}
	if err != nil {
		return nil, err
	}
	if len(linesRaw) > 0 {
		_ = json.Unmarshal(linesRaw, &x.Lines)
	}
	if x.Lines == nil {
		x.Lines = []domain.SchemeLine{}
	}
	return &x, nil
}

func scanIncome(s scannable) (*domain.Income, error) {
	var x domain.Income
	var schemeID, referralID, doctorID, regID sql.NullString
	err := s.Scan(
		&x.ID, &x.CompanyID, &schemeID, &x.SchemeName, &x.Source, &x.SourceID, &x.Amount,
		&x.HasReferral, &referralID, &x.ReferralName, &doctorID, &x.DoctorName,
		&regID, &x.PatientName, &x.PatientPhone, &x.Note, &x.PaidAt, &x.CreatedAt,
	)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, domain.ErrNotFound
	}
	if err != nil {
		return nil, err
	}
	if schemeID.Valid {
		x.SchemeID = &schemeID.String
	}
	if referralID.Valid {
		x.ReferralID = &referralID.String
	}
	if doctorID.Valid {
		x.DoctorID = &doctorID.String
	}
	if regID.Valid {
		x.RegistratorID = &regID.String
	}
	return &x, nil
}

func scanAllocation(s scannable) (*domain.Allocation, error) {
	var x domain.Allocation
	var benID sql.NullString
	var paidOut sql.NullTime
	err := s.Scan(
		&x.ID, &x.CompanyID, &x.IncomeID, &x.Category, &x.BeneficiaryType, &benID,
		&x.BeneficiaryName, &x.Amount, &x.Status, &x.PayoutNote, &paidOut, &x.CreatedAt,
		&x.PatientName, &x.Source, &x.IncomeAmount, &x.PaidAt,
	)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, domain.ErrNotFound
	}
	if err != nil {
		return nil, err
	}
	if benID.Valid {
		x.BeneficiaryID = &benID.String
	}
	if paidOut.Valid {
		t := paidOut.Time
		x.PaidOutAt = &t
	}
	return &x, nil
}

func nullStr(p *string) any {
	if p == nil || *p == "" {
		return nil
	}
	return *p
}
