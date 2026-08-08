package referral

import (
	"context"
	"database/sql"

	"github.com/gin-gonic/gin"

	"github.com/foydalanuvchilar-bazasi/backend/internal/config"
	"github.com/foydalanuvchilar-bazasi/backend/internal/modules/referral/handler"
	"github.com/foydalanuvchilar-bazasi/backend/internal/modules/referral/repository"
	"github.com/foydalanuvchilar-bazasi/backend/internal/modules/referral/service"
	"github.com/foydalanuvchilar-bazasi/backend/internal/platform/middleware"
)

type Settings interface {
	GetSurveyLinkBaseURL(ctx context.Context) (string, error)
}

type Module struct {
	handler *handler.Handler
	jwt     config.JWTConfig
	Repo    *repository.Repository
}

func NewModule(db *sql.DB, jwtCfg config.JWTConfig, settings Settings) *Module {
	repo := repository.NewRepository(db)
	svc := service.NewService(repo, settings)
	return &Module{
		handler: handler.NewHandler(svc),
		jwt:     jwtCfg,
		Repo:    repo,
	}
}

func (m *Module) RegisterRoutes(rg *gin.RouterGroup) {
	g := rg.Group("/company/referrals")
	g.Use(middleware.CompanyAuth(m.jwt.Secret))
	{
		g.POST("", m.handler.Create)
		g.GET("", m.handler.List)
		g.GET("/:id", m.handler.Get)
		g.PUT("/:id", m.handler.Update)
		g.DELETE("/:id", m.handler.Delete)
		g.POST("/:id/card", m.handler.AttachCard)
		g.DELETE("/:id/card", m.handler.DetachCard)
	}
}
