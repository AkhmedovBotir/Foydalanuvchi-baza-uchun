package main

import (
	"context"
	"database/sql"
	"fmt"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"sort"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/joho/godotenv"
	swaggerFiles "github.com/swaggo/files"
	ginSwagger "github.com/swaggo/gin-swagger"

	_ "github.com/foydalanuvchilar-bazasi/backend/docs"
	"github.com/foydalanuvchilar-bazasi/backend/internal/config"
	"github.com/foydalanuvchilar-bazasi/backend/internal/modules/admin"
	"github.com/foydalanuvchilar-bazasi/backend/internal/modules/appointment"
	"github.com/foydalanuvchilar-bazasi/backend/internal/modules/card"
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

	printBanner(cfg.App.Name, cfg.App.Env)

	step("Baza", "PostgreSQL ulanish…")
	db, err := database.Connect(cfg.DB)
	if err != nil {
		fail("Baza ulanishda xato: %v", err)
	}
	defer db.Close()
	ok("Baza ga ulandi  (%s@%s:%s/%s)", cfg.DB.User, cfg.DB.Host, cfg.DB.Port, cfg.DB.Name)

	step("Migratsiya", "SQL fayllar tekshirilmoqda…")
	applied, total, err := runMigrations(db)
	if err != nil {
		fail("Migratsiya xatosi: %v", err)
	}
	if applied > 0 {
		ok("Migratsiya  %d yangi / jami %d", applied, total)
	} else {
		ok("Migratsiya  yangilanish yo‘q (jami %d)", total)
	}

	step("Modullar", "admin · company · survey · card · appointment · settings")
	adminModule := admin.NewModule(db, cfg.JWT)
	if err := adminModule.Seed(context.Background()); err != nil {
		fail("Admin seed xatosi: %v", err)
	}

	companyModule := company.NewModule(db, cfg.JWT)
	settingModule := setting.NewModule(db, cfg.JWT)
	uploadStorage := upload.NewStorage(cfg.Upload.Dir, cfg.Upload.PublicBaseURL)
	if err := uploadStorage.EnsureDirs(); err != nil {
		fail("Upload katalogi: %v", err)
	}
	surveyModule := survey.NewModule(db, cfg.JWT, settingModule.Service, uploadStorage)
	cardModule := card.NewModule(db, cfg.JWT, settingModule.Service, cfg.Upload.Dir)
	if err := cardModule.Service.EnsureDirs(); err != nil {
		fail("Card upload katalogi: %v", err)
	}
	appointmentModule := appointment.NewModule(db, cfg.JWT, settingModule.Service)
	ok("Modullar tayyor")

	// Route ro'yxatini logga yozmaslik
	gin.SetMode(gin.ReleaseMode)
	gin.DefaultWriter = io.Discard
	gin.DefaultErrorWriter = os.Stderr
	gin.DebugPrintRouteFunc = func(string, string, string, int) {}

	r := gin.New()
	r.Use(gin.Recovery())
	r.Use(requestLogger())
	r.Use(corsMiddleware())

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
	cardModule.RegisterRoutes(api)
	appointmentModule.RegisterRoutes(api)

	host := cfg.Server.Host
	if host == "0.0.0.0" || host == "" {
		host = "localhost"
	}
	addr := fmt.Sprintf("%s:%s", cfg.Server.Host, cfg.Server.Port)
	publicURL := fmt.Sprintf("http://%s:%s", host, cfg.Server.Port)

	printReady(publicURL, cfg.Server.Port, cfg.App.Env)

	if err := r.Run(addr); err != nil {
		fail("Server xatosi: %v", err)
	}
}

func printBanner(name, env string) {
	line := strings.Repeat("─", 52)
	fmt.Println()
	fmt.Printf("  ┌%s┐\n", line)
	fmt.Printf("  │  %-48s  │\n", name)
	fmt.Printf("  │  %-48s  │\n", "Backend API server")
	fmt.Printf("  │  muhit: %-41s  │\n", env)
	fmt.Printf("  └%s┘\n", line)
	fmt.Println()
}

