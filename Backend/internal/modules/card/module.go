package card

import (
	"database/sql"

	"github.com/gin-gonic/gin"

	"github.com/foydalanuvchilar-bazasi/backend/internal/config"
	"github.com/foydalanuvchilar-bazasi/backend/internal/modules/card/handler"
	"github.com/foydalanuvchilar-bazasi/backend/internal/modules/card/repository"
	"github.com/foydalanuvchilar-bazasi/backend/internal/modules/card/service"
	settingService "github.com/foydalanuvchilar-bazasi/backend/internal/modules/setting/service"
	"github.com/foydalanuvchilar-bazasi/backend/internal/platform/middleware"
)

type Module struct {
	handler *handler.Handler
	Service *service.Service
	jwt     config.JWTConfig
}

func NewModule(db *sql.DB, jwtCfg config.JWTConfig, settings *settingService.SettingService, uploadDir string) *Module {
	repo := repository.NewRepository(db)
	svc := service.NewService(repo, settings, uploadDir)
	h := handler.NewHandler(svc)
	return &Module{handler: h, Service: svc, jwt: jwtCfg}
}

func (m *Module) RegisterRoutes(rg *gin.RouterGroup) {
	// Admin: global shablonlar
	adminTpl := rg.Group("/card-templates")
	adminTpl.Use(middleware.AdminAuth(m.jwt.Secret))
	{
		adminTpl.POST("", m.handler.CreateTemplate)
		adminTpl.GET("", m.handler.ListTemplates)
		adminTpl.GET("/:id", m.handler.GetTemplate)
		adminTpl.PUT("/:id", m.handler.UpdateTemplate)
		adminTpl.DELETE("/:id", m.handler.DeleteTemplate)
		adminTpl.GET("/:id/image", m.handler.TemplateImage)
	}

	// Company: shablonlarni ko'rish
	companyTpl := rg.Group("/company/card-templates")
	companyTpl.Use(middleware.CompanyAuth(m.jwt.Secret))
	{
		companyTpl.GET("", m.handler.CompanyListTemplates)
		companyTpl.GET("/:id", m.handler.CompanyGetTemplate)
		companyTpl.GET("/:id/image", m.handler.CompanyTemplateImage)
	}

	// Company: o'z vizitkalari
	cards := rg.Group("/company/cards")
	cards.Use(middleware.CompanyAuth(m.jwt.Secret))
	{
		cards.POST("/from-template", m.handler.CreateFromTemplate)
		cards.POST("", m.handler.CreateCustom)
		cards.GET("", m.handler.ListCards)
		cards.GET("/:id", m.handler.GetCard)
		cards.PUT("/:id", m.handler.UpdateCard)
		cards.DELETE("/:id", m.handler.DeleteCard)
		cards.GET("/:id/image", m.handler.CardImage)
		cards.GET("/:id/preview", m.handler.Preview)
		cards.GET("/:id/qr", m.handler.QR)
		cards.GET("/:id/layout", m.handler.Layout)
		cards.GET("/:id/pdf", m.handler.PDF)
	}

	// Surveyga biriktirish
	surveyCards := rg.Group("/company/surveys")
	surveyCards.Use(middleware.CompanyAuth(m.jwt.Secret))
	{
		surveyCards.GET("/:id/card", m.handler.SurveyCard)
		surveyCards.POST("/:id/card", m.handler.AttachCard)
		surveyCards.DELETE("/:id/card", m.handler.DetachCard)
	}
}
