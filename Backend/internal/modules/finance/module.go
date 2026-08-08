package finance

import (
	"database/sql"

	"github.com/gin-gonic/gin"

	"github.com/foydalanuvchilar-bazasi/backend/internal/config"
	"github.com/foydalanuvchilar-bazasi/backend/internal/modules/finance/handler"
	"github.com/foydalanuvchilar-bazasi/backend/internal/modules/finance/repository"
	"github.com/foydalanuvchilar-bazasi/backend/internal/modules/finance/service"
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

func (m *Module) RegisterRoutes(rg *gin.RouterGroup) {
	g := rg.Group("/company/finance")
	g.Use(middleware.CompanyAuth(m.jwt.Secret))
	{
		g.GET("/summary", m.handler.Summary)

		g.GET("/schemes", m.handler.ListSchemes)
		g.POST("/schemes", m.handler.CreateScheme)
		g.GET("/schemes/:id", m.handler.GetScheme)
		g.PUT("/schemes/:id", m.handler.UpdateScheme)
		g.DELETE("/schemes/:id", m.handler.DeleteScheme)

		g.GET("/incomes", m.handler.ListIncomes)
		g.GET("/allocations", m.handler.ListAllocations)
		g.POST("/allocations/pay-batch", m.handler.PayBatch)
		g.POST("/allocations/:id/pay", m.handler.PayAllocation)
	}
}
