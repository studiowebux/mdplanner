// Eisenhower Matrix Sidenav Module
// Slide-in panel for Eisenhower matrix with inline item management

import { Sidenav } from "../ui/sidenav.js";
import { EisenhowerAPI } from "../api.js";
import { showToast } from "../ui/toast.js";
import { escapeHtml } from "../utils.js";

const QUADRANTS = [
  "urgentImportant",
  "notUrgentImportant",
  "urgentNotImportant",
  "notUrgentNotImportant",
];

export class EisenhowerSidenavModule {
  constructor(taskManager) {
    this.tm = taskManager;
    this.editingEisenhowerId = null;
    this.currentMatrix = null;
  }

  bindEvents() {
    document.getElementById("eisenhowerSidenavClose")?.addEventListener(
      "click",
      () => this.close(),
    );
    document.getElementById("eisenhowerSidenavCancel")?.addEventListener(
      "click",
      () => this.close(),
    );
    document.getElementById("eisenhowerSidenavDelete")?.addEventListener(
      "click",
      () => this.handleDelete(),
    );
    document.getElementById("eisenhowerSidenavSave")?.addEventListener(
      "click",
      () => this.save(),
    );

    QUADRANTS.forEach((quadrant) => {
      document.getElementById(`eisenhowerSidenav_add_${quadrant}`)
        ?.addEventListener("click", () => {
          this.showAddItemInput(quadrant);
        });
    });
  }

  openNew() {
    this.editingEisenhowerId = null;
    this.currentMatrix = {
      title: "",
      date: new Date().toISOString().split("T")[0],
      urgentImportant: [],
      notUrgentImportant: [],
      urgentNotImportant: [],
      notUrgentNotImportant: [],
    };

    document.getElementById("eisenhowerSidenavHeader").textContent =
      "New Eisenhower Matrix";
    this.fillForm();
    document.getElementById("eisenhowerSidenavDelete").classList.add("hidden");
    Sidenav.open("eisenhowerSidenav");
  }

  openEdit(matrixId) {
    const matrix = this.tm.eisenhowerMatrices.find((m) => m.id === matrixId);
    if (!matrix) return;

    this.editingEisenhowerId = matrixId;
    this.currentMatrix = JSON.parse(JSON.stringify(matrix));

    document.getElementById("eisenhowerSidenavHeader").textContent =
      "Edit Eisenhower Matrix";
    this.fillForm();
    document.getElementById("eisenhowerSidenavDelete").classList.remove(
      "hidden",
    );
    Sidenav.open("eisenhowerSidenav");
  }

  close() {
    Sidenav.close("eisenhowerSidenav");
    this.editingEisenhowerId = null;
    this.currentMatrix = null;
  }

  fillForm() {
    document.getElementById("eisenhowerSidenavTitle").value =
      this.currentMatrix.title || "";
    document.getElementById("eisenhowerSidenavDate").value =
      this.currentMatrix.date || "";
    this.renderAllQuadrants();
  }

  renderAllQuadrants() {
    QUADRANTS.forEach((q) => this.renderQuadrant(q));
  }

  renderQuadrant(quadrant) {
    const container = document.getElementById(
      `eisenhowerSidenav_${quadrant}`,
    );
    if (!container) return;

    const items = this.currentMatrix[quadrant] || [];

    container.innerHTML = items.length === 0
      ? '<div class="text-muted text-sm italic py-2">No items yet</div>'
      : items.map((item, idx) => `
        <div class="flex items-start gap-2 py-1 group">
          <span class="flex-1 text-sm text-secondary">${escapeHtml(item)}</span>
          <button onclick="taskManager.eisenhowerSidenavModule.removeItem('${quadrant}', ${idx})"
                  class="opacity-0 group-hover:opacity-100 text-muted hover:text-error flex-shrink-0">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
            </svg>
          </button>
        </div>
      `).join("");
  }

  showAddItemInput(quadrant) {
    const container = document.getElementById(
      `eisenhowerSidenav_${quadrant}`,
    );
    if (!container) return;

    const existingInput = container.querySelector(".eisenhower-add-input");
    if (existingInput) {
      existingInput.querySelector("input").focus();
      return;
    }

    const inputHtml = `
      <div class="eisenhower-add-input flex gap-2 mt-2">
        <input type="text" class="flex-1 px-2 py-1 text-sm border border-strong rounded bg-primary text-primary"
               placeholder="Enter item..." autofocus>
        <button type="button" class="px-2 py-1 text-xs bg-inverse text-inverse rounded hover:bg-inverse">Add</button>
        <button type="button" class="px-2 py-1 text-xs text-muted hover:text-secondary">Cancel</button>
      </div>
    `;
    container.insertAdjacentHTML("beforeend", inputHtml);

    const inputWrapper = container.querySelector(".eisenhower-add-input");
    const input = inputWrapper.querySelector("input");
    const addBtn = inputWrapper.querySelectorAll("button")[0];
    const cancelBtn = inputWrapper.querySelectorAll("button")[1];

    const addItem = () => {
      const text = input.value.trim();
      if (text) {
        this.currentMatrix[quadrant].push(text);
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
    this.currentMatrix[quadrant].splice(index, 1);
    this.renderQuadrant(quadrant);
  }

  async save() {
    this.currentMatrix.title = document.getElementById(
      "eisenhowerSidenavTitle",
    ).value.trim();
    this.currentMatrix.date = document.getElementById(
      "eisenhowerSidenavDate",
    ).value;

    if (!this.currentMatrix.title) {
      this.showSaveStatus("Title required");
      return;
    }

    try {
      if (this.editingEisenhowerId) {
        await EisenhowerAPI.update(
          this.editingEisenhowerId,
          this.currentMatrix,
        );
        this.showSaveStatus("Saved");
      } else {
        const response = await EisenhowerAPI.create(this.currentMatrix);
        const result = await response.json();
        this.editingEisenhowerId = result.id;
        this.currentMatrix.id = result.id;
        this.showSaveStatus("Created");
        document.getElementById("eisenhowerSidenavHeader").textContent =
          "Edit Eisenhower Matrix";
        document.getElementById("eisenhowerSidenavDelete").classList.remove(
          "hidden",
        );
      }
      await this.tm.eisenhowerModule.load();
    } catch (error) {
      console.error("Error saving Eisenhower matrix:", error);
      this.showSaveStatus("Error");
      showToast("Error saving Eisenhower matrix", "error");
    }
  }

  async handleDelete() {
    if (!this.editingEisenhowerId) return;
    if (
      !confirm(
        `Delete "${this.currentMatrix.title}"? This cannot be undone.`,
      )
    ) return;

    try {
      await EisenhowerAPI.delete(this.editingEisenhowerId);
      showToast("Eisenhower matrix deleted", "success");
      await this.tm.eisenhowerModule.load();
      this.close();
    } catch (error) {
      console.error("Error deleting Eisenhower matrix:", error);
      showToast("Error deleting Eisenhower matrix", "error");
    }
  }

  showSaveStatus(text) {
    const statusEl = document.getElementById("eisenhowerSidenavSaveStatus");
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

export default EisenhowerSidenavModule;
