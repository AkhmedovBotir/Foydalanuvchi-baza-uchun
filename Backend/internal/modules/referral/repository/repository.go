package repository

import (
	"context"
	"database/sql"
	"errors"
	"time"

	"github.com/foydalanuvchilar-bazasi/backend/internal/modules/referral/domain"
)

type Repository struct {
	db *sql.DB
}

func NewRepository(db *sql.DB) *Repository {
	return &Repository{db: db}
}

func (r *Repository) Create(ctx context.Context, x *domain.Referral) error {
	return r.db.QueryRowContext(ctx, `
		INSERT INTO company_referrals (company_id, name, phone, specialty, service_id)
		VALUES ($1,$2,$3,$4,$5)
		RETURNING id, created_at, updated_at`,
		x.CompanyID, x.Name, x.Phone, x.Specialty, nullStr(x.ServiceID),
	).Scan(&x.ID, &x.CreatedAt, &x.UpdatedAt)
}

func (r *Repository) List(ctx context.Context, companyID string) ([]domain.Referral, error) {
	rows, err := r.db.QueryContext(ctx, `
		SELECT r.id, r.company_id, r.name, r.phone, r.specialty,
			r.service_id, r.card_id,
			COALESCE(s.slug,''), COALESCE(s.title,''),
			r.created_at, r.updated_at
		FROM company_referrals r
		LEFT JOIN appointment_services s ON s.id=r.service_id
		WHERE r.company_id=$1
		ORDER BY r.created_at DESC`, companyID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := make([]domain.Referral, 0)
	for rows.Next() {
		item, err := scanReferral(rows)
		if err != nil {
			return nil, err
		}
		out = append(out, *item)
	}
	return out, rows.Err()
}

func (r *Repository) Get(ctx context.Context, companyID, id string) (*domain.Referral, error) {
	row := r.db.QueryRowContext(ctx, `
		SELECT r.id, r.company_id, r.name, r.phone, r.specialty,
			r.service_id, r.card_id,
			COALESCE(s.slug,''), COALESCE(s.title,''),
			r.created_at, r.updated_at
		FROM company_referrals r
		LEFT JOIN appointment_services s ON s.id=r.service_id
		WHERE r.id=$1 AND r.company_id=$2`, id, companyID)
	return scanReferral(row)
}

func (r *Repository) GetByID(ctx context.Context, id string) (*domain.Referral, error) {
	row := r.db.QueryRowContext(ctx, `
		SELECT r.id, r.company_id, r.name, r.phone, r.specialty,
			r.service_id, r.card_id,
			COALESCE(s.slug,''), COALESCE(s.title,''),
			r.created_at, r.updated_at
		FROM company_referrals r
		LEFT JOIN appointment_services s ON s.id=r.service_id
		WHERE r.id=$1`, id)
	return scanReferral(row)
}

func (r *Repository) Update(ctx context.Context, x *domain.Referral) error {
	res, err := r.db.ExecContext(ctx, `
		UPDATE company_referrals SET
			name=$3, phone=$4, specialty=$5, service_id=$6, updated_at=NOW()
		WHERE id=$1 AND company_id=$2`,
		x.ID, x.CompanyID, x.Name, x.Phone, x.Specialty, nullStr(x.ServiceID),
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

func (r *Repository) Delete(ctx context.Context, companyID, id string) error {
	res, err := r.db.ExecContext(ctx, `
		DELETE FROM company_referrals WHERE id=$1 AND company_id=$2`, id, companyID)
	if err != nil {
		return err
	}
	n, _ := res.RowsAffected()
	if n == 0 {
		return domain.ErrNotFound
	}
	return nil
}

func (r *Repository) SetCard(ctx context.Context, companyID, id string, cardID, serviceID *string) error {
	// clear same card from other company referrals first is done in service
	res, err := r.db.ExecContext(ctx, `
		UPDATE company_referrals SET
			card_id=$3, service_id=COALESCE($4, service_id), updated_at=NOW()
		WHERE id=$1 AND company_id=$2`,
		id, companyID, nullStr(cardID), nullStr(serviceID),
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

func (r *Repository) ClearCard(ctx context.Context, companyID, id string) error {
	res, err := r.db.ExecContext(ctx, `
		UPDATE company_referrals SET card_id=NULL, updated_at=NOW()
		WHERE id=$1 AND company_id=$2`, id, companyID)
	if err != nil {
		return err
	}
	n, _ := res.RowsAffected()
	if n == 0 {
		return domain.ErrNotFound
	}
	return nil
}

func (r *Repository) ClearCardByCardID(ctx context.Context, companyID, cardID string) error {
	_, err := r.db.ExecContext(ctx, `
		UPDATE company_referrals SET card_id=NULL, updated_at=NOW()
		WHERE company_id=$1 AND card_id=$2`, companyID, cardID)
	return err
}

func (r *Repository) ByCard(ctx context.Context, companyID, cardID string) (*domain.Referral, error) {
	row := r.db.QueryRowContext(ctx, `
		SELECT r.id, r.company_id, r.name, r.phone, r.specialty,
			r.service_id, r.card_id,
			COALESCE(s.slug,''), COALESCE(s.title,''),
			r.created_at, r.updated_at
		FROM company_referrals r
		LEFT JOIN appointment_services s ON s.id=r.service_id
		WHERE r.company_id=$1 AND r.card_id=$2
		LIMIT 1`, companyID, cardID)
	item, err := scanReferral(row)
	if errors.Is(err, domain.ErrNotFound) {
		return nil, nil
	}
	return item, err
}

func (r *Repository) ServiceBelongs(ctx context.Context, companyID, serviceID string) (bool, error) {
	var n int
	err := r.db.QueryRowContext(ctx, `
		SELECT COUNT(*) FROM appointment_services WHERE id=$1 AND company_id=$2`,
		serviceID, companyID,
	).Scan(&n)
	return n > 0, err
}

func (r *Repository) CardBelongs(ctx context.Context, companyID, cardID string) (bool, error) {
	var n int
	err := r.db.QueryRowContext(ctx, `
		SELECT COUNT(*) FROM company_cards WHERE id=$1 AND company_id=$2`,
		cardID, companyID,
	).Scan(&n)
	return n > 0, err
}

type scannable interface {
	Scan(dest ...any) error
}

func scanReferral(s scannable) (*domain.Referral, error) {
	var x domain.Referral
	var serviceID, cardID sql.NullString
	var created, updated time.Time
	err := s.Scan(
		&x.ID, &x.CompanyID, &x.Name, &x.Phone, &x.Specialty,
		&serviceID, &cardID, &x.ServiceSlug, &x.ServiceTitle,
		&created, &updated,
	)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, domain.ErrNotFound
	}
	if err != nil {
		return nil, err
	}
	if serviceID.Valid {
		v := serviceID.String
		x.ServiceID = &v
	}
	if cardID.Valid {
		v := cardID.String
		x.CardID = &v
	}
	x.CreatedAt = created
	x.UpdatedAt = updated
	return &x, nil
}

func nullStr(p *string) any {
	if p == nil || *p == "" {
		return nil
	}
	return *p
}
