package domain

import (
	"errors"
	"time"
)

const (
	CategoryWorker       = "worker"
	CategoryAds          = "ads"
	CategoryDoctor       = "doctor"
	CategoryOwnerSales   = "owner_sales"
	CategoryOwnerDeposit = "owner_deposit"
	CategoryReferral     = "referral"
	CategoryResidual     = "residual"
	CategoryCustom       = "custom"

	RoleWorker        = "worker"
	RoleAds           = "ads"
	RoleDoctor        = "doctor"
	RoleOwner         = "owner"
	RoleReferral      = "referral"
	RoleOwnerSales    = "owner_sales"
	RoleOwnerDeposit  = "owner_deposit"
	RoleDoctorShare   = "doctor_share"
	RoleReferralShare = "referral_share"
	RoleCustom        = "custom"

	AllocPending = "pending"
	AllocPaid    = "paid"

	SourceBooking = "booking"
	SourceSurvey  = "survey"
)

var (
	ErrNotFound     = errors.New("yozuv topilmadi")
	ErrInvalidInput = errors.New("noto'g'ri ma'lumot")
	ErrBadPct       = errors.New("foizlar yig'indisi noto'g'ri")
	ErrNoScheme     = errors.New("faol moliya sxemasi topilmadi")
	ErrAlreadyExist = errors.New("bu to'lov allaqachon moliya hisobida")
)

// SchemeLine — taqsimot daraxtining tuguni (yuqori yoki ichki).
type SchemeLine struct {
	ID             string       `json:"id"`
	Label          string       `json:"label"`
	Pct            float64      `json:"pct"`
	Role           string       `json:"role"`
	OnlyIfReferral bool         `json:"onlyIfReferral,omitempty"`
	DoctorID       string       `json:"doctorId,omitempty"`
	ReferralID     string       `json:"referralId,omitempty"`
	Children       []SchemeLine `json:"children,omitempty"`
}

type SchemeDoctor struct {
	DoctorID   string
	DoctorName string
	Pct        float64
}

type SchemeReferral struct {
	ReferralID   string
	ReferralName string
	Pct          float64
}

type Scheme struct {
	ID              string
	CompanyID       string
	Name            string
	Description     string
	WorkerPct       float64
	AdsPct          float64
	DoctorPct       float64
	OwnerPct        float64
	ReferralPct     float64
	OwnerSalesPct   float64
	OwnerDepositPct float64
	IsActive        bool
	Lines           []SchemeLine
	Doctors         []SchemeDoctor
	Referrals       []SchemeReferral
	CreatedAt       time.Time
	UpdatedAt       time.Time
}

type IncomeEvent struct {
	CompanyID     string
	Source        string
	SourceID      string
	Amount        float64
	ReferralID    *string
	DoctorID      *string
	RegistratorID *string
	PatientName   string
	PatientPhone  string
	Note          string
	PaidAt        time.Time
}

type Income struct {
	ID            string
	CompanyID     string
	SchemeID      *string
	SchemeName    string
	Source        string
	SourceID      string
	Amount        float64
	HasReferral   bool
	ReferralID    *string
	ReferralName  string
	DoctorID      *string
	DoctorName    string
	RegistratorID *string
	PatientName   string
	PatientPhone  string
	Note          string
	PaidAt        time.Time
	CreatedAt     time.Time
}

type Allocation struct {
	ID              string
	CompanyID       string
	IncomeID        string
	Category        string
	BeneficiaryType string
	BeneficiaryID   *string
	BeneficiaryName string
	Amount          float64
	Status          string
	PayoutNote      string
	PaidOutAt       *time.Time
	CreatedAt       time.Time
	// joined
	PatientName  string
	Source       string
	IncomeAmount float64
	PaidAt       time.Time
}

type Summary struct {
	TodayIncome     float64
	TodayPending    float64
	TodayPaidOut    float64
	PendingTotal    float64
	PaidOutTotal    float64
	WorkerPending   float64
	AdsPending      float64
	DoctorPending   float64
	OwnerPending    float64
	ReferralPending float64
}
