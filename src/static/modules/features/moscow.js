import { MoscowAPI } from "../api.js";
import { escapeHtml } from "../utils.js";

/**
 * MoscowModule - Handles MoSCoW Prioritization (Must, Should, Could, Won't)
 */
export class MoscowModule {
  constructor(taskManager) {
    this.taskManager = taskManager;
  }

  async load() {
    try {
      this.taskManager.moscowAnalyses = await MoscowAPI.fetchAll();
      this.renderSelector();
      if (
        this.taskManager.moscowAnalyses.length > 0 &&
        !this.taskManager.selectedMoscowId
      ) {
        this.select(this.taskManager.moscowAnalyses[0].id);
      } else if (this.taskManager.selectedMoscowId) {
        this.select(this.taskManager.selectedMoscowId);
      } else {
        this.renderView(null);
      }
    } catch (error) {
      console.error("Error loading MoSCoW analyses:", error);
    }
  }

  renderSelector() {
    const selector = document.getElementById("moscowSelector");
    selector.innerHTML = '<option value="">Select Analysis</option>';
    this.taskManager.moscowAnalyses.forEach((analysis) => {
      const option = document.createElement("option");
      option.value = analysis.id;
      option.textContent = `${analysis.title} (${analysis.date})`;
      selector.appendChild(option);
    });
  }

  select(analysisId) {
    this.taskManager.selectedMoscowId = analysisId;
    const selector = document.getElementById("moscowSelector");
    selector.value = analysisId || "";

    const analysis = this.taskManager.moscowAnalyses.find(
      (a) => a.id === analysisId,
    );
    this.renderView(analysis);

    const editBtn = document.getElementById("editMoscowBtn");
    const deleteBtn = document.getElementById("deleteMoscowBtn");
    if (analysis) {
      editBtn.classList.remove("hidden");
      deleteBtn.classList.remove("hidden");
    } else {
      editBtn.classList.add("hidden");
      deleteBtn.classList.add("hidden");
    }
  }

  renderView(analysis) {
    const emptyState = document.getElementById("emptyMoscowState");
    const grid = document.getElementById("moscowGrid");

    if (!analysis) {
      emptyState.classList.remove("hidden");
      grid.classList.add("hidden");
      return;
    }

    emptyState.classList.add("hidden");
    grid.classList.remove("hidden");

    const renderItems = (items, category) => {
      if (!items || items.length === 0) {
        return '<li class="text-muted italic">No items yet</li>';
      }
      return items
        .map(
          (item, idx) => `
        <li class="flex justify-between items-start group">
          <span>${escapeHtml(item)}</span>
          <button onclick="taskManager.removeMoscowItem('${category}', ${idx})" class="opacity-0 group-hover:opacity-100 text-muted hover:text-error ml-2">x</button>
        </li>
      `,
        )
        .join("");
    };

    document.getElementById("moscowMust").innerHTML = renderItems(
      analysis.must,
      "must",
    );
    document.getElementById("moscowShould").innerHTML = renderItems(
      analysis.should,
      "should",
    );
    document.getElementById("moscowCould").innerHTML = renderItems(
      analysis.could,
      "could",
    );
    document.getElementById("moscowWont").innerHTML = renderItems(
      analysis.wont,
      "wont",
    );
  }

  editSelected() {
    if (this.taskManager.selectedMoscowId) {
      this.taskManager.moscowSidenavModule.openEdit(
        this.taskManager.selectedMoscowId,
      );
    }
  }

  async deleteSelected() {
    if (!this.taskManager.selectedMoscowId) return;
    if (!confirm("Delete this MoSCoW analysis?")) return;
    try {
      await MoscowAPI.delete(this.taskManager.selectedMoscowId);
      this.taskManager.selectedMoscowId = null;
      await this.load();
    } catch (error) {
      console.error("Error deleting MoSCoW:", error);
    }
  }

  async removeItem(category, index) {
    if (!this.taskManager.selectedMoscowId) return;
    const analysis = this.taskManager.moscowAnalyses.find(
      (a) => a.id === this.taskManager.selectedMoscowId,
    );
    if (!analysis) return;

    analysis[category].splice(index, 1);

    try {
      await MoscowAPI.update(this.taskManager.selectedMoscowId, analysis);
      this.renderView(analysis);
    } catch (error) {
      console.error("Error removing MoSCoW item:", error);
    }
  }

  bindEvents() {
    document
      .getElementById("moscowViewBtn")
      ?.addEventListener("click", () => {
        this.taskManager.switchView("moscow");
        document.getElementById("viewSelectorDropdown")?.classList.add(
          "hidden",
        );
      });

    document
      .getElementById("addMoscowBtn")
      ?.addEventListener(
        "click",
        () => this.taskManager.moscowSidenavModule.openNew(),
      );

    document
      .getElementById("moscowSelector")
      ?.addEventListener("change", (e) => this.select(e.target.value));

    document
      .getElementById("editMoscowBtn")
      ?.addEventListener("click", () => this.editSelected());
    document
      .getElementById("deleteMoscowBtn")
      ?.addEventListener("click", () => this.deleteSelected());

    document.querySelectorAll(".moscow-add-btn").forEach((btn) => {
      btn.addEventListener(
        "click",
        () =>
          this.taskManager.moscowSidenavModule.showAddItemInput(
            btn.dataset.category,
          ),
      );
    });
  }
}
