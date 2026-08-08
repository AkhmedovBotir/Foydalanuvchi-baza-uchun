package handler

import (
	"errors"
	"net/http"

	"github.com/gin-gonic/gin"

	"github.com/foydalanuvchilar-bazasi/backend/internal/modules/staff/domain"
	"github.com/foydalanuvchilar-bazasi/backend/internal/modules/staff/dto"
	"github.com/foydalanuvchilar-bazasi/backend/internal/modules/staff/service"
	"github.com/foydalanuvchilar-bazasi/backend/internal/platform/middleware"
	"github.com/foydalanuvchilar-bazasi/backend/internal/platform/response"
)

type Handler struct {
	svc *service.Service
}

func NewHandler(svc *service.Service) *Handler {
	return &Handler{svc: svc}
}

func (h *Handler) LoginRegistrator(c *gin.Context) {
	var req dto.LoginRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, "Validatsiya xatosi", err.Error())
		return
	}
	x, err := h.svc.LoginRegistrator(c.Request.Context(), req)
	if err != nil {
		h.handleError(c, err)
		return
	}
	response.OK(c, "Muvaffaqiyatli kirildi", x)
}

func (h *Handler) RegistratorProfile(c *gin.Context) {
	x, err := h.svc.GetRegistratorProfile(c.Request.Context(), c.GetString(middleware.ContextStaffID))
	if err != nil {
		h.handleError(c, err)
		return
	}
	response.OK(c, "Profil", x)
}

func (h *Handler) LoginDoctor(c *gin.Context) {
	var req dto.LoginRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, "Validatsiya xatosi", err.Error())
		return
	}
	x, err := h.svc.LoginDoctor(c.Request.Context(), req)
	if err != nil {
		h.handleError(c, err)
		return
	}
	response.OK(c, "Muvaffaqiyatli kirildi", x)
}

func (h *Handler) DoctorProfile(c *gin.Context) {
	x, err := h.svc.GetDoctorProfile(c.Request.Context(), c.GetString(middleware.ContextStaffID))
	if err != nil {
		h.handleError(c, err)
		return
	}
	response.OK(c, "Profil", x)
}

// Registrators

func (h *Handler) CreateRegistrator(c *gin.Context) {
	var req dto.CreateRegistratorRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, "Validatsiya xatosi", err.Error())
		return
	}
	x, err := h.svc.CreateRegistrator(c.Request.Context(), c.GetString(middleware.ContextCompanyID), req)
	if err != nil {
		h.handleError(c, err)
		return
	}
	response.Created(c, "Registrator yaratildi", x)
}

func (h *Handler) ListRegistrators(c *gin.Context) {
	list, err := h.svc.ListRegistrators(c.Request.Context(), c.GetString(middleware.ContextCompanyID))
	if err != nil {
		h.handleError(c, err)
		return
	}
	response.OK(c, "Registratorlar", list)
}

func (h *Handler) GetRegistrator(c *gin.Context) {
	x, err := h.svc.GetRegistrator(c.Request.Context(), c.GetString(middleware.ContextCompanyID), c.Param("id"))
	if err != nil {
		h.handleError(c, err)
		return
	}
	response.OK(c, "Registrator", x)
}

func (h *Handler) UpdateRegistrator(c *gin.Context) {
	var req dto.UpdateRegistratorRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, "Validatsiya xatosi", err.Error())
		return
	}
	x, err := h.svc.UpdateRegistrator(c.Request.Context(), c.GetString(middleware.ContextCompanyID), c.Param("id"), req)
	if err != nil {
		h.handleError(c, err)
		return
	}
	response.OK(c, "Registrator yangilandi", x)
}

func (h *Handler) DeleteRegistrator(c *gin.Context) {
	if err := h.svc.DeleteRegistrator(c.Request.Context(), c.GetString(middleware.ContextCompanyID), c.Param("id")); err != nil {
		h.handleError(c, err)
		return
	}
	response.OK(c, "Registrator o‘chirildi", nil)
}

// Doctors

func (h *Handler) CreateDoctor(c *gin.Context) {
	var req dto.CreateDoctorRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, "Validatsiya xatosi", err.Error())
		return
	}
	x, err := h.svc.CreateDoctor(c.Request.Context(), c.GetString(middleware.ContextCompanyID), req)
	if err != nil {
		h.handleError(c, err)
		return
	}
	response.Created(c, "Shifokor yaratildi", x)
}

func (h *Handler) ListDoctors(c *gin.Context) {
	list, err := h.svc.ListDoctors(c.Request.Context(), c.GetString(middleware.ContextCompanyID))
	if err != nil {
		h.handleError(c, err)
		return
	}
	response.OK(c, "Shifokorlar", list)
}

func (h *Handler) GetDoctor(c *gin.Context) {
	x, err := h.svc.GetDoctor(c.Request.Context(), c.GetString(middleware.ContextCompanyID), c.Param("id"))
	if err != nil {
		h.handleError(c, err)
		return
	}
	response.OK(c, "Shifokor", x)
}

func (h *Handler) UpdateDoctor(c *gin.Context) {
	var req dto.UpdateDoctorRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, "Validatsiya xatosi", err.Error())
		return
	}
	x, err := h.svc.UpdateDoctor(c.Request.Context(), c.GetString(middleware.ContextCompanyID), c.Param("id"), req)
	if err != nil {
		h.handleError(c, err)
		return
	}
	response.OK(c, "Shifokor yangilandi", x)
}

func (h *Handler) DeleteDoctor(c *gin.Context) {
	if err := h.svc.DeleteDoctor(c.Request.Context(), c.GetString(middleware.ContextCompanyID), c.Param("id")); err != nil {
		h.handleError(c, err)
		return
	}
	response.OK(c, "Shifokor o‘chirildi", nil)
}

func (h *Handler) handleError(c *gin.Context, err error) {
	switch {
	case errors.Is(err, domain.ErrRegistratorNotFound), errors.Is(err, domain.ErrDoctorNotFound):
		response.NotFound(c, err.Error())
	case errors.Is(err, domain.ErrInvalidCredentials):
		response.Fail(c, http.StatusUnauthorized, err.Error(), "")
	case errors.Is(err, domain.ErrUsernameTaken):
		response.Fail(c, http.StatusConflict, err.Error(), "")
	case errors.Is(err, domain.ErrWeakPassword), errors.Is(err, domain.ErrInvalidInput):
		response.BadRequest(c, err.Error(), "")
	default:
		c.Error(err)
		response.Internal(c, "Ichki server xatosi")
	}
}
