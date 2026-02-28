// Risk Analysis Sidenav Module
// Slide-in panel for risk analysis with inline item management (2x2 matrix)

import { Sidenav } from "../ui/sidenav.js";
import { RiskAnalysisAPI } from "../api.js";
import { showToast } from "../ui/toast.js";
import { escapeHtml } from "../utils.js";

export class RiskSidenavModule {
  constructor(taskManager) {
    this.tm = taskManager;
    this.editingRiskId = null;
    this.currentRisk = null;
    this.quadrants = [
      "highImpactHighProb",
      "highImpactLowProb",
      "lowImpactHighProb",
      "lowImpactLowProb",
    ];
    this.quadrantNames = {
      highImpactHighProb: "High Impact / High Probability",
      highImpactLowProb: "High Impact / Low Probability",
      lowImpactHighProb: "Low Impact / High Probability",
      lowImpactLowProb: "Low Impact / Low Probability",
    };
  }

  bindEvents() {
    document.getElementById("riskSidenavClose")?.addEventListener(
      "click",
      () => this.close(),
    );
    document.getElementById("riskSidenavCancel")?.addEventListener(
      "click",
      () => this.close(),
    );
    document.getElementById("riskSidenavDelete")?.addEventListener(
      "click",
      () => this.handleDelete(),
    );
    document.getElementById("riskSidenavSave")?.addEventListener(
      "click",
      () => this.save(),
    );

    this.quadrants.forEach((quadrant) => {
      document.getElementById(`riskSidenav_add_${quadrant}`)?.addEventListener(
        "click",
        () => {
          this.showAddItemInput(quadrant);
        },
      );
    });
  }

  openNew() {
    this.editingRiskId = null;
    this.currentRisk = {
      title: "",
      date: new Date().toISOString().split("T")[0],
      highImpactHighProb: [],
      highImpactLowProb: [],
      lowImpactHighProb: [],
      lowImpactLowProb: [],
    };

    document.getElementById("riskSidenavHeader").textContent =
      "New Risk Analysis";
    this.fillForm();
    document.getElementById("riskSidenavDelete").classList.add("hidden");
    Sidenav.open("riskSidenav");
  }

  openEdit(riskId) {
    const risk = this.tm.riskAnalyses.find((r) => r.id === riskId);
    if (!risk) return;

    this.editingRiskId = riskId;
    this.currentRisk = JSON.parse(JSON.stringify(risk));

    document.getElementById("riskSidenavHeader").textContent =
      "Edit Risk Analysis";
    this.fillForm();
    document.getElementById("riskSidenavDelete").classList.remove("hidden");
    Sidenav.open("riskSidenav");
  }

  close() {
    Sidenav.close("riskSidenav");
    this.editingRiskId = null;
    this.currentRisk = null;
  }

  fillForm() {
    document.getElementById("riskSidenavTitle").value =
      this.currentRisk.title || "";
    document.getElementById("riskSidenavDate").value = this.currentRisk.date ||
      "";
    this.quadrants.forEach((q) => this.renderQuadrant(q));
  }

  renderQuadrant(quadrant) {
    const container = document.getElementById(`riskSidenav_${quadrant}`);
    if (!container) return;

    const items = this.currentRisk[quadrant] || [];

    container.innerHTML = items.length === 0
      ? '<div class="text-muted text-sm italic py-2">No risks</div>'
      : items.map((item, idx) => `
        <div class="flex items-start gap-2 py-1 group">
          <span class="flex-1 text-sm text-secondary">${
        escapeHtml(item)
      }</span>
          <button onclick="taskManager.riskSidenavModule.removeItem('${quadrant}', ${idx})"
                  class="opacity-0 group-hover:opacity-100 text-muted hover:text-error flex-shrink-0">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
            </svg>
          </button>
        </div>
      `).join("");
  }

