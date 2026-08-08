package domain

import (
	"errors"
	"time"
)

var (
	ErrRegistratorNotFound = errors.New("registrator topilmadi")
	ErrDoctorNotFound      = errors.New("shifokor topilmadi")
	ErrUsernameTaken       = errors.New("bu username allaqachon band")
	ErrWeakPassword        = errors.New("parol kamida 6 ta belgidan iborat bo'lishi kerak")
	ErrInvalidInput        = errors.New("noto'g'ri ma'lumot")
	ErrInvalidCredentials  = errors.New("username yoki parol noto'g'ri")
)

type Registrator struct {
	ID        string
	CompanyID string
	Name      string
	Phone     string
	Username  string
	Password  string
	CreatedAt time.Time
	UpdatedAt time.Time
}

type Doctor struct {
	ID        string
	CompanyID string
	Name      string
	Specialty string
	Phone     string
	Username  string
	Password  string
	CreatedAt time.Time
	UpdatedAt time.Time
}
