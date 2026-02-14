import { RiskAnalysisAPI } from "../api.js";

/**
 * RiskModule - Handles Risk Analysis (Impact/Probability matrix)
 */
export class RiskModule {
  constructor(taskManager) {
    this.taskManager = taskManager;
  }

  async load() {
    try {
      this.taskManager.riskAnalyses = await RiskAnalysisAPI.fetchAll();
      this.renderSelector();
      if (
        this.taskManager.riskAnalyses.length > 0 &&
        !this.taskManager.selectedRiskId
      ) {
        this.select(this.taskManager.riskAnalyses[0].id);
      } else if (this.taskManager.selectedRiskId) {
        this.select(this.taskManager.selectedRiskId);
      } else {
        this.renderView(null);
      }
    } catch (error) {
      console.error("Error loading risk analyses:", error);
    }
  }

  renderSelector() {
    const selector = document.getElementById("riskAnalysisSelector");
    selector.innerHTML = '<option value="">Select Analysis</option>';
    this.taskManager.riskAnalyses.forEach((risk) => {
      const option = document.createElement("option");
      option.value = risk.id;
      option.textContent = `${risk.title} (${risk.date})`;
      selector.appendChild(option);
    });
  }

  select(riskId) {
    this.taskManager.selectedRiskId = riskId;
    const selector = document.getElementById("riskAnalysisSelector");
    selector.value = riskId || "";

    const risk = this.taskManager.riskAnalyses.find((r) => r.id === riskId);
    this.renderView(risk);

    const editBtn = document.getElementById("editRiskAnalysisBtn");
    const deleteBtn = document.getElementById("deleteRiskAnalysisBtn");
    if (risk) {
      editBtn.classList.remove("hidden");
      deleteBtn.classList.remove("hidden");
    } else {
      editBtn.classList.add("hidden");
      deleteBtn.classList.add("hidden");
    }
  }

  renderView(risk) {
    const emptyState = document.getElementById("emptyRiskAnalysisState");
    const grid = document.getElementById("riskAnalysisGrid");

    if (!risk) {
      emptyState.classList.remove("hidden");
      grid.classList.add("hidden");
      return;
    }

    emptyState.classList.add("hidden");
    grid.classList.remove("hidden");

    const quadrants = [
      { id: "highImpactHighProb", el: "riskHighImpactHighProb" },
      { id: "highImpactLowProb", el: "riskHighImpactLowProb" },
      { id: "lowImpactHighProb", el: "riskLowImpactHighProb" },
      { id: "lowImpactLowProb", el: "riskLowImpactLowProb" },
    ];

    quadrants.forEach(({ id, el }) => {
      const ul = document.getElementById(el);
      ul.innerHTML = (risk[id] || [])
        .map(
          (item, idx) => `
        <li class="flex justify-between items-start group">
          <span>${item}</span>
          <button onclick="taskManager.removeRiskAnalysisItem('${id}', ${idx})" class="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500 ml-2">
            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
          </button>
        </li>
      `,
        )
        .join("");
    });
  }

  openModal(id = null) {
    this.taskManager.editingRiskId = id;
    const modal = document.getElementById("riskAnalysisModal");
    const title = document.getElementById("riskAnalysisModalTitle");
    document.getElementById("riskAnalysisTitle").value = "";
    document.getElementById("riskAnalysisDate").value = new Date()
      .toISOString()
      .split("T")[0];

    if (id) {
      title.textContent = "Edit Risk Analysis";
      const risk = this.taskManager.riskAnalyses.find((r) => r.id === id);
      if (risk) {
        document.getElementById("riskAnalysisTitle").value = risk.title;
        document.getElementById("riskAnalysisDate").value = risk.date;
      }
    } else {
      title.textContent = "New Risk Analysis";
    }

    modal.classList.remove("hidden");
    modal.classList.add("flex");
    document.getElementById("riskAnalysisTitle").focus();
  }

  closeModal() {
    const modal = document.getElementById("riskAnalysisModal");
    modal.classList.add("hidden");
    modal.classList.remove("flex");
    this.taskManager.editingRiskId = null;
  }

  async save(e) {
    e.preventDefault();
    const title = document.getElementById("riskAnalysisTitle").value.trim();
    const date = document.getElementById("riskAnalysisDate").value;

    if (!title) return;

    try {
      if (this.taskManager.editingRiskId) {
        const risk = this.taskManager.riskAnalyses.find(
          (r) => r.id === this.taskManager.editingRiskId,
        );
        await RiskAnalysisAPI.update(this.taskManager.editingRiskId, {
          ...risk,
          title,
          date,
        });
      } else {
        await RiskAnalysisAPI.create({ title, date });
      }
      this.closeModal();
      await this.load();
    } catch (error) {
      console.error("Error saving risk analysis:", error);
    }
  }

