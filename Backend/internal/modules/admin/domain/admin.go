package domain

import (
	"errors"
	"time"
)

var (
	ErrAdminNotFound      = errors.New("admin topilmadi")
	ErrUsernameTaken      = errors.New("bu username allaqachon band")
	ErrPhoneTaken         = errors.New("bu telefon raqami allaqachon band")
	ErrInvalidCredentials = errors.New("username yoki parol noto'g'ri")
	ErrWeakPassword       = errors.New("parol kamida 6 ta belgidan iborat bo'lishi kerak")
)

type Admin struct {
	ID        string    `json:"id"`
	Name      string    `json:"name"`
	Phone     string    `json:"phone"`
	Username  string    `json:"username"`
	Password  string    `json:"-"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}
