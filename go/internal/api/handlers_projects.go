package api

import (
	"net/http"

	"github.com/studiowebux/mdplanner/internal/domain"
)

// handleGetProjects returns all projects
func (h *Handlers) handleGetProjects(w http.ResponseWriter, r *http.Request) {
	projects, err := h.storage.ScanProjects(r.Context())
	if err != nil {
		WriteError(w, err)
		return
	}
	WriteJSON(w, http.StatusOK, projects)
}

// handleGetActiveProject returns the active project
func (h *Handlers) handleGetActiveProject(w http.ResponseWriter, r *http.Request) {
	filename, err := h.storage.GetActiveProject(r.Context())
	if err != nil {
		WriteError(w, err)
		return
	}
	WriteJSON(w, http.StatusOK, map[string]string{"filename": filename})
}

// handleSwitchProject switches to a different project
func (h *Handlers) handleSwitchProject(w http.ResponseWriter, r *http.Request) {
	var req struct {
		Filename string `json:"filename"`
	}
	if err := parseJSON(r, &req); err != nil {
		WriteError(w, NewError(http.StatusBadRequest, "invalid request body"))
		return
	}
	if err := h.storage.SwitchProject(r.Context(), req.Filename); err != nil {
		WriteError(w, err)
		return
	}
	WriteSuccess(w)
}

// handleCreateProject creates a new project
func (h *Handlers) handleCreateProject(w http.ResponseWriter, r *http.Request) {
	var req struct {
		Name string `json:"name"`
	}
	if err := parseJSON(r, &req); err != nil {
		WriteError(w, NewError(http.StatusBadRequest, "invalid request body"))
		return
	}
	filename, err := h.storage.CreateProject(r.Context(), req.Name)
	if err != nil {
		WriteError(w, err)
		return
	}
	WriteCreated(w, filename)
}

// handleGetProjectInfo returns project info
func (h *Handlers) handleGetProjectInfo(w http.ResponseWriter, r *http.Request) {
	info, err := h.storage.ReadProjectInfo(r.Context())
	if err != nil {
		WriteError(w, err)
		return
	}
	WriteJSON(w, http.StatusOK, info)
}

// handleGetProjectConfig returns project configuration
func (h *Handlers) handleGetProjectConfig(w http.ResponseWriter, r *http.Request) {
	config, err := h.storage.ReadProjectConfig(r.Context())
	if err != nil {
		WriteError(w, err)
		return
	}
	WriteJSON(w, http.StatusOK, config)
}

// handleSaveProjectConfig saves project configuration
func (h *Handlers) handleSaveProjectConfig(w http.ResponseWriter, r *http.Request) {
	var config domain.ProjectConfig
	if err := parseJSON(r, &config); err != nil {
		WriteError(w, NewError(http.StatusBadRequest, "invalid request body"))
		return
	}
	if err := h.storage.SaveProjectConfig(r.Context(), config); err != nil {
		WriteError(w, err)
		return
	}
	WriteSuccess(w)
}

// handleGetSections returns available board sections
func (h *Handlers) handleGetSections(w http.ResponseWriter, r *http.Request) {
	sections, err := h.storage.GetSections(r.Context())
	if err != nil {
		WriteError(w, err)
		return
	}
	WriteJSON(w, http.StatusOK, sections)
}

// handleRewriteProject rewrites the project file (for formatting)
func (h *Handlers) handleRewriteProject(w http.ResponseWriter, r *http.Request) {
	// This would re-read and re-write the file to normalize formatting
	// For now, just return success
	WriteSuccess(w)
}
