package domain

import (
	"errors"
	"time"
)

var (
	ErrNotFound     = errors.New("referal topilmadi")
	ErrInvalidInput = errors.New("noto'g'ri ma'lumot")
	ErrCardInUse    = errors.New("vizitka allaqachon boshqa yozuvga biriktirilgan")
)

type Referral struct {
	ID        string
	CompanyID string
	Name      string
	Phone     string
	Specialty string
	ServiceID *string
	CardID    *string
	// joined
	ServiceSlug  string
	ServiceTitle string
	CreatedAt    time.Time
	UpdatedAt    time.Time
}
