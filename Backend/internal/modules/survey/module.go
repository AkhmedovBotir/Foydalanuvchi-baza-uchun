package survey

import (
	"database/sql"

	"github.com/gin-gonic/gin"

	"github.com/foydalanuvchilar-bazasi/backend/internal/config"
	settingService "github.com/foydalanuvchilar-bazasi/backend/internal/modules/setting/service"
	"github.com/foydalanuvchilar-bazasi/backend/internal/modules/survey/handler"
	"github.com/foydalanuvchilar-bazasi/backend/internal/modules/survey/repository"
	"github.com/foydalanuvchilar-bazasi/backend/internal/modules/survey/service"
	"github.com/foydalanuvchilar-bazasi/backend/internal/platform/middleware"
	"github.com/foydalanuvchilar-bazasi/backend/internal/platform/upload"
)

type Module struct {
	handler       *handler.SurveyHandler
	publicHandler *handler.PublicSurveyHandler
	jwt           config.JWTConfig
}

func NewModule(db *sql.DB, jwtCfg config.JWTConfig, settings *settingService.SettingService, storage *upload.Storage) *Module {
	repo := repository.NewSurveyRepository(db)
	svc := service.NewSurveyService(repo, settings, storage)
	h := handler.NewSurveyHandler(svc)
	return &Module{handler: h, publicHandler: handler.NewPublicSurveyHandler(svc), jwt: jwtCfg}
}

func (m *Module) RegisterRoutes(rg *gin.RouterGroup) {
	// Tokensiz forma API (respondent)
	forms := rg.Group("/forms")
	{
		forms.GET("/:slug", m.publicHandler.FormGet)
		forms.POST("/:slug", m.publicHandler.FormSubmit)
		forms.POST("/:slug/upload", m.publicHandler.Upload)
	}

	public := rg.Group("/surveys")
	{
		public.GET("", m.publicHandler.List)
		public.GET("/:id", m.publicHandler.Get)
		public.POST("/:id/responses", m.publicHandler.Submit)
		public.POST("/:id/upload", m.publicHandler.Upload)
	}
	surveys := rg.Group("/company/surveys")
	surveys.Use(middleware.CompanyAuth(m.jwt.Secret))
	{
		surveys.GET("/file-formats", m.handler.ListFileFormats)
		surveys.GET("/responses", m.handler.ListResponses)
		surveys.GET("/responses/:responseId", m.handler.GetResponse)
		surveys.DELETE("/responses/:responseId", m.handler.DeleteResponse)
		surveys.POST("", m.handler.CreateSurvey)
		surveys.GET("", m.handler.ListSurveys)
		surveys.GET("/:id", m.handler.GetSurvey)
		surveys.PUT("/:id", m.handler.UpdateSurvey)
		surveys.DELETE("/:id", m.handler.DeleteSurvey)
		surveys.POST("/:id/publish", m.handler.Publish)
		surveys.POST("/:id/close", m.handler.Close)
		surveys.GET("/:id/responses", m.handler.ListSurveyResponses)
		surveys.GET("/:id/responses/summary", m.handler.Summary)
	}
}
