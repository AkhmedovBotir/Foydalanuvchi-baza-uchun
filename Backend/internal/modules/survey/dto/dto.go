package dto

import "encoding/json"

type CreateSurveyRequest struct {
	Slug        string          `json:"slug" binding:"required,max=100"`
	Title       string          `json:"title" binding:"required,max=255"`
	Description string          `json:"description" binding:"max=10000"`
	Settings    json.RawMessage `json:"settings"`
	Questions   json.RawMessage `json:"questions" binding:"required"`
	SortOrder   int             `json:"sortOrder"`
}
type UpdateSurveyRequest = CreateSurveyRequest
type SurveyResponse struct {
	ID               string                `json:"id"`
	CompanyID        string                `json:"companyId,omitempty"`
	Slug             string                `json:"slug"`
	Title            string                `json:"title"`
	Description      string                `json:"description"`
	Settings         json.RawMessage       `json:"settings,omitempty"`
	Questions        json.RawMessage       `json:"questions,omitempty"`
	QuestionCount    int                   `json:"questionCount"`
	Status           string                `json:"status"`
	SortOrder        int                   `json:"sortOrder"`
	ResponseURL      string                `json:"responseUrl,omitempty"`
	RespondentFields []RespondentFieldMeta `json:"respondentFields"`
	CreatedAt        string                `json:"createdAt"`
	UpdatedAt        string                `json:"updatedAt"`
	PublishedAt      string                `json:"publishedAt,omitempty"`
	ClosedAt         string                `json:"closedAt,omitempty"`
}
type PublicSurveyListItem struct {
	ID            string `json:"id"`
	Title         string `json:"title"`
	Description   string `json:"description"`
	QuestionCount int    `json:"questionCount"`
}

type PublicSurveyResponse struct {
	ID               string                 `json:"id"`
	Title            string                 `json:"title"`
	Description      string                 `json:"description"`
	Settings         json.RawMessage        `json:"settings,omitempty"`
	Questions        json.RawMessage        `json:"questions"`
	Status           string                 `json:"status"`
	RespondentFields []RespondentFieldMeta  `json:"respondentFields"`
}

// RespondentFieldMeta — forma ochilganda frontend shu maydonlarni avtomatik chizadi
// (savollar ro'yxatidan tashqari: ism, telefon).
type RespondentFieldMeta struct {
	Key      string `json:"key" example:"name"`
	Label    string `json:"label" example:"Ism familiya"`
	Type     string `json:"type" example:"text"`
	Required bool   `json:"required" example:"true"`
}

// DefaultRespondentFields — barcha formalarda majburiy respondent maydonlari.
func DefaultRespondentFields() []RespondentFieldMeta {
	return []RespondentFieldMeta{
		{Key: "name", Label: "Ism familiya", Type: "text", Required: true},
		{Key: "phone", Label: "Telefon raqam", Type: "phone", Required: true},
	}
}

// FormSubmitRequest — tokensiz forma topshirish (ism + telefon majburiy).
type FormSubmitRequest struct {
	Name    string          `json:"name" binding:"required,min=2,max=200" example:"Alisher Karimov"`
	Phone   string          `json:"phone" binding:"required,min=9,max=30" example:"+998901234567"`
	Answers json.RawMessage `json:"answers" binding:"required"`
}

type FormSubmitResult struct {
	ID                  string `json:"id" example:"550e8400-e29b-41d4-a716-446655440000"`
	Name                string `json:"name" example:"Alisher Karimov"`
	Phone               string `json:"phone" example:"+998901234567"`
	ConfirmationMessage string `json:"confirmationMessage,omitempty" example:"Rahmat!"`
	CreatedAt           string `json:"createdAt" example:"2026-07-25T12:00:00Z"`
}

// SubmitSurveyResponseRequest — eski public submit (ham name/phone majburiy).
type SubmitSurveyResponseRequest struct {
	Name    string          `json:"name" binding:"required,min=2,max=200"`
	Phone   string          `json:"phone" binding:"required,min=9,max=30"`
	Answers json.RawMessage `json:"answers" binding:"required"`
}

type SubmitSurveyResponseResult struct {
	ID                  string `json:"id"`
	Name                string `json:"name"`
	Phone               string `json:"phone"`
	ConfirmationMessage string `json:"confirmationMessage,omitempty"`
	CreatedAt           string `json:"createdAt"`
}

type SurveyResponseItem struct {
	ID              string          `json:"id"`
	SurveyID        string          `json:"surveyId"`
	SurveySlug      string          `json:"surveySlug"`
	SurveyTitle     string          `json:"surveyTitle"`
	RespondentName  string          `json:"name"`
	RespondentPhone string          `json:"phone"`
	Answers         json.RawMessage `json:"answers"`
	CreatedAt       string          `json:"createdAt"`
}

type SurveyResponseList struct {
	Data  []SurveyResponseItem `json:"data"`
	Total int                  `json:"total"`
	Page  int                  `json:"page"`
	Limit int                  `json:"limit"`
}

type SurveyResponseDetail struct {
	SurveyResponseItem
	SurveyStatus string          `json:"surveyStatus"`
	Questions    json.RawMessage `json:"questions"`
}

type SurveyResponseSummary struct {
	SurveyID         string `json:"surveyId"`
	SurveySlug       string `json:"surveySlug"`
	SurveyTitle      string `json:"surveyTitle"`
	SurveyStatus     string `json:"surveyStatus"`
	TotalResponses   int    `json:"totalResponses"`
	TodayResponses   int    `json:"todayResponses"`
	WeekResponses    int    `json:"weekResponses"`
	FirstResponseAt  string `json:"firstResponseAt,omitempty"`
	LastResponseAt   string `json:"lastResponseAt,omitempty"`
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
