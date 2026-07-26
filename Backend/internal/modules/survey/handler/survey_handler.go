package handler

import (
	"errors"
	"net/http"
	"strconv"
	"strings"

	"github.com/gin-gonic/gin"

	"github.com/foydalanuvchilar-bazasi/backend/internal/modules/survey/domain"
	"github.com/foydalanuvchilar-bazasi/backend/internal/modules/survey/dto"
	"github.com/foydalanuvchilar-bazasi/backend/internal/modules/survey/service"
	"github.com/foydalanuvchilar-bazasi/backend/internal/platform/middleware"
	"github.com/foydalanuvchilar-bazasi/backend/internal/platform/response"
)

type SurveyHandler struct {
	svc *service.SurveyService
}

func NewSurveyHandler(svc *service.SurveyService) *SurveyHandler {
	return &SurveyHandler{svc: svc}
}

// CreateSurvey godoc
// @Summary      Yangi so'rovnoma yaratish
// @Description  Kompaniya yangi so'rovnoma yaratadi. Slug va public link avtomatik hosil bo'ladi.
// @Tags         Surveys
// @Accept       json
// @Produce      json
// @Security     BearerAuth
// @Param        body  body      dto.CreateSurveyRequest  true  "So'rovnoma ma'lumotlari"
// @Success      201   {object}  dto.MessageResponse
// @Failure      400   {object}  dto.ErrorResponse
// @Failure      401   {object}  dto.ErrorResponse
// @Failure      500   {object}  dto.ErrorResponse
// @Router       /surveys [post]
func (h *SurveyHandler) CreateSurvey(c *gin.Context) {
	var req dto.CreateSurveyRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, "Validatsiya xatosi", err.Error())
		return
	}

	companyID := c.GetString(middleware.ContextCompanyID)
	survey, err := h.svc.Create(c.Request.Context(), companyID, req)
	if err != nil {
		h.handleError(c, err)
		return
	}
	response.Created(c, "So'rovnoma muvaffaqiyatli yaratildi", survey)
}

// ListSurveys godoc
// @Summary      So'rovnomalar ro'yxati
// @Description  Joriy kompaniyaning barcha so'rovnomalarini (link bilan) qaytaradi
// @Tags         Surveys
// @Produce      json
// @Security     BearerAuth
// @Success      200  {object}  dto.MessageResponse
// @Failure      401  {object}  dto.ErrorResponse
// @Failure      500  {object}  dto.ErrorResponse
// @Router       /surveys [get]
func (h *SurveyHandler) ListSurveys(c *gin.Context) {
	companyID := c.GetString(middleware.ContextCompanyID)
	list, err := h.svc.List(c.Request.Context(), companyID)
	if err != nil {
		h.handleError(c, err)
		return
	}
	response.OK(c, "So'rovnomalar ro'yxati", list)
}

func (h *SurveyHandler) ListFileFormats(c *gin.Context) {
	response.OK(c, "Fayl formatlari", h.svc.FileFormats())
}
func (h *SurveyHandler) Publish(c *gin.Context) {
	x, err := h.svc.Publish(c.Request.Context(), c.GetString(middleware.ContextCompanyID), c.Param("id"))
	h.companyResult(c, x, err, "So'rovnoma nashr qilindi")
}
func (h *SurveyHandler) Close(c *gin.Context) {
	x, err := h.svc.Close(c.Request.Context(), c.GetString(middleware.ContextCompanyID), c.Param("id"))
	h.companyResult(c, x, err, "So'rovnoma yopildi")
}

// ListResponses godoc
// @Summary      Barcha so'rovnoma javoblari
// @Description  Kompaniyaning barcha so'rovnomalariga kelgan javoblar (name, phone bilan)
// @Tags         Survey Responses
// @Produce      json
// @Security     BearerAuth
// @Param        page   query  int  false  "Sahifa" default(1)
// @Param        limit  query  int  false  "Limit" default(20)
// @Success      200  {object}  dto.MessageResponse
// @Failure      401  {object}  dto.ErrorResponse
// @Router       /company/surveys/responses [get]
func (h *SurveyHandler) ListResponses(c *gin.Context) {
	page, _ := strconv.Atoi(c.Query("page"))
	limit, _ := strconv.Atoi(c.Query("limit"))
	x, err := h.svc.ListResponses(c.Request.Context(), c.GetString(middleware.ContextCompanyID), "", page, limit)
	if err != nil {
		h.handleError(c, err)
		return
	}
	response.OK(c, "Javoblar", x)
}

