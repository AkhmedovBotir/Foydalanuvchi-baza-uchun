package dto

type CreateReferralRequest struct {
	Name      string `json:"name" binding:"required,min=2,max=200"`
	Phone     string `json:"phone" binding:"required,min=9,max=30"`
	Specialty string `json:"specialty" binding:"required,min=2,max=200"`
	ServiceID string `json:"serviceId"` // ixtiyoriy — vizitka QR uchun qabul
}

type UpdateReferralRequest struct {
	Name      string `json:"name" binding:"required,min=2,max=200"`
	Phone     string `json:"phone" binding:"required,min=9,max=30"`
	Specialty string `json:"specialty" binding:"required,min=2,max=200"`
	ServiceID string `json:"serviceId"`
}

type AttachCardRequest struct {
	CardID    string `json:"cardId" binding:"required"`
	ServiceID string `json:"serviceId"` // qabul xizmati (QR /book/{slug}?ref=)
}

type ReferralResponse struct {
	ID           string  `json:"id"`
	CompanyID    string  `json:"companyId"`
	Name         string  `json:"name"`
	Phone        string  `json:"phone"`
	Specialty    string  `json:"specialty"`
	ServiceID    *string `json:"serviceId,omitempty"`
	ServiceSlug  string  `json:"serviceSlug,omitempty"`
	ServiceTitle string  `json:"serviceTitle,omitempty"`
	CardID       *string `json:"cardId,omitempty"`
	BookingURL   string  `json:"bookingUrl,omitempty"`
	CreatedAt    string  `json:"createdAt"`
	UpdatedAt    string  `json:"updatedAt"`
}
