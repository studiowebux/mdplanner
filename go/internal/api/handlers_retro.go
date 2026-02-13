package api

import (
	"net/http"

	"github.com/studiowebux/mdplanner/internal/domain"
)

func (h *Handlers) handleGetRetrospectives(w http.ResponseWriter, r *http.Request) {
	retros, err := h.storage.ReadRetrospectives(r.Context())
	if err != nil {
		WriteError(w, err)
		return
	}
	WriteJSON(w, http.StatusOK, retros)
}

func (h *Handlers) handleCreateRetrospective(w http.ResponseWriter, r *http.Request) {
	var retro domain.Retrospective
	if err := parseJSON(r, &retro); err != nil {
		WriteError(w, NewError(http.StatusBadRequest, "invalid request body"))
		return
	}
	id, err := h.storage.CreateRetrospective(r.Context(), retro)
	if err != nil {
		WriteError(w, err)
		return
	}
	WriteCreated(w, id)
}

func (h *Handlers) handleUpdateRetrospective(w http.ResponseWriter, r *http.Request) {
	id := getURLParam(r, "id")
	var retro domain.Retrospective
	if err := parseJSON(r, &retro); err != nil {
		WriteError(w, NewError(http.StatusBadRequest, "invalid request body"))
		return
	}
	if err := h.storage.UpdateRetrospective(r.Context(), id, retro); err != nil {
		WriteError(w, err)
		return
	}
	WriteSuccess(w)
}

func (h *Handlers) handleDeleteRetrospective(w http.ResponseWriter, r *http.Request) {
	id := getURLParam(r, "id")
	if err := h.storage.DeleteRetrospective(r.Context(), id); err != nil {
		WriteError(w, err)
		return
	}
	WriteSuccess(w)
}
