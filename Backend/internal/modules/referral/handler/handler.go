package handler

import (
	"errors"
	"net/http"

	"github.com/gin-gonic/gin"

	"github.com/foydalanuvchilar-bazasi/backend/internal/modules/referral/domain"
	"github.com/foydalanuvchilar-bazasi/backend/internal/modules/referral/dto"
	"github.com/foydalanuvchilar-bazasi/backend/internal/modules/referral/service"
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
	var req dto.CreateReferralRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, "Validatsiya xatosi", err.Error())
		return
	}
	x, err := h.svc.Create(c.Request.Context(), c.GetString(middleware.ContextCompanyID), req)
	if err != nil {
		h.handle(c, err)
		return
	}
	response.Created(c, "Referal yaratildi", x)
}

func (h *Handler) List(c *gin.Context) {
	list, err := h.svc.List(c.Request.Context(), c.GetString(middleware.ContextCompanyID))
	if err != nil {
		h.handle(c, err)
		return
	}
	response.OK(c, "Referallar", list)
}

func (h *Handler) Get(c *gin.Context) {
	x, err := h.svc.Get(c.Request.Context(), c.GetString(middleware.ContextCompanyID), c.Param("id"))
	if err != nil {
		h.handle(c, err)
		return
	}
	response.OK(c, "Referal", x)
}

func (h *Handler) Update(c *gin.Context) {
	var req dto.UpdateReferralRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, "Validatsiya xatosi", err.Error())
		return
	}
	x, err := h.svc.Update(c.Request.Context(), c.GetString(middleware.ContextCompanyID), c.Param("id"), req)
	if err != nil {
		h.handle(c, err)
		return
	}
	response.OK(c, "Referal yangilandi", x)
}

func (h *Handler) Delete(c *gin.Context) {
	if err := h.svc.Delete(c.Request.Context(), c.GetString(middleware.ContextCompanyID), c.Param("id")); err != nil {
		h.handle(c, err)
		return
	}
	response.OK(c, "Referal o‘chirildi", nil)
}

func (h *Handler) AttachCard(c *gin.Context) {
	var req dto.AttachCardRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, "Validatsiya xatosi", err.Error())
		return
	}
	x, err := h.svc.AttachCard(c.Request.Context(), c.GetString(middleware.ContextCompanyID), c.Param("id"), req)
	if err != nil {
		h.handle(c, err)
		return
	}
	response.OK(c, "Vizitka biriktirildi", x)
}

func (h *Handler) DetachCard(c *gin.Context) {
	x, err := h.svc.DetachCard(c.Request.Context(), c.GetString(middleware.ContextCompanyID), c.Param("id"))
	if err != nil {
		h.handle(c, err)
		return
	}
	response.OK(c, "Vizitka yechildi", x)
}

func (h *Handler) handle(c *gin.Context, err error) {
	switch {
	case errors.Is(err, domain.ErrNotFound):
		response.NotFound(c, err.Error())
	case errors.Is(err, domain.ErrInvalidInput), errors.Is(err, domain.ErrCardInUse):
		response.BadRequest(c, err.Error(), "")
	default:
		c.Error(err)
		response.Fail(c, http.StatusInternalServerError, "Ichki server xatosi", "")
	}
}
