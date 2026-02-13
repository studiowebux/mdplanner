package api

import (
	"net/http"

	"github.com/studiowebux/mdplanner/internal/domain"
)

func (h *Handlers) handleGetMilestones(w http.ResponseWriter, r *http.Request) {
	milestones, err := h.storage.ReadMilestones(r.Context())
	if err != nil {
		WriteError(w, err)
		return
	}
	WriteJSON(w, http.StatusOK, milestones)
}

func (h *Handlers) handleCreateMilestone(w http.ResponseWriter, r *http.Request) {
	var milestone domain.Milestone
	if err := parseJSON(r, &milestone); err != nil {
		WriteError(w, NewError(http.StatusBadRequest, "invalid request body"))
		return
	}
	id, err := h.storage.CreateMilestone(r.Context(), milestone)
	if err != nil {
		WriteError(w, err)
		return
	}
	WriteCreated(w, id)
}

func (h *Handlers) handleUpdateMilestone(w http.ResponseWriter, r *http.Request) {
	id := getURLParam(r, "id")
	var milestone domain.Milestone
	if err := parseJSON(r, &milestone); err != nil {
		WriteError(w, NewError(http.StatusBadRequest, "invalid request body"))
		return
	}
	if err := h.storage.UpdateMilestone(r.Context(), id, milestone); err != nil {
		WriteError(w, err)
		return
	}
	WriteSuccess(w)
}

func (h *Handlers) handleDeleteMilestone(w http.ResponseWriter, r *http.Request) {
	id := getURLParam(r, "id")
	if err := h.storage.DeleteMilestone(r.Context(), id); err != nil {
		WriteError(w, err)
		return
	}
	WriteSuccess(w)
}