// ListSurveyResponses godoc
// @Summary      Bitta so'rovnoma javoblari
// @Description  Berilgan so'rovnoma (slug yoki id) javoblari
// @Tags         Survey Responses
// @Produce      json
// @Security     BearerAuth
// @Param        id     path   string  true   "Survey slug yoki UUID"
// @Param        page   query  int     false  "Sahifa" default(1)
// @Param        limit  query  int     false  "Limit" default(20)
// @Success      200  {object}  dto.MessageResponse
// @Failure      401  {object}  dto.ErrorResponse
// @Failure      404  {object}  dto.ErrorResponse
// @Router       /company/surveys/{id}/responses [get]
func (h *SurveyHandler) ListSurveyResponses(c *gin.Context) {
	page, _ := strconv.Atoi(c.Query("page"))
	limit, _ := strconv.Atoi(c.Query("limit"))
	x, err := h.svc.ListResponses(c.Request.Context(), c.GetString(middleware.ContextCompanyID), c.Param("id"), page, limit)
	if err != nil {
		h.handleError(c, err)
		return
	}
	response.OK(c, "Javoblar", x)
}

// GetResponse godoc
// @Summary      Bitta javobni olish
// @Tags         Survey Responses
// @Produce      json
// @Security     BearerAuth
// @Param        responseId  path  string  true  "Response UUID"
// @Success      200  {object}  dto.MessageResponse
// @Failure      404  {object}  dto.ErrorResponse
// @Router       /company/surveys/responses/{responseId} [get]
func (h *SurveyHandler) GetResponse(c *gin.Context) {
	x, err := h.svc.GetResponse(c.Request.Context(), c.GetString(middleware.ContextCompanyID), c.Param("responseId"))
	if err != nil {
		h.handleError(c, err)
		return
	}
	response.OK(c, "Javob", x)
}

// DeleteResponse godoc
// @Summary      Javobni o'chirish
// @Tags         Survey Responses
// @Produce      json
// @Security     BearerAuth
// @Param        responseId  path  string  true  "Response UUID"
// @Success      200  {object}  dto.MessageResponse
// @Failure      404  {object}  dto.ErrorResponse
// @Router       /company/surveys/responses/{responseId} [delete]
func (h *SurveyHandler) DeleteResponse(c *gin.Context) {
	if err := h.svc.DeleteResponse(c.Request.Context(), c.GetString(middleware.ContextCompanyID), c.Param("responseId")); err != nil {
		h.handleError(c, err)
		return
	}
	response.OK(c, "Javob o'chirildi", nil)
}

// Summary godoc
// @Summary      So'rovnoma javoblari statistikasi
// @Tags         Survey Responses
// @Produce      json
// @Security     BearerAuth
// @Param        id  path  string  true  "Survey slug yoki UUID"
// @Success      200  {object}  dto.MessageResponse
// @Failure      404  {object}  dto.ErrorResponse
// @Router       /company/surveys/{id}/responses/summary [get]
func (h *SurveyHandler) Summary(c *gin.Context) {
	x, err := h.svc.ResponseSummary(c.Request.Context(), c.GetString(middleware.ContextCompanyID), c.Param("id"))
	if err != nil {
		h.handleError(c, err)
		return
	}
	response.OK(c, "Javoblar xulosasi", x)
}
func (h *SurveyHandler) companyResult(c *gin.Context, x *dto.SurveyResponse, err error, message string) {
	if err != nil {
		h.handleError(c, err)
		return
	}
	response.OK(c, message, x)
}

type PublicSurveyHandler struct{ svc *service.SurveyService }

func NewPublicSurveyHandler(s *service.SurveyService) *PublicSurveyHandler {
	return &PublicSurveyHandler{svc: s}
}

