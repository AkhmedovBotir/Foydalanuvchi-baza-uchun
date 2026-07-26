package dto

type CreateCompanyRequest struct {
	Name     string `json:"name" binding:"required,min=2,max=200" example:"Tech Solutions LLC"`
	Phone    string `json:"phone" binding:"required,min=9,max=30" example:"+998901112233"`
	Username string `json:"username" binding:"required,min=3,max=100" example:"techsol"`
	Password string `json:"password" binding:"required,min=6,max=100" example:"company123"`
}

type UpdateCompanyRequest struct {
	Name     string `json:"name" binding:"required,min=2,max=200" example:"Tech Solutions LLC"`
	Phone    string `json:"phone" binding:"required,min=9,max=30" example:"+998901112233"`
	Username string `json:"username" binding:"required,min=3,max=100" example:"techsol"`
	Password string `json:"password" binding:"omitempty,min=6,max=100" example:"newcompany123"`
}

type LoginRequest struct {
	Username string `json:"username" binding:"required" example:"techsol"`
	Password string `json:"password" binding:"required" example:"company123"`
}

type UpdateProfileRequest struct {
	Name     string `json:"name" binding:"required,min=2,max=200" example:"Tech Solutions LLC"`
	Phone    string `json:"phone" binding:"required,min=9,max=30" example:"+998901112233"`
	Username string `json:"username" binding:"required,min=3,max=100" example:"techsol"`
	Password string `json:"password" binding:"omitempty,min=6,max=100" example:"newcompany123"`
}

type CompanyResponse struct {
	ID        string `json:"id" example:"550e8400-e29b-41d4-a716-446655440000"`
	Name      string `json:"name" example:"Tech Solutions LLC"`
	Phone     string `json:"phone" example:"+998901112233"`
	Username  string `json:"username" example:"techsol"`
	CreatedAt string `json:"created_at" example:"2026-07-24T12:00:00Z"`
	UpdatedAt string `json:"updated_at" example:"2026-07-24T12:00:00Z"`
}

type LoginResponse struct {
	Token   string          `json:"token" example:"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."`
	Company CompanyResponse `json:"company"`
}

type MessageResponse struct {
	Success bool        `json:"success" example:"true"`
	Message string      `json:"message" example:"Muvaffaqiyatli"`
	Data    interface{} `json:"data,omitempty"`
}

type ErrorResponse struct {
	Success bool   `json:"success" example:"false"`
	Message string `json:"message" example:"Xatolik yuz berdi"`
	Error   string `json:"error,omitempty" example:"validation failed"`
}
