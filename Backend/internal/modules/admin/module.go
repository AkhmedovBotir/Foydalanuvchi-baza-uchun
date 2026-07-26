package admin

import (
	"context"
	"database/sql"

	"github.com/gin-gonic/gin"

	"github.com/foydalanuvchilar-bazasi/backend/internal/config"
	"github.com/foydalanuvchilar-bazasi/backend/internal/modules/admin/handler"
	"github.com/foydalanuvchilar-bazasi/backend/internal/modules/admin/repository"
	"github.com/foydalanuvchilar-bazasi/backend/internal/modules/admin/service"
	"github.com/foydalanuvchilar-bazasi/backend/internal/platform/middleware"
)

// Module — Admin moduli (modular monolit).
// Keyinchalik boshqa modullar (users, roles, ...) shu uslubda ulanadi.
type Module struct {
	handler *handler.AdminHandler
	service *service.AdminService
	jwt     config.JWTConfig
}

func NewModule(db *sql.DB, jwtCfg config.JWTConfig) *Module {
	repo := repository.NewAdminRepository(db)
	svc := service.NewAdminService(repo, jwtCfg)
	h := handler.NewAdminHandler(svc)
	return &Module{handler: h, service: svc, jwt: jwtCfg}
}

func (m *Module) Seed(ctx context.Context) error {
	return m.service.SeedDefaultAdmin(ctx)
}

func (m *Module) RegisterRoutes(rg *gin.RouterGroup) {
	auth := rg.Group("/auth")
	{
		auth.POST("/login", m.handler.Login)

		protected := auth.Group("")
		protected.Use(middleware.AdminAuth(m.jwt.Secret))
		{
			protected.GET("/profile", m.handler.GetProfile)
			protected.PUT("/profile", m.handler.UpdateProfile)
		}
	}

	admins := rg.Group("/admins")
	admins.Use(middleware.AdminAuth(m.jwt.Secret))
	{
		admins.POST("", m.handler.CreateAdmin)
		admins.GET("", m.handler.ListAdmins)
		admins.GET("/:id", m.handler.GetAdmin)
		admins.PUT("/:id", m.handler.UpdateAdmin)
		admins.DELETE("/:id", m.handler.DeleteAdmin)
	}
}
