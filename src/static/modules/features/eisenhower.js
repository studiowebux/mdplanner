import { EisenhowerAPI } from "../api.js";
import { escapeHtml } from "../utils.js";

const QUADRANT_LABELS = {
  urgentImportant: "Do First",
  notUrgentImportant: "Schedule",
  urgentNotImportant: "Delegate",
  notUrgentNotImportant: "Eliminate",
};

/**
 * EisenhowerModule - Handles Eisenhower Matrix (Urgent/Important 2x2 grid)
 */
export class EisenhowerModule {
  constructor(taskManager) {
    this.taskManager = taskManager;
  }

  async load() {
    try {
      this.taskManager.eisenhowerMatrices = await EisenhowerAPI.fetchAll();
      this.renderSelector();
      if (
        this.taskManager.eisenhowerMatrices.length > 0 &&
        !this.taskManager.selectedEisenhowerId
      ) {
        this.select(this.taskManager.eisenhowerMatrices[0].id);
      } else if (this.taskManager.selectedEisenhowerId) {
        this.select(this.taskManager.selectedEisenhowerId);
      } else {
        this.renderView(null);
      }
    } catch (error) {
      console.error("Error loading Eisenhower matrices:", error);
    }
  }

  renderSelector() {
    const selector = document.getElementById("eisenhowerSelector");
    selector.innerHTML = '<option value="">Select Matrix</option>';
    this.taskManager.eisenhowerMatrices.forEach((matrix) => {
      const option = document.createElement("option");
      option.value = matrix.id;
      option.textContent = `${matrix.title} (${matrix.date})`;
      selector.appendChild(option);
    });
  }

  select(matrixId) {
    this.taskManager.selectedEisenhowerId = matrixId;
    const selector = document.getElementById("eisenhowerSelector");
    selector.value = matrixId || "";

    const matrix = this.taskManager.eisenhowerMatrices.find(
      (m) => m.id === matrixId,
    );
    this.renderView(matrix);

    const editBtn = document.getElementById("editEisenhowerBtn");
    const deleteBtn = document.getElementById("deleteEisenhowerBtn");
    if (matrix) {
      editBtn.classList.remove("hidden");
      deleteBtn.classList.remove("hidden");
    } else {
      editBtn.classList.add("hidden");
      deleteBtn.classList.add("hidden");
    }
  }

  renderView(matrix) {
    const emptyState = document.getElementById("emptyEisenhowerState");
    const grid = document.getElementById("eisenhowerGrid");

    if (!matrix) {
      emptyState.classList.remove("hidden");
      grid.classList.add("hidden");
      return;
    }

    emptyState.classList.add("hidden");
    grid.classList.remove("hidden");

    const renderItems = (items, quadrant) => {
      if (!items || items.length === 0) {
        return '<li class="text-muted italic">No items yet</li>';
      }
      return items
        .map(
          (item, idx) => `
        <li class="flex justify-between items-start group">
          <span>${escapeHtml(item)}</span>
          <button onclick="taskManager.removeEisenhowerItem('${quadrant}', ${idx})" class="opacity-0 group-hover:opacity-100 text-muted hover:text-error ml-2">x</button>
        </li>
      `,
        )
        .join("");
    };

    document.getElementById("eisenhowerUrgentImportant").innerHTML =
      renderItems(matrix.urgentImportant, "urgentImportant");
    document.getElementById("eisenhowerNotUrgentImportant").innerHTML =
      renderItems(matrix.notUrgentImportant, "notUrgentImportant");
    document.getElementById("eisenhowerUrgentNotImportant").innerHTML =
      renderItems(matrix.urgentNotImportant, "urgentNotImportant");
    document.getElementById("eisenhowerNotUrgentNotImportant").innerHTML =
      renderItems(matrix.notUrgentNotImportant, "notUrgentNotImportant");
  }

  editSelected() {
    if (this.taskManager.selectedEisenhowerId) {
      this.taskManager.eisenhowerSidenavModule.openEdit(
        this.taskManager.selectedEisenhowerId,
      );
    }
  }

  async deleteSelected() {
    if (!this.taskManager.selectedEisenhowerId) return;
    if (!confirm("Delete this Eisenhower matrix?")) return;
    try {
      await EisenhowerAPI.delete(this.taskManager.selectedEisenhowerId);
      this.taskManager.selectedEisenhowerId = null;
      await this.load();
    } catch (error) {
      console.error("Error deleting Eisenhower matrix:", error);
    }
  }

  async removeItem(quadrant, index) {
    if (!this.taskManager.selectedEisenhowerId) return;
    const matrix = this.taskManager.eisenhowerMatrices.find(
      (m) => m.id === this.taskManager.selectedEisenhowerId,
    );
    if (!matrix) return;

    matrix[quadrant].splice(index, 1);

    try {
      await EisenhowerAPI.update(
        this.taskManager.selectedEisenhowerId,
        matrix,
      );
      this.renderView(matrix);
    } catch (error) {
      console.error("Error removing Eisenhower item:", error);
    }
  }

  bindEvents() {
    document
      .getElementById("eisenhowerViewBtn")
      ?.addEventListener("click", () => {
        this.taskManager.switchView("eisenhower");
        document.getElementById("viewSelectorDropdown")?.classList.add(
          "hidden",
        );
      });

    document
      .getElementById("addEisenhowerBtn")
      ?.addEventListener(
        "click",
        () => this.taskManager.eisenhowerSidenavModule.openNew(),
      );

    document
      .getElementById("eisenhowerSelector")
      ?.addEventListener("change", (e) => this.select(e.target.value));

    document
      .getElementById("editEisenhowerBtn")
      ?.addEventListener("click", () => this.editSelected());
    document
      .getElementById("deleteEisenhowerBtn")
      ?.addEventListener("click", () => this.deleteSelected());

    document.querySelectorAll(".eisenhower-add-btn").forEach((btn) => {
      btn.addEventListener(
        "click",
        () =>
          this.taskManager.eisenhowerSidenavModule.showAddItemInput(
            btn.dataset.quadrant,
          ),
      );
    });
  }
}
