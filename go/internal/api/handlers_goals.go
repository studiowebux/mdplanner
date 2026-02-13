package api

import (
	"net/http"

	"github.com/studiowebux/mdplanner/internal/domain"
)

func (h *Handlers) handleGetGoals(w http.ResponseWriter, r *http.Request) {
	goals, err := h.storage.ReadGoals(r.Context())
	if err != nil {
		WriteError(w, err)
		return
	}
	WriteJSON(w, http.StatusOK, goals)
}

func (h *Handlers) handleCreateGoal(w http.ResponseWriter, r *http.Request) {
	var goal domain.Goal
	if err := parseJSON(r, &goal); err != nil {
		WriteError(w, NewError(http.StatusBadRequest, "invalid request body"))
		return
	}
	id, err := h.storage.CreateGoal(r.Context(), goal)
	if err != nil {
		WriteError(w, err)
		return
	}
	WriteCreated(w, id)
}

func (h *Handlers) handleGetGoal(w http.ResponseWriter, r *http.Request) {
	id := getURLParam(r, "id")
	goals, err := h.storage.ReadGoals(r.Context())
	if err != nil {
		WriteError(w, err)
		return
	}
	for _, goal := range goals {
		if goal.ID == id {
			WriteJSON(w, http.StatusOK, goal)
			return
		}
	}
	WriteError(w, NewError(http.StatusNotFound, "goal not found"))
}

func (h *Handlers) handleUpdateGoal(w http.ResponseWriter, r *http.Request) {
	id := getURLParam(r, "id")
	var goal domain.Goal
	if err := parseJSON(r, &goal); err != nil {
		WriteError(w, NewError(http.StatusBadRequest, "invalid request body"))
		return
	}
	if err := h.storage.UpdateGoal(r.Context(), id, goal); err != nil {
		WriteError(w, err)
		return
	}
	WriteSuccess(w)
}

func (h *Handlers) handleDeleteGoal(w http.ResponseWriter, r *http.Request) {
	id := getURLParam(r, "id")
	if err := h.storage.DeleteGoal(r.Context(), id); err != nil {
		WriteError(w, err)
		return
	}
	WriteSuccess(w)
}
