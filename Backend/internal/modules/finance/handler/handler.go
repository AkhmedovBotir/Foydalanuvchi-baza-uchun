package handler

import (
	"errors"
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"

	"github.com/foydalanuvchilar-bazasi/backend/internal/modules/finance/domain"
	"github.com/foydalanuvchilar-bazasi/backend/internal/modules/finance/dto"
	"github.com/foydalanuvchilar-bazasi/backend/internal/modules/finance/service"
	"github.com/foydalanuvchilar-bazasi/backend/internal/platform/middleware"
	"github.com/foydalanuvchilar-bazasi/backend/internal/platform/response"
)

type Handler struct {
	svc *service.Service
}

func NewHandler(svc *service.Service) *Handler {
	return &Handler{svc: svc}
}

func (h *Handler) company(c *gin.Context) string {
	return c.GetString(middleware.ContextCompanyID)
}

func (h *Handler) Summary(c *gin.Context) {
	x, err := h.svc.Summary(c.Request.Context(), h.company(c))
	if err != nil {
		h.fail(c, err)
		return
	}
	response.OK(c, "Moliya xulosa", x)
}

func (h *Handler) ListSchemes(c *gin.Context) {
	list, err := h.svc.ListSchemes(c.Request.Context(), h.company(c))
	if err != nil {
		h.fail(c, err)
		return
	}
	response.OK(c, "Sxemalar", list)
}

func (h *Handler) GetScheme(c *gin.Context) {
	x, err := h.svc.GetScheme(c.Request.Context(), h.company(c), c.Param("id"))
	if err != nil {
		h.fail(c, err)
		return
	}
	response.OK(c, "Sxema", x)
}

func (h *Handler) CreateScheme(c *gin.Context) {
	var req dto.UpsertSchemeRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, "Validatsiya xatosi", err.Error())
		return
	}
	x, err := h.svc.CreateScheme(c.Request.Context(), h.company(c), req)
	if err != nil {
		h.fail(c, err)
		return
	}
	response.Created(c, "Sxema yaratildi", x)
}

func (h *Handler) UpdateScheme(c *gin.Context) {
	var req dto.UpsertSchemeRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, "Validatsiya xatosi", err.Error())
		return
	}
	x, err := h.svc.UpdateScheme(c.Request.Context(), h.company(c), c.Param("id"), req)
	if err != nil {
		h.fail(c, err)
		return
	}
	response.OK(c, "Sxema yangilandi", x)
}

func (h *Handler) DeleteScheme(c *gin.Context) {
	if err := h.svc.DeleteScheme(c.Request.Context(), h.company(c), c.Param("id")); err != nil {
		h.fail(c, err)
		return
	}
	response.OK(c, "Sxema o‘chirildi", nil)
}

func (h *Handler) ListIncomes(c *gin.Context) {
	page, _ := strconv.Atoi(c.Query("page"))
	limit, _ := strconv.Atoi(c.Query("limit"))
	x, err := h.svc.ListIncomes(c.Request.Context(), h.company(c), c.Query("date"), page, limit)
	if err != nil {
		h.fail(c, err)
		return
	}
	response.OK(c, "Kirimlar", x)
}

func (h *Handler) ListAllocations(c *gin.Context) {
	page, _ := strconv.Atoi(c.Query("page"))
	limit, _ := strconv.Atoi(c.Query("limit"))
	x, err := h.svc.ListAllocations(
		c.Request.Context(), h.company(c),
		c.Query("status"), c.Query("category"), c.Query("date"), page, limit,
	)
	if err != nil {
		h.fail(c, err)
		return
	}
	response.OK(c, "Taqsimotlar", x)
}

func (h *Handler) PayAllocation(c *gin.Context) {
	var req dto.PayAllocationRequest
	_ = c.ShouldBindJSON(&req)
	if err := h.svc.PayAllocation(c.Request.Context(), h.company(c), c.Param("id"), req.Note); err != nil {
		h.fail(c, err)
		return
	}
	response.OK(c, "To‘lov belgilandi", nil)
}

func (h *Handler) PayBatch(c *gin.Context) {
	var req dto.PayBatchRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, "Validatsiya xatosi", err.Error())
		return
	}
	n, err := h.svc.PayBatch(c.Request.Context(), h.company(c), req.IDs, req.Note)
	if err != nil {
		h.fail(c, err)
		return
	}
	response.OK(c, "To‘lovlar belgilandi", gin.H{"count": n})
}

func (h *Handler) fail(c *gin.Context, err error) {
	switch {
	case errors.Is(err, domain.ErrNotFound):
		response.NotFound(c, err.Error())
	case errors.Is(err, domain.ErrInvalidInput), errors.Is(err, domain.ErrBadPct),
		errors.Is(err, domain.ErrAlreadyExist), errors.Is(err, domain.ErrNoScheme):
		response.BadRequest(c, err.Error(), "")
	default:
		c.Error(err)
		response.Fail(c, http.StatusInternalServerError, "Ichki server xatosi", "")
	}
}