  editSelected() {
    if (this.taskManager.selectedRiskId) {
      this.openModal(this.taskManager.selectedRiskId);
    }
  }

  async deleteSelected() {
    if (!this.taskManager.selectedRiskId) return;
    if (!confirm("Delete this risk analysis?")) return;
    try {
      await RiskAnalysisAPI.delete(this.taskManager.selectedRiskId);
      this.taskManager.selectedRiskId = null;
      await this.load();
    } catch (error) {
      console.error("Error deleting risk analysis:", error);
    }
  }

  openItemModal(quadrant) {
    this.taskManager.riskItemQuadrant = quadrant;
    const modal = document.getElementById("riskAnalysisItemModal");
    const title = document.getElementById("riskAnalysisItemModalTitle");
    const quadrantNames = {
      highImpactHighProb: "High Impact / High Probability",
      highImpactLowProb: "High Impact / Low Probability",
      lowImpactHighProb: "Low Impact / High Probability",
      lowImpactLowProb: "Low Impact / Low Probability",
    };
    title.textContent = `Add Risk: ${quadrantNames[quadrant]}`;
    document.getElementById("riskAnalysisItemText").value = "";
    modal.classList.remove("hidden");
    modal.classList.add("flex");
    document.getElementById("riskAnalysisItemText").focus();
  }

  closeItemModal() {
    const modal = document.getElementById("riskAnalysisItemModal");
    modal.classList.add("hidden");
    modal.classList.remove("flex");
    this.taskManager.riskItemQuadrant = null;
  }

  async saveItem(e) {
    e.preventDefault();
    if (
      !this.taskManager.selectedRiskId ||
      !this.taskManager.riskItemQuadrant
    ) {
      return;
    }

    const text = document.getElementById("riskAnalysisItemText").value.trim();
    if (!text) return;

    const risk = this.taskManager.riskAnalyses.find(
      (r) => r.id === this.taskManager.selectedRiskId,
    );
    if (!risk) return;

    risk[this.taskManager.riskItemQuadrant].push(text);

    try {
      await RiskAnalysisAPI.update(this.taskManager.selectedRiskId, risk);
      this.closeItemModal();
      this.renderView(risk);
    } catch (error) {
      console.error("Error saving risk item:", error);
    }
  }

  async removeItem(quadrant, index) {
    if (!this.taskManager.selectedRiskId) return;
    const risk = this.taskManager.riskAnalyses.find(
      (r) => r.id === this.taskManager.selectedRiskId,
    );
    if (!risk) return;

    risk[quadrant].splice(index, 1);

    try {
      await RiskAnalysisAPI.update(this.taskManager.selectedRiskId, risk);
      this.renderView(risk);
    } catch (error) {
      console.error("Error removing risk item:", error);
    }
  }

  bindEvents() {
    // View button
    document
      .getElementById("riskAnalysisViewBtn")
      .addEventListener("click", () => {
        this.taskManager.switchView("riskAnalysis");
        document.getElementById("viewSelectorDropdown")?.classList.add("hidden");
      });

    // Add Risk Analysis button
    document
      .getElementById("addRiskAnalysisBtn")
      .addEventListener("click", () => this.openModal());

    // Cancel Risk Analysis modal
    document
      .getElementById("cancelRiskAnalysisBtn")
      .addEventListener("click", () => this.closeModal());

    // Risk Analysis form submission
    document
      .getElementById("riskAnalysisForm")
      .addEventListener("submit", (e) => this.save(e));

    // Selector change
    document
      .getElementById("riskAnalysisSelector")
      .addEventListener("change", (e) => this.select(e.target.value));

    // Edit and delete buttons
    document
      .getElementById("editRiskAnalysisBtn")
      .addEventListener("click", () => this.editSelected());
    document
      .getElementById("deleteRiskAnalysisBtn")
      .addEventListener("click", () => this.deleteSelected());

    // Item modal events
    document
      .getElementById("cancelRiskAnalysisItemBtn")
      .addEventListener("click", () => this.closeItemModal());
    document
      .getElementById("riskAnalysisItemForm")
      .addEventListener("submit", (e) => this.saveItem(e));

    // Add buttons for each quadrant
    document.querySelectorAll(".risk-add-btn").forEach(btn => {
      btn.addEventListener("click", () => this.openItemModal(btn.dataset.quadrant));
    });

    // Close modals on background click
    document.getElementById("riskAnalysisModal").addEventListener("click", (e) => {
      if (e.target.id === "riskAnalysisModal") {
        this.closeModal();
      }
    });
    document.getElementById("riskAnalysisItemModal").addEventListener("click", (e) => {
      if (e.target.id === "riskAnalysisItemModal") {
        this.closeItemModal();
      }
    });
  }
}
