package handler

import (
	"errors"

	"github.com/gin-gonic/gin"

	"github.com/foydalanuvchilar-bazasi/backend/internal/modules/company/domain"
	"github.com/foydalanuvchilar-bazasi/backend/internal/modules/company/dto"
	"github.com/foydalanuvchilar-bazasi/backend/internal/modules/company/service"
	"github.com/foydalanuvchilar-bazasi/backend/internal/platform/middleware"
	"github.com/foydalanuvchilar-bazasi/backend/internal/platform/response"
)

type CompanyHandler struct {
	svc *service.CompanyService
}

func NewCompanyHandler(svc *service.CompanyService) *CompanyHandler {
	return &CompanyHandler{svc: svc}
}

// CreateCompany godoc
// @Summary      Yangi kompaniya yaratish
// @Description  Admin tomonidan yangi kompaniya qo'shiladi
// @Tags         Companies
// @Accept       json
// @Produce      json
// @Security     BearerAuth
// @Param        body  body      dto.CreateCompanyRequest  true  "Kompaniya ma'lumotlari"
// @Success      201   {object}  dto.MessageResponse
// @Failure      400   {object}  dto.ErrorResponse
// @Failure      401   {object}  dto.ErrorResponse
// @Failure      409   {object}  dto.ErrorResponse
// @Failure      500   {object}  dto.ErrorResponse
// @Router       /companies [post]
func (h *CompanyHandler) CreateCompany(c *gin.Context) {
	var req dto.CreateCompanyRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, "Validatsiya xatosi", err.Error())
		return
	}

	company, err := h.svc.Create(c.Request.Context(), req)
	if err != nil {
		h.handleError(c, err)
		return
	}
	response.Created(c, "Kompaniya muvaffaqiyatli yaratildi", company)
}

// ListCompanies godoc
// @Summary      Kompaniyalar ro'yxati
// @Description  Barcha kompaniyalarni qaytaradi (admin)
// @Tags         Companies
// @Produce      json
// @Security     BearerAuth
// @Success      200  {object}  dto.MessageResponse
// @Failure      401  {object}  dto.ErrorResponse
// @Failure      500  {object}  dto.ErrorResponse
// @Router       /companies [get]
func (h *CompanyHandler) ListCompanies(c *gin.Context) {
	companies, err := h.svc.List(c.Request.Context())
	if err != nil {
		h.handleError(c, err)
		return
	}
	response.OK(c, "Kompaniyalar ro'yxati", companies)
}

// GetCompany godoc
// @Summary      Kompaniyani ID bo'yicha olish
// @Description  Bitta kompaniya ma'lumotlarini qaytaradi (admin)
// @Tags         Companies
// @Produce      json
// @Security     BearerAuth
// @Param        id   path      string  true  "Company UUID"
// @Success      200  {object}  dto.MessageResponse
// @Failure      401  {object}  dto.ErrorResponse
// @Failure      404  {object}  dto.ErrorResponse
// @Failure      500  {object}  dto.ErrorResponse
// @Router       /companies/{id} [get]
func (h *CompanyHandler) GetCompany(c *gin.Context) {
	company, err := h.svc.GetByID(c.Request.Context(), c.Param("id"))
	if err != nil {
		h.handleError(c, err)
		return
	}
	response.OK(c, "Kompaniya topildi", company)
}

// UpdateCompany godoc
// @Summary      Kompaniyani yangilash
// @Description  Kompaniya ma'lumotlarini o'zgartiradi. Password bo'sh qoldirilsa, eski parol saqlanadi.
// @Tags         Companies
// @Accept       json
// @Produce      json
// @Security     BearerAuth
// @Param        id    path      string                    true  "Company UUID"
// @Param        body  body      dto.UpdateCompanyRequest  true  "Yangilangan ma'lumotlar"
// @Success      200   {object}  dto.MessageResponse
// @Failure      400   {object}  dto.ErrorResponse
// @Failure      401   {object}  dto.ErrorResponse
// @Failure      404   {object}  dto.ErrorResponse
// @Failure      409   {object}  dto.ErrorResponse
// @Failure      500   {object}  dto.ErrorResponse
// @Router       /companies/{id} [put]
func (h *CompanyHandler) UpdateCompany(c *gin.Context) {
	var req dto.UpdateCompanyRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, "Validatsiya xatosi", err.Error())
		return
	}

	company, err := h.svc.Update(c.Request.Context(), c.Param("id"), req)
	if err != nil {
		h.handleError(c, err)
		return
	}
	response.OK(c, "Kompaniya muvaffaqiyatli yangilandi", company)
}

