package handler

import (
	"errors"
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"

	"github.com/foydalanuvchilar-bazasi/backend/internal/modules/workflow/domain"
	"github.com/foydalanuvchilar-bazasi/backend/internal/modules/workflow/dto"
	"github.com/foydalanuvchilar-bazasi/backend/internal/modules/workflow/service"
	"github.com/foydalanuvchilar-bazasi/backend/internal/platform/middleware"
	"github.com/foydalanuvchilar-bazasi/backend/internal/platform/response"
)

type Handler struct {
	svc *service.Service
}

func NewHandler(svc *service.Service) *Handler {
	return &Handler{svc: svc}
}

func (h *Handler) companyAndStaff(c *gin.Context) (companyID, staffID string) {
	return c.GetString(middleware.ContextCompanyID), c.GetString(middleware.ContextStaffID)
}

// ——— Registrator ———

func (h *Handler) RegDashboard(c *gin.Context) {
	companyID, _ := h.companyAndStaff(c)
	x, err := h.svc.RegistratorDashboard(c.Request.Context(), companyID)
	if err != nil {
		h.handleError(c, err)
		return
	}
	response.OK(c, "Dashboard", x)
}

func (h *Handler) RegDoctors(c *gin.Context) {
	companyID, _ := h.companyAndStaff(c)
	x, err := h.svc.ListDoctors(c.Request.Context(), companyID)
	if err != nil {
		h.handleError(c, err)
		return
	}
	response.OK(c, "Shifokorlar", x)
}

func (h *Handler) RegListSurveys(c *gin.Context) {
	h.listSurveys(c, "")
}

func (h *Handler) RegListBookings(c *gin.Context) {
	h.listBookings(c, "")
}

func (h *Handler) RegGetSurvey(c *gin.Context) {
	companyID, _ := h.companyAndStaff(c)
	x, err := h.svc.GetSurvey(c.Request.Context(), companyID, c.Param("id"))
	if err != nil {
		h.handleError(c, err)
		return
	}
	response.OK(c, "Javob", x)
}

func (h *Handler) RegGetBooking(c *gin.Context) {
	companyID, _ := h.companyAndStaff(c)
	x, err := h.svc.GetBooking(c.Request.Context(), companyID, c.Param("id"))
	if err != nil {
		h.handleError(c, err)
		return
	}
	response.OK(c, "Bron", x)
}

func (h *Handler) RegAssignSurvey(c *gin.Context) {
	var req dto.AssignRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, "Validatsiya xatosi", err.Error())
		return
	}
	companyID, staffID := h.companyAndStaff(c)
	x, err := h.svc.AssignSurvey(c.Request.Context(), companyID, staffID, c.Param("id"), req)
	if err != nil {
		h.handleError(c, err)
		return
	}
	response.OK(c, "Doktorga yo‘naltirildi", x)
}

func (h *Handler) RegPaySurvey(c *gin.Context) {
	var req dto.PaymentRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, "Validatsiya xatosi", err.Error())
		return
	}
	companyID, staffID := h.companyAndStaff(c)
	x, err := h.svc.PaySurvey(c.Request.Context(), companyID, staffID, c.Param("id"), req)
	if err != nil {
		h.handleError(c, err)
		return
	}
	response.OK(c, "To‘lov qayd qilindi", x)
}

func (h *Handler) RegNoShowSurvey(c *gin.Context) {
	companyID, staffID := h.companyAndStaff(c)
	x, err := h.svc.NoShowSurveyReg(c.Request.Context(), companyID, staffID, c.Param("id"))
	if err != nil {
		h.handleError(c, err)
		return
	}
	response.OK(c, "Kelmagan deb belgilandi", x)
}

func (h *Handler) RegAssignBooking(c *gin.Context) {
	var req dto.AssignRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, "Validatsiya xatosi", err.Error())
		return
	}
	companyID, staffID := h.companyAndStaff(c)
	x, err := h.svc.AssignBooking(c.Request.Context(), companyID, staffID, c.Param("id"), req)
	if err != nil {
		h.handleError(c, err)
		return
	}
	response.OK(c, "Doktorga yo‘naltirildi", x)
}

