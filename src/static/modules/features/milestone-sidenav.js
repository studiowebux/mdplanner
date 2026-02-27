// Milestone Sidenav Module
// Pattern: Template Method (extends BaseSidenavModule)

import { BaseSidenavModule } from "../ui/base-sidenav.js";
import { MilestonesAPI } from "../api.js";

export class MilestoneSidenavModule extends BaseSidenavModule {
  get prefix() { return "milestone"; }
  get entityName() { return "Milestone"; }
  get api() { return MilestonesAPI; }
  get titleField() { return "name"; }
  get newLabel() { return "New Milestone"; }
  get editLabel() { return "Edit Milestone"; }
  get inputIds() {
    return [
      "milestoneSidenavName", "milestoneSidenavTarget",
      "milestoneSidenavStatus", "milestoneSidenavDescription",
    ];
  }

  openNew() {
    super.openNew();
    document.getElementById("milestoneSidenavProgress")?.classList.add("hidden");
  }

  openEdit(milestoneId) {
    super.openEdit(milestoneId);
    const milestone = this.findEntity(milestoneId);
    if (milestone) this.renderProgress(milestone);
  }

  renderProgress(milestone) {
    const container = document.getElementById("milestoneSidenavProgress");
    container?.classList.remove("hidden");

    const progressBar = document.getElementById("milestoneSidenavProgressBar");
    const progressText = document.getElementById("milestoneSidenavProgressText");

    if (progressBar) progressBar.style.width = `${milestone.progress || 0}%`;
    if (progressText) {
      progressText.textContent = `${milestone.completedCount || 0}/${
        milestone.taskCount || 0
      } tasks (${milestone.progress || 0}%)`;
    }
  }

  clearForm() {
    document.getElementById("milestoneSidenavName").value = "";
    document.getElementById("milestoneSidenavTarget").value = "";
    document.getElementById("milestoneSidenavStatus").value = "pending";
    document.getElementById("milestoneSidenavDescription").value = "";
    document.getElementById("milestoneSidenavProject").value = "";
    this._populateProjectList();
  }

  fillForm(milestone) {
    document.getElementById("milestoneSidenavName").value = milestone.name || "";
    document.getElementById("milestoneSidenavTarget").value = milestone.target || "";
    document.getElementById("milestoneSidenavStatus").value = milestone.status || "pending";
    document.getElementById("milestoneSidenavDescription").value = milestone.description || "";
    document.getElementById("milestoneSidenavProject").value = milestone.project || "";
    this._populateProjectList();
  }

  getFormData() {
    return {
      name: document.getElementById("milestoneSidenavName").value.trim(),
      target: document.getElementById("milestoneSidenavTarget").value || null,
      status: document.getElementById("milestoneSidenavStatus").value,
      description: document.getElementById("milestoneSidenavDescription").value.trim() || null,
      project: document.getElementById("milestoneSidenavProject").value.trim() || null,
    };
  }

  _populateProjectList() {
    const datalist = document.getElementById("milestoneSidenavProjectList");
    if (!datalist) return;
    const names = new Set((this.tm.portfolio || []).map((p) => p.name).filter(Boolean));
    datalist.innerHTML = Array.from(names).sort().map((n) => `<option value="${n}">`).join("");
  }

  findEntity(id) {
    return this.tm.milestones.find((m) => m.id === id);
  }

  async reloadData() {
    await this.tm.milestonesModule.load();
  }
}

export default MilestoneSidenavModule;
