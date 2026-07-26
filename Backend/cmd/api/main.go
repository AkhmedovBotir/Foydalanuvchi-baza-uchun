package main

import (
	"context"
	"database/sql"
	"fmt"
	"log"
	"net/http"
	"os"
	"path/filepath"
	"sort"

	"github.com/gin-gonic/gin"
	"github.com/joho/godotenv"
	swaggerFiles "github.com/swaggo/files"
	ginSwagger "github.com/swaggo/gin-swagger"

	_ "github.com/foydalanuvchilar-bazasi/backend/docs"
	"github.com/foydalanuvchilar-bazasi/backend/internal/config"
	"github.com/foydalanuvchilar-bazasi/backend/internal/modules/admin"
	"github.com/foydalanuvchilar-bazasi/backend/internal/modules/company"
	"github.com/foydalanuvchilar-bazasi/backend/internal/modules/setting"
	"github.com/foydalanuvchilar-bazasi/backend/internal/modules/survey"
	"github.com/foydalanuvchilar-bazasi/backend/internal/platform/database"
	"github.com/foydalanuvchilar-bazasi/backend/internal/platform/response"
	"github.com/foydalanuvchilar-bazasi/backend/internal/platform/upload"
)

// @title           Foydalanuvchilar bazasi API
// @version         1.0
// @description     Modular monolit backend. Admin, Company, Survey va Settings modullari.
// @termsOfService  http://swagger.io/terms/

// @contact.name   API Support
// @contact.email  support@example.com

// @license.name  MIT

// @host      localhost:8080
// @BasePath  /api/v1

// @securityDefinitions.apikey BearerAuth
// @in header
// @name Authorization
// @description JWT token. Format: Bearer {token}
func main() {
	_ = godotenv.Load()

	cfg := config.Load()

	db, err := database.Connect(cfg.DB)
	if err != nil {
		log.Fatalf("database ulanishda xato: %v", err)
	}
	defer db.Close()

	if err := runMigrations(db); err != nil {
		log.Fatalf("migratsiya xatosi: %v", err)
	}

	adminModule := admin.NewModule(db, cfg.JWT)
	if err := adminModule.Seed(context.Background()); err != nil {
		log.Fatalf("admin seed xatosi: %v", err)
	}

	companyModule := company.NewModule(db, cfg.JWT)
	settingModule := setting.NewModule(db, cfg.JWT)
	uploadStorage := upload.NewStorage(cfg.Upload.Dir, cfg.Upload.PublicBaseURL)
	if err := uploadStorage.EnsureDirs(); err != nil {
		log.Fatalf("upload katalogini yaratib bo'lmadi: %v", err)
	}
	surveyModule := survey.NewModule(db, cfg.JWT, settingModule.Service, uploadStorage)

	if cfg.App.Env == "production" {
		gin.SetMode(gin.ReleaseMode)
	}

	r := gin.Default()

	r.Use(func(c *gin.Context) {
		origin := c.GetHeader("Origin")
		if origin == "" {
			origin = "*"
		}
		c.Header("Access-Control-Allow-Origin", origin)
		c.Header("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS")
		c.Header("Access-Control-Allow-Headers", "Origin, Content-Type, Accept, Authorization")
		c.Header("Access-Control-Allow-Credentials", "true")
		if c.Request.Method == http.MethodOptions {
			c.AbortWithStatus(http.StatusNoContent)
			return
		}
		c.Next()
	})

	r.GET("/health", func(c *gin.Context) {
		response.OK(c, "OK", gin.H{"status": "healthy"})
	})

	r.GET("/swagger/*any", ginSwagger.WrapHandler(swaggerFiles.Handler))
	r.Static("/uploads", cfg.Upload.Dir)

	api := r.Group("/api/v1")
	adminModule.RegisterRoutes(api)
	companyModule.RegisterRoutes(api)
	settingModule.RegisterRoutes(api)
	surveyModule.RegisterRoutes(api)

	addr := fmt.Sprintf("%s:%s", cfg.Server.Host, cfg.Server.Port)
	log.Printf("%s ishga tushdi: http://%s", cfg.App.Name, addr)
	log.Printf("Swagger UI: http://localhost:%s/swagger/index.html", cfg.Server.Port)

	if err := r.Run(addr); err != nil {
		log.Fatalf("server xatosi: %v", err)
	}
}

func runMigrations(db *sql.DB) error {
	if _, err := db.Exec(`
		CREATE TABLE IF NOT EXISTS app_migrations (
			name TEXT PRIMARY KEY,
			applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
		)`); err != nil {
		return fmt.Errorf("migration jadvalini yaratib bo'lmadi: %w", err)
	}
	files, err := filepath.Glob("migrations/*.up.sql")
	if err != nil {
		return fmt.Errorf("migration fayllarini topib bo'lmadi: %w", err)
	}
	sort.Strings(files)

	for _, file := range files {
		name := filepath.Base(file)
		var applied bool
		if err := db.QueryRow(`SELECT EXISTS(SELECT 1 FROM app_migrations WHERE name = $1)`, name).Scan(&applied); err != nil {
			return fmt.Errorf("%s holatini tekshirib bo'lmadi: %w", name, err)
		}
		if applied {
			continue
		}
		sqlBytes, err := os.ReadFile(file)
		if err != nil {
			return fmt.Errorf("%s o'qib bo'lmadi: %w", file, err)
		}
		tx, err := db.Begin()
		if err != nil {
			return fmt.Errorf("%s transaction ochilmadi: %w", name, err)
		}
		if _, err := tx.Exec(string(sqlBytes)); err != nil {
			_ = tx.Rollback()
			return fmt.Errorf("%s bajarilmadi: %w", file, err)
		}
		if _, err := tx.Exec(`INSERT INTO app_migrations (name) VALUES ($1)`, name); err != nil {
			_ = tx.Rollback()
			return fmt.Errorf("%s qayd qilinmadi: %w", name, err)
		}
		if err := tx.Commit(); err != nil {
			return fmt.Errorf("%s tasdiqlanmadi: %w", name, err)
		}
		log.Printf("migratsiya: %s", name)
	}

	if len(files) == 0 {
		return fmt.Errorf("migrations papkasida *.up.sql topilmadi")
	}

	log.Printf("migratsiyalar muvaffaqiyatli (%d ta)", len(files))
	return nil
}
