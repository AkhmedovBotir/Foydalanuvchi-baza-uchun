package handler

import (
	"errors"
	"net/http"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"

	"github.com/foydalanuvchilar-bazasi/backend/internal/modules/appointment/domain"
	"github.com/foydalanuvchilar-bazasi/backend/internal/modules/appointment/dto"
	"github.com/foydalanuvchilar-bazasi/backend/internal/modules/appointment/service"
	"github.com/foydalanuvchilar-bazasi/backend/internal/platform/middleware"
	"github.com/foydalanuvchilar-bazasi/backend/internal/platform/response"
)

type Handler struct {
	svc *service.Service
}

func NewHandler(svc *service.Service) *Handler {
	return &Handler{svc: svc}
}

func (h *Handler) Create(c *gin.Context) {
	var req dto.UpsertServiceRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, "Validatsiya xatosi", err.Error())
		return
	}
	x, err := h.svc.Create(c.Request.Context(), c.GetString(middleware.ContextCompanyID), req)
	if err != nil {
		h.handleError(c, err)
		return
	}
	response.Created(c, "Qabul xizmati yaratildi", x)
}

func (h *Handler) List(c *gin.Context) {
	list, err := h.svc.List(c.Request.Context(), c.GetString(middleware.ContextCompanyID))
	if err != nil {
		h.handleError(c, err)
		return
	}
	response.OK(c, "Qabul xizmatlari", list)
}

func (h *Handler) Get(c *gin.Context) {
	x, err := h.svc.Get(c.Request.Context(), c.GetString(middleware.ContextCompanyID), c.Param("id"))
	if err != nil {
		h.handleError(c, err)
		return
	}
	response.OK(c, "Qabul xizmati", x)
}

func (h *Handler) Update(c *gin.Context) {
	var req dto.UpsertServiceRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, "Validatsiya xatosi", err.Error())
		return
	}
	x, err := h.svc.Update(c.Request.Context(), c.GetString(middleware.ContextCompanyID), c.Param("id"), req)
	if err != nil {
		h.handleError(c, err)
		return
	}
	response.OK(c, "Qabul yangilandi", x)
}

func (h *Handler) Delete(c *gin.Context) {
	if err := h.svc.Delete(c.Request.Context(), c.GetString(middleware.ContextCompanyID), c.Param("id")); err != nil {
		h.handleError(c, err)
		return
	}
	response.OK(c, "Qabul o‘chirildi", nil)
}

func (h *Handler) Publish(c *gin.Context) {
	x, err := h.svc.Publish(c.Request.Context(), c.GetString(middleware.ContextCompanyID), c.Param("id"))
	if err != nil {
		h.handleError(c, err)
		return
	}
	response.OK(c, "Qabul nashr qilindi", x)
}

func (h *Handler) Close(c *gin.Context) {
	x, err := h.svc.Close(c.Request.Context(), c.GetString(middleware.ContextCompanyID), c.Param("id"))
	if err != nil {
		h.handleError(c, err)
		return
	}
	response.OK(c, "Qabul yopildi", x)
}

func (h *Handler) AttachCard(c *gin.Context) {
	var req dto.AttachCardRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, "Validatsiya xatosi", err.Error())
		return
	}
	x, err := h.svc.AttachCard(c.Request.Context(), c.GetString(middleware.ContextCompanyID), c.Param("id"), req.CardID)
	if err != nil {
		h.handleError(c, err)
		return
	}
	response.OK(c, "Vizitka biriktirildi", x)
}

func (h *Handler) DetachCard(c *gin.Context) {
	x, err := h.svc.DetachCard(c.Request.Context(), c.GetString(middleware.ContextCompanyID), c.Param("id"))
	if err != nil {
		h.handleError(c, err)
		return
	}
	response.OK(c, "Vizitka ajratildi", x)
}

func (h *Handler) ListBookings(c *gin.Context) {
	page, _ := strconv.Atoi(c.Query("page"))
	limit, _ := strconv.Atoi(c.Query("limit"))
	serviceRef := c.Query("service")
	if serviceRef == "" {
		serviceRef = c.Query("serviceId")
	}
	status := c.Query("status")
	x, err := h.svc.ListBookings(c.Request.Context(), c.GetString(middleware.ContextCompanyID), serviceRef, status, page, limit)
	if err != nil {
		h.handleError(c, err)
		return
	}
	response.OK(c, "Bronlar", x)
}

