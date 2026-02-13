package api

import (
	"net/http"

	"github.com/studiowebux/mdplanner/internal/domain"
)

// Strategic Levels handlers
func (h *Handlers) handleGetStrategicLevels(w http.ResponseWriter, r *http.Request) {
	builders, err := h.storage.ReadStrategicBuilders(r.Context())
	if err != nil {
		WriteError(w, err)
		return
	}
	WriteJSON(w, http.StatusOK, builders)
}

func (h *Handlers) handleCreateStrategicBuilder(w http.ResponseWriter, r *http.Request) {
	var builder domain.StrategicLevelsBuilder
	if err := parseJSON(r, &builder); err != nil {
		WriteError(w, NewError(http.StatusBadRequest, "invalid request body"))
		return
	}
	id, err := h.storage.CreateStrategicBuilder(r.Context(), builder)
	if err != nil {
		WriteError(w, err)
		return
	}
	WriteCreated(w, id)
}

func (h *Handlers) handleGetStrategicBuilder(w http.ResponseWriter, r *http.Request) {
	id := getURLParam(r, "id")
	builders, err := h.storage.ReadStrategicBuilders(r.Context())
	if err != nil {
		WriteError(w, err)
		return
	}
	for _, b := range builders {
		if b.ID == id {
			WriteJSON(w, http.StatusOK, b)
			return
		}
	}
	WriteError(w, NewError(http.StatusNotFound, "strategic builder not found"))
}

func (h *Handlers) handleUpdateStrategicBuilder(w http.ResponseWriter, r *http.Request) {
	id := getURLParam(r, "id")
	var builder domain.StrategicLevelsBuilder
	if err := parseJSON(r, &builder); err != nil {
		WriteError(w, NewError(http.StatusBadRequest, "invalid request body"))
		return
	}
	if err := h.storage.UpdateStrategicBuilder(r.Context(), id, builder); err != nil {
		WriteError(w, err)
		return
	}
	WriteSuccess(w)
}

func (h *Handlers) handleDeleteStrategicBuilder(w http.ResponseWriter, r *http.Request) {
	id := getURLParam(r, "id")
	if err := h.storage.DeleteStrategicBuilder(r.Context(), id); err != nil {
		WriteError(w, err)
		return
	}
	WriteSuccess(w)
}

// Strategic Level handlers (nested in builder)
func (h *Handlers) handleAddStrategicLevel(w http.ResponseWriter, r *http.Request) {
	builderID := getURLParam(r, "id")
	var level domain.StrategicLevel
	if err := parseJSON(r, &level); err != nil {
		WriteError(w, NewError(http.StatusBadRequest, "invalid request body"))
		return
	}
	id, err := h.storage.AddStrategicLevel(r.Context(), builderID, level)
	if err != nil {
		WriteError(w, err)
		return
	}
	WriteCreated(w, id)
}

func (h *Handlers) handleUpdateStrategicLevel(w http.ResponseWriter, r *http.Request) {
	builderID := getURLParam(r, "id")
	levelID := getURLParam(r, "lid")
	var level domain.StrategicLevel
	if err := parseJSON(r, &level); err != nil {
		WriteError(w, NewError(http.StatusBadRequest, "invalid request body"))
		return
	}
	if err := h.storage.UpdateStrategicLevel(r.Context(), builderID, levelID, level); err != nil {
		WriteError(w, err)
		return
	}
	WriteSuccess(w)
}

func (h *Handlers) handleDeleteStrategicLevel(w http.ResponseWriter, r *http.Request) {
	builderID := getURLParam(r, "id")
	levelID := getURLParam(r, "lid")
	if err := h.storage.DeleteStrategicLevel(r.Context(), builderID, levelID); err != nil {
		WriteError(w, err)
		return
	}
	WriteSuccess(w)
}
