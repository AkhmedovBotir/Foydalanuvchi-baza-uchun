package dto

import "github.com/foydalanuvchilar-bazasi/backend/internal/modules/card/domain"

type TextFieldDTO = domain.TextField

type CardTemplateResponse struct {
	ID               string         `json:"id"`
	Name             string         `json:"name"`
	ImageURL         string         `json:"imageUrl"`
	ImageWidth       int            `json:"imageWidth"`
	ImageHeight      int            `json:"imageHeight"`
	ImageContentType string         `json:"imageContentType"`
	QRX              int            `json:"qrX"`
	QRY              int            `json:"qrY"`
	QRWidth          int            `json:"qrWidth"`
	QRHeight         int            `json:"qrHeight"`
	TextFields       []TextFieldDTO `json:"textFields"`
	CreatedAt        string         `json:"createdAt"`
	UpdatedAt        string         `json:"updatedAt"`
}

type CompanyCardResponse struct {
	ID               string         `json:"id"`
	CompanyID        string         `json:"companyId"`
	TemplateID       *string        `json:"templateId,omitempty"`
	Source           string         `json:"source"`
	Name             string         `json:"name"`
	ImageURL         string         `json:"imageUrl"`
	ImageWidth       int            `json:"imageWidth"`
	ImageHeight      int            `json:"imageHeight"`
	ImageContentType string         `json:"imageContentType"`
	QRX              int            `json:"qrX"`
	QRY              int            `json:"qrY"`
	QRWidth          int            `json:"qrWidth"`
	QRHeight         int            `json:"qrHeight"`
	TextFields       []TextFieldDTO `json:"textFields"`
	Orientation      string         `json:"orientation"`
	Cols             int            `json:"cols"`
	Rows             int            `json:"rows"`
	MarginMM         float64        `json:"marginMm"`
	GapMM            float64        `json:"gapMm"`
	SurveyID         *string        `json:"surveyId,omitempty"`
	SurveySlug       string         `json:"surveySlug,omitempty"`
	SurveyTitle      string         `json:"surveyTitle,omitempty"`
	ResponseURL      string         `json:"responseUrl,omitempty"`
	AppointmentID    *string        `json:"appointmentId,omitempty"`
	AppointmentSlug  string         `json:"appointmentSlug,omitempty"`
	AppointmentTitle string         `json:"appointmentTitle,omitempty"`
	BookingURL       string         `json:"bookingUrl,omitempty"`
	ReferralID       *string        `json:"referralId,omitempty"`
	ReferralName     string         `json:"referralName,omitempty"`
	CreatedAt        string         `json:"createdAt"`
	UpdatedAt        string         `json:"updatedAt"`
}

type CardBrief struct {
	ID          string `json:"id"`
	Name        string `json:"name"`
	ImageURL    string `json:"imageUrl"`
	PreviewURL  string `json:"previewUrl,omitempty"`
	QRURL       string `json:"qrUrl,omitempty"`
	ResponseURL string `json:"responseUrl,omitempty"`
	Source      string `json:"source"`
}

type UpdateTemplateRequest struct {
	Name        *string         `json:"name"`
	QRX         *int            `json:"qrX"`
	QRY         *int            `json:"qrY"`
	QRWidth     *int            `json:"qrWidth"`
	QRHeight    *int            `json:"qrHeight"`
	TextFields  []TextFieldDTO  `json:"textFields"`
}

type CreateFromTemplateRequest struct {
	TemplateID string         `json:"templateId" binding:"required"`
	Name       string         `json:"name"`
	TextFields []TextFieldDTO `json:"textFields"`
}

type UpdateCompanyCardRequest struct {
	Name        *string         `json:"name"`
	QRX         *int            `json:"qrX"`
	QRY         *int            `json:"qrY"`
	QRWidth     *int            `json:"qrWidth"`
	QRHeight    *int            `json:"qrHeight"`
	TextFields  []TextFieldDTO  `json:"textFields"`
	Orientation *string         `json:"orientation"`
	Cols        *int            `json:"cols"`
	Rows        *int            `json:"rows"`
}

type AttachCardRequest struct {
	CardID string `json:"cardId" binding:"required"`
}

type LayoutResponse = domain.Layout
