package api

import (
	"net/http"

	"github.com/studiowebux/mdplanner/internal/domain"
)

// handleGetNotes returns all notes
func (h *Handlers) handleGetNotes(w http.ResponseWriter, r *http.Request) {
	notes, err := h.storage.ReadNotes(r.Context())
	if err != nil {
		WriteError(w, err)
		return
	}
	WriteJSON(w, http.StatusOK, notes)
}

// handleCreateNote creates a new note
func (h *Handlers) handleCreateNote(w http.ResponseWriter, r *http.Request) {
	var note domain.Note
	if err := parseJSON(r, &note); err != nil {
		WriteError(w, NewError(http.StatusBadRequest, "invalid request body"))
		return
	}
	id, err := h.storage.CreateNote(r.Context(), note)
	if err != nil {
		WriteError(w, err)
		return
	}
	WriteCreated(w, id)
}

// handleGetNote returns a single note
func (h *Handlers) handleGetNote(w http.ResponseWriter, r *http.Request) {
	id := getURLParam(r, "id")
	notes, err := h.storage.ReadNotes(r.Context())
	if err != nil {
		WriteError(w, err)
		return
	}
	for _, note := range notes {
		if note.ID == id {
			WriteJSON(w, http.StatusOK, note)
			return
		}
	}
	WriteError(w, NewError(http.StatusNotFound, "note not found"))
}

// handleUpdateNote updates a note
func (h *Handlers) handleUpdateNote(w http.ResponseWriter, r *http.Request) {
	id := getURLParam(r, "id")
	var note domain.Note
	if err := parseJSON(r, &note); err != nil {
		WriteError(w, NewError(http.StatusBadRequest, "invalid request body"))
		return
	}
	if err := h.storage.UpdateNote(r.Context(), id, note); err != nil {
		WriteError(w, err)
		return
	}
	WriteSuccess(w)
}

// handleDeleteNote deletes a note
func (h *Handlers) handleDeleteNote(w http.ResponseWriter, r *http.Request) {
	id := getURLParam(r, "id")
	if err := h.storage.DeleteNote(r.Context(), id); err != nil {
		WriteError(w, err)
		return
	}
	WriteSuccess(w)
}