  showAddItemInput(quadrant) {
    const container = document.getElementById(`riskSidenav_${quadrant}`);
    const existingInput = container.querySelector(".risk-add-input");
    if (existingInput) {
      existingInput.querySelector("input").focus();
      return;
    }

    const inputHtml = `
      <div class="risk-add-input flex gap-2 mt-2">
        <input type="text" class="flex-1 px-2 py-1 text-sm border border-strong rounded bg-primary text-primary"
               placeholder="Enter risk..." autofocus>
        <button type="button" class="px-2 py-1 text-xs bg-inverse text-inverse rounded hover:bg-inverse">Add</button>
        <button type="button" class="px-2 py-1 text-xs text-muted hover:text-secondary">Cancel</button>
      </div>
    `;
    container.insertAdjacentHTML("beforeend", inputHtml);

    const inputWrapper = container.querySelector(".risk-add-input");
    const input = inputWrapper.querySelector("input");
    const addBtn = inputWrapper.querySelectorAll("button")[0];
    const cancelBtn = inputWrapper.querySelectorAll("button")[1];

    const addItem = () => {
      const text = input.value.trim();
      if (text) {
        this.currentRisk[quadrant].push(text);
        this.renderQuadrant(quadrant);
      }
      inputWrapper.remove();
    };

    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter") addItem();
      if (e.key === "Escape") inputWrapper.remove();
    });
    addBtn.addEventListener("click", addItem);
    cancelBtn.addEventListener("click", () => inputWrapper.remove());
    input.focus();
  }

  removeItem(quadrant, index) {
    this.currentRisk[quadrant].splice(index, 1);
    this.renderQuadrant(quadrant);
  }

  async save() {
    this.currentRisk.title = document.getElementById("riskSidenavTitle").value
      .trim();
    this.currentRisk.date = document.getElementById("riskSidenavDate").value;

    if (!this.currentRisk.title) {
      this.showSaveStatus("Title required");
      return;
    }

    try {
      if (this.editingRiskId) {
        await RiskAnalysisAPI.update(this.editingRiskId, this.currentRisk);
        this.showSaveStatus("Saved");
      } else {
        const response = await RiskAnalysisAPI.create(this.currentRisk);
        const result = await response.json();
        this.editingRiskId = result.id;
        this.currentRisk.id = result.id;
        this.showSaveStatus("Created");
        document.getElementById("riskSidenavHeader").textContent =
          "Edit Risk Analysis";
        document.getElementById("riskSidenavDelete").classList.remove("hidden");
      }
      await this.tm.riskModule.load();
    } catch (error) {
      console.error("Error saving risk analysis:", error);
      this.showSaveStatus("Error");
      showToast("Error saving risk analysis", "error");
    }
  }

  async handleDelete() {
    if (!this.editingRiskId) return;
    if (
      !confirm(`Delete "${this.currentRisk.title}"? This cannot be undone.`)
    ) return;

    try {
      await RiskAnalysisAPI.delete(this.editingRiskId);
      showToast("Risk analysis deleted", "success");
      await this.tm.riskModule.load();
      this.close();
    } catch (error) {
      console.error("Error deleting risk analysis:", error);
      showToast("Error deleting risk analysis", "error");
    }
  }

  showSaveStatus(text) {
    const statusEl = document.getElementById("riskSidenavSaveStatus");
    if (!statusEl) return;

    statusEl.textContent = text;
    statusEl.classList.remove(
      "hidden",
      "sidenav-status-saved",
      "sidenav-status-saving",
      "sidenav-status-error",
    );

    if (text === "Saved" || text === "Created") {
      statusEl.classList.add("sidenav-status-saved");
    } else if (text === "Error" || text === "Title required") {
      statusEl.classList.add("sidenav-status-error");
    } else {
      statusEl.classList.add("sidenav-status-saving");
    }

    if (text === "Saved" || text === "Created" || text === "Error") {
      setTimeout(() => statusEl.classList.add("hidden"), 2000);
    }
  }
}

export default RiskSidenavModule;
