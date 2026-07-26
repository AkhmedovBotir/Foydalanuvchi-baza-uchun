package handler

import (
	"errors"

	"github.com/gin-gonic/gin"

	"github.com/foydalanuvchilar-bazasi/backend/internal/modules/setting/domain"
	"github.com/foydalanuvchilar-bazasi/backend/internal/modules/setting/dto"
	"github.com/foydalanuvchilar-bazasi/backend/internal/modules/setting/service"
	"github.com/foydalanuvchilar-bazasi/backend/internal/platform/response"
)

type SettingHandler struct {
	svc *service.SettingService
}

func NewSettingHandler(svc *service.SettingService) *SettingHandler {
	return &SettingHandler{svc: svc}
}

// GetSurveyLinkBase godoc
// @Summary      So'rovnoma link base URL olish
// @Description  So'rovnomalar uchun public linkning asosiy (base) URL manzilini qaytaradi
// @Tags         Settings
// @Produce      json
// @Security     BearerAuth
// @Success      200  {object}  dto.MessageResponse
// @Failure      401  {object}  dto.ErrorResponse
// @Failure      404  {object}  dto.ErrorResponse
// @Failure      500  {object}  dto.ErrorResponse
// @Router       /settings/survey-link-base [get]
func (h *SettingHandler) GetSurveyLinkBase(c *gin.Context) {
	data, err := h.svc.GetSurveyLinkBase(c.Request.Context())
	if err != nil {
		h.handleError(c, err)
		return
	}
	response.OK(c, "So'rovnoma link sozlamasi", data)
}

// UpdateSurveyLinkBase godoc
// @Summary      So'rovnoma link base URL yangilash
// @Description  Admin so'rovnoma public linklarining asosiy URL manzilini o'zgartiradi. Mavjud so'rovnomalar linklari yangi base bo'yicha avtomatik hisoblanadi.
// @Tags         Settings
// @Accept       json
// @Produce      json
// @Security     BearerAuth
// @Param        body  body      dto.UpdateSurveyLinkBaseRequest  true  "Base URL"
// @Success      200   {object}  dto.MessageResponse
// @Failure      400   {object}  dto.ErrorResponse
// @Failure      401   {object}  dto.ErrorResponse
// @Failure      500   {object}  dto.ErrorResponse
// @Router       /settings/survey-link-base [put]
func (h *SettingHandler) UpdateSurveyLinkBase(c *gin.Context) {
	var req dto.UpdateSurveyLinkBaseRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, "Validatsiya xatosi", err.Error())
		return
	}

	data, err := h.svc.UpdateSurveyLinkBase(c.Request.Context(), req)
	if err != nil {
		h.handleError(c, err)
		return
	}
	response.OK(c, "So'rovnoma link sozlamasi yangilandi", data)
}

func (h *SettingHandler) handleError(c *gin.Context, err error) {
	switch {
	case errors.Is(err, domain.ErrSettingNotFound):
		response.NotFound(c, err.Error())
	case errors.Is(err, domain.ErrInvalidBaseURL):
		response.BadRequest(c, err.Error(), "")
	default:
		response.Internal(c, "Ichki server xatosi")
	}
}
