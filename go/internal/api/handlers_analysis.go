package api

import (
	"net/http"

	"github.com/studiowebux/mdplanner/internal/domain"
)

// SWOT Analysis handlers
func (h *Handlers) handleGetSwot(w http.ResponseWriter, r *http.Request) {
	items, err := h.storage.ReadSwotAnalyses(r.Context())
	if err != nil {
		WriteError(w, err)
		return
	}
	WriteJSON(w, http.StatusOK, items)
}

func (h *Handlers) handleCreateSwot(w http.ResponseWriter, r *http.Request) {
	var swot domain.SwotAnalysis
	if err := parseJSON(r, &swot); err != nil {
		WriteError(w, NewError(http.StatusBadRequest, "invalid request body"))
		return
	}
	id, err := h.storage.CreateSwotAnalysis(r.Context(), swot)
	if err != nil {
		WriteError(w, err)
		return
	}
	WriteCreated(w, id)
}

func (h *Handlers) handleUpdateSwot(w http.ResponseWriter, r *http.Request) {
	id := getURLParam(r, "id")
	var swot domain.SwotAnalysis
	if err := parseJSON(r, &swot); err != nil {
		WriteError(w, NewError(http.StatusBadRequest, "invalid request body"))
		return
	}
	if err := h.storage.UpdateSwotAnalysis(r.Context(), id, swot); err != nil {
		WriteError(w, err)
		return
	}
	WriteSuccess(w)
}

func (h *Handlers) handleDeleteSwot(w http.ResponseWriter, r *http.Request) {
	id := getURLParam(r, "id")
	if err := h.storage.DeleteSwotAnalysis(r.Context(), id); err != nil {
		WriteError(w, err)
		return
	}
	WriteSuccess(w)
}

// Risk Analysis handlers
func (h *Handlers) handleGetRiskAnalysis(w http.ResponseWriter, r *http.Request) {
	items, err := h.storage.ReadRiskAnalyses(r.Context())
	if err != nil {
		WriteError(w, err)
		return
	}
	WriteJSON(w, http.StatusOK, items)
}

func (h *Handlers) handleCreateRiskAnalysis(w http.ResponseWriter, r *http.Request) {
	var risk domain.RiskAnalysis
	if err := parseJSON(r, &risk); err != nil {
		WriteError(w, NewError(http.StatusBadRequest, "invalid request body"))
		return
	}
	id, err := h.storage.CreateRiskAnalysis(r.Context(), risk)
	if err != nil {
		WriteError(w, err)
		return
	}
	WriteCreated(w, id)
}

func (h *Handlers) handleUpdateRiskAnalysis(w http.ResponseWriter, r *http.Request) {
	id := getURLParam(r, "id")
	var risk domain.RiskAnalysis
	if err := parseJSON(r, &risk); err != nil {
		WriteError(w, NewError(http.StatusBadRequest, "invalid request body"))
		return
	}
	if err := h.storage.UpdateRiskAnalysis(r.Context(), id, risk); err != nil {
		WriteError(w, err)
		return
	}
	WriteSuccess(w)
}

func (h *Handlers) handleDeleteRiskAnalysis(w http.ResponseWriter, r *http.Request) {
	id := getURLParam(r, "id")
	if err := h.storage.DeleteRiskAnalysis(r.Context(), id); err != nil {
		WriteError(w, err)
		return
	}
	WriteSuccess(w)
}

// Lean Canvas handlers
func (h *Handlers) handleGetLeanCanvas(w http.ResponseWriter, r *http.Request) {
	items, err := h.storage.ReadLeanCanvases(r.Context())
	if err != nil {
		WriteError(w, err)
		return
	}
	WriteJSON(w, http.StatusOK, items)
}

func (h *Handlers) handleCreateLeanCanvas(w http.ResponseWriter, r *http.Request) {
	var canvas domain.LeanCanvas
	if err := parseJSON(r, &canvas); err != nil {
		WriteError(w, NewError(http.StatusBadRequest, "invalid request body"))
		return
	}
	id, err := h.storage.CreateLeanCanvas(r.Context(), canvas)
	if err != nil {
		WriteError(w, err)
		return
	}
	WriteCreated(w, id)
}

func (h *Handlers) handleUpdateLeanCanvas(w http.ResponseWriter, r *http.Request) {
	id := getURLParam(r, "id")
	var canvas domain.LeanCanvas
	if err := parseJSON(r, &canvas); err != nil {
		WriteError(w, NewError(http.StatusBadRequest, "invalid request body"))
		return
	}
	if err := h.storage.UpdateLeanCanvas(r.Context(), id, canvas); err != nil {
		WriteError(w, err)
		return
	}
	WriteSuccess(w)
}

func (h *Handlers) handleDeleteLeanCanvas(w http.ResponseWriter, r *http.Request) {
	id := getURLParam(r, "id")
	if err := h.storage.DeleteLeanCanvas(r.Context(), id); err != nil {
		WriteError(w, err)
		return
	}
	WriteSuccess(w)
}