func (h *Handler) RegPayBooking(c *gin.Context) {
	var req dto.PaymentRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, "Validatsiya xatosi", err.Error())
		return
	}
	companyID, staffID := h.companyAndStaff(c)
	x, err := h.svc.PayBooking(c.Request.Context(), companyID, staffID, c.Param("id"), req)
	if err != nil {
		h.handleError(c, err)
		return
	}
	response.OK(c, "To‘lov qayd qilindi", x)
}

func (h *Handler) RegNoShowBooking(c *gin.Context) {
	companyID, staffID := h.companyAndStaff(c)
	x, err := h.svc.NoShowBookingReg(c.Request.Context(), companyID, staffID, c.Param("id"))
	if err != nil {
		h.handleError(c, err)
		return
	}
	response.OK(c, "Kelmagan deb belgilandi", x)
}

// ——— Doctor ———

func (h *Handler) DocDashboard(c *gin.Context) {
	companyID, staffID := h.companyAndStaff(c)
	x, err := h.svc.DoctorDashboard(c.Request.Context(), companyID, staffID)
	if err != nil {
		h.handleError(c, err)
		return
	}
	response.OK(c, "Dashboard", x)
}

func (h *Handler) DocListSurveys(c *gin.Context) {
	_, staffID := h.companyAndStaff(c)
	h.listSurveys(c, staffID)
}

func (h *Handler) DocListBookings(c *gin.Context) {
	_, staffID := h.companyAndStaff(c)
	h.listBookings(c, staffID)
}

func (h *Handler) DocGetSurvey(c *gin.Context) {
	companyID, staffID := h.companyAndStaff(c)
	x, err := h.svc.GetSurvey(c.Request.Context(), companyID, c.Param("id"))
	if err != nil {
		h.handleError(c, err)
		return
	}
	if x.AssignedDoctorID == nil || *x.AssignedDoctorID != staffID {
		response.Fail(c, http.StatusForbidden, domain.ErrForbidden.Error(), "")
		return
	}
	response.OK(c, "Javob", x)
}

func (h *Handler) DocGetBooking(c *gin.Context) {
	companyID, staffID := h.companyAndStaff(c)
	x, err := h.svc.GetBooking(c.Request.Context(), companyID, c.Param("id"))
	if err != nil {
		h.handleError(c, err)
		return
	}
	if x.AssignedDoctorID == nil || *x.AssignedDoctorID != staffID {
		response.Fail(c, http.StatusForbidden, domain.ErrForbidden.Error(), "")
		return
	}
	response.OK(c, "Bron", x)
}

func (h *Handler) DocConcludeSurvey(c *gin.Context) {
	var req dto.ConcludeRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, "Validatsiya xatosi", err.Error())
		return
	}
	companyID, staffID := h.companyAndStaff(c)
	x, err := h.svc.ConcludeSurvey(c.Request.Context(), companyID, staffID, c.Param("id"), req)
	if err != nil {
		h.handleError(c, err)
		return
	}
	response.OK(c, "Xulosa yozildi", x)
}

func (h *Handler) DocCancelSurvey(c *gin.Context) {
	companyID, staffID := h.companyAndStaff(c)
	x, err := h.svc.CancelSurvey(c.Request.Context(), companyID, staffID, c.Param("id"))
	if err != nil {
		h.handleError(c, err)
		return
	}
	response.OK(c, "Bekor qilindi", x)
}

func (h *Handler) DocNoShowSurvey(c *gin.Context) {
	companyID, staffID := h.companyAndStaff(c)
	x, err := h.svc.DoctorNoShowSurvey(c.Request.Context(), companyID, staffID, c.Param("id"))
	if err != nil {
		h.handleError(c, err)
		return
	}
	response.OK(c, "Kirmagan deb belgilandi", x)
}

func (h *Handler) DocConcludeBooking(c *gin.Context) {
	var req dto.ConcludeRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, "Validatsiya xatosi", err.Error())
		return
	}
	companyID, staffID := h.companyAndStaff(c)
	x, err := h.svc.ConcludeBooking(c.Request.Context(), companyID, staffID, c.Param("id"), req)
	if err != nil {
		h.handleError(c, err)
		return
	}
	response.OK(c, "Xulosa yozildi", x)
}

func (h *Handler) DocCancelBooking(c *gin.Context) {
	companyID, staffID := h.companyAndStaff(c)
	x, err := h.svc.CancelBooking(c.Request.Context(), companyID, staffID, c.Param("id"))
	if err != nil {
		h.handleError(c, err)
		return
	}
	response.OK(c, "Bekor qilindi", x)
}

