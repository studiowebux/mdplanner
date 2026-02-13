package api

import (
	"encoding/json"
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/studiowebux/mdplanner/internal/storage"
)

// Handlers holds all API handlers with storage dependency
type Handlers struct {
	storage storage.Storage
}

// NewHandlers creates a new Handlers instance
func NewHandlers(s storage.Storage) *Handlers {
	return &Handlers{storage: s}
}

// parseJSON decodes JSON request body into v
func parseJSON(r *http.Request, v any) error {
	return json.NewDecoder(r.Body).Decode(v)
}

// getURLParam extracts a URL parameter
func getURLParam(r *http.Request, key string) string {
	return chi.URLParam(r, key)
}
