package staff

import (
	"database/sql"

	"github.com/gin-gonic/gin"

	"github.com/foydalanuvchilar-bazasi/backend/internal/config"
	"github.com/foydalanuvchilar-bazasi/backend/internal/modules/staff/handler"
	"github.com/foydalanuvchilar-bazasi/backend/internal/modules/staff/repository"
	"github.com/foydalanuvchilar-bazasi/backend/internal/modules/staff/service"
	"github.com/foydalanuvchilar-bazasi/backend/internal/platform/middleware"
)

type Module struct {
	handler *handler.Handler
	Service *service.Service
	jwt     config.JWTConfig
}

func NewModule(db *sql.DB, jwtCfg config.JWTConfig) *Module {
	repo := repository.NewRepository(db)
	svc := service.NewService(repo, jwtCfg)
	return &Module{handler: handler.NewHandler(svc), Service: svc, jwt: jwtCfg}
}

func (m *Module) RegisterRoutes(rg *gin.RouterGroup) {
	// Auth — registrator / doctor
	regAuth := rg.Group("/registrator/auth")
	{
		regAuth.POST("/login", m.handler.LoginRegistrator)
		regAuth.GET("/profile", middleware.RegistratorAuth(m.jwt.Secret), m.handler.RegistratorProfile)
	}
	docAuth := rg.Group("/doctor/auth")
	{
		docAuth.POST("/login", m.handler.LoginDoctor)
		docAuth.GET("/profile", middleware.DoctorAuth(m.jwt.Secret), m.handler.DoctorProfile)
	}

	// Company CRUD
	regs := rg.Group("/company/registrators")
	regs.Use(middleware.CompanyAuth(m.jwt.Secret))
	{
		regs.POST("", m.handler.CreateRegistrator)
		regs.GET("", m.handler.ListRegistrators)
		regs.GET("/:id", m.handler.GetRegistrator)
		regs.PUT("/:id", m.handler.UpdateRegistrator)
		regs.DELETE("/:id", m.handler.DeleteRegistrator)
	}

	docs := rg.Group("/company/doctors")
	docs.Use(middleware.CompanyAuth(m.jwt.Secret))
	{
		docs.POST("", m.handler.CreateDoctor)
		docs.GET("", m.handler.ListDoctors)
		docs.GET("/:id", m.handler.GetDoctor)
		docs.PUT("/:id", m.handler.UpdateDoctor)
		docs.DELETE("/:id", m.handler.DeleteDoctor)
	}
}