func (h *Handler) DocNoShowBooking(c *gin.Context) {
	companyID, staffID := h.companyAndStaff(c)
	x, err := h.svc.DoctorNoShowBooking(c.Request.Context(), companyID, staffID, c.Param("id"))
	if err != nil {
		h.handleError(c, err)
		return
	}
	response.OK(c, "Kirmagan deb belgilandi", x)
}

func (h *Handler) listSurveys(c *gin.Context, doctorID string) {
	companyID, _ := h.companyAndStaff(c)
	page, _ := strconv.Atoi(c.Query("page"))
	limit, _ := strconv.Atoi(c.Query("limit"))
	status := c.Query("status")
	// doctor queue default: assigned+paid if no status
	// listing filtered by doctorID when set
	x, err := h.svc.ListSurveys(c.Request.Context(), companyID, doctorID, status, page, limit)
	if err != nil {
		h.handleError(c, err)
		return
	}
	response.OK(c, "So‘rovnoma javoblari", x)
}

func (h *Handler) listBookings(c *gin.Context, doctorID string) {
	companyID, _ := h.companyAndStaff(c)
	page, _ := strconv.Atoi(c.Query("page"))
	limit, _ := strconv.Atoi(c.Query("limit"))
	status := c.Query("status")
	x, err := h.svc.ListBookings(c.Request.Context(), companyID, doctorID, status, page, limit)
	if err != nil {
		h.handleError(c, err)
		return
	}
	response.OK(c, "Bronlar", x)
}

func (h *Handler) handleError(c *gin.Context, err error) {
	switch {
	case errors.Is(err, domain.ErrNotFound):
		response.NotFound(c, err.Error())
	case errors.Is(err, domain.ErrForbidden):
		response.Fail(c, http.StatusForbidden, err.Error(), "")
	case errors.Is(err, domain.ErrInvalidInput), errors.Is(err, domain.ErrBadState):
		response.BadRequest(c, err.Error(), "")
	default:
		c.Error(err)
		response.Internal(c, "Ichki server xatosi")
	}
}

// ——— Company (full control) ———

func (h *Handler) companyID(c *gin.Context) string {
	return c.GetString(middleware.ContextCompanyID)
}

func (h *Handler) CoDashboard(c *gin.Context) {
	x, err := h.svc.RegistratorDashboard(c.Request.Context(), h.companyID(c))
	if err != nil {
		h.handleError(c, err)
		return
	}
	response.OK(c, "Dashboard", x)
}

func (h *Handler) CoListSurveys(c *gin.Context) {
	page, _ := strconv.Atoi(c.Query("page"))
	limit, _ := strconv.Atoi(c.Query("limit"))
	status := c.Query("status")
	doctorID := c.Query("doctorId")
	x, err := h.svc.ListSurveys(c.Request.Context(), h.companyID(c), doctorID, status, page, limit)
	if err != nil {
		h.handleError(c, err)
		return
	}
	response.OK(c, "So‘rovnoma javoblari", x)
}

func (h *Handler) CoListBookings(c *gin.Context) {
	page, _ := strconv.Atoi(c.Query("page"))
	limit, _ := strconv.Atoi(c.Query("limit"))
	status := c.Query("status")
	doctorID := c.Query("doctorId")
	x, err := h.svc.ListBookings(c.Request.Context(), h.companyID(c), doctorID, status, page, limit)
	if err != nil {
		h.handleError(c, err)
		return
	}
	response.OK(c, "Bronlar", x)
}

func (h *Handler) CoGetSurvey(c *gin.Context) {
	x, err := h.svc.GetSurvey(c.Request.Context(), h.companyID(c), c.Param("id"))
	if err != nil {
		h.handleError(c, err)
		return
	}
	response.OK(c, "Javob", x)
}

func (h *Handler) CoGetBooking(c *gin.Context) {
	x, err := h.svc.GetBooking(c.Request.Context(), h.companyID(c), c.Param("id"))
	if err != nil {
		h.handleError(c, err)
		return
	}
	response.OK(c, "Bron", x)
}

