package domain

import (
	"errors"
	"time"
)

const (
	StatusPending      = "pending"
	StatusAssigned     = "assigned"
	StatusPaid         = "paid"
	StatusNoShow       = "no_show"
	StatusConcluded    = "concluded"
	StatusCancelled    = "cancelled"
	StatusDoctorNoShow = "doctor_no_show"

	SourceSurvey  = "survey"
	SourceBooking = "booking"
)

var (
	ErrNotFound     = errors.New("yozuv topilmadi")
	ErrInvalidInput = errors.New("noto'g'ri ma'lumot")
	ErrForbidden    = errors.New("ruxsat yo'q")
	ErrBadState     = errors.New("holat uchun amal mumkin emas")
)

type CaseItem struct {
	ID              string
	Source          string // survey | booking
	CompanyID       string
	SourceID        string
	Title           string
	PatientName     string
	PatientPhone    string
	Purpose         string
	WorkflowStatus  string
	AssignedDoctorID *string
	DoctorName      string
	RegistratorID   *string
	PaymentAmount   *float64
	PaymentNote     string
	PaidAt          *time.Time
	Conclusion      string
	ConcludedAt     *time.Time
	// booking extras
	Date      string
	SlotStart string
	SlotEnd   string
	// referral extras
	ReferralID        *string
	ReferralName      string
	ReferralPhone     string
	ReferralSpecialty string
	// survey extras
	SurveySlug string
	Answers    map[string]any
	CreatedAt  time.Time
	UpdatedAt  time.Time
}

type Dashboard struct {
	Pending     int
	Assigned    int
	Paid        int
	TodayPaid   int
	MyQueue     int
	Concluded   int
	NoShow      int
}
