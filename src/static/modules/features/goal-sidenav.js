// Goal Sidenav Module
// Slide-in panel for goal creation and editing

import { Sidenav } from "../ui/sidenav.js";
import { GoalsAPI } from "../api.js";
import { showToast } from "../ui/toast.js";

export class GoalSidenavModule {
  constructor(taskManager) {
    this.tm = taskManager;
    this.editingGoalId = null;
    this.autoSaveTimeout = null;
  }

  bindEvents() {
    // Close button
    document.getElementById("goalSidenavClose")?.addEventListener(
      "click",
      () => {
        this.close();
      },
    );

    // Cancel button
    document.getElementById("goalSidenavCancel")?.addEventListener(
      "click",
      () => {
        this.close();
      },
    );

    // Delete button
    document.getElementById("goalSidenavDelete")?.addEventListener(
      "click",
      () => {
        this.handleDelete();
      },
    );

    // Form submit
    document.getElementById("goalSidenavForm")?.addEventListener(
      "submit",
      async (e) => {
        e.preventDefault();
        await this.save();
      },
    );

    // Auto-save on input changes
    const inputs = [
      "goalSidenavTitle",
      "goalSidenavType",
      "goalSidenavStatus",
      "goalSidenavKpi",
      "goalSidenavStartDate",
      "goalSidenavEndDate",
      "goalSidenavDescription",
    ];
    inputs.forEach((id) => {
      document.getElementById(id)?.addEventListener("input", () => {
        if (this.editingGoalId) {
          this.scheduleAutoSave();
        }
      });
      document.getElementById(id)?.addEventListener("change", () => {
        if (this.editingGoalId) {
          this.scheduleAutoSave();
        }
      });
    });
  }

  openNew() {
    this.editingGoalId = null;

    // Update header
    document.getElementById("goalSidenavHeader").textContent = "New Goal";

    // Reset form
    this.clearForm();

    // Hide delete button
    document.getElementById("goalSidenavDelete").classList.add("hidden");

    // Open sidenav
    Sidenav.open("goalSidenav");
  }

  openEdit(goalId) {
    const goal = this.tm.goals.find((g) => g.id === goalId);
    if (!goal) return;

    this.editingGoalId = goalId;

    // Update header
    document.getElementById("goalSidenavHeader").textContent = "Edit Goal";

    // Fill form
    this.fillForm(goal);

    // Show delete button
    document.getElementById("goalSidenavDelete").classList.remove("hidden");

    // Open sidenav
    Sidenav.open("goalSidenav");
  }

  close() {
    if (this.autoSaveTimeout) {
      clearTimeout(this.autoSaveTimeout);
      this.autoSaveTimeout = null;
    }

    Sidenav.close("goalSidenav");
    this.editingGoalId = null;
  }

  clearForm() {
    document.getElementById("goalSidenavTitle").value = "";
    document.getElementById("goalSidenavType").value = "project";
    document.getElementById("goalSidenavStatus").value = "planning";
    document.getElementById("goalSidenavKpi").value = "";
    document.getElementById("goalSidenavStartDate").value = "";
    document.getElementById("goalSidenavEndDate").value = "";
    document.getElementById("goalSidenavDescription").value = "";
  }

  fillForm(goal) {
    document.getElementById("goalSidenavTitle").value = goal.title || "";
    document.getElementById("goalSidenavType").value = goal.type || "project";
    document.getElementById("goalSidenavStatus").value = goal.status ||
      "planning";
    document.getElementById("goalSidenavKpi").value = goal.kpi || "";
    document.getElementById("goalSidenavStartDate").value = goal.startDate ||
      "";
    document.getElementById("goalSidenavEndDate").value = goal.endDate || "";
    document.getElementById("goalSidenavDescription").value =
      goal.description || "";
  }

  getFormData() {
    return {
      title: document.getElementById("goalSidenavTitle").value.trim(),
      type: document.getElementById("goalSidenavType").value,
      status: document.getElementById("goalSidenavStatus").value,
      kpi: document.getElementById("goalSidenavKpi").value.trim(),
      startDate: document.getElementById("goalSidenavStartDate").value,
      endDate: document.getElementById("goalSidenavEndDate").value,
      description: document.getElementById("goalSidenavDescription").value
        .trim(),
    };
  }

  scheduleAutoSave() {
    if (this.autoSaveTimeout) {
      clearTimeout(this.autoSaveTimeout);
    }

    this.showSaveStatus("Saving...");

    this.autoSaveTimeout = setTimeout(async () => {
      await this.save();
    }, 1000);
  }

  async save() {
    const data = this.getFormData();

    if (!data.title) {
      this.showSaveStatus("Title required");
      return;
    }

    try {
      if (this.editingGoalId) {
        await GoalsAPI.update(this.editingGoalId, data);
        this.showSaveStatus("Saved");
      } else {
        const response = await GoalsAPI.create(data);
        const result = await response.json();
        this.editingGoalId = result.id;
        this.showSaveStatus("Created");

        // Update header and show delete button
        document.getElementById("goalSidenavHeader").textContent = "Edit Goal";
        document.getElementById("goalSidenavDelete").classList.remove("hidden");
      }

      // Reload and re-render
      await this.tm.goalsModule.load();
    } catch (error) {
      console.error("Error saving goal:", error);
      this.showSaveStatus("Error");
      showToast("Error saving goal", "error");
    }
  }

  async handleDelete() {
    if (!this.editingGoalId) return;

    const goal = this.tm.goals.find((g) => g.id === this.editingGoalId);
    if (!goal) return;

    if (!confirm(`Delete "${goal.title}"? This cannot be undone.`)) return;

    try {
      await GoalsAPI.delete(this.editingGoalId);
      showToast("Goal deleted", "success");
      await this.tm.goalsModule.load();
      this.close();
    } catch (error) {
      console.error("Error deleting goal:", error);
      showToast("Error deleting goal", "error");
    }
  }

  showSaveStatus(text) {
    const statusEl = document.getElementById("goalSidenavSaveStatus");
    if (!statusEl) return;

    statusEl.textContent = text;
    statusEl.classList.remove(
      "hidden",
      "text-green-600",
      "text-red-500",
      "text-gray-500",
    );

    if (text === "Saved" || text === "Created") {
      statusEl.classList.add("text-green-600", "dark:text-green-400");
    } else if (text === "Error" || text === "Title required") {
      statusEl.classList.add("text-red-500");
    } else {
      statusEl.classList.add("text-gray-500", "dark:text-gray-400");
    }

    if (text === "Saved" || text === "Created" || text === "Error") {
      setTimeout(() => {
        statusEl.classList.add("hidden");
      }, 2000);
    }
  }
}

export default GoalSidenavModule;
