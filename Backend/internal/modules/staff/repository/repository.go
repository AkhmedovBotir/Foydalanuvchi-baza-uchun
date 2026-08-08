package repository

import (
	"context"
	"database/sql"
	"errors"
	"strings"

	"github.com/foydalanuvchilar-bazasi/backend/internal/modules/staff/domain"
	"github.com/lib/pq"
)

type Repository struct {
	db *sql.DB
}

func NewRepository(db *sql.DB) *Repository {
	return &Repository{db: db}
}

// ——— Registrators ———

func (r *Repository) CreateRegistrator(ctx context.Context, x *domain.Registrator) error {
	err := r.db.QueryRowContext(ctx, `
		INSERT INTO company_registrators (company_id, name, phone, username, password)
		VALUES ($1,$2,$3,$4,$5)
		RETURNING id, created_at, updated_at`,
		x.CompanyID, x.Name, x.Phone, x.Username, x.Password,
	).Scan(&x.ID, &x.CreatedAt, &x.UpdatedAt)
	return mapUnique(err)
}

func (r *Repository) ListRegistrators(ctx context.Context, companyID string) ([]domain.Registrator, error) {
	rows, err := r.db.QueryContext(ctx, `
		SELECT id, company_id, name, phone, username, password, created_at, updated_at
		FROM company_registrators WHERE company_id=$1
		ORDER BY created_at DESC`, companyID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := make([]domain.Registrator, 0)
	for rows.Next() {
		var x domain.Registrator
		if err := rows.Scan(
			&x.ID, &x.CompanyID, &x.Name, &x.Phone, &x.Username, &x.Password, &x.CreatedAt, &x.UpdatedAt,
		); err != nil {
			return nil, err
		}
		out = append(out, x)
	}
	return out, rows.Err()
}

func (r *Repository) GetRegistrator(ctx context.Context, companyID, id string) (*domain.Registrator, error) {
	var x domain.Registrator
	err := r.db.QueryRowContext(ctx, `
		SELECT id, company_id, name, phone, username, password, created_at, updated_at
		FROM company_registrators WHERE id=$1 AND company_id=$2`, id, companyID,
	).Scan(&x.ID, &x.CompanyID, &x.Name, &x.Phone, &x.Username, &x.Password, &x.CreatedAt, &x.UpdatedAt)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, domain.ErrRegistratorNotFound
	}
	if err != nil {
		return nil, err
	}
	return &x, nil
}

func (r *Repository) UpdateRegistrator(ctx context.Context, x *domain.Registrator) error {
	res, err := r.db.ExecContext(ctx, `
		UPDATE company_registrators SET
			name=$3, phone=$4, username=$5, password=$6, updated_at=NOW()
		WHERE id=$1 AND company_id=$2`,
		x.ID, x.CompanyID, x.Name, x.Phone, x.Username, x.Password,
	)
	if err != nil {
		return mapUnique(err)
	}
	n, _ := res.RowsAffected()
	if n == 0 {
		return domain.ErrRegistratorNotFound
	}
	// refresh timestamps
	return r.db.QueryRowContext(ctx, `
		SELECT created_at, updated_at FROM company_registrators WHERE id=$1`, x.ID,
	).Scan(&x.CreatedAt, &x.UpdatedAt)
}

func (r *Repository) DeleteRegistrator(ctx context.Context, companyID, id string) error {
	res, err := r.db.ExecContext(ctx, `
		DELETE FROM company_registrators WHERE id=$1 AND company_id=$2`, id, companyID)
	if err != nil {
		return err
	}
	n, _ := res.RowsAffected()
	if n == 0 {
		return domain.ErrRegistratorNotFound
	}
	return nil
}

func (r *Repository) FindRegistratorByUsername(ctx context.Context, username string) (*domain.Registrator, error) {
	var x domain.Registrator
	err := r.db.QueryRowContext(ctx, `
		SELECT id, company_id, name, phone, username, password, created_at, updated_at
		FROM company_registrators WHERE LOWER(username)=LOWER($1)
		ORDER BY created_at ASC LIMIT 1`, username,
	).Scan(&x.ID, &x.CompanyID, &x.Name, &x.Phone, &x.Username, &x.Password, &x.CreatedAt, &x.UpdatedAt)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, domain.ErrRegistratorNotFound
	}
	if err != nil {
		return nil, err
	}
	return &x, nil
}

func (r *Repository) FindRegistratorByID(ctx context.Context, id string) (*domain.Registrator, error) {
	var x domain.Registrator
	err := r.db.QueryRowContext(ctx, `
		SELECT id, company_id, name, phone, username, password, created_at, updated_at
		FROM company_registrators WHERE id=$1`, id,
	).Scan(&x.ID, &x.CompanyID, &x.Name, &x.Phone, &x.Username, &x.Password, &x.CreatedAt, &x.UpdatedAt)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, domain.ErrRegistratorNotFound
	}
	if err != nil {
		return nil, err
	}
	return &x, nil
}