// Business Model Canvas handlers
func (h *Handlers) handleGetBusinessModel(w http.ResponseWriter, r *http.Request) {
	items, err := h.storage.ReadBusinessModelCanvases(r.Context())
	if err != nil {
		WriteError(w, err)
		return
	}
	WriteJSON(w, http.StatusOK, items)
}

func (h *Handlers) handleCreateBusinessModel(w http.ResponseWriter, r *http.Request) {
	var canvas domain.BusinessModelCanvas
	if err := parseJSON(r, &canvas); err != nil {
		WriteError(w, NewError(http.StatusBadRequest, "invalid request body"))
		return
	}
	id, err := h.storage.CreateBusinessModelCanvas(r.Context(), canvas)
	if err != nil {
		WriteError(w, err)
		return
	}
	WriteCreated(w, id)
}

func (h *Handlers) handleUpdateBusinessModel(w http.ResponseWriter, r *http.Request) {
	id := getURLParam(r, "id")
	var canvas domain.BusinessModelCanvas
	if err := parseJSON(r, &canvas); err != nil {
		WriteError(w, NewError(http.StatusBadRequest, "invalid request body"))
		return
	}
	if err := h.storage.UpdateBusinessModelCanvas(r.Context(), id, canvas); err != nil {
		WriteError(w, err)
		return
	}
	WriteSuccess(w)
}

func (h *Handlers) handleDeleteBusinessModel(w http.ResponseWriter, r *http.Request) {
	id := getURLParam(r, "id")
	if err := h.storage.DeleteBusinessModelCanvas(r.Context(), id); err != nil {
		WriteError(w, err)
		return
	}
	WriteSuccess(w)
}

// Project Value Board handlers
func (h *Handlers) handleGetProjectValueBoard(w http.ResponseWriter, r *http.Request) {
	items, err := h.storage.ReadProjectValueBoards(r.Context())
	if err != nil {
		WriteError(w, err)
		return
	}
	WriteJSON(w, http.StatusOK, items)
}

func (h *Handlers) handleCreateProjectValueBoard(w http.ResponseWriter, r *http.Request) {
	var board domain.ProjectValueBoard
	if err := parseJSON(r, &board); err != nil {
		WriteError(w, NewError(http.StatusBadRequest, "invalid request body"))
		return
	}
	id, err := h.storage.CreateProjectValueBoard(r.Context(), board)
	if err != nil {
		WriteError(w, err)
		return
	}
	WriteCreated(w, id)
}

func (h *Handlers) handleUpdateProjectValueBoard(w http.ResponseWriter, r *http.Request) {
	id := getURLParam(r, "id")
	var board domain.ProjectValueBoard
	if err := parseJSON(r, &board); err != nil {
		WriteError(w, NewError(http.StatusBadRequest, "invalid request body"))
		return
	}
	if err := h.storage.UpdateProjectValueBoard(r.Context(), id, board); err != nil {
		WriteError(w, err)
		return
	}
	WriteSuccess(w)
}

func (h *Handlers) handleDeleteProjectValueBoard(w http.ResponseWriter, r *http.Request) {
	id := getURLParam(r, "id")
	if err := h.storage.DeleteProjectValueBoard(r.Context(), id); err != nil {
		WriteError(w, err)
		return
	}
	WriteSuccess(w)
}

// Brief handlers
func (h *Handlers) handleGetBrief(w http.ResponseWriter, r *http.Request) {
	items, err := h.storage.ReadBriefs(r.Context())
	if err != nil {
		WriteError(w, err)
		return
	}
	WriteJSON(w, http.StatusOK, items)
}

func (h *Handlers) handleCreateBrief(w http.ResponseWriter, r *http.Request) {
	var brief domain.Brief
	if err := parseJSON(r, &brief); err != nil {
		WriteError(w, NewError(http.StatusBadRequest, "invalid request body"))
		return
	}
	id, err := h.storage.CreateBrief(r.Context(), brief)
	if err != nil {
		WriteError(w, err)
		return
	}
	WriteCreated(w, id)
}

func (h *Handlers) handleUpdateBrief(w http.ResponseWriter, r *http.Request) {
	id := getURLParam(r, "id")
	var brief domain.Brief
	if err := parseJSON(r, &brief); err != nil {
		WriteError(w, NewError(http.StatusBadRequest, "invalid request body"))
		return
	}
	if err := h.storage.UpdateBrief(r.Context(), id, brief); err != nil {
		WriteError(w, err)
		return
	}
	WriteSuccess(w)
}

func (h *Handlers) handleDeleteBrief(w http.ResponseWriter, r *http.Request) {
	id := getURLParam(r, "id")
	if err := h.storage.DeleteBrief(r.Context(), id); err != nil {
		WriteError(w, err)
		return
	}
	WriteSuccess(w)
}
