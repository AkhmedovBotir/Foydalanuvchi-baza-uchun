package repository

import (
	"context"
	"database/sql"
	"errors"
	"strings"

	"github.com/foydalanuvchilar-bazasi/backend/internal/modules/admin/domain"
	"github.com/lib/pq"
)

type AdminRepository struct {
	db *sql.DB
}

func NewAdminRepository(db *sql.DB) *AdminRepository {
	return &AdminRepository{db: db}
}

func (r *AdminRepository) Create(ctx context.Context, admin *domain.Admin) error {
	query := `
		INSERT INTO admins (name, phone, username, password)
		VALUES ($1, $2, $3, $4)
		RETURNING id, created_at, updated_at`

	err := r.db.QueryRowContext(ctx, query,
		admin.Name, admin.Phone, admin.Username, admin.Password,
	).Scan(&admin.ID, &admin.CreatedAt, &admin.UpdatedAt)

	if err != nil {
		return mapUniqueViolation(err)
	}
	return nil
}

func (r *AdminRepository) FindAll(ctx context.Context) ([]domain.Admin, error) {
	query := `
		SELECT id, name, phone, username, password, created_at, updated_at
		FROM admins
		ORDER BY created_at DESC`

	rows, err := r.db.QueryContext(ctx, query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	admins := make([]domain.Admin, 0)
	for rows.Next() {
		var a domain.Admin
		if err := rows.Scan(
			&a.ID, &a.Name, &a.Phone, &a.Username, &a.Password, &a.CreatedAt, &a.UpdatedAt,
		); err != nil {
			return nil, err
		}
		admins = append(admins, a)
	}
	return admins, rows.Err()
}

func (r *AdminRepository) FindByID(ctx context.Context, id string) (*domain.Admin, error) {
	query := `
		SELECT id, name, phone, username, password, created_at, updated_at
		FROM admins WHERE id = $1`

	var a domain.Admin
	err := r.db.QueryRowContext(ctx, query, id).Scan(
		&a.ID, &a.Name, &a.Phone, &a.Username, &a.Password, &a.CreatedAt, &a.UpdatedAt,
	)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, domain.ErrAdminNotFound
	}
	if err != nil {
		return nil, err
	}
	return &a, nil
}

func (r *AdminRepository) FindByUsername(ctx context.Context, username string) (*domain.Admin, error) {
	query := `
		SELECT id, name, phone, username, password, created_at, updated_at
		FROM admins WHERE LOWER(username) = LOWER($1)`

	var a domain.Admin
	err := r.db.QueryRowContext(ctx, query, username).Scan(
		&a.ID, &a.Name, &a.Phone, &a.Username, &a.Password, &a.CreatedAt, &a.UpdatedAt,
	)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, domain.ErrAdminNotFound
	}
	if err != nil {
		return nil, err
	}
	return &a, nil
}

func (r *AdminRepository) Update(ctx context.Context, admin *domain.Admin) error {
	query := `
		UPDATE admins
		SET name = $1, phone = $2, username = $3, password = $4, updated_at = NOW()
		WHERE id = $5
		RETURNING updated_at`

	err := r.db.QueryRowContext(ctx, query,
		admin.Name, admin.Phone, admin.Username, admin.Password, admin.ID,
	).Scan(&admin.UpdatedAt)

	if errors.Is(err, sql.ErrNoRows) {
		return domain.ErrAdminNotFound
	}
	if err != nil {
		return mapUniqueViolation(err)
	}
	return nil
}

func (r *AdminRepository) Count(ctx context.Context) (int64, error) {
	var count int64
	err := r.db.QueryRowContext(ctx, `SELECT COUNT(*) FROM admins`).Scan(&count)
	return count, err
}

func (r *AdminRepository) Delete(ctx context.Context, id string) error {
	result, err := r.db.ExecContext(ctx, `DELETE FROM admins WHERE id = $1`, id)
	if err != nil {
		return err
	}
	n, err := result.RowsAffected()
	if err != nil {
		return err
	}
	if n == 0 {
		return domain.ErrAdminNotFound
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
