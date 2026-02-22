// MoSCoW Analysis Sidenav Module
// Slide-in panel for MoSCoW analysis with inline item management

import { Sidenav } from "../ui/sidenav.js";
import { MoscowAPI } from "../api.js";
import { showToast } from "../ui/toast.js";
import { escapeHtml } from "../utils.js";

const CATEGORIES = ["must", "should", "could", "wont"];
const CATEGORY_LABELS = {
  must: "Must Have",
  should: "Should Have",
  could: "Could Have",
  wont: "Won't Have",
};

export class MoscowSidenavModule {
  constructor(taskManager) {
    this.tm = taskManager;
    this.editingMoscowId = null;
    this.currentAnalysis = null;
    this.autoSaveTimeout = null;
  }

  bindEvents() {
    document.getElementById("moscowSidenavClose")?.addEventListener(
      "click",
      () => this.close(),
    );
    document.getElementById("moscowSidenavCancel")?.addEventListener(
      "click",
      () => this.close(),
    );
    document.getElementById("moscowSidenavDelete")?.addEventListener(
      "click",
      () => this.handleDelete(),
    );

    // Title and date auto-save
    document.getElementById("moscowSidenavTitle")?.addEventListener(
      "input",
      () => this.scheduleAutoSave(),
    );
    document.getElementById("moscowSidenavDate")?.addEventListener(
      "change",
      () => this.scheduleAutoSave(),
    );

    // Add item buttons
    CATEGORIES.forEach((category) => {
      document.getElementById(`moscowSidenav_add_${category}`)
        ?.addEventListener("click", () => {
          this.showAddItemInput(category);
        });
    });
  }

  openNew() {
    this.editingMoscowId = null;
    this.currentAnalysis = {
      title: "",
      date: new Date().toISOString().split("T")[0],
      must: [],
      should: [],
      could: [],
      wont: [],
    };

    document.getElementById("moscowSidenavHeader").textContent =
      "New MoSCoW Analysis";
    this.fillForm();
    document.getElementById("moscowSidenavDelete").classList.add("hidden");
    Sidenav.open("moscowSidenav");
  }

  openEdit(analysisId) {
    const analysis = this.tm.moscowAnalyses.find((a) => a.id === analysisId);
    if (!analysis) return;

    this.editingMoscowId = analysisId;
    this.currentAnalysis = JSON.parse(JSON.stringify(analysis));

    document.getElementById("moscowSidenavHeader").textContent =
      "Edit MoSCoW Analysis";
    this.fillForm();
    document.getElementById("moscowSidenavDelete").classList.remove("hidden");
    Sidenav.open("moscowSidenav");
  }

  close() {
    if (this.autoSaveTimeout) {
      clearTimeout(this.autoSaveTimeout);
      this.autoSaveTimeout = null;
    }
    Sidenav.close("moscowSidenav");
    this.editingMoscowId = null;
    this.currentAnalysis = null;
  }

  fillForm() {
    document.getElementById("moscowSidenavTitle").value =
      this.currentAnalysis.title || "";
    document.getElementById("moscowSidenavDate").value =
      this.currentAnalysis.date || "";
    this.renderAllCategories();
  }

  renderAllCategories() {
    CATEGORIES.forEach((c) => this.renderCategory(c));
  }

  renderCategory(category) {
    const container = document.getElementById(`moscowSidenav_${category}`);
    if (!container) return;

    const items = this.currentAnalysis[category] || [];

    container.innerHTML = items.length === 0
      ? '<div class="text-muted text-sm italic py-2">No items yet</div>'
      : items.map((item, idx) => `
        <div class="flex items-start gap-2 py-1 group">
          <span class="flex-1 text-sm text-secondary">${escapeHtml(item)}</span>
          <button onclick="taskManager.moscowSidenavModule.removeItem('${category}', ${idx})"
                  class="opacity-0 group-hover:opacity-100 text-muted hover:text-error flex-shrink-0">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
            </svg>
          </button>
        </div>
      `).join("");
  }

  showAddItemInput(category) {
    const container = document.getElementById(`moscowSidenav_${category}`);
    if (!container) return;

    const existingInput = container.querySelector(".moscow-add-input");
    if (existingInput) {
      existingInput.querySelector("input").focus();
      return;
    }

    const inputHtml = `
      <div class="moscow-add-input flex gap-2 mt-2">
        <input type="text" class="flex-1 px-2 py-1 text-sm border border-strong rounded bg-primary text-primary"
               placeholder="Enter item..." autofocus>
        <button type="button" class="px-2 py-1 text-xs bg-inverse text-inverse rounded hover:bg-inverse">Add</button>
        <button type="button" class="px-2 py-1 text-xs text-muted hover:text-secondary">Cancel</button>
      </div>
    `;
    container.insertAdjacentHTML("beforeend", inputHtml);

    const inputWrapper = container.querySelector(".moscow-add-input");
    const input = inputWrapper.querySelector("input");
    const addBtn = inputWrapper.querySelectorAll("button")[0];
    const cancelBtn = inputWrapper.querySelectorAll("button")[1];

    const addItem = () => {
      const text = input.value.trim();
      if (text) {
        this.currentAnalysis[category].push(text);
        this.renderCategory(category);
        this.scheduleAutoSave();
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

  removeItem(category, index) {
    this.currentAnalysis[category].splice(index, 1);
    this.renderCategory(category);
    this.scheduleAutoSave();
  }

  scheduleAutoSave() {
    if (this.autoSaveTimeout) clearTimeout(this.autoSaveTimeout);
    this.showSaveStatus("Saving...");
    this.autoSaveTimeout = setTimeout(() => this.save(), 1000);
  }

  async save() {
    this.currentAnalysis.title = document.getElementById(
      "moscowSidenavTitle",
    ).value.trim();
    this.currentAnalysis.date = document.getElementById(
      "moscowSidenavDate",
    ).value;

    if (!this.currentAnalysis.title) {
      this.showSaveStatus("Title required");
      return;
    }

    try {
      if (this.editingMoscowId) {
        await MoscowAPI.update(this.editingMoscowId, this.currentAnalysis);
        this.showSaveStatus("Saved");
      } else {
        const response = await MoscowAPI.create(this.currentAnalysis);
        const result = await response.json();
        this.editingMoscowId = result.id;
        this.currentAnalysis.id = result.id;
        this.showSaveStatus("Created");
        document.getElementById("moscowSidenavHeader").textContent =
          "Edit MoSCoW Analysis";
        document.getElementById("moscowSidenavDelete").classList.remove(
          "hidden",
        );
      }
      await this.tm.moscowModule.load();
    } catch (error) {
      console.error("Error saving MoSCoW:", error);
      this.showSaveStatus("Error");
      showToast("Error saving MoSCoW analysis", "error");
    }
  }

  async handleDelete() {
    if (!this.editingMoscowId) return;
    if (
      !confirm(
        `Delete "${this.currentAnalysis.title}"? This cannot be undone.`,
      )
    ) return;

    try {
      await MoscowAPI.delete(this.editingMoscowId);
      showToast("MoSCoW analysis deleted", "success");
      await this.tm.moscowModule.load();
      this.close();
    } catch (error) {
      console.error("Error deleting MoSCoW:", error);
      showToast("Error deleting MoSCoW analysis", "error");
    }
  }

  showSaveStatus(text) {
    const statusEl = document.getElementById("moscowSidenavSaveStatus");
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

export default MoscowSidenavModule;
