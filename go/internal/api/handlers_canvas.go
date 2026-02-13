package api

import (
	"net/http"

	"github.com/studiowebux/mdplanner/internal/domain"
)

// Sticky Notes (Canvas) handlers
func (h *Handlers) handleGetStickyNotes(w http.ResponseWriter, r *http.Request) {
	notes, err := h.storage.ReadStickyNotes(r.Context())
	if err != nil {
		WriteError(w, err)
		return
	}
	WriteJSON(w, http.StatusOK, notes)
}

func (h *Handlers) handleCreateStickyNote(w http.ResponseWriter, r *http.Request) {
	var note domain.StickyNote
	if err := parseJSON(r, &note); err != nil {
		WriteError(w, NewError(http.StatusBadRequest, "invalid request body"))
		return
	}
	id, err := h.storage.CreateStickyNote(r.Context(), note)
	if err != nil {
		WriteError(w, err)
		return
	}
	WriteCreated(w, id)
}

func (h *Handlers) handleUpdateStickyNote(w http.ResponseWriter, r *http.Request) {
	id := getURLParam(r, "id")
	var note domain.StickyNote
	if err := parseJSON(r, &note); err != nil {
		WriteError(w, NewError(http.StatusBadRequest, "invalid request body"))
		return
	}
	if err := h.storage.UpdateStickyNote(r.Context(), id, note); err != nil {
		WriteError(w, err)
		return
	}
	WriteSuccess(w)
}

func (h *Handlers) handleDeleteStickyNote(w http.ResponseWriter, r *http.Request) {
	id := getURLParam(r, "id")
	if err := h.storage.DeleteStickyNote(r.Context(), id); err != nil {
		WriteError(w, err)
		return
	}
	WriteSuccess(w)
}

// Mindmap handlers
func (h *Handlers) handleGetMindmaps(w http.ResponseWriter, r *http.Request) {
	mindmaps, err := h.storage.ReadMindmaps(r.Context())
	if err != nil {
		WriteError(w, err)
		return
	}
	WriteJSON(w, http.StatusOK, mindmaps)
}

func (h *Handlers) handleCreateMindmap(w http.ResponseWriter, r *http.Request) {
	var mindmap domain.Mindmap
	if err := parseJSON(r, &mindmap); err != nil {
		WriteError(w, NewError(http.StatusBadRequest, "invalid request body"))
		return
	}
	id, err := h.storage.CreateMindmap(r.Context(), mindmap)
	if err != nil {
		WriteError(w, err)
		return
	}
	WriteCreated(w, id)
}

func (h *Handlers) handleGetMindmap(w http.ResponseWriter, r *http.Request) {
	id := getURLParam(r, "id")
	mindmaps, err := h.storage.ReadMindmaps(r.Context())
	if err != nil {
		WriteError(w, err)
		return
	}
	for _, m := range mindmaps {
		if m.ID == id {
			WriteJSON(w, http.StatusOK, m)
			return
		}
	}
	WriteError(w, NewError(http.StatusNotFound, "mindmap not found"))
}

func (h *Handlers) handleUpdateMindmap(w http.ResponseWriter, r *http.Request) {
	id := getURLParam(r, "id")
	var mindmap domain.Mindmap
	if err := parseJSON(r, &mindmap); err != nil {
		WriteError(w, NewError(http.StatusBadRequest, "invalid request body"))
		return
	}
	if err := h.storage.UpdateMindmap(r.Context(), id, mindmap); err != nil {
		WriteError(w, err)
		return
	}
	WriteSuccess(w)
}

func (h *Handlers) handleDeleteMindmap(w http.ResponseWriter, r *http.Request) {
	id := getURLParam(r, "id")
	if err := h.storage.DeleteMindmap(r.Context(), id); err != nil {
		WriteError(w, err)
		return
	}
	WriteSuccess(w)
}

// C4 Architecture handlers
func (h *Handlers) handleGetC4(w http.ResponseWriter, r *http.Request) {
	components, err := h.storage.ReadC4Components(r.Context())
	if err != nil {
		WriteError(w, err)
		return
	}
	WriteJSON(w, http.StatusOK, components)
}

func (h *Handlers) handleCreateC4(w http.ResponseWriter, r *http.Request) {
	var components []domain.C4Component
	if err := parseJSON(r, &components); err != nil {
		WriteError(w, NewError(http.StatusBadRequest, "invalid request body"))
		return
	}
	if err := h.storage.SaveC4Components(r.Context(), components); err != nil {
		WriteError(w, err)
		return
	}
	WriteSuccess(w)
}

func (h *Handlers) handleUpdateC4(w http.ResponseWriter, r *http.Request) {
	var components []domain.C4Component
	if err := parseJSON(r, &components); err != nil {
		WriteError(w, NewError(http.StatusBadRequest, "invalid request body"))
		return
	}
	if err := h.storage.SaveC4Components(r.Context(), components); err != nil {
		WriteError(w, err)
		return
	}
	WriteSuccess(w)
}

func (h *Handlers) handleDeleteC4(w http.ResponseWriter, r *http.Request) {
	// For C4, deleting means saving an empty array or removing specific component
	// For now, just save empty
	if err := h.storage.SaveC4Components(r.Context(), []domain.C4Component{}); err != nil {
		WriteError(w, err)
		return
	}
	WriteSuccess(w)
}
