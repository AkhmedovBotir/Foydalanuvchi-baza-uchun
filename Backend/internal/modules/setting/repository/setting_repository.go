package repository

import (
	"context"
	"database/sql"
	"errors"
	"time"

	"github.com/foydalanuvchilar-bazasi/backend/internal/modules/setting/domain"
)

type SettingRepository struct {
	db *sql.DB
}

func NewSettingRepository(db *sql.DB) *SettingRepository {
	return &SettingRepository{db: db}
}

func (r *SettingRepository) Get(ctx context.Context, key string) (*domain.Setting, error) {
	var s domain.Setting
	var updatedAt time.Time
	err := r.db.QueryRowContext(ctx,
		`SELECT key, value, updated_at FROM settings WHERE key = $1`, key,
	).Scan(&s.Key, &s.Value, &updatedAt)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, domain.ErrSettingNotFound
	}
	if err != nil {
		return nil, err
	}
	s.UpdatedAt = updatedAt.UTC().Format(time.RFC3339)
	return &s, nil
}

func (r *SettingRepository) Upsert(ctx context.Context, key, value string) (*domain.Setting, error) {
	var s domain.Setting
	var updatedAt time.Time
	err := r.db.QueryRowContext(ctx, `
		INSERT INTO settings (key, value, updated_at)
		VALUES ($1, $2, NOW())
		ON CONFLICT (key) DO UPDATE
		SET value = EXCLUDED.value, updated_at = NOW()
		RETURNING key, value, updated_at`,
		key, value,
	).Scan(&s.Key, &s.Value, &updatedAt)
	if err != nil {
		return nil, err
	}
	s.UpdatedAt = updatedAt.UTC().Format(time.RFC3339)
	return &s, nil
}
