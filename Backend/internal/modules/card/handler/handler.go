package handler

import (
	"encoding/json"
	"errors"
	"io"
	"net/http"
	"strconv"
	"strings"

	"github.com/foydalanuvchilar-bazasi/backend/internal/modules/card/domain"
	"github.com/foydalanuvchilar-bazasi/backend/internal/modules/card/dto"
	"github.com/foydalanuvchilar-bazasi/backend/internal/modules/card/service"
	"github.com/foydalanuvchilar-bazasi/backend/internal/platform/middleware"
	"github.com/foydalanuvchilar-bazasi/backend/internal/platform/response"
	"github.com/gin-gonic/gin"
)

type Handler struct {
	svc *service.Service
}

func NewHandler(svc *service.Service) *Handler {
	return &Handler{svc: svc}
}

func (h *Handler) CreateTemplate(c *gin.Context) {
	name, data, qx, qy, qw, qh, fields, err := parseMultipartCard(c)
	if err != nil {
		response.BadRequest(c, err.Error(), "")
		return
	}
	item, err := h.svc.CreateTemplate(c.Request.Context(), name, data, qx, qy, qw, qh, fields)
	if err != nil {
		h.fail(c, err)
		return
	}
	response.Created(c, "Vizitka shabloni yaratildi", item)
}

func (h *Handler) ListTemplates(c *gin.Context) {
	items, err := h.svc.ListTemplates(c.Request.Context())
	if err != nil {
		h.fail(c, err)
		return
	}
	response.OK(c, "Vizitka shablonlari", items)
}

func (h *Handler) GetTemplate(c *gin.Context) {
	item, err := h.svc.GetTemplate(c.Request.Context(), c.Param("id"))
	if err != nil {
		h.fail(c, err)
		return
	}
	response.OK(c, "Vizitka shabloni", item)
}

func (h *Handler) UpdateTemplate(c *gin.Context) {
	var req dto.UpdateTemplateRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, "So'rov tanasi noto'g'ri", err.Error())
		return
	}
	item, err := h.svc.UpdateTemplate(c.Request.Context(), c.Param("id"), req)
	if err != nil {
		h.fail(c, err)
		return
	}
	response.OK(c, "Shablon yangilandi", item)
}

func (h *Handler) DeleteTemplate(c *gin.Context) {
	if err := h.svc.DeleteTemplate(c.Request.Context(), c.Param("id")); err != nil {
		h.fail(c, err)
		return
	}
	response.OK(c, "Shablon o'chirildi", nil)
}

func (h *Handler) TemplateImage(c *gin.Context) {
	path, ct, err := h.svc.TemplateImagePath(c.Request.Context(), c.Param("id"))
	if err != nil {
		h.fail(c, err)
		return
	}
	if ct != "" {
		c.Header("Content-Type", ct)
	}
	c.File(path)
}

func (h *Handler) CompanyListTemplates(c *gin.Context) {
	h.ListTemplates(c)
}

func (h *Handler) CompanyGetTemplate(c *gin.Context) {
	h.GetTemplate(c)
}

func (h *Handler) CompanyTemplateImage(c *gin.Context) {
	path, ct, err := h.svc.TemplateImagePath(c.Request.Context(), c.Param("id"))
	if err != nil {
		h.fail(c, err)
		return
	}
	if ct != "" {
		c.Header("Content-Type", ct)
	}
	c.File(path)
}

func (h *Handler) CreateFromTemplate(c *gin.Context) {
	companyID := c.GetString(middleware.ContextCompanyID)
	var req dto.CreateFromTemplateRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, "So'rov tanasi noto'g'ri", err.Error())
		return
	}
	item, err := h.svc.CreateFromTemplate(c.Request.Context(), companyID, req)
	if err != nil {
		h.fail(c, err)
		return
	}
	response.Created(c, "Vizitka yaratildi", item)
}

func (h *Handler) CreateCustom(c *gin.Context) {
	companyID := c.GetString(middleware.ContextCompanyID)
	name, data, qx, qy, qw, qh, fields, err := parseMultipartCard(c)
	if err != nil {
		response.BadRequest(c, err.Error(), "")
		return
	}
	item, err := h.svc.CreateCustom(c.Request.Context(), companyID, name, data, qx, qy, qw, qh, fields)
	if err != nil {
		h.fail(c, err)
		return
	}
	response.Created(c, "Vizitka saqlandi", item)
}