// ——— Doctors ———

func (r *Repository) CreateDoctor(ctx context.Context, x *domain.Doctor) error {
	err := r.db.QueryRowContext(ctx, `
		INSERT INTO company_doctors (company_id, name, specialty, phone, username, password)
		VALUES ($1,$2,$3,$4,$5,$6)
		RETURNING id, created_at, updated_at`,
		x.CompanyID, x.Name, x.Specialty, x.Phone, x.Username, x.Password,
	).Scan(&x.ID, &x.CreatedAt, &x.UpdatedAt)
	return mapUnique(err)
}

func (r *Repository) ListDoctors(ctx context.Context, companyID string) ([]domain.Doctor, error) {
	rows, err := r.db.QueryContext(ctx, `
		SELECT id, company_id, name, specialty, phone, username, password, created_at, updated_at
		FROM company_doctors WHERE company_id=$1
		ORDER BY created_at DESC`, companyID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := make([]domain.Doctor, 0)
	for rows.Next() {
		var x domain.Doctor
		if err := rows.Scan(
			&x.ID, &x.CompanyID, &x.Name, &x.Specialty, &x.Phone, &x.Username, &x.Password, &x.CreatedAt, &x.UpdatedAt,
		); err != nil {
			return nil, err
		}
		out = append(out, x)
	}
	return out, rows.Err()
}

func (r *Repository) GetDoctor(ctx context.Context, companyID, id string) (*domain.Doctor, error) {
	var x domain.Doctor
	err := r.db.QueryRowContext(ctx, `
		SELECT id, company_id, name, specialty, phone, username, password, created_at, updated_at
		FROM company_doctors WHERE id=$1 AND company_id=$2`, id, companyID,
	).Scan(&x.ID, &x.CompanyID, &x.Name, &x.Specialty, &x.Phone, &x.Username, &x.Password, &x.CreatedAt, &x.UpdatedAt)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, domain.ErrDoctorNotFound
	}
	if err != nil {
		return nil, err
	}
	return &x, nil
}

func (r *Repository) UpdateDoctor(ctx context.Context, x *domain.Doctor) error {
	res, err := r.db.ExecContext(ctx, `
		UPDATE company_doctors SET
			name=$3, specialty=$4, phone=$5, username=$6, password=$7, updated_at=NOW()
		WHERE id=$1 AND company_id=$2`,
		x.ID, x.CompanyID, x.Name, x.Specialty, x.Phone, x.Username, x.Password,
	)
	if err != nil {
		return mapUnique(err)
	}
	n, _ := res.RowsAffected()
	if n == 0 {
		return domain.ErrDoctorNotFound
	}
	return r.db.QueryRowContext(ctx, `
		SELECT created_at, updated_at FROM company_doctors WHERE id=$1`, x.ID,
	).Scan(&x.CreatedAt, &x.UpdatedAt)
}

func (r *Repository) DeleteDoctor(ctx context.Context, companyID, id string) error {
	res, err := r.db.ExecContext(ctx, `
		DELETE FROM company_doctors WHERE id=$1 AND company_id=$2`, id, companyID)
	if err != nil {
		return err
	}
	n, _ := res.RowsAffected()
	if n == 0 {
		return domain.ErrDoctorNotFound
	}
	return nil
}

func (r *Repository) FindDoctorByUsername(ctx context.Context, username string) (*domain.Doctor, error) {
	var x domain.Doctor
	err := r.db.QueryRowContext(ctx, `
		SELECT id, company_id, name, specialty, phone, username, password, created_at, updated_at
		FROM company_doctors WHERE LOWER(username)=LOWER($1)
		ORDER BY created_at ASC LIMIT 1`, username,
	).Scan(&x.ID, &x.CompanyID, &x.Name, &x.Specialty, &x.Phone, &x.Username, &x.Password, &x.CreatedAt, &x.UpdatedAt)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, domain.ErrDoctorNotFound
	}
	if err != nil {
		return nil, err
	}
	return &x, nil
}

func (r *Repository) FindDoctorByID(ctx context.Context, id string) (*domain.Doctor, error) {
	var x domain.Doctor
	err := r.db.QueryRowContext(ctx, `
		SELECT id, company_id, name, specialty, phone, username, password, created_at, updated_at
		FROM company_doctors WHERE id=$1`, id,
	).Scan(&x.ID, &x.CompanyID, &x.Name, &x.Specialty, &x.Phone, &x.Username, &x.Password, &x.CreatedAt, &x.UpdatedAt)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, domain.ErrDoctorNotFound
	}
	if err != nil {
		return nil, err
	}
	return &x, nil
}

func mapUnique(err error) error {
	if err == nil {
		return nil
	}
	var pqErr *pq.Error
	if errors.As(err, &pqErr) && pqErr.Code == "23505" {
		if strings.Contains(pqErr.Constraint, "username") {
			return domain.ErrUsernameTaken
		}
		return domain.ErrUsernameTaken
	}
	return err
}