func (h *Handler) GetBooking(c *gin.Context) {
	x, err := h.svc.GetBooking(c.Request.Context(), c.GetString(middleware.ContextCompanyID), c.Param("bookingId"))
	if err != nil {
		h.handleError(c, err)
		return
	}
	response.OK(c, "Bron", x)
}

func (h *Handler) UpdateBooking(c *gin.Context) {
	var req dto.UpdateBookingRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, "Validatsiya xatosi", err.Error())
		return
	}
	x, err := h.svc.UpdateBooking(c.Request.Context(), c.GetString(middleware.ContextCompanyID), c.Param("bookingId"), req)
	if err != nil {
		h.handleError(c, err)
		return
	}
	response.OK(c, "Bron yangilandi", x)
}

func (h *Handler) Summary(c *gin.Context) {
	x, err := h.svc.Summary(c.Request.Context(), c.GetString(middleware.ContextCompanyID), c.Query("service"))
	if err != nil {
		h.handleError(c, err)
		return
	}
	response.OK(c, "Qabul xulosasi", x)
}

// Public

func (h *Handler) PublicGet(c *gin.Context) {
	x, err := h.svc.PublicGet(c.Request.Context(), c.Param("slug"))
	if err != nil {
		h.handleError(c, err)
		return
	}
	response.OK(c, "Qabul", x)
}

func (h *Handler) PublicDays(c *gin.Context) {
	fromStr := c.DefaultQuery("from", time.Now().Format("2006-01-02"))
	toStr := c.Query("to")
	from, err := time.ParseInLocation("2006-01-02", fromStr, time.Local)
	if err != nil {
		response.BadRequest(c, "Noto‘g‘ri from sana", err.Error())
		return
	}
	to := from.AddDate(0, 0, 14)
	if toStr != "" {
		t, err := time.ParseInLocation("2006-01-02", toStr, time.Local)
		if err != nil {
			response.BadRequest(c, "Noto‘g‘ri to sana", err.Error())
			return
		}
		to = t
	}
	x, err := h.svc.AvailableDays(c.Request.Context(), c.Param("slug"), from, to)
	if err != nil {
		h.handleError(c, err)
		return
	}
	response.OK(c, "Mavjud kunlar", x)
}

func (h *Handler) PublicSlots(c *gin.Context) {
	date := c.Query("date")
	if date == "" {
		response.BadRequest(c, "date majburiy", "")
		return
	}
	x, err := h.svc.AvailableSlots(c.Request.Context(), c.Param("slug"), date)
	if err != nil {
		h.handleError(c, err)
		return
	}
	response.OK(c, "Vaqt oraliglari", x)
}

func (h *Handler) PublicBook(c *gin.Context) {
	var req dto.CreateBookingRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, "Validatsiya xatosi", err.Error())
		return
	}
	x, err := h.svc.CreateBooking(c.Request.Context(), c.Param("slug"), req)
	if err != nil {
		h.handleError(c, err)
		return
	}
	response.Created(c, "Bron muvaffaqiyatli qabul qilindi", x)
}

func (h *Handler) handleError(c *gin.Context, err error) {
	switch {
	case errors.Is(err, domain.ErrNotFound), errors.Is(err, domain.ErrBookingNotFound):
		response.NotFound(c, err.Error())
	case errors.Is(err, domain.ErrForbidden):
		response.Fail(c, http.StatusForbidden, err.Error(), "")
	case errors.Is(err, domain.ErrInvalidInput),
		errors.Is(err, domain.ErrNotPublished),
		errors.Is(err, domain.ErrSlotTaken),
		errors.Is(err, domain.ErrSlotClosed),
		errors.Is(err, domain.ErrNotDraft),
		errors.Is(err, domain.ErrNotOpen):
		response.BadRequest(c, err.Error(), "")
	default:
		c.Error(err)
		response.Internal(c, "Ichki server xatosi")
	}
}
