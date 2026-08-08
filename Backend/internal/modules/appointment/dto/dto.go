package dto

import "github.com/foydalanuvchilar-bazasi/backend/internal/modules/appointment/domain"

type DaySchedule = domain.DaySchedule

type UpsertServiceRequest struct {
	Slug                string        `json:"slug" binding:"required,max=100"`
	Title               string        `json:"title" binding:"required,max=255"`
	Description         string        `json:"description" binding:"max=5000"`
	SlotIntervalMinutes int           `json:"slotIntervalMinutes" binding:"required,min=5,max=480"`
	Schedule            []DaySchedule `json:"schedule" binding:"required"`
	MaxDaysAhead        int           `json:"maxDaysAhead"`
}

type ServiceResponse struct {
	ID                  string        `json:"id"`
	CompanyID           string        `json:"companyId"`
	Slug                string        `json:"slug"`
	Title               string        `json:"title"`
	Description         string        `json:"description"`
	Status              string        `json:"status"`
	SlotIntervalMinutes int           `json:"slotIntervalMinutes"`
	Schedule            []DaySchedule `json:"schedule"`
	MaxDaysAhead        int           `json:"maxDaysAhead"`
	CardID              *string       `json:"cardId,omitempty"`
	BookingURL          string        `json:"bookingUrl,omitempty"`
	CreatedAt           string        `json:"createdAt"`
	UpdatedAt           string        `json:"updatedAt"`
	PublishedAt         string        `json:"publishedAt,omitempty"`
	ClosedAt            string        `json:"closedAt,omitempty"`
}

type AttachCardRequest struct {
	CardID string `json:"cardId" binding:"required"`
}

type CreateBookingRequest struct {
	Date      string `json:"date" binding:"required"`      // YYYY-MM-DD
	SlotStart string `json:"slotStart" binding:"required"` // HH:MM
	Name      string `json:"name" binding:"required,min=2,max=200"`
	Phone     string `json:"phone" binding:"required,min=9,max=30"`
	Purpose   string `json:"purpose" binding:"max=2000"`
	ReferralID string `json:"referralId"` // optional — referal orqali
}

type BookingResponse struct {
	ID          string `json:"id"`
	ServiceID   string `json:"serviceId"`
	ServiceSlug string `json:"serviceSlug,omitempty"`
	ServiceTitle string `json:"serviceTitle,omitempty"`
	Date        string `json:"date"`
	SlotStart   string `json:"slotStart"`
	SlotEnd     string `json:"slotEnd"`
	Name        string `json:"name"`
	Phone       string `json:"phone"`
	Purpose     string `json:"purpose"`
	Status      string `json:"status"`
	Conclusion  string `json:"conclusion"`
	ConcludedAt string `json:"concludedAt,omitempty"`
	CreatedAt   string `json:"createdAt"`
	UpdatedAt   string `json:"updatedAt"`
}

type UpdateBookingRequest struct {
	Status     *string `json:"status"`
	Conclusion *string `json:"conclusion"`
}

type SlotItem struct {
	Start    string `json:"start"`
	End      string `json:"end"`
	Available bool  `json:"available"`
}

type DayAvailability struct {
	Date         string `json:"date"`
	Weekday      int    `json:"weekday"`
	Open         bool   `json:"open"`
	TotalSlots   int    `json:"totalSlots"`
	FreeSlots    int    `json:"freeSlots"`
}

type PublicServiceResponse struct {
	ID                  string        `json:"id"`
	Slug                string        `json:"slug"`
	Title               string        `json:"title"`
	Description         string        `json:"description"`
	Status              string        `json:"status"`
	SlotIntervalMinutes int           `json:"slotIntervalMinutes"`
	Schedule            []DaySchedule `json:"schedule"`
	MaxDaysAhead        int           `json:"maxDaysAhead"`
}

type BookingListResult struct {
	Data  []BookingResponse `json:"data"`
	Total int               `json:"total"`
	Page  int               `json:"page"`
	Limit int               `json:"limit"`
}

type BookingSummary struct {
	ServiceID      string `json:"serviceId"`
	Total          int    `json:"total"`
	Pending        int    `json:"pending"`
	Confirmed      int    `json:"confirmed"`
	Completed      int    `json:"completed"`
	Cancelled      int    `json:"cancelled"`
	Today          int    `json:"today"`
	ThisWeek       int    `json:"thisWeek"`
}
