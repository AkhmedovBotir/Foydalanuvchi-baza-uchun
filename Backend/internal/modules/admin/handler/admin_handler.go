package handler

import (
	"errors"

	"github.com/gin-gonic/gin"

	"github.com/foydalanuvchilar-bazasi/backend/internal/modules/admin/domain"
	"github.com/foydalanuvchilar-bazasi/backend/internal/modules/admin/dto"
	"github.com/foydalanuvchilar-bazasi/backend/internal/modules/admin/service"
	"github.com/foydalanuvchilar-bazasi/backend/internal/platform/middleware"
	"github.com/foydalanuvchilar-bazasi/backend/internal/platform/response"
)

type AdminHandler struct {
	svc *service.AdminService
}

func NewAdminHandler(svc *service.AdminService) *AdminHandler {
	return &AdminHandler{svc: svc}
}

// CreateAdmin godoc
// @Summary      Yangi admin yaratish
// @Description  Admin CRUD: yangi admin qo'shadi
// @Tags         Admins
// @Accept       json
// @Produce      json
// @Security     BearerAuth
// @Param        body  body      dto.CreateAdminRequest  true  "Admin ma'lumotlari"
// @Success      201   {object}  dto.MessageResponse
// @Failure      400   {object}  dto.ErrorResponse
// @Failure      401   {object}  dto.ErrorResponse
// @Failure      409   {object}  dto.ErrorResponse
// @Failure      500   {object}  dto.ErrorResponse
// @Router       /admins [post]
func (h *AdminHandler) CreateAdmin(c *gin.Context) {
	var req dto.CreateAdminRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, "Validatsiya xatosi", err.Error())
		return
	}

	admin, err := h.svc.Create(c.Request.Context(), req)
	if err != nil {
		h.handleError(c, err)
		return
	}
	response.Created(c, "Admin muvaffaqiyatli yaratildi", admin)
}

// ListAdmins godoc
// @Summary      Adminlar ro'yxati
// @Description  Barcha adminlarni qaytaradi
// @Tags         Admins
// @Produce      json
// @Security     BearerAuth
// @Success      200  {object}  dto.MessageResponse
// @Failure      401  {object}  dto.ErrorResponse
// @Failure      500  {object}  dto.ErrorResponse
// @Router       /admins [get]
func (h *AdminHandler) ListAdmins(c *gin.Context) {
	admins, err := h.svc.List(c.Request.Context())
	if err != nil {
		h.handleError(c, err)
		return
	}
	response.OK(c, "Adminlar ro'yxati", admins)
}

// GetAdmin godoc
// @Summary      Adminni ID bo'yicha olish
// @Description  Bitta admin ma'lumotlarini qaytaradi
// @Tags         Admins
// @Produce      json
// @Security     BearerAuth
// @Param        id   path      string  true  "Admin UUID"
// @Success      200  {object}  dto.MessageResponse
// @Failure      401  {object}  dto.ErrorResponse
// @Failure      404  {object}  dto.ErrorResponse
// @Failure      500  {object}  dto.ErrorResponse
// @Router       /admins/{id} [get]
func (h *AdminHandler) GetAdmin(c *gin.Context) {
	admin, err := h.svc.GetByID(c.Request.Context(), c.Param("id"))
	if err != nil {
		h.handleError(c, err)
		return
	}
	response.OK(c, "Admin topildi", admin)
}

// UpdateAdmin godoc
// @Summary      Adminni yangilash
// @Description  Admin ma'lumotlarini o'zgartiradi. Password bo'sh qoldirilsa, eski parol saqlanadi.
// @Tags         Admins
// @Accept       json
// @Produce      json
// @Security     BearerAuth
// @Param        id    path      string                 true  "Admin UUID"
// @Param        body  body      dto.UpdateAdminRequest true  "Yangilangan ma'lumotlar"
// @Success      200   {object}  dto.MessageResponse
// @Failure      400   {object}  dto.ErrorResponse
// @Failure      401   {object}  dto.ErrorResponse
// @Failure      404   {object}  dto.ErrorResponse
// @Failure      409   {object}  dto.ErrorResponse
// @Failure      500   {object}  dto.ErrorResponse
// @Router       /admins/{id} [put]
func (h *AdminHandler) UpdateAdmin(c *gin.Context) {
	var req dto.UpdateAdminRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, "Validatsiya xatosi", err.Error())
		return
	}

	admin, err := h.svc.Update(c.Request.Context(), c.Param("id"), req)
	if err != nil {
		h.handleError(c, err)
		return
	}
	response.OK(c, "Admin muvaffaqiyatli yangilandi", admin)
}