func (h *Handler) CoAssignSurvey(c *gin.Context) {
	var req dto.AssignRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, "Validatsiya xatosi", err.Error())
		return
	}
	x, err := h.svc.AssignSurvey(c.Request.Context(), h.companyID(c), "", c.Param("id"), req)
	if err != nil {
		h.handleError(c, err)
		return
	}
	response.OK(c, "Doktorga yo‘naltirildi", x)
}

func (h *Handler) CoPaySurvey(c *gin.Context) {
	var req dto.PaymentRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, "Validatsiya xatosi", err.Error())
		return
	}
	x, err := h.svc.PaySurvey(c.Request.Context(), h.companyID(c), "", c.Param("id"), req)
	if err != nil {
		h.handleError(c, err)
		return
	}
	response.OK(c, "To‘lov qayd qilindi", x)
}

func (h *Handler) CoNoShowSurvey(c *gin.Context) {
	x, err := h.svc.NoShowSurveyReg(c.Request.Context(), h.companyID(c), "", c.Param("id"))
	if err != nil {
		h.handleError(c, err)
		return
	}
	response.OK(c, "Kelmagan deb belgilandi", x)
}

func (h *Handler) CoConcludeSurvey(c *gin.Context) {
	var req dto.ConcludeRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, "Validatsiya xatosi", err.Error())
		return
	}
	x, err := h.svc.CompanyConcludeSurvey(c.Request.Context(), h.companyID(c), c.Param("id"), req)
	if err != nil {
		h.handleError(c, err)
		return
	}
	response.OK(c, "Xulosa yozildi", x)
}

func (h *Handler) CoCancelSurvey(c *gin.Context) {
	x, err := h.svc.CompanyCancelSurvey(c.Request.Context(), h.companyID(c), c.Param("id"))
	if err != nil {
		h.handleError(c, err)
		return
	}
	response.OK(c, "Bekor qilindi", x)
}

func (h *Handler) CoDoctorNoShowSurvey(c *gin.Context) {
	x, err := h.svc.CompanyDoctorNoShowSurvey(c.Request.Context(), h.companyID(c), c.Param("id"))
	if err != nil {
		h.handleError(c, err)
		return
	}
	response.OK(c, "Kirmagan deb belgilandi", x)
}

func (h *Handler) CoAssignBooking(c *gin.Context) {
	var req dto.AssignRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, "Validatsiya xatosi", err.Error())
		return
	}
	x, err := h.svc.AssignBooking(c.Request.Context(), h.companyID(c), "", c.Param("id"), req)
	if err != nil {
		h.handleError(c, err)
		return
	}
	response.OK(c, "Doktorga yo‘naltirildi", x)
}

func (h *Handler) CoPayBooking(c *gin.Context) {
	var req dto.PaymentRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, "Validatsiya xatosi", err.Error())
		return
	}
	x, err := h.svc.PayBooking(c.Request.Context(), h.companyID(c), "", c.Param("id"), req)
	if err != nil {
		h.handleError(c, err)
		return
	}
	response.OK(c, "To‘lov qayd qilindi", x)
}

func (h *Handler) CoNoShowBooking(c *gin.Context) {
	x, err := h.svc.NoShowBookingReg(c.Request.Context(), h.companyID(c), "", c.Param("id"))
	if err != nil {
		h.handleError(c, err)
		return
	}
	response.OK(c, "Kelmagan deb belgilandi", x)
}

func (h *Handler) CoConcludeBooking(c *gin.Context) {
	var req dto.ConcludeRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, "Validatsiya xatosi", err.Error())
		return
	}
	x, err := h.svc.CompanyConcludeBooking(c.Request.Context(), h.companyID(c), c.Param("id"), req)
	if err != nil {
		h.handleError(c, err)
		return
	}
	response.OK(c, "Xulosa yozildi", x)
}

func (h *Handler) CoCancelBooking(c *gin.Context) {
	x, err := h.svc.CompanyCancelBooking(c.Request.Context(), h.companyID(c), c.Param("id"))
	if err != nil {
		h.handleError(c, err)
		return
	}
	response.OK(c, "Bekor qilindi", x)
}

func (h *Handler) CoDoctorNoShowBooking(c *gin.Context) {
	x, err := h.svc.CompanyDoctorNoShowBooking(c.Request.Context(), h.companyID(c), c.Param("id"))
	if err != nil {
		h.handleError(c, err)
		return
	}
	response.OK(c, "Kirmagan deb belgilandi", x)
}
