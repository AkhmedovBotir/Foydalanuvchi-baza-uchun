package dto

type SchemeLineInput struct {
	ID             string            `json:"id"`
	Label          string            `json:"label" binding:"required,min=1,max=200"`
	Pct            float64           `json:"pct" binding:"min=0,max=100"`
	Role           string            `json:"role"`
	OnlyIfReferral bool              `json:"onlyIfReferral"`
	DoctorID       string            `json:"doctorId"`
	ReferralID     string            `json:"referralId"`
	Children       []SchemeLineInput `json:"children"`
}

type SchemeDoctorInput struct {
	DoctorID string  `json:"doctorId" binding:"required"`
	Pct      float64 `json:"pct" binding:"min=0,max=100"`
}

type SchemeReferralInput struct {
	ReferralID string  `json:"referralId" binding:"required"`
	Pct        float64 `json:"pct" binding:"min=0,max=100"`
}

type UpsertSchemeRequest struct {
	Name            string                `json:"name" binding:"required,min=2,max=200"`
	Description     string                `json:"description"`
	// Lines — asosiy dinamik taqsimot. Bo‘sh bo‘lsa legacy foizlar ishlatiladi.
	Lines           []SchemeLineInput     `json:"lines"`
	// Legacy (orqaga moslik)
	WorkerPct       float64               `json:"workerPct" binding:"min=0,max=100"`
	AdsPct          float64               `json:"adsPct" binding:"min=0,max=100"`
	DoctorPct       float64               `json:"doctorPct" binding:"min=0,max=100"`
	OwnerPct        float64               `json:"ownerPct" binding:"min=0,max=100"`
	ReferralPct     float64               `json:"referralPct" binding:"min=0,max=100"`
	OwnerSalesPct   float64               `json:"ownerSalesPct" binding:"min=0,max=100"`
	OwnerDepositPct float64               `json:"ownerDepositPct" binding:"min=0,max=100"`
	IsActive        bool                  `json:"isActive"`
	Doctors         []SchemeDoctorInput   `json:"doctors"`
	Referrals       []SchemeReferralInput `json:"referrals"`
}

type SchemeLineResponse struct {
	ID             string               `json:"id"`
	Label          string               `json:"label"`
	Pct            float64              `json:"pct"`
	Role           string               `json:"role"`
	OnlyIfReferral bool                 `json:"onlyIfReferral,omitempty"`
	DoctorID       string               `json:"doctorId,omitempty"`
	ReferralID     string               `json:"referralId,omitempty"`
	Children       []SchemeLineResponse `json:"children,omitempty"`
}

type SchemeDoctorResponse struct {
	DoctorID   string  `json:"doctorId"`
	DoctorName string  `json:"doctorName"`
	Pct        float64 `json:"pct"`
}

type SchemeReferralResponse struct {
	ReferralID   string  `json:"referralId"`
	ReferralName string  `json:"referralName"`
	Pct          float64 `json:"pct"`
}

type SchemeResponse struct {
	ID              string                   `json:"id"`
	CompanyID       string                   `json:"companyId"`
	Name            string                   `json:"name"`
	Description     string                   `json:"description"`
	Lines           []SchemeLineResponse     `json:"lines"`
	WorkerPct       float64                  `json:"workerPct"`
	AdsPct          float64                  `json:"adsPct"`
	DoctorPct       float64                  `json:"doctorPct"`
	OwnerPct        float64                  `json:"ownerPct"`
	ReferralPct     float64                  `json:"referralPct"`
	OwnerSalesPct   float64                 `json:"ownerSalesPct"`
	OwnerDepositPct float64                  `json:"ownerDepositPct"`
	IsActive        bool                     `json:"isActive"`
	Doctors         []SchemeDoctorResponse   `json:"doctors"`
	Referrals       []SchemeReferralResponse `json:"referrals"`
	CreatedAt       string                   `json:"createdAt"`
	UpdatedAt       string                   `json:"updatedAt"`
}

type IncomeResponse struct {
	ID            string  `json:"id"`
	SchemeID      *string `json:"schemeId,omitempty"`
	SchemeName    string  `json:"schemeName,omitempty"`
	Source        string  `json:"source"`
	SourceID      string  `json:"sourceId"`
	Amount        float64 `json:"amount"`
	HasReferral   bool    `json:"hasReferral"`
	ReferralID    *string `json:"referralId,omitempty"`
	ReferralName  string  `json:"referralName,omitempty"`
	DoctorID      *string `json:"doctorId,omitempty"`
	DoctorName    string  `json:"doctorName,omitempty"`
	RegistratorID *string `json:"registratorId,omitempty"`
	PatientName   string  `json:"patientName"`
	PatientPhone  string  `json:"patientPhone"`
	Note          string  `json:"note"`
	PaidAt        string  `json:"paidAt"`
	CreatedAt     string  `json:"createdAt"`
}

type AllocationResponse struct {
	ID              string  `json:"id"`
	IncomeID        string  `json:"incomeId"`
	Category        string  `json:"category"`
	BeneficiaryType string  `json:"beneficiaryType"`
	BeneficiaryID   *string `json:"beneficiaryId,omitempty"`
	BeneficiaryName string  `json:"beneficiaryName"`
	Amount          float64 `json:"amount"`
	Status          string  `json:"status"`
	PayoutNote      string  `json:"payoutNote"`
	PaidOutAt       string  `json:"paidOutAt,omitempty"`
	PatientName     string  `json:"patientName,omitempty"`
	Source          string  `json:"source,omitempty"`
	IncomeAmount    float64 `json:"incomeAmount,omitempty"`
	PaidAt          string  `json:"paidAt,omitempty"`
	CreatedAt       string  `json:"createdAt"`
}

type ListResult[T any] struct {
	Data  []T `json:"data"`
	Total int `json:"total"`
	Page  int `json:"page"`
	Limit int `json:"limit"`
}

type PayAllocationRequest struct {
	Note string `json:"note"`
}

type PayBatchRequest struct {
	IDs  []string `json:"ids" binding:"required,min=1"`
	Note string   `json:"note"`
}

type SummaryResponse struct {
	TodayIncome     float64 `json:"todayIncome"`
	TodayPending    float64 `json:"todayPending"`
	TodayPaidOut    float64 `json:"todayPaidOut"`
	PendingTotal    float64 `json:"pendingTotal"`
	PaidOutTotal    float64 `json:"paidOutTotal"`
	WorkerPending   float64 `json:"workerPending"`
	AdsPending      float64 `json:"adsPending"`
	DoctorPending   float64 `json:"doctorPending"`
	OwnerPending    float64 `json:"ownerPending"`
	ReferralPending float64 `json:"referralPending"`
}
