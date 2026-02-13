package api

import (
	"encoding/json"
	"net/http"
)

// APIError represents an API error response
type APIError struct {
	Code    int    `json:"-"`
	Message string `json:"error"`
}

func (e APIError) Error() string {
	return e.Message
}

// Common errors
var (
	ErrNotFound       = APIError{Code: http.StatusNotFound, Message: "Not found"}
	ErrBadRequest     = APIError{Code: http.StatusBadRequest, Message: "Bad request"}
	ErrInternalServer = APIError{Code: http.StatusInternalServerError, Message: "Internal server error"}
)

// NewError creates a new API error with custom message
func NewError(code int, message string) APIError {
	return APIError{Code: code, Message: message}
}

// WriteError writes an error response
func WriteError(w http.ResponseWriter, err error) {
	var apiErr APIError
	if e, ok := err.(APIError); ok {
		apiErr = e
	} else {
		apiErr = ErrInternalServer
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(apiErr.Code)
	json.NewEncoder(w).Encode(apiErr)
}

// WriteJSON writes a JSON response
func WriteJSON(w http.ResponseWriter, status int, data any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(data)
}

// WriteSuccess writes a simple success response
func WriteSuccess(w http.ResponseWriter) {
	WriteJSON(w, http.StatusOK, map[string]bool{"success": true})
}

// WriteCreated writes a created response with ID
func WriteCreated(w http.ResponseWriter, id string) {
	WriteJSON(w, http.StatusCreated, map[string]any{"success": true, "id": id})
}
