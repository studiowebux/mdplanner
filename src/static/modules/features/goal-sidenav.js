// Goal Sidenav Module
// Pattern: Template Method (extends BaseSidenavModule)

import { BaseSidenavModule } from "../ui/base-sidenav.js";
import { GoalsAPI } from "../api.js";

export class GoalSidenavModule extends BaseSidenavModule {
  get prefix() { return "goal"; }
  get entityName() { return "Goal"; }
  get api() { return GoalsAPI; }
  get inputIds() {
    return [
      "goalSidenavTitle", "goalSidenavType", "goalSidenavStatus",
      "goalSidenavKpi", "goalSidenavStartDate", "goalSidenavEndDate",
      "goalSidenavDescription",
    ];
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
    document.getElementById("goalSidenavStatus").value = goal.status || "planning";
    document.getElementById("goalSidenavKpi").value = goal.kpi || "";
    document.getElementById("goalSidenavStartDate").value = goal.startDate || "";
    document.getElementById("goalSidenavEndDate").value = goal.endDate || "";
    document.getElementById("goalSidenavDescription").value = goal.description || "";
  }

  getFormData() {
    return {
      title: document.getElementById("goalSidenavTitle").value.trim(),
      type: document.getElementById("goalSidenavType").value,
      status: document.getElementById("goalSidenavStatus").value,
      kpi: document.getElementById("goalSidenavKpi").value.trim(),
      startDate: document.getElementById("goalSidenavStartDate").value,
      endDate: document.getElementById("goalSidenavEndDate").value,
      description: document.getElementById("goalSidenavDescription").value.trim(),
    };
  }

  findEntity(id) {
    return this.tm.goals.find((g) => g.id === id);
  }

  async reloadData() {
    await this.tm.goalsModule.load();
  }
}

export default GoalSidenavModule;
