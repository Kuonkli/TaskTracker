package exceptions

import (
	"context"
	"errors"
	"net/http"
	"strings"
	"time"

	"github.com/go-playground/validator/v10"
	"gorm.io/gorm"
)

// APIError представляет ошибку API
type APIError struct {
	Status    int         `json:"status"`
	Error     string      `json:"error"`
	Message   string      `json:"message"`
	Code      string      `json:"code"`
	Timestamp time.Time   `json:"timestamp"`
	Details   interface{} `json:"details,omitempty"`
}

// NewApiError - ЕДИНСТВЕННАЯ функция, которая обрабатывает ЛЮБЫЕ ошибки
func NewApiError(err error) (int, *APIError) {
	if err == nil {
		return 0, nil
	}

	// 2. Проверяем на DomainError (наши кастомные ошибки)
	var domainErr *DomainError
	if errors.As(err, &domainErr) {
		e := &APIError{
			Status:    domainErr.Status,
			Error:     http.StatusText(domainErr.Status),
			Message:   domainErr.Error(),
			Code:      domainErr.Code,
			Timestamp: time.Now(),
			Details:   domainErr.Error(),
		}
		return e.Status, e
	}

	// 3. Ошибки валидации от gin/validator
	var validationErrs validator.ValidationErrors
	if errors.As(err, &validationErrs) {
		e := handleValidationError(validationErrs)
		return e.Status, e
	}

	// 4. GORM ошибки
	if errors.Is(err, gorm.ErrRecordNotFound) {
		e := &APIError{
			Status:    http.StatusNotFound,
			Error:     "Not Found",
			Message:   "Record not found",
			Code:      "record_not_found",
			Timestamp: time.Now(),
			Details:   "Record not found",
		}
		return e.Status, e
	}

	// 5. PostgreSQL ошибки по тексту
	errMsg := err.Error()
	switch {
	case strings.Contains(errMsg, "duplicate key") || strings.Contains(errMsg, "UNIQUE constraint"):
		e := &APIError{
			Status:    http.StatusConflict,
			Error:     "Conflict",
			Message:   "Duplicate entry",
			Code:      "duplicate_entry",
			Timestamp: time.Now(),
			Details:   errMsg,
		}
		return e.Status, e

	case strings.Contains(errMsg, "foreign key constraint"):
		e := &APIError{
			Status:    http.StatusBadRequest,
			Error:     "Bad Request",
			Message:   "Referenced resource does not exist",
			Code:      "foreign_key_violation",
			Timestamp: time.Now(),
			Details:   errMsg,
		}
		return e.Status, e

	case strings.Contains(errMsg, "connection refused") ||
		strings.Contains(errMsg, "timeout"):
		e := &APIError{
			Status:    http.StatusServiceUnavailable,
			Error:     "Service Unavailable",
			Message:   "Database connection error",
			Code:      "database_connection_error",
			Timestamp: time.Now(),
			Details:   errMsg,
		}
		return e.Status, e
	}

	// 6. Ошибки контекста
	switch {
	case errors.Is(err, context.DeadlineExceeded):
		e := &APIError{
			Status:    http.StatusGatewayTimeout,
			Error:     "Gateway Timeout",
			Message:   "Request timeout",
			Code:      "request_timeout",
			Timestamp: time.Now(),
			Details:   errMsg,
		}
		return e.Status, e
	case errors.Is(err, context.Canceled):
		e := &APIError{
			Status:    http.StatusBadRequest,
			Error:     "Bad Request",
			Message:   "Request cancelled",
			Code:      "request_cancelled",
			Timestamp: time.Now(),
			Details:   errMsg,
		}
		return e.Status, e
	}

	// 7. JSON ошибки
	if strings.Contains(errMsg, "json") || strings.Contains(errMsg, "unmarshal") {
		e := &APIError{
			Status:    http.StatusBadRequest,
			Error:     "Bad Request",
			Message:   "Invalid JSON format",
			Code:      "invalid_json",
			Timestamp: time.Now(),
			Details:   errMsg,
		}
		return e.Status, e
	}

	if strings.Contains(errMsg, "http: named cookie not present") {
		e := &APIError{
			Status:    http.StatusUnauthorized,
			Error:     "Unauthorized",
			Message:   "Authentication Failed",
			Code:      "authentication_failed",
			Timestamp: time.Now(),
			Details:   errMsg,
		}
		return e.Status, e
	}

	// 8. Все остальное - Internal Server Error
	e := &APIError{
		Status:    http.StatusInternalServerError,
		Error:     "Internal Server Error",
		Message:   "An internal server error occurred",
		Code:      "internal_server_error",
		Timestamp: time.Now(),
		Details:   errMsg,
	}
	return e.Status, e
}

func handleValidationError(validationErrs validator.ValidationErrors) *APIError {
	details := make(map[string]string)
	for _, ve := range validationErrs {
		details[ve.Field()] = getValidationMessage(ve)
	}

	return &APIError{
		Status:    http.StatusBadRequest,
		Error:     "Validation Error",
		Message:   "Request validation failed",
		Code:      "validation_failed",
		Timestamp: time.Now(),
		Details:   details,
	}
}

func getValidationMessage(ve validator.FieldError) string {
	switch ve.Tag() {
	case "required":
		return "This field is required"
	case "max":
		return "Maximum length is " + ve.Param() + " characters"
	case "min":
		return "Minimum length is " + ve.Param() + " characters"
	case "email":
		return "Invalid email format"
	case "oneof":
		return "Must be one of: " + ve.Param()
	case "uuid":
		return "Invalid UUID format"
	default:
		return "Invalid value"
	}
}

func (e *APIError) ToResponse() *APIError {
	e.Timestamp = time.Now()
	return e
}
