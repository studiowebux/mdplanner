// Lean Canvas Sidenav Module
// Slide-in panel for Lean Canvas with inline item management

import { Sidenav } from "../ui/sidenav.js";
import { LeanCanvasAPI } from "../api.js";
import { showToast } from "../ui/toast.js";
import { escapeHtml } from "../utils.js";

export class LeanCanvasSidenavModule {
  constructor(taskManager) {
    this.tm = taskManager;
    this.editingCanvasId = null;
    this.currentCanvas = null;
    this.autoSaveTimeout = null;

    this.sections = [
      "problem",
      "solution",
      "uniqueValueProp",
      "unfairAdvantage",
      "customerSegments",
      "existingAlternatives",
      "keyMetrics",
      "highLevelConcept",
      "channels",
      "earlyAdopters",
      "costStructure",
      "revenueStreams",
    ];

    this.sectionNames = {
      problem: "Problem",
      solution: "Solution",
      uniqueValueProp: "Unique Value Proposition",
      unfairAdvantage: "Unfair Advantage",
      customerSegments: "Customer Segments",
      existingAlternatives: "Existing Alternatives",
      keyMetrics: "Key Metrics",
      highLevelConcept: "High-Level Concept",
      channels: "Channels",
      earlyAdopters: "Early Adopters",
      costStructure: "Cost Structure",
      revenueStreams: "Revenue Streams",
    };
  }

  bindEvents() {
    document.getElementById("leanCanvasSidenavClose")?.addEventListener(
      "click",
      () => this.close(),
    );
    document.getElementById("leanCanvasSidenavCancel")?.addEventListener(
      "click",
      () => this.close(),
    );
    document.getElementById("leanCanvasSidenavDelete")?.addEventListener(
      "click",
      () => this.handleDelete(),
    );

    document.getElementById("leanCanvasSidenavTitle")?.addEventListener(
      "input",
      () => this.scheduleAutoSave(),
    );
    document.getElementById("leanCanvasSidenavDate")?.addEventListener(
      "change",
      () => this.scheduleAutoSave(),
    );

    this.sections.forEach((section) => {
      document.getElementById(`leanSidenav_add_${section}`)?.addEventListener(
        "click",
        () => {
          this.showAddItemInput(section);
        },
      );
    });
  }

  openNew() {
    this.editingCanvasId = null;
    this.currentCanvas = {
      title: "",
      date: new Date().toISOString().split("T")[0],
    };
    this.sections.forEach((s) => this.currentCanvas[s] = []);

    document.getElementById("leanCanvasSidenavHeader").textContent =
      "New Lean Canvas";
    this.fillForm();
    document.getElementById("leanCanvasSidenavDelete").classList.add("hidden");
    Sidenav.open("leanCanvasSidenav");
  }

  openEdit(canvasId) {
    const canvas = this.tm.leanCanvases.find((c) => c.id === canvasId);
    if (!canvas) return;

    this.editingCanvasId = canvasId;
    this.currentCanvas = JSON.parse(JSON.stringify(canvas));

    document.getElementById("leanCanvasSidenavHeader").textContent =
      "Edit Lean Canvas";
    this.fillForm();
    document.getElementById("leanCanvasSidenavDelete").classList.remove(
      "hidden",
    );
    Sidenav.open("leanCanvasSidenav");
  }

  close() {
    if (this.autoSaveTimeout) {
      clearTimeout(this.autoSaveTimeout);
      this.autoSaveTimeout = null;
    }
    Sidenav.close("leanCanvasSidenav");
    this.editingCanvasId = null;
    this.currentCanvas = null;
  }

  fillForm() {
    document.getElementById("leanCanvasSidenavTitle").value =
      this.currentCanvas.title || "";
    document.getElementById("leanCanvasSidenavDate").value =
      this.currentCanvas.date || "";
    this.sections.forEach((s) => this.renderSection(s));
  }

