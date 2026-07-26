package config

import (
	"fmt"
	"os"
	"strconv"
	"time"
)

type Config struct {
	App    AppConfig
	DB     DBConfig
	JWT    JWTConfig
	Server ServerConfig
	Upload UploadConfig
}

type AppConfig struct {
	Name string
	Env  string
}

type ServerConfig struct {
	Host string
	Port string
}

type DBConfig struct {
	Host     string
	Port     string
	User     string
	Password string
	Name     string
	SSLMode  string
}

type JWTConfig struct {
	Secret     string
	ExpireHour int
}

type UploadConfig struct {
	Dir           string
	PublicBaseURL string
}

func (d DBConfig) DSN() string {
	return fmt.Sprintf(
		"host=%s port=%s user=%s password=%s dbname=%s sslmode=%s",
		d.Host, d.Port, d.User, d.Password, d.Name, d.SSLMode,
	)
}

func (j JWTConfig) ExpireDuration() time.Duration {
	return time.Duration(j.ExpireHour) * time.Hour
}

func Load() *Config {
	return &Config{
		App: AppConfig{
			Name: getEnv("APP_NAME", "foydalanuvchilar-bazasi"),
			Env:  getEnv("APP_ENV", "development"),
		},
		Server: ServerConfig{
			Host: getEnv("SERVER_HOST", "0.0.0.0"),
			Port: getEnv("SERVER_PORT", "8080"),
		},
		DB: DBConfig{
			Host:     getEnv("DB_HOST", "localhost"),
			Port:     getEnv("DB_PORT", "5432"),
			User:     getEnv("DB_USER", "postgres"),
			Password: getEnv("DB_PASSWORD", "postgres"),
			Name:     getEnv("DB_NAME", "foydalanuvchilar_bazasi"),
			SSLMode:  getEnv("DB_SSLMODE", "disable"),
		},
		JWT: JWTConfig{
			Secret:     getEnv("JWT_SECRET", "change-me-in-production-secret-key"),
			ExpireHour: getEnvAsInt("JWT_EXPIRE_HOUR", 24),
		},
		Upload: UploadConfig{
			Dir:           getEnv("UPLOAD_DIR", "./uploads"),
			PublicBaseURL: getEnv("PUBLIC_BASE_URL", "http://localhost:8080"),
		},
	}
}

func getEnv(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}

func getEnvAsInt(key string, fallback int) int {
	if v := os.Getenv(key); v != "" {
		if n, err := strconv.Atoi(v); err == nil {
			return n
		}
	}
	return fallback
}
