package middleware

import (
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"

	"github.com/foydalanuvchilar-bazasi/backend/internal/platform/response"
)

const (
	ContextAdminID         = "admin_id"
	ContextAdminUsername   = "admin_username"
	ContextCompanyID       = "company_id"
	ContextCompanyUsername = "company_username"
	ContextRole            = "role"

	// Legacy alias — mavjud admin handlerlar uchun
	ContextUsername = ContextAdminUsername
)

func AdminAuth(jwtSecret string) gin.HandlerFunc {
	return roleAuth(jwtSecret, []string{"admin"})
}

func CompanyAuth(jwtSecret string) gin.HandlerFunc {
	return roleAuth(jwtSecret, []string{"company"})
}

func AdminOrCompanyAuth(jwtSecret string) gin.HandlerFunc {
	return roleAuth(jwtSecret, []string{"admin", "company"})
}

func roleAuth(jwtSecret string, allowedRoles []string) gin.HandlerFunc {
	allowed := make(map[string]struct{}, len(allowedRoles))
	for _, r := range allowedRoles {
		allowed[r] = struct{}{}
	}

	return func(c *gin.Context) {
		header := c.GetHeader("Authorization")
		if header == "" {
			response.Unauthorized(c, "Authorization header majburiy")
			c.Abort()
			return
		}

		parts := strings.SplitN(header, " ", 2)
		if len(parts) != 2 || !strings.EqualFold(parts[0], "Bearer") || parts[1] == "" {
			response.Unauthorized(c, "Token formati: Bearer <token>")
			c.Abort()
			return
		}

		token, err := jwt.Parse(parts[1], func(t *jwt.Token) (interface{}, error) {
			if _, ok := t.Method.(*jwt.SigningMethodHMAC); !ok {
				return nil, jwt.ErrSignatureInvalid
			}
			return []byte(jwtSecret), nil
		})
		if err != nil || !token.Valid {
			response.Unauthorized(c, "Token yaroqsiz yoki muddati o'tgan")
			c.Abort()
			return
		}

		claims, ok := token.Claims.(jwt.MapClaims)
		if !ok {
			response.Unauthorized(c, "Token claims o'qilmadi")
			c.Abort()
			return
		}

		role, _ := claims["role"].(string)
		if _, ok := allowed[role]; !ok {
			response.Unauthorized(c, "Bu amal uchun ruxsat yo'q")
			c.Abort()
			return
		}

		id, _ := claims["sub"].(string)
		username, _ := claims["username"].(string)
		if id == "" {
			response.Unauthorized(c, "Token ichida ID yo'q")
			c.Abort()
			return
		}

		c.Set(ContextRole, role)
		switch role {
		case "admin":
			c.Set(ContextAdminID, id)
			c.Set(ContextAdminUsername, username)
		case "company":
			c.Set(ContextCompanyID, id)
			c.Set(ContextCompanyUsername, username)
		}
		c.Next()
	}
}
