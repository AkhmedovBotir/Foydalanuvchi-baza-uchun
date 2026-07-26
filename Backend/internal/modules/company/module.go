package company

import (
	"database/sql"

	"github.com/gin-gonic/gin"

	"github.com/foydalanuvchilar-bazasi/backend/internal/config"
	"github.com/foydalanuvchilar-bazasi/backend/internal/modules/company/handler"
	"github.com/foydalanuvchilar-bazasi/backend/internal/modules/company/repository"
	"github.com/foydalanuvchilar-bazasi/backend/internal/modules/company/service"
	"github.com/foydalanuvchilar-bazasi/backend/internal/platform/middleware"
)

// Module — Company moduli (modular monolit).
type Module struct {
	handler *handler.CompanyHandler
	jwt     config.JWTConfig
}

func NewModule(db *sql.DB, jwtCfg config.JWTConfig) *Module {
	repo := repository.NewCompanyRepository(db)
	svc := service.NewCompanyService(repo, jwtCfg)
	h := handler.NewCompanyHandler(svc)
	return &Module{handler: h, jwt: jwtCfg}
}

func (m *Module) RegisterRoutes(rg *gin.RouterGroup) {
	// Kompaniya o'z login / profili
	auth := rg.Group("/company/auth")
	{
		auth.POST("/login", m.handler.Login)

		protected := auth.Group("")
		protected.Use(middleware.CompanyAuth(m.jwt.Secret))
		{
			protected.GET("/profile", m.handler.GetProfile)
			protected.PUT("/profile", m.handler.UpdateProfile)
		}
	}

	// Admin tomonidan CRUD
	companies := rg.Group("/companies")
	companies.Use(middleware.AdminAuth(m.jwt.Secret))
	{
		companies.POST("", m.handler.CreateCompany)
		companies.GET("", m.handler.ListCompanies)
		companies.GET("/:id", m.handler.GetCompany)
		companies.PUT("/:id", m.handler.UpdateCompany)
		companies.DELETE("/:id", m.handler.DeleteCompany)
	}
}
