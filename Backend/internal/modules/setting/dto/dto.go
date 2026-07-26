package dto

type UpdateSurveyLinkBaseRequest struct {
	BaseURL string `json:"base_url" binding:"required,url,min=8,max=500" example:"http://localhost:3000/s"`
}

type SurveyLinkBaseResponse struct {
	Key       string `json:"key" example:"survey_link_base_url"`
	BaseURL   string `json:"base_url" example:"http://localhost:3000/s"`
	UpdatedAt string `json:"updated_at" example:"2026-07-25T12:00:00Z"`
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