// DeleteCompany godoc
// @Summary      Kompaniyani o'chirish
// @Description  Kompaniyani tizimdan o'chiradi (admin)
// @Tags         Companies
// @Produce      json
// @Security     BearerAuth
// @Param        id   path      string  true  "Company UUID"
// @Success      200  {object}  dto.MessageResponse
// @Failure      401  {object}  dto.ErrorResponse
// @Failure      404  {object}  dto.ErrorResponse
// @Failure      500  {object}  dto.ErrorResponse
// @Router       /companies/{id} [delete]
func (h *CompanyHandler) DeleteCompany(c *gin.Context) {
	if err := h.svc.Delete(c.Request.Context(), c.Param("id")); err != nil {
		h.handleError(c, err)
		return
	}
	response.OK(c, "Kompaniya muvaffaqiyatli o'chirildi", nil)
}

// Login godoc
// @Summary      Kompaniya login
// @Description  Username va password orqali kompaniya tizimga kiradi. JWT token qaytaradi.
// @Tags         Company Auth
// @Accept       json
// @Produce      json
// @Param        body  body      dto.LoginRequest  true  "Login ma'lumotlari"
// @Success      200   {object}  dto.MessageResponse
// @Failure      400   {object}  dto.ErrorResponse
// @Failure      401   {object}  dto.ErrorResponse
// @Failure      500   {object}  dto.ErrorResponse
// @Router       /company/auth/login [post]
func (h *CompanyHandler) Login(c *gin.Context) {
	var req dto.LoginRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, "Validatsiya xatosi", err.Error())
		return
	}

	result, err := h.svc.Login(c.Request.Context(), req)
	if err != nil {
		h.handleError(c, err)
		return
	}
	response.OK(c, "Muvaffaqiyatli kirildi", result)
}

// GetProfile godoc
// @Summary      Joriy kompaniya profili
// @Description  Token egasi kompaniyaning profil ma'lumotlarini qaytaradi
// @Tags         Company Auth
// @Produce      json
// @Security     BearerAuth
// @Success      200  {object}  dto.MessageResponse
// @Failure      401  {object}  dto.ErrorResponse
// @Failure      404  {object}  dto.ErrorResponse
// @Failure      500  {object}  dto.ErrorResponse
// @Router       /company/auth/profile [get]
func (h *CompanyHandler) GetProfile(c *gin.Context) {
	companyID := c.GetString(middleware.ContextCompanyID)
	company, err := h.svc.GetProfile(c.Request.Context(), companyID)
	if err != nil {
		h.handleError(c, err)
		return
	}
	response.OK(c, "Profil ma'lumotlari", company)
}

// UpdateProfile godoc
// @Summary      Joriy kompaniya profilini yangilash
// @Description  Token egasi o'z profilini o'zgartiradi. Password bo'sh qoldirilsa, eski parol saqlanadi.
// @Tags         Company Auth
// @Accept       json
// @Produce      json
// @Security     BearerAuth
// @Param        body  body      dto.UpdateProfileRequest  true  "Profil ma'lumotlari"
// @Success      200   {object}  dto.MessageResponse
// @Failure      400   {object}  dto.ErrorResponse
// @Failure      401   {object}  dto.ErrorResponse
// @Failure      409   {object}  dto.ErrorResponse
// @Failure      500   {object}  dto.ErrorResponse
// @Router       /company/auth/profile [put]
func (h *CompanyHandler) UpdateProfile(c *gin.Context) {
	var req dto.UpdateProfileRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, "Validatsiya xatosi", err.Error())
		return
	}

	companyID := c.GetString(middleware.ContextCompanyID)
	company, err := h.svc.UpdateProfile(c.Request.Context(), companyID, req)
	if err != nil {
		h.handleError(c, err)
		return
	}
	response.OK(c, "Profil muvaffaqiyatli yangilandi", company)
}

func (h *CompanyHandler) handleError(c *gin.Context, err error) {
	switch {
	case errors.Is(err, domain.ErrCompanyNotFound):
		response.NotFound(c, err.Error())
	case errors.Is(err, domain.ErrInvalidCredentials):
		response.Unauthorized(c, err.Error())
	case errors.Is(err, domain.ErrUsernameTaken), errors.Is(err, domain.ErrPhoneTaken):
		response.Conflict(c, err.Error())
	case errors.Is(err, domain.ErrWeakPassword):
		response.BadRequest(c, err.Error(), "")
	default:
		response.Internal(c, "Ichki server xatosi")
	}
}
