package dto

type LoginRequest struct {
	Username string `json:"username" binding:"required"`
	Password string `json:"password" binding:"required"`
}

type RegistratorLoginResponse struct {
	Token       string               `json:"token"`
	Registrator RegistratorResponse  `json:"registrator"`
}

type DoctorLoginResponse struct {
	Token  string         `json:"token"`
	Doctor DoctorResponse `json:"doctor"`
}

type CreateRegistratorRequest struct {
	Name     string `json:"name" binding:"required,min=2,max=200"`
	Phone    string `json:"phone" binding:"required,min=9,max=30"`
	Username string `json:"username" binding:"required,min=3,max=100"`
	Password string `json:"password" binding:"required,min=6,max=100"`
}

type UpdateRegistratorRequest struct {
	Name     string `json:"name" binding:"required,min=2,max=200"`
	Phone    string `json:"phone" binding:"required,min=9,max=30"`
	Username string `json:"username" binding:"required,min=3,max=100"`
	Password string `json:"password" binding:"omitempty,min=6,max=100"`
}

type RegistratorResponse struct {
	ID        string `json:"id"`
	CompanyID string `json:"companyId"`
	Name      string `json:"name"`
	Phone     string `json:"phone"`
	Username  string `json:"username"`
	CreatedAt string `json:"createdAt"`
	UpdatedAt string `json:"updatedAt"`
}

type CreateDoctorRequest struct {
	Name      string `json:"name" binding:"required,min=2,max=200"`
	Specialty string `json:"specialty" binding:"required,min=2,max=200"`
	Phone     string `json:"phone" binding:"required,min=9,max=30"`
	Username  string `json:"username" binding:"required,min=3,max=100"`
	Password  string `json:"password" binding:"required,min=6,max=100"`
}

type UpdateDoctorRequest struct {
	Name      string `json:"name" binding:"required,min=2,max=200"`
	Specialty string `json:"specialty" binding:"required,min=2,max=200"`
	Phone     string `json:"phone" binding:"required,min=9,max=30"`
	Username  string `json:"username" binding:"required,min=3,max=100"`
	Password  string `json:"password" binding:"omitempty,min=6,max=100"`
}

type DoctorResponse struct {
	ID        string `json:"id"`
	CompanyID string `json:"companyId"`
	Name      string `json:"name"`
	Specialty string `json:"specialty"`
	Phone     string `json:"phone"`
	Username  string `json:"username"`
	CreatedAt string `json:"createdAt"`
	UpdatedAt string `json:"updatedAt"`
}
