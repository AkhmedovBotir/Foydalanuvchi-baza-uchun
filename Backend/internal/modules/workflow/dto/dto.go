package dto

type AssignRequest struct {
	DoctorID      string   `json:"doctorId" binding:"required"`
	PaymentAmount *float64 `json:"paymentAmount"`
	PaymentNote   string   `json:"paymentNote"`
}

type PaymentRequest struct {
	Amount float64 `json:"amount" binding:"required,gt=0"`
	Note   string  `json:"note"`
}

type ConcludeRequest struct {
	Conclusion string `json:"conclusion" binding:"required,min=1,max=5000"`
}

type DoctorBrief struct {
	ID        string `json:"id"`
	Name      string `json:"name"`
	Specialty string `json:"specialty"`
	Phone     string `json:"phone"`
}

type CaseResponse struct {
	ID               string         `json:"id"`
	Source           string         `json:"source"`
	SourceID         string         `json:"sourceId"`
	Title            string         `json:"title"`
	PatientName      string         `json:"patientName"`
	PatientPhone     string         `json:"patientPhone"`
	Purpose          string         `json:"purpose,omitempty"`
	WorkflowStatus   string         `json:"workflowStatus"`
	AssignedDoctorID *string        `json:"assignedDoctorId,omitempty"`
	DoctorName       string         `json:"doctorName,omitempty"`
	RegistratorID    *string        `json:"registratorId,omitempty"`
	PaymentAmount    *float64       `json:"paymentAmount,omitempty"`
	PaymentNote      string         `json:"paymentNote,omitempty"`
	PaidAt           string         `json:"paidAt,omitempty"`
	Conclusion       string         `json:"conclusion,omitempty"`
	ConcludedAt      string         `json:"concludedAt,omitempty"`
	Date             string         `json:"date,omitempty"`
	SlotStart        string         `json:"slotStart,omitempty"`
	SlotEnd          string         `json:"slotEnd,omitempty"`
	SurveySlug       string         `json:"surveySlug,omitempty"`
	Answers          map[string]any `json:"answers,omitempty"`
	ReferralID       *string        `json:"referralId,omitempty"`
	ReferralName     string         `json:"referralName,omitempty"`
	ReferralPhone    string         `json:"referralPhone,omitempty"`
	ReferralSpecialty string        `json:"referralSpecialty,omitempty"`
	CreatedAt        string         `json:"createdAt"`
	UpdatedAt        string         `json:"updatedAt,omitempty"`
}

type CaseListResult struct {
	Data  []CaseResponse `json:"data"`
	Total int            `json:"total"`
	Page  int            `json:"page"`
	Limit int            `json:"limit"`
}

type DashboardResponse struct {
	Pending   int `json:"pending"`
	Assigned  int `json:"assigned"`
	Paid      int `json:"paid"`
	TodayPaid int `json:"todayPaid"`
	MyQueue   int `json:"myQueue"`
	Concluded int `json:"concluded"`
	NoShow    int `json:"noShow"`
}
