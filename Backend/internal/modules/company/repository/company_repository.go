package repository

import (
	"context"
	"database/sql"
	"errors"
	"strings"

	"github.com/foydalanuvchilar-bazasi/backend/internal/modules/company/domain"
	"github.com/lib/pq"
)

type CompanyRepository struct {
	db *sql.DB
}

func NewCompanyRepository(db *sql.DB) *CompanyRepository {
	return &CompanyRepository{db: db}
}

func (r *CompanyRepository) Create(ctx context.Context, company *domain.Company) error {
	query := `
		INSERT INTO companies (name, phone, username, password)
		VALUES ($1, $2, $3, $4)
		RETURNING id, created_at, updated_at`

	err := r.db.QueryRowContext(ctx, query,
		company.Name, company.Phone, company.Username, company.Password,
	).Scan(&company.ID, &company.CreatedAt, &company.UpdatedAt)

	if err != nil {
		return mapUniqueViolation(err)
	}
	return nil
}

func (r *CompanyRepository) FindAll(ctx context.Context) ([]domain.Company, error) {
	query := `
		SELECT id, name, phone, username, password, created_at, updated_at
		FROM companies
		ORDER BY created_at DESC`

	rows, err := r.db.QueryContext(ctx, query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	companies := make([]domain.Company, 0)
	for rows.Next() {
		var c domain.Company
		if err := rows.Scan(
			&c.ID, &c.Name, &c.Phone, &c.Username, &c.Password, &c.CreatedAt, &c.UpdatedAt,
		); err != nil {
			return nil, err
		}
		companies = append(companies, c)
	}
	return companies, rows.Err()
}

func (r *CompanyRepository) FindByID(ctx context.Context, id string) (*domain.Company, error) {
	query := `
		SELECT id, name, phone, username, password, created_at, updated_at
		FROM companies WHERE id = $1`

	var c domain.Company
	err := r.db.QueryRowContext(ctx, query, id).Scan(
		&c.ID, &c.Name, &c.Phone, &c.Username, &c.Password, &c.CreatedAt, &c.UpdatedAt,
	)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, domain.ErrCompanyNotFound
	}
	if err != nil {
		return nil, err
	}
	return &c, nil
}

func (r *CompanyRepository) FindByUsername(ctx context.Context, username string) (*domain.Company, error) {
	query := `
		SELECT id, name, phone, username, password, created_at, updated_at
		FROM companies WHERE LOWER(username) = LOWER($1)`

	var c domain.Company
	err := r.db.QueryRowContext(ctx, query, username).Scan(
		&c.ID, &c.Name, &c.Phone, &c.Username, &c.Password, &c.CreatedAt, &c.UpdatedAt,
	)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, domain.ErrCompanyNotFound
	}
	if err != nil {
		return nil, err
	}
	return &c, nil
}

func (r *CompanyRepository) Update(ctx context.Context, company *domain.Company) error {
	query := `
		UPDATE companies
		SET name = $1, phone = $2, username = $3, password = $4, updated_at = NOW()
		WHERE id = $5
		RETURNING updated_at`

	err := r.db.QueryRowContext(ctx, query,
		company.Name, company.Phone, company.Username, company.Password, company.ID,
	).Scan(&company.UpdatedAt)

	if errors.Is(err, sql.ErrNoRows) {
		return domain.ErrCompanyNotFound
	}
	if err != nil {
		return mapUniqueViolation(err)
	}
	return nil
}

func (r *CompanyRepository) Delete(ctx context.Context, id string) error {
	result, err := r.db.ExecContext(ctx, `DELETE FROM companies WHERE id = $1`, id)
	if err != nil {
		return err
	}
	n, err := result.RowsAffected()
	if err != nil {
		return err
	}
	if n == 0 {
		return domain.ErrCompanyNotFound
	}
	return nil
}

func mapUniqueViolation(err error) error {
	var pqErr *pq.Error
	if errors.As(err, &pqErr) && pqErr.Code == "23505" {
		constraint := strings.ToLower(pqErr.Constraint)
		if strings.Contains(constraint, "username") {
			return domain.ErrUsernameTaken
		}
		if strings.Contains(constraint, "phone") {
			return domain.ErrPhoneTaken
		}
		return domain.ErrUsernameTaken
	}
	return err
}
