package workflow

import (
	"database/sql"

	"github.com/gin-gonic/gin"

	"github.com/foydalanuvchilar-bazasi/backend/internal/config"
	"github.com/foydalanuvchilar-bazasi/backend/internal/modules/workflow/handler"
	"github.com/foydalanuvchilar-bazasi/backend/internal/modules/workflow/repository"
	"github.com/foydalanuvchilar-bazasi/backend/internal/modules/workflow/service"
	"github.com/foydalanuvchilar-bazasi/backend/internal/platform/middleware"
)

type Module struct {
	handler *handler.Handler
	Service *service.Service
	jwt     config.JWTConfig
}

func NewModule(db *sql.DB, jwtCfg config.JWTConfig) *Module {
	repo := repository.NewRepository(db)
	svc := service.NewService(repo)
	return &Module{
		handler: handler.NewHandler(svc),
		Service: svc,
		jwt:     jwtCfg,
	}
}

func (m *Module) SetFinance(rec service.PaymentRecorder) {
	m.Service.SetFinance(rec)
}

func (m *Module) RegisterRoutes(rg *gin.RouterGroup) {
	reg := rg.Group("/registrator")
	reg.Use(middleware.RegistratorAuth(m.jwt.Secret))
	{
		reg.GET("/dashboard", m.handler.RegDashboard)
		reg.GET("/doctors", m.handler.RegDoctors)

		reg.GET("/responses", m.handler.RegListSurveys)
		reg.GET("/responses/:id", m.handler.RegGetSurvey)
		reg.POST("/responses/:id/assign", m.handler.RegAssignSurvey)
		reg.POST("/responses/:id/payment", m.handler.RegPaySurvey)
		reg.POST("/responses/:id/no-show", m.handler.RegNoShowSurvey)

		reg.GET("/bookings", m.handler.RegListBookings)
		reg.GET("/bookings/:id", m.handler.RegGetBooking)
		reg.POST("/bookings/:id/assign", m.handler.RegAssignBooking)
		reg.POST("/bookings/:id/payment", m.handler.RegPayBooking)
		reg.POST("/bookings/:id/no-show", m.handler.RegNoShowBooking)
	}

	doc := rg.Group("/doctor")
	doc.Use(middleware.DoctorAuth(m.jwt.Secret))
	{
		doc.GET("/dashboard", m.handler.DocDashboard)

		doc.GET("/responses", m.handler.DocListSurveys)
		doc.GET("/responses/:id", m.handler.DocGetSurvey)
		doc.POST("/responses/:id/conclude", m.handler.DocConcludeSurvey)
		doc.POST("/responses/:id/cancel", m.handler.DocCancelSurvey)
		doc.POST("/responses/:id/no-show", m.handler.DocNoShowSurvey)

		doc.GET("/bookings", m.handler.DocListBookings)
		doc.GET("/bookings/:id", m.handler.DocGetBooking)
		doc.POST("/bookings/:id/conclude", m.handler.DocConcludeBooking)
		doc.POST("/bookings/:id/cancel", m.handler.DocCancelBooking)
		doc.POST("/bookings/:id/no-show", m.handler.DocNoShowBooking)
	}

	// Kompaniya paneli — registrator + doktor imkoniyatlari
	co := rg.Group("/company/workflow")
	co.Use(middleware.CompanyAuth(m.jwt.Secret))
	{
		co.GET("/dashboard", m.handler.CoDashboard)

		co.GET("/responses", m.handler.CoListSurveys)
		co.GET("/responses/:id", m.handler.CoGetSurvey)
		co.POST("/responses/:id/assign", m.handler.CoAssignSurvey)
		co.POST("/responses/:id/payment", m.handler.CoPaySurvey)
		co.POST("/responses/:id/no-show", m.handler.CoNoShowSurvey)
		co.POST("/responses/:id/conclude", m.handler.CoConcludeSurvey)
		co.POST("/responses/:id/cancel", m.handler.CoCancelSurvey)
		co.POST("/responses/:id/doctor-no-show", m.handler.CoDoctorNoShowSurvey)

		co.GET("/bookings", m.handler.CoListBookings)
		co.GET("/bookings/:id", m.handler.CoGetBooking)
		co.POST("/bookings/:id/assign", m.handler.CoAssignBooking)
		co.POST("/bookings/:id/payment", m.handler.CoPayBooking)
		co.POST("/bookings/:id/no-show", m.handler.CoNoShowBooking)
		co.POST("/bookings/:id/conclude", m.handler.CoConcludeBooking)
		co.POST("/bookings/:id/cancel", m.handler.CoCancelBooking)
		co.POST("/bookings/:id/doctor-no-show", m.handler.CoDoctorNoShowBooking)
	}
}
