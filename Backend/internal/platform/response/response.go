package response

import (
	"net/http"

	"github.com/gin-gonic/gin"
)

type SuccessBody struct {
	Success bool        `json:"success"`
	Message string      `json:"message,omitempty"`
	Data    interface{} `json:"data,omitempty"`
}

type ErrorBody struct {
	Success bool   `json:"success"`
	Message string `json:"message"`
	Error   string `json:"error,omitempty"`
}

func OK(c *gin.Context, message string, data interface{}) {
	c.JSON(http.StatusOK, SuccessBody{
		Success: true,
		Message: message,
		Data:    data,
	})
}

func Created(c *gin.Context, message string, data interface{}) {
	c.JSON(http.StatusCreated, SuccessBody{
		Success: true,
		Message: message,
		Data:    data,
	})
}

func Fail(c *gin.Context, status int, message string, errDetail string) {
	c.JSON(status, ErrorBody{
		Success: false,
		Message: message,
		Error:   errDetail,
	})
}

func BadRequest(c *gin.Context, message string, errDetail string) {
	Fail(c, http.StatusBadRequest, message, errDetail)
}

func Unauthorized(c *gin.Context, message string) {
	Fail(c, http.StatusUnauthorized, message, "")
}

func NotFound(c *gin.Context, message string) {
	Fail(c, http.StatusNotFound, message, "")
}

func Conflict(c *gin.Context, message string) {
	Fail(c, http.StatusConflict, message, "")
}

func Internal(c *gin.Context, message string) {
	Fail(c, http.StatusInternalServerError, message, "")
}
