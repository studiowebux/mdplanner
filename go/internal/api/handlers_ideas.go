package api

import (
	"net/http"

	"github.com/studiowebux/mdplanner/internal/domain"
)

func (h *Handlers) handleGetIdeas(w http.ResponseWriter, r *http.Request) {
	ideas, err := h.storage.ReadIdeasWithBacklinks(r.Context())
	if err != nil {
		WriteError(w, err)
		return
	}
	WriteJSON(w, http.StatusOK, ideas)
}

func (h *Handlers) handleCreateIdea(w http.ResponseWriter, r *http.Request) {
	var idea domain.Idea
	if err := parseJSON(r, &idea); err != nil {
		WriteError(w, NewError(http.StatusBadRequest, "invalid request body"))
		return
	}
	id, err := h.storage.CreateIdea(r.Context(), idea)
	if err != nil {
		WriteError(w, err)
		return
	}
	WriteCreated(w, id)
}

func (h *Handlers) handleUpdateIdea(w http.ResponseWriter, r *http.Request) {
	id := getURLParam(r, "id")
	var idea domain.Idea
	if err := parseJSON(r, &idea); err != nil {
		WriteError(w, NewError(http.StatusBadRequest, "invalid request body"))
		return
	}
	if err := h.storage.UpdateIdea(r.Context(), id, idea); err != nil {
		WriteError(w, err)
		return
	}
	WriteSuccess(w)
}

func (h *Handlers) handleDeleteIdea(w http.ResponseWriter, r *http.Request) {
	id := getURLParam(r, "id")
	if err := h.storage.DeleteIdea(r.Context(), id); err != nil {
		WriteError(w, err)
		return
	}
	WriteSuccess(w)
}
