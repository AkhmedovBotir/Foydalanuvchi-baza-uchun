package dto

type CreateAdminRequest struct {
	Name     string `json:"name" binding:"required,min=2,max=150" example:"Alisher Karimov"`
	Phone    string `json:"phone" binding:"required,min=9,max=30" example:"+998901234567"`
	Username string `json:"username" binding:"required,min=3,max=100" example:"admin"`
	Password string `json:"password" binding:"required,min=6,max=100" example:"secret123"`
}

type UpdateAdminRequest struct {
	Name     string `json:"name" binding:"required,min=2,max=150" example:"Alisher Karimov"`
	Phone    string `json:"phone" binding:"required,min=9,max=30" example:"+998901234567"`
	Username string `json:"username" binding:"required,min=3,max=100" example:"admin"`
	Password string `json:"password" binding:"omitempty,min=6,max=100" example:"newsecret123"`
}

type LoginRequest struct {
	Username string `json:"username" binding:"required" example:"admin"`
	Password string `json:"password" binding:"required" example:"secret123"`
}

type UpdateProfileRequest struct {
	Name     string `json:"name" binding:"required,min=2,max=150" example:"Alisher Karimov"`
	Phone    string `json:"phone" binding:"required,min=9,max=30" example:"+998901234567"`
	Username string `json:"username" binding:"required,min=3,max=100" example:"admin"`
	Password string `json:"password" binding:"omitempty,min=6,max=100" example:"newsecret123"`
}

type AdminResponse struct {
	ID        string `json:"id" example:"550e8400-e29b-41d4-a716-446655440000"`
	Name      string `json:"name" example:"Alisher Karimov"`
	Phone     string `json:"phone" example:"+998901234567"`
	Username  string `json:"username" example:"admin"`
	CreatedAt string `json:"created_at" example:"2026-07-24T12:00:00Z"`
	UpdatedAt string `json:"updated_at" example:"2026-07-24T12:00:00Z"`
}

type LoginResponse struct {
	Token string        `json:"token" example:"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."`
	Admin AdminResponse `json:"admin"`
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
