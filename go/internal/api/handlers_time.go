package api

import (
	"net/http"

	"github.com/studiowebux/mdplanner/internal/domain"
)

// Time Tracking handlers
func (h *Handlers) handleGetTimeEntries(w http.ResponseWriter, r *http.Request) {
	entries, err := h.storage.ReadTimeEntries(r.Context())
	if err != nil {
		WriteError(w, err)
		return
	}
	WriteJSON(w, http.StatusOK, entries)
}

func (h *Handlers) handleGetTimeEntriesForTask(w http.ResponseWriter, r *http.Request) {
	taskID := getURLParam(r, "taskId")
	entries, err := h.storage.GetTimeEntriesForTask(r.Context(), taskID)
	if err != nil {
		WriteError(w, err)
		return
	}
	WriteJSON(w, http.StatusOK, entries)
}

func (h *Handlers) handleAddTimeEntry(w http.ResponseWriter, r *http.Request) {
	taskID := getURLParam(r, "taskId")
	var entry domain.TimeEntry
	if err := parseJSON(r, &entry); err != nil {
		WriteError(w, NewError(http.StatusBadRequest, "invalid request body"))
		return
	}
	id, err := h.storage.AddTimeEntry(r.Context(), taskID, entry)
	if err != nil {
		WriteError(w, err)
		return
	}
	WriteCreated(w, id)
}

func (h *Handlers) handleDeleteTimeEntry(w http.ResponseWriter, r *http.Request) {
	taskID := getURLParam(r, "taskId")
	entryID := getURLParam(r, "entryId")
	if err := h.storage.DeleteTimeEntry(r.Context(), taskID, entryID); err != nil {
		WriteError(w, err)
		return
	}
	WriteSuccess(w)
}
