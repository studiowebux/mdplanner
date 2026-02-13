package api

import (
	"net/http"

	"github.com/studiowebux/mdplanner/internal/domain"
)

// handleGetTasks returns all tasks
func (h *Handlers) handleGetTasks(w http.ResponseWriter, r *http.Request) {
	tasks, err := h.storage.ReadTasks(r.Context())
	if err != nil {
		WriteError(w, err)
		return
	}
	WriteJSON(w, http.StatusOK, tasks)
}

// handleCreateTask creates a new task
func (h *Handlers) handleCreateTask(w http.ResponseWriter, r *http.Request) {
	var task domain.Task
	if err := parseJSON(r, &task); err != nil {
		WriteError(w, NewError(http.StatusBadRequest, "invalid request body"))
		return
	}
	id, err := h.storage.CreateTask(r.Context(), task)
	if err != nil {
		WriteError(w, err)
		return
	}
	WriteCreated(w, id)
}

// handleGetTask returns a single task
func (h *Handlers) handleGetTask(w http.ResponseWriter, r *http.Request) {
	id := getURLParam(r, "id")
	task, err := h.storage.GetTask(r.Context(), id)
	if err != nil {
		WriteError(w, NewError(http.StatusNotFound, "task not found"))
		return
	}
	WriteJSON(w, http.StatusOK, task)
}

// handleUpdateTask updates a task
func (h *Handlers) handleUpdateTask(w http.ResponseWriter, r *http.Request) {
	id := getURLParam(r, "id")
	var task domain.Task
	if err := parseJSON(r, &task); err != nil {
		WriteError(w, NewError(http.StatusBadRequest, "invalid request body"))
		return
	}
	if err := h.storage.UpdateTask(r.Context(), id, task); err != nil {
		WriteError(w, err)
		return
	}
	WriteSuccess(w)
}

// handleDeleteTask deletes a task
func (h *Handlers) handleDeleteTask(w http.ResponseWriter, r *http.Request) {
	id := getURLParam(r, "id")
	if err := h.storage.DeleteTask(r.Context(), id); err != nil {
		WriteError(w, err)
		return
	}
	WriteSuccess(w)
}

// handleMoveTask moves a task to a different section
func (h *Handlers) handleMoveTask(w http.ResponseWriter, r *http.Request) {
	id := getURLParam(r, "id")
	var req struct {
		Section string `json:"section"`
	}
	if err := parseJSON(r, &req); err != nil {
		WriteError(w, NewError(http.StatusBadRequest, "invalid request body"))
		return
	}
	if err := h.storage.MoveTask(r.Context(), id, req.Section); err != nil {
		WriteError(w, err)
		return
	}
	WriteSuccess(w)
}
