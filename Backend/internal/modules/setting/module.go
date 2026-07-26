package setting

import (
	"database/sql"

	"github.com/gin-gonic/gin"

	"github.com/foydalanuvchilar-bazasi/backend/internal/config"
	"github.com/foydalanuvchilar-bazasi/backend/internal/modules/setting/handler"
	"github.com/foydalanuvchilar-bazasi/backend/internal/modules/setting/repository"
	"github.com/foydalanuvchilar-bazasi/backend/internal/modules/setting/service"
	"github.com/foydalanuvchilar-bazasi/backend/internal/platform/middleware"
)

type Module struct {
	handler *handler.SettingHandler
	Service *service.SettingService
	jwt     config.JWTConfig
}

func NewModule(db *sql.DB, jwtCfg config.JWTConfig) *Module {
	repo := repository.NewSettingRepository(db)
	svc := service.NewSettingService(repo)
	h := handler.NewSettingHandler(svc)
	return &Module{handler: h, Service: svc, jwt: jwtCfg}
}

func (m *Module) RegisterRoutes(rg *gin.RouterGroup) {
	settings := rg.Group("/settings")
	{
		// O'qish: admin va company
		read := settings.Group("")
		read.Use(middleware.AdminOrCompanyAuth(m.jwt.Secret))
		{
			read.GET("/survey-link-base", m.handler.GetSurveyLinkBase)
		}

		// Yangilash: faqat admin
		write := settings.Group("")
		write.Use(middleware.AdminAuth(m.jwt.Secret))
		{
			write.PUT("/survey-link-base", m.handler.UpdateSurveyLinkBase)
		}
	}
}