func (h *Handler) ListCards(c *gin.Context) {
	companyID := c.GetString(middleware.ContextCompanyID)
	items, err := h.svc.ListCards(c.Request.Context(), companyID)
	if err != nil {
		h.fail(c, err)
		return
	}
	response.OK(c, "Vizitkalar", items)
}

func (h *Handler) GetCard(c *gin.Context) {
	companyID := c.GetString(middleware.ContextCompanyID)
	item, err := h.svc.GetCard(c.Request.Context(), companyID, c.Param("id"))
	if err != nil {
		h.fail(c, err)
		return
	}
	response.OK(c, "Vizitka", item)
}

func (h *Handler) UpdateCard(c *gin.Context) {
	companyID := c.GetString(middleware.ContextCompanyID)
	var req dto.UpdateCompanyCardRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, "So'rov tanasi noto'g'ri", err.Error())
		return
	}
	item, err := h.svc.UpdateCard(c.Request.Context(), companyID, c.Param("id"), req)
	if err != nil {
		h.fail(c, err)
		return
	}
	response.OK(c, "Vizitka yangilandi", item)
}

func (h *Handler) DeleteCard(c *gin.Context) {
	companyID := c.GetString(middleware.ContextCompanyID)
	if err := h.svc.DeleteCard(c.Request.Context(), companyID, c.Param("id")); err != nil {
		h.fail(c, err)
		return
	}
	response.OK(c, "Vizitka o'chirildi", nil)
}

func (h *Handler) CardImage(c *gin.Context) {
	companyID := c.GetString(middleware.ContextCompanyID)
	path, ct, err := h.svc.CardImagePath(c.Request.Context(), companyID, c.Param("id"))
	if err != nil {
		h.fail(c, err)
		return
	}
	if ct != "" {
		c.Header("Content-Type", ct)
	}
	c.File(path)
}

func (h *Handler) Preview(c *gin.Context) {
	companyID := c.GetString(middleware.ContextCompanyID)
	data, err := h.svc.PreviewPNG(c.Request.Context(), companyID, c.Param("id"))
	if err != nil {
		h.fail(c, err)
		return
	}
	c.Data(http.StatusOK, "image/png", data)
}

func (h *Handler) QR(c *gin.Context) {
	companyID := c.GetString(middleware.ContextCompanyID)
	data, err := h.svc.QRPNG(c.Request.Context(), companyID, c.Param("id"))
	if err != nil {
		h.fail(c, err)
		return
	}
	c.Data(http.StatusOK, "image/png", data)
}

func (h *Handler) Layout(c *gin.Context) {
	companyID := c.GetString(middleware.ContextCompanyID)
	layout, err := h.svc.Layout(c.Request.Context(), companyID, c.Param("id"))
	if err != nil {
		h.fail(c, err)
		return
	}
	response.OK(c, "A4 layout", layout)
}

func (h *Handler) PDF(c *gin.Context) {
	companyID := c.GetString(middleware.ContextCompanyID)
	copies, _ := strconv.Atoi(c.Query("copies"))
	data, err := h.svc.PDF(c.Request.Context(), companyID, c.Param("id"), copies)
	if err != nil {
		h.fail(c, err)
		return
	}
	c.Header("Content-Type", "application/pdf")
	c.Header("Content-Disposition", `attachment; filename="vizitka.pdf"`)
	c.Data(http.StatusOK, "application/pdf", data)
}

func (h *Handler) AttachCard(c *gin.Context) {
	companyID := c.GetString(middleware.ContextCompanyID)
	var req dto.AttachCardRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, "cardId majburiy", err.Error())
		return
	}
	item, err := h.svc.AttachToSurvey(c.Request.Context(), companyID, c.Param("id"), req.CardID)
	if err != nil {
		h.fail(c, err)
		return
	}
	response.OK(c, "Vizitka so'rovnomaga biriktirildi", item)
}

func (h *Handler) DetachCard(c *gin.Context) {
	companyID := c.GetString(middleware.ContextCompanyID)
	if err := h.svc.DetachFromSurvey(c.Request.Context(), companyID, c.Param("id")); err != nil {
		h.fail(c, err)
		return
	}
	response.OK(c, "Vizitka ajratildi", nil)
}

