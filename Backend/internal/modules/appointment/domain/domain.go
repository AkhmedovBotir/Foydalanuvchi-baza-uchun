package domain

import (
	"errors"
	"time"
)

const (
	StatusDraft     = "draft"
	StatusPublished = "published"
	StatusClosed    = "closed"

	BookingPending   = "pending"
	BookingConfirmed = "confirmed"
	BookingCompleted = "completed"
	BookingCancelled = "cancelled"
	BookingNoShow    = "no_show"
)

var (
	ErrNotFound      = errors.New("qabul topilmadi")
	ErrBookingNotFound = errors.New("bron topilmadi")
	ErrInvalidInput  = errors.New("noto'g'ri ma'lumot")
	ErrNotPublished  = errors.New("qabul nashr qilinmagan")
	ErrSlotTaken     = errors.New("bu vaqt band")
	ErrSlotClosed    = errors.New("bu vaqt mavjud emas")
	ErrForbidden     = errors.New("ruxsat yo'q")
	ErrNotDraft      = errors.New("faqat loyiha holatida nashr qilinadi")
	ErrNotOpen       = errors.New("faqat nashr qilingan qabul yopiladi")
)

// DaySchedule — hafta kuni ish vaqti.
// Weekday: 1=Dushanba ... 7=Yakshanba
type DaySchedule struct {
	Weekday int    `json:"weekday"`
	Enabled bool   `json:"enabled"`
	Start   string `json:"start"` // HH:MM
	End     string `json:"end"`   // HH:MM
}

type Service struct {
	ID                  string
	CompanyID           string
	Slug                string
	Title               string
	Description         string
	Status              string
	SlotIntervalMinutes int
	Schedule            []DaySchedule
	MaxDaysAhead        int
	CardID              *string
	CreatedAt           time.Time
	UpdatedAt           time.Time
	PublishedAt         *time.Time
	ClosedAt            *time.Time
}

type Booking struct {
	ID               string
	ServiceID        string
	CompanyID        string
	BookingDate      time.Time // date only
	SlotStart        string    // HH:MM:SS or HH:MM
	SlotEnd          string
	RespondentName   string
	RespondentPhone  string
	Purpose          string
	Status           string
	Conclusion       string
	ConcludedAt      *time.Time
	ReferralID       *string
	CreatedAt        time.Time
	UpdatedAt        time.Time
}