// List godoc
// @Summary Published surveys
// @Tags Surveys
// @Success 200 {object} dto.MessageResponse
// @Router /surveys [get]
func (h *PublicSurveyHandler) List(c *gin.Context) {
	x, e := h.svc.PublicList(c.Request.Context())
	if e != nil {
		h.publicError(c, e)
		return
	}
	response.OK(c, "So'rovnomalar", x)
}

func (h *PublicSurveyHandler) Get(c *gin.Context) {
	x, e := h.svc.PublicGet(c.Request.Context(), c.Param("id"))
	if e != nil {
		h.publicError(c, e)
		return
	}
	response.OK(c, "So'rovnoma", x)
}

func (h *PublicSurveyHandler) Submit(c *gin.Context) {
	var req dto.SubmitSurveyResponseRequest
	if e := c.ShouldBindJSON(&req); e != nil {
		response.BadRequest(c, "Validatsiya xatosi", e.Error())
		return
	}
	x, e := h.svc.Submit(c.Request.Context(), c.Param("id"), req)
	if e != nil {
		h.publicError(c, e)
		return
	}
	response.Created(c, "Javob qabul qilindi", x)
}

func (h *PublicSurveyHandler) Upload(c *gin.Context) {
	ref := c.Param("id")
	if ref == "" {
		ref = c.Param("slug")
	}
	file, e := c.FormFile("file")
	if e != nil {
		response.BadRequest(c, "file majburiy", "")
		return
	}
	x, e := h.svc.Upload(c.Request.Context(), ref, strings.TrimSpace(c.PostForm("questionId")), file)
	if e != nil {
		h.publicError(c, e)
		return
	}
	response.Created(c, "Fayl yuklandi", x)
}

// FormGet godoc
// @Summary      Forma — so'rovnomani olish (tokensiz)
// @Description  Public form frontend uchun. Auth kerak emas. published yoki closed.
// @Tags         Form
// @Produce      json
// @Param        slug  path  string  true  "Survey slug"
// @Success      200   {object}  dto.MessageResponse
// @Failure      404   {object}  dto.ErrorResponse
// @Router       /forms/{slug} [get]
func (h *PublicSurveyHandler) FormGet(c *gin.Context) {
	x, e := h.svc.FormGet(c.Request.Context(), c.Param("slug"))
	if e != nil {
		h.publicError(c, e)
		return
	}
	response.OK(c, "So'rovnoma formasi", x)
}

// FormSubmit godoc
// @Summary      Forma — so'rovnomani topshirish (tokensiz)
// @Description  name (ism) va phone (telefon) majburiy. Auth kerak emas. Faqat published.
// @Tags         Form
// @Accept       json
// @Produce      json
// @Param        slug  path  string  true  "Survey slug"
// @Param        body  body  dto.FormSubmitRequest  true  "Ism, telefon va javoblar"
// @Success      201   {object}  dto.MessageResponse
// @Failure      400   {object}  dto.ErrorResponse
// @Failure      404   {object}  dto.ErrorResponse
// @Router       /forms/{slug} [post]
func (h *PublicSurveyHandler) FormSubmit(c *gin.Context) {
	var req dto.FormSubmitRequest
	if e := c.ShouldBindJSON(&req); e != nil {
		response.BadRequest(c, "Validatsiya xatosi: name va phone majburiy", e.Error())
		return
	}
	x, e := h.svc.FormSubmit(c.Request.Context(), c.Param("slug"), req)
	if e != nil {
		h.publicError(c, e)
		return
	}
	response.Created(c, "So'rovnoma muvaffaqiyatli topshirildi", x)
}

func (h *PublicSurveyHandler) publicError(c *gin.Context, e error) {
	if errors.Is(e, domain.ErrSurveyNotFound) {
		response.NotFound(c, e.Error())
		return
	}
	if errors.Is(e, service.ErrNotAccepting) || errors.Is(e, service.ErrInvalidSurvey) {
		response.BadRequest(c, e.Error(), "")
		return
	}
	response.Fail(c, http.StatusInternalServerError, "Ichki server xatosi", "")
}