func (h *Handler) SurveyCard(c *gin.Context) {
	companyID := c.GetString(middleware.ContextCompanyID)
	brief, err := h.svc.BriefForSurvey(c.Request.Context(), companyID, c.Param("id"))
	if err != nil {
		h.fail(c, err)
		return
	}
	response.OK(c, "So'rovnoma vizitkasi", brief)
}

func parseMultipartCard(c *gin.Context) (name string, data []byte, qx, qy, qw, qh int, fields []domain.TextField, err error) {
	if err = c.Request.ParseMultipartForm(domain.MaxImageBytes + (1 << 20)); err != nil {
		return "", nil, 0, 0, 0, 0, nil, errors.New("multipart forma noto'g'ri yoki juda katta")
	}
	file, header, ferr := c.Request.FormFile("image")
	if ferr != nil {
		return "", nil, 0, 0, 0, 0, nil, errors.New("image maydoni majburiy")
	}
	defer file.Close()
	if header.Size > domain.MaxImageBytes {
		return "", nil, 0, 0, 0, 0, nil, domain.ErrImageTooLarge
	}
	data, err = io.ReadAll(io.LimitReader(file, domain.MaxImageBytes+1))
	if err != nil {
		return "", nil, 0, 0, 0, 0, nil, errors.New("rasmni o'qib bo'lmadi")
	}
	if len(data) > domain.MaxImageBytes {
		return "", nil, 0, 0, 0, 0, nil, domain.ErrImageTooLarge
	}
	name = c.PostForm("name")
	qx, err1 := strconv.Atoi(strings.TrimSpace(c.PostForm("qrX")))
	if err1 != nil {
		qx, err1 = strconv.Atoi(strings.TrimSpace(c.PostForm("qr_x")))
	}
	qy, err2 := strconv.Atoi(strings.TrimSpace(c.PostForm("qrY")))
	if err2 != nil {
		qy, err2 = strconv.Atoi(strings.TrimSpace(c.PostForm("qr_y")))
	}
	qw, err3 := strconv.Atoi(strings.TrimSpace(c.PostForm("qrWidth")))
	if err3 != nil {
		qw, err3 = strconv.Atoi(strings.TrimSpace(c.PostForm("qr_width")))
	}
	qh, err4 := strconv.Atoi(strings.TrimSpace(c.PostForm("qrHeight")))
	if err4 != nil {
		qh, err4 = strconv.Atoi(strings.TrimSpace(c.PostForm("qr_height")))
	}
	if err1 != nil || err2 != nil || err3 != nil || err4 != nil {
		return "", nil, 0, 0, 0, 0, nil, errors.New("qrX, qrY, qrWidth, qrHeight butun son bo'lishi kerak")
	}
	rawFields := c.PostForm("textFields")
	if rawFields == "" {
		rawFields = "[]"
	}
	if err = json.Unmarshal([]byte(rawFields), &fields); err != nil {
		return "", nil, 0, 0, 0, 0, nil, errors.New("textFields JSON noto'g'ri")
	}
	return name, data, qx, qy, qw, qh, fields, nil
}

func (h *Handler) fail(c *gin.Context, err error) {
	switch {
	case errors.Is(err, domain.ErrNotFound):
		response.NotFound(c, err.Error())
	case errors.Is(err, domain.ErrForbidden):
		response.Unauthorized(c, err.Error())
	case errors.Is(err, domain.ErrInvalidInput), errors.Is(err, domain.ErrImageTooLarge), errors.Is(err, domain.ErrBadImage):
		response.BadRequest(c, err.Error(), "")
	case errors.Is(err, domain.ErrNoOrientation), errors.Is(err, domain.ErrNoGrid), errors.Is(err, domain.ErrNoSurveyURL):
		response.Fail(c, http.StatusConflict, err.Error(), "")
	default:
		msg := err.Error()
		if strings.Contains(msg, "noto'g'ri") || strings.Contains(msg, "chegarasidan") || strings.Contains(msg, "o'lchami") {
			response.BadRequest(c, msg, "")
			return
		}
		response.Internal(c, "Ichki server xatosi")
	}
}