func printReady(publicURL, port, env string) {
	line := strings.Repeat("─", 52)
	fmt.Println()
	fmt.Printf("  ┌%s┐\n", line)
	fmt.Printf("  │  %-48s  │\n", "✓  Server ishga tushdi")
	fmt.Printf("  │                                              │\n")
	fmt.Printf("  │  API      %-37s  │\n", publicURL)
	fmt.Printf("  │  Health   %-37s  │\n", publicURL+"/health")
	fmt.Printf("  │  Swagger  %-37s  │\n", "http://localhost:"+port+"/swagger/index.html")
	fmt.Printf("  │  Upload   %-37s  │\n", publicURL+"/uploads")
	fmt.Printf("  │                                              │\n")
	fmt.Printf("  │  muhit: %-41s  │\n", env)
	fmt.Printf("  │  to‘xtatish: Ctrl+C                          │\n")
	fmt.Printf("  └%s┘\n", line)
	fmt.Println()
}

func step(title, detail string) {
	fmt.Printf("  ▸  %-12s  %s\n", title, detail)
}

func ok(format string, args ...any) {
	fmt.Printf("  ✓  %s\n", fmt.Sprintf(format, args...))
}

func fail(format string, args ...any) {
	fmt.Printf("  ✗  %s\n", fmt.Sprintf(format, args...))
	os.Exit(1)
}

func corsMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
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
	}
}

// requestLogger — faqat so‘rovlar (method, path, status, vaqt), route ro‘yxatisiz.
func requestLogger() gin.HandlerFunc {
	return func(c *gin.Context) {
		start := time.Now()
		c.Next()

		// swagger static va health shovqinini kamaytirish (ixtiyoriy)
		path := c.Request.URL.Path
		if strings.HasPrefix(path, "/swagger/") && c.Writer.Status() < 400 {
			return
		}

		status := c.Writer.Status()
		method := c.Request.Method
		latency := time.Since(start)
		client := c.ClientIP()

		// Ranglar (Windows terminalda oddiy belgilar ishlaydi)
		mark := "·"
		if status >= 500 {
			mark = "✗"
		} else if status >= 400 {
			mark = "!"
		} else if status >= 200 && status < 300 {
			mark = "✓"
		}

		fmt.Printf("  %s  %s  %-6s  %-40s  %3d  %s\n",
			time.Now().Format("15:04:05"),
			mark,
			method,
			truncate(path, 40),
			status,
			latency.Round(time.Millisecond),
		)
		_ = client
	}
}

func truncate(s string, n int) string {
	if len(s) <= n {
		return s
	}
	return s[:n-1] + "…"
}

// runMigrations yangi qo'llanganlar soni va jami fayl sonini qaytaradi.
func runMigrations(db *sql.DB) (applied, total int, err error) {
	if _, err = db.Exec(`
		CREATE TABLE IF NOT EXISTS app_migrations (
			name TEXT PRIMARY KEY,
			applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
		)`); err != nil {
		return 0, 0, fmt.Errorf("migration jadvalini yaratib bo'lmadi: %w", err)
	}
	files, err := filepath.Glob("migrations/*.up.sql")
	if err != nil {
		return 0, 0, fmt.Errorf("migration fayllarini topib bo'lmadi: %w", err)
	}
	sort.Strings(files)
	total = len(files)

	for _, file := range files {
		name := filepath.Base(file)
		var exists bool
		if err = db.QueryRow(`SELECT EXISTS(SELECT 1 FROM app_migrations WHERE name = $1)`, name).Scan(&exists); err != nil {
			return applied, total, fmt.Errorf("%s holatini tekshirib bo'lmadi: %w", name, err)
		}
		if exists {
			continue
		}
		sqlBytes, err := os.ReadFile(file)
		if err != nil {
			return applied, total, fmt.Errorf("%s o'qib bo'lmadi: %w", file, err)
		}
		tx, err := db.Begin()
		if err != nil {
			return applied, total, fmt.Errorf("%s transaction ochilmadi: %w", name, err)
		}
		if _, err := tx.Exec(string(sqlBytes)); err != nil {
			_ = tx.Rollback()
			return applied, total, fmt.Errorf("%s bajarilmadi: %w", file, err)
		}
		if _, err := tx.Exec(`INSERT INTO app_migrations (name) VALUES ($1)`, name); err != nil {
			_ = tx.Rollback()
			return applied, total, fmt.Errorf("%s qayd qilinmadi: %w", name, err)
		}
		if err := tx.Commit(); err != nil {
			return applied, total, fmt.Errorf("%s tasdiqlanmadi: %w", name, err)
		}
		fmt.Printf("     +  %s\n", name)
		applied++
	}

	if total == 0 {
		return 0, 0, fmt.Errorf("migrations papkasida *.up.sql topilmadi")
	}
	return applied, total, nil
}