// GetSurvey godoc
// @Summary      So'rovnomani ID bo'yicha olish
// @Description  Bitta so'rovnoma ma'lumotlari va public linkini qaytaradi
// @Tags         Surveys
// @Produce      json
// @Security     BearerAuth
// @Param        id   path      string  true  "Survey UUID"
// @Success      200  {object}  dto.MessageResponse
// @Failure      401  {object}  dto.ErrorResponse
// @Failure      403  {object}  dto.ErrorResponse
// @Failure      404  {object}  dto.ErrorResponse
// @Failure      500  {object}  dto.ErrorResponse
// @Router       /surveys/{id} [get]
func (h *SurveyHandler) GetSurvey(c *gin.Context) {
	companyID := c.GetString(middleware.ContextCompanyID)
	survey, err := h.svc.GetByID(c.Request.Context(), companyID, c.Param("id"))
	if err != nil {
		h.handleError(c, err)
		return
	}
	response.OK(c, "So'rovnoma topildi", survey)
}

// UpdateSurvey godoc
// @Summary      So'rovnomani yangilash
// @Description  Title, description, is_active yangilanadi. Slug va link o'zgarmaydi.
// @Tags         Surveys
// @Accept       json
// @Produce      json
// @Security     BearerAuth
// @Param        id    path      string                 true  "Survey UUID"
// @Param        body  body      dto.UpdateSurveyRequest true  "Yangilangan ma'lumotlar"
// @Success      200   {object}  dto.MessageResponse
// @Failure      400   {object}  dto.ErrorResponse
// @Failure      401   {object}  dto.ErrorResponse
// @Failure      403   {object}  dto.ErrorResponse
// @Failure      404   {object}  dto.ErrorResponse
// @Failure      500   {object}  dto.ErrorResponse
// @Router       /surveys/{id} [put]
func (h *SurveyHandler) UpdateSurvey(c *gin.Context) {
	var req dto.UpdateSurveyRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, "Validatsiya xatosi", err.Error())
		return
	}

	companyID := c.GetString(middleware.ContextCompanyID)
	survey, err := h.svc.Update(c.Request.Context(), companyID, c.Param("id"), req)
	if err != nil {
		h.handleError(c, err)
		return
	}
	response.OK(c, "So'rovnoma muvaffaqiyatli yangilandi", survey)
}

// DeleteSurvey godoc
// @Summary      So'rovnomani o'chirish
// @Description  So'rovnomani tizimdan o'chiradi
// @Tags         Surveys
// @Produce      json
// @Security     BearerAuth
// @Param        id   path      string  true  "Survey UUID"
// @Success      200  {object}  dto.MessageResponse
// @Failure      401  {object}  dto.ErrorResponse
// @Failure      403  {object}  dto.ErrorResponse
// @Failure      404  {object}  dto.ErrorResponse
// @Failure      500  {object}  dto.ErrorResponse
// @Router       /surveys/{id} [delete]
func (h *SurveyHandler) DeleteSurvey(c *gin.Context) {
	companyID := c.GetString(middleware.ContextCompanyID)
	if err := h.svc.Delete(c.Request.Context(), companyID, c.Param("id")); err != nil {
		h.handleError(c, err)
		return
	}
	response.OK(c, "So'rovnoma muvaffaqiyatli o'chirildi", nil)
}

func (h *SurveyHandler) handleError(c *gin.Context, err error) {
	switch {
	case errors.Is(err, domain.ErrSurveyNotFound):
		response.NotFound(c, err.Error())
	case errors.Is(err, domain.ErrForbidden):
		response.Fail(c, 403, err.Error(), "")
	case errors.Is(err, domain.ErrResponseNotFound):
		response.NotFound(c, err.Error())
	case errors.Is(err, service.ErrInvalidSurvey), errors.Is(err, service.ErrSurveyClosed), errors.Is(err, service.ErrNotDraft), errors.Is(err, service.ErrNotPublished):
		response.BadRequest(c, err.Error(), "")
	default:
		c.Error(err)
		response.Internal(c, "Ichki server xatosi")
	}
}
