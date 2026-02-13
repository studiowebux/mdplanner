package api

import (
	"net/http"

	"github.com/studiowebux/mdplanner/internal/domain"
)

// Capacity Planning handlers
func (h *Handlers) handleGetCapacityPlans(w http.ResponseWriter, r *http.Request) {
	plans, err := h.storage.ReadCapacityPlans(r.Context())
	if err != nil {
		WriteError(w, err)
		return
	}
	WriteJSON(w, http.StatusOK, plans)
}

func (h *Handlers) handleCreateCapacityPlan(w http.ResponseWriter, r *http.Request) {
	var plan domain.CapacityPlan
	if err := parseJSON(r, &plan); err != nil {
		WriteError(w, NewError(http.StatusBadRequest, "invalid request body"))
		return
	}
	id, err := h.storage.CreateCapacityPlan(r.Context(), plan)
	if err != nil {
		WriteError(w, err)
		return
	}
	WriteCreated(w, id)
}

func (h *Handlers) handleGetCapacityPlan(w http.ResponseWriter, r *http.Request) {
	id := getURLParam(r, "id")
	plans, err := h.storage.ReadCapacityPlans(r.Context())
	if err != nil {
		WriteError(w, err)
		return
	}
	for _, plan := range plans {
		if plan.ID == id {
			WriteJSON(w, http.StatusOK, plan)
			return
		}
	}
	WriteError(w, NewError(http.StatusNotFound, "capacity plan not found"))
}

func (h *Handlers) handleUpdateCapacityPlan(w http.ResponseWriter, r *http.Request) {
	id := getURLParam(r, "id")
	var plan domain.CapacityPlan
	if err := parseJSON(r, &plan); err != nil {
		WriteError(w, NewError(http.StatusBadRequest, "invalid request body"))
		return
	}
	if err := h.storage.UpdateCapacityPlan(r.Context(), id, plan); err != nil {
		WriteError(w, err)
		return
	}
	WriteSuccess(w)
}

func (h *Handlers) handleDeleteCapacityPlan(w http.ResponseWriter, r *http.Request) {
	id := getURLParam(r, "id")
	if err := h.storage.DeleteCapacityPlan(r.Context(), id); err != nil {
		WriteError(w, err)
		return
	}
	WriteSuccess(w)
}

// Team Member handlers
func (h *Handlers) handleAddTeamMember(w http.ResponseWriter, r *http.Request) {
	planID := getURLParam(r, "id")
	var member domain.TeamMember
	if err := parseJSON(r, &member); err != nil {
		WriteError(w, NewError(http.StatusBadRequest, "invalid request body"))
		return
	}
	id, err := h.storage.AddTeamMember(r.Context(), planID, member)
	if err != nil {
		WriteError(w, err)
		return
	}
	WriteCreated(w, id)
}

func (h *Handlers) handleUpdateTeamMember(w http.ResponseWriter, r *http.Request) {
	planID := getURLParam(r, "id")
	memberID := getURLParam(r, "mid")
	var member domain.TeamMember
	if err := parseJSON(r, &member); err != nil {
		WriteError(w, NewError(http.StatusBadRequest, "invalid request body"))
		return
	}
	if err := h.storage.UpdateTeamMember(r.Context(), planID, memberID, member); err != nil {
		WriteError(w, err)
		return
	}
	WriteSuccess(w)
}

func (h *Handlers) handleDeleteTeamMember(w http.ResponseWriter, r *http.Request) {
	planID := getURLParam(r, "id")
	memberID := getURLParam(r, "mid")
	if err := h.storage.DeleteTeamMember(r.Context(), planID, memberID); err != nil {
		WriteError(w, err)
		return
	}
	WriteSuccess(w)
}

// Allocation handlers
func (h *Handlers) handleAddAllocation(w http.ResponseWriter, r *http.Request) {
	planID := getURLParam(r, "id")
	var alloc domain.WeeklyAllocation
	if err := parseJSON(r, &alloc); err != nil {
		WriteError(w, NewError(http.StatusBadRequest, "invalid request body"))
		return
	}
	id, err := h.storage.AddAllocation(r.Context(), planID, alloc)
	if err != nil {
		WriteError(w, err)
		return
	}
	WriteCreated(w, id)
}

func (h *Handlers) handleUpdateAllocation(w http.ResponseWriter, r *http.Request) {
	planID := getURLParam(r, "id")
	allocID := getURLParam(r, "aid")
	var alloc domain.WeeklyAllocation
	if err := parseJSON(r, &alloc); err != nil {
		WriteError(w, NewError(http.StatusBadRequest, "invalid request body"))
		return
	}
	if err := h.storage.UpdateAllocation(r.Context(), planID, allocID, alloc); err != nil {
		WriteError(w, err)
		return
	}
	WriteSuccess(w)
}

func (h *Handlers) handleDeleteAllocation(w http.ResponseWriter, r *http.Request) {
	planID := getURLParam(r, "id")
	allocID := getURLParam(r, "aid")
	if err := h.storage.DeleteAllocation(r.Context(), planID, allocID); err != nil {
		WriteError(w, err)
		return
	}
	WriteSuccess(w)
}

// Utilization calculation
func (h *Handlers) handleGetUtilization(w http.ResponseWriter, r *http.Request) {
	// Calculate utilization from capacity plan
	id := getURLParam(r, "id")
	plans, err := h.storage.ReadCapacityPlans(r.Context())
	if err != nil {
		WriteError(w, err)
		return
	}

	for _, plan := range plans {
		if plan.ID == id {
			// Calculate utilization per member
			utilization := make(map[string]float64)
			for _, member := range plan.TeamMembers {
				totalAllocated := 0.0
				for _, alloc := range plan.Allocations {
					if alloc.MemberID == member.ID {
						totalAllocated += alloc.AllocatedHours
					}
				}
				// Simple utilization = allocated / (hoursPerDay * workingDays * 4 weeks)
				capacity := member.HoursPerDay * float64(len(member.WorkingDays)) * 4
				if capacity > 0 {
					utilization[member.ID] = (totalAllocated / capacity) * 100
				}
			}
			WriteJSON(w, http.StatusOK, utilization)
			return
		}
	}
	WriteError(w, NewError(http.StatusNotFound, "capacity plan not found"))
}

// Suggest assignments (placeholder)
func (h *Handlers) handleSuggestAssignments(w http.ResponseWriter, r *http.Request) {
	// This would implement smart assignment suggestions
	WriteJSON(w, http.StatusOK, []any{})
}

// Apply assignments (placeholder)
func (h *Handlers) handleApplyAssignments(w http.ResponseWriter, r *http.Request) {
	WriteSuccess(w)
}