  renderSection(section) {
    const container = document.getElementById(`leanSidenav_${section}`);
    if (!container) return;

    const items = this.currentCanvas[section] || [];

    container.innerHTML = items.length === 0
      ? '<div class="text-gray-400 dark:text-gray-500 text-sm italic py-1">No items</div>'
      : items.map((item, idx) => `
        <div class="flex items-start gap-2 py-1 group">
          <span class="flex-1 text-sm text-gray-700 dark:text-gray-300">${
        escapeHtml(item)
      }</span>
          <button onclick="taskManager.leanCanvasSidenavModule.removeItem('${section}', ${idx})"
                  class="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500 flex-shrink-0">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
            </svg>
          </button>
        </div>
      `).join("");
  }

  showAddItemInput(section) {
    const container = document.getElementById(`leanSidenav_${section}`);
    const existingInput = container.querySelector(".lean-add-input");
    if (existingInput) {
      existingInput.querySelector("input").focus();
      return;
    }

    const inputHtml = `
      <div class="lean-add-input flex gap-2 mt-1">
        <input type="text" class="flex-1 px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
               placeholder="Enter item..." autofocus>
        <button type="button" class="px-2 py-1 text-xs bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 rounded">Add</button>
      </div>
    `;
    container.insertAdjacentHTML("beforeend", inputHtml);

    const inputWrapper = container.querySelector(".lean-add-input");
    const input = inputWrapper.querySelector("input");
    const addBtn = inputWrapper.querySelector("button");

    const addItem = () => {
      const text = input.value.trim();
      if (text) {
        this.currentCanvas[section].push(text);
        this.renderSection(section);
        this.scheduleAutoSave();
      }
      inputWrapper.remove();
    };

    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter") addItem();
      if (e.key === "Escape") inputWrapper.remove();
    });
    addBtn.addEventListener("click", addItem);
    input.focus();
  }

  removeItem(section, index) {
    this.currentCanvas[section].splice(index, 1);
    this.renderSection(section);
    this.scheduleAutoSave();
  }

  scheduleAutoSave() {
    if (this.autoSaveTimeout) clearTimeout(this.autoSaveTimeout);
    this.showSaveStatus("Saving...");
    this.autoSaveTimeout = setTimeout(() => this.save(), 1000);
  }

  async save() {
    this.currentCanvas.title = document.getElementById("leanCanvasSidenavTitle")
      .value.trim();
    this.currentCanvas.date =
      document.getElementById("leanCanvasSidenavDate").value;

    if (!this.currentCanvas.title) {
      this.showSaveStatus("Title required");
      return;
    }

    try {
      if (this.editingCanvasId) {
        await LeanCanvasAPI.update(this.editingCanvasId, this.currentCanvas);
        this.showSaveStatus("Saved");
      } else {
        const response = await LeanCanvasAPI.create(this.currentCanvas);
        const result = await response.json();
        this.editingCanvasId = result.id;
        this.currentCanvas.id = result.id;
        this.showSaveStatus("Created");
        document.getElementById("leanCanvasSidenavHeader").textContent =
          "Edit Lean Canvas";
        document.getElementById("leanCanvasSidenavDelete").classList.remove(
          "hidden",
        );
      }
      await this.tm.leanCanvasModule.load();
    } catch (error) {
      console.error("Error saving Lean Canvas:", error);
      this.showSaveStatus("Error");
      showToast("Error saving Lean Canvas", "error");
    }
  }

  async handleDelete() {
    if (!this.editingCanvasId) return;
    if (
      !confirm(`Delete "${this.currentCanvas.title}"? This cannot be undone.`)
    ) return;

    try {
      await LeanCanvasAPI.delete(this.editingCanvasId);
      showToast("Lean Canvas deleted", "success");
      await this.tm.leanCanvasModule.load();
      this.close();
    } catch (error) {
      console.error("Error deleting Lean Canvas:", error);
      showToast("Error deleting Lean Canvas", "error");
    }
  }

  showSaveStatus(text) {
    const statusEl = document.getElementById("leanCanvasSidenavSaveStatus");
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
      setTimeout(() => statusEl.classList.add("hidden"), 2000);
    }
  }
}

export default LeanCanvasSidenavModule;
