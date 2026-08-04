package appointment

import (
	"database/sql"

	"github.com/gin-gonic/gin"

	"github.com/foydalanuvchilar-bazasi/backend/internal/config"
	"github.com/foydalanuvchilar-bazasi/backend/internal/modules/appointment/handler"
	"github.com/foydalanuvchilar-bazasi/backend/internal/modules/appointment/repository"
	"github.com/foydalanuvchilar-bazasi/backend/internal/modules/appointment/service"
	settingService "github.com/foydalanuvchilar-bazasi/backend/internal/modules/setting/service"
	"github.com/foydalanuvchilar-bazasi/backend/internal/platform/middleware"
)

type Module struct {
	handler *handler.Handler
	Service *service.Service
	jwt     config.JWTConfig
}

func NewModule(db *sql.DB, jwtCfg config.JWTConfig, settings *settingService.SettingService) *Module {
	repo := repository.NewRepository(db)
	svc := service.NewService(repo, settings)
	return &Module{
		handler: handler.NewHandler(svc),
		Service: svc,
		jwt:     jwtCfg,
	}
}

func (m *Module) RegisterRoutes(rg *gin.RouterGroup) {
	// Public booking
	bookings := rg.Group("/bookings")
	{
		bookings.GET("/:slug", m.handler.PublicGet)
		bookings.GET("/:slug/days", m.handler.PublicDays)
		bookings.GET("/:slug/slots", m.handler.PublicSlots)
		bookings.POST("/:slug", m.handler.PublicBook)
	}

	// Company management
	co := rg.Group("/company/appointments")
	co.Use(middleware.CompanyAuth(m.jwt.Secret))
	{
		co.GET("/bookings", m.handler.ListBookings)
		co.GET("/bookings/:bookingId", m.handler.GetBooking)
		co.PATCH("/bookings/:bookingId", m.handler.UpdateBooking)
		co.GET("/summary", m.handler.Summary)

		co.POST("", m.handler.Create)
		co.GET("", m.handler.List)
		co.GET("/:id", m.handler.Get)
		co.PUT("/:id", m.handler.Update)
		co.DELETE("/:id", m.handler.Delete)
		co.POST("/:id/publish", m.handler.Publish)
		co.POST("/:id/close", m.handler.Close)
		co.POST("/:id/card", m.handler.AttachCard)
		co.DELETE("/:id/card", m.handler.DetachCard)
	}
}