// DeleteAdmin godoc
// @Summary      Adminni o'chirish
// @Description  Adminni tizimdan o'chiradi
// @Tags         Admins
// @Produce      json
// @Security     BearerAuth
// @Param        id   path      string  true  "Admin UUID"
// @Success      200  {object}  dto.MessageResponse
// @Failure      401  {object}  dto.ErrorResponse
// @Failure      404  {object}  dto.ErrorResponse
// @Failure      500  {object}  dto.ErrorResponse
// @Router       /admins/{id} [delete]
func (h *AdminHandler) DeleteAdmin(c *gin.Context) {
	if err := h.svc.Delete(c.Request.Context(), c.Param("id")); err != nil {
		h.handleError(c, err)
		return
	}
	response.OK(c, "Admin muvaffaqiyatli o'chirildi", nil)
}

// Login godoc
// @Summary      Admin login
// @Description  Username va password orqali tizimga kirish. JWT token qaytaradi.
// @Tags         Auth
// @Accept       json
// @Produce      json
// @Param        body  body      dto.LoginRequest  true  "Login ma'lumotlari"
// @Success      200   {object}  dto.MessageResponse
// @Failure      400   {object}  dto.ErrorResponse
// @Failure      401   {object}  dto.ErrorResponse
// @Failure      500   {object}  dto.ErrorResponse
// @Router       /auth/login [post]
func (h *AdminHandler) Login(c *gin.Context) {
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
// @Summary      Joriy admin profili
// @Description  Token egasining profil ma'lumotlarini qaytaradi
// @Tags         Auth
// @Produce      json
// @Security     BearerAuth
// @Success      200  {object}  dto.MessageResponse
// @Failure      401  {object}  dto.ErrorResponse
// @Failure      404  {object}  dto.ErrorResponse
// @Failure      500  {object}  dto.ErrorResponse
// @Router       /auth/profile [get]
func (h *AdminHandler) GetProfile(c *gin.Context) {
	adminID := c.GetString(middleware.ContextAdminID)
	admin, err := h.svc.GetProfile(c.Request.Context(), adminID)
	if err != nil {
		h.handleError(c, err)
		return
	}
	response.OK(c, "Profil ma'lumotlari", admin)
}

// UpdateProfile godoc
// @Summary      Joriy admin profilini yangilash
// @Description  Token egasi o'z profilini o'zgartiradi. Password bo'sh qoldirilsa, eski parol saqlanadi.
// @Tags         Auth
// @Accept       json
// @Produce      json
// @Security     BearerAuth
// @Param        body  body      dto.UpdateProfileRequest  true  "Profil ma'lumotlari"
// @Success      200   {object}  dto.MessageResponse
// @Failure      400   {object}  dto.ErrorResponse
// @Failure      401   {object}  dto.ErrorResponse
// @Failure      409   {object}  dto.ErrorResponse
// @Failure      500   {object}  dto.ErrorResponse
// @Router       /auth/profile [put]
func (h *AdminHandler) UpdateProfile(c *gin.Context) {
	var req dto.UpdateProfileRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, "Validatsiya xatosi", err.Error())
		return
	}

	adminID := c.GetString(middleware.ContextAdminID)
	admin, err := h.svc.UpdateProfile(c.Request.Context(), adminID, req)
	if err != nil {
		h.handleError(c, err)
		return
	}
	response.OK(c, "Profil muvaffaqiyatli yangilandi", admin)
}

func (h *AdminHandler) handleError(c *gin.Context, err error) {
	switch {
	case errors.Is(err, domain.ErrAdminNotFound):
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
