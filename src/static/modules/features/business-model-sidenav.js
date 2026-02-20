// Business Model Canvas Sidenav Module
// Slide-in panel for Business Model Canvas with inline item management

import { Sidenav } from "../ui/sidenav.js";
import { BusinessModelAPI } from "../api.js";
import { showToast } from "../ui/toast.js";
import { escapeHtml } from "../utils.js";

export class BusinessModelSidenavModule {
  constructor(taskManager) {
    this.tm = taskManager;
    this.editingCanvasId = null;
    this.currentCanvas = null;
    this.autoSaveTimeout = null;

    this.sections = [
      "keyPartners",
      "keyActivities",
      "keyResources",
      "valueProposition",
      "customerRelationships",
      "channels",
      "customerSegments",
      "costStructure",
      "revenueStreams",
    ];

    this.sectionNames = {
      keyPartners: "Key Partners",
      keyActivities: "Key Activities",
      keyResources: "Key Resources",
      valueProposition: "Value Proposition",
      customerRelationships: "Customer Relationships",
      channels: "Channels",
      customerSegments: "Customer Segments",
      costStructure: "Cost Structure",
      revenueStreams: "Revenue Streams",
    };
  }

  bindEvents() {
    document.getElementById("bmcSidenavClose")?.addEventListener(
      "click",
      () => this.close(),
    );
    document.getElementById("bmcSidenavCancel")?.addEventListener(
      "click",
      () => this.close(),
    );
    document.getElementById("bmcSidenavDelete")?.addEventListener(
      "click",
      () => this.handleDelete(),
    );

    document.getElementById("bmcSidenavTitle")?.addEventListener(
      "input",
      () => this.scheduleAutoSave(),
    );
    document.getElementById("bmcSidenavDate")?.addEventListener(
      "change",
      () => this.scheduleAutoSave(),
    );

    this.sections.forEach((section) => {
      document.getElementById(`bmcSidenav_add_${section}`)?.addEventListener(
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

    document.getElementById("bmcSidenavHeader").textContent =
      "New Business Model Canvas";
    this.fillForm();
    document.getElementById("bmcSidenavDelete").classList.add("hidden");
    Sidenav.open("bmcSidenav");
  }

  openEdit(canvasId) {
    const canvas = this.tm.businessModelCanvases.find((c) => c.id === canvasId);
    if (!canvas) return;

    this.editingCanvasId = canvasId;
    this.currentCanvas = JSON.parse(JSON.stringify(canvas));

    document.getElementById("bmcSidenavHeader").textContent =
      "Edit Business Model Canvas";
    this.fillForm();
    document.getElementById("bmcSidenavDelete").classList.remove("hidden");
    Sidenav.open("bmcSidenav");
  }

  close() {
    if (this.autoSaveTimeout) {
      clearTimeout(this.autoSaveTimeout);
      this.autoSaveTimeout = null;
    }
    Sidenav.close("bmcSidenav");
    this.editingCanvasId = null;
    this.currentCanvas = null;
  }

  fillForm() {
    document.getElementById("bmcSidenavTitle").value =
      this.currentCanvas.title || "";
    document.getElementById("bmcSidenavDate").value = this.currentCanvas.date ||
      "";
    this.sections.forEach((s) => this.renderSection(s));
  }

  renderSection(section) {
    const container = document.getElementById(`bmcSidenav_${section}`);
    if (!container) return;

    const items = this.currentCanvas[section] || [];

    container.innerHTML = items.length === 0
      ? '<div class="text-gray-400 dark:text-gray-500 text-sm italic py-1">No items</div>'
      : items.map((item, idx) => `
        <div class="flex items-start gap-2 py-1 group">
          <span class="flex-1 text-sm text-gray-700 dark:text-gray-300">${
        escapeHtml(item)
      }</span>
          <button onclick="taskManager.businessModelSidenavModule.removeItem('${section}', ${idx})"
                  class="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500 flex-shrink-0">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
            </svg>
          </button>
        </div>
      `).join("");
  }

  showAddItemInput(section) {
    const container = document.getElementById(`bmcSidenav_${section}`);
    const existingInput = container.querySelector(".bmc-add-input");
    if (existingInput) {
      existingInput.querySelector("input").focus();
      return;
    }

    const inputHtml = `
      <div class="bmc-add-input flex gap-2 mt-1">
        <input type="text" class="flex-1 px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
               placeholder="Enter item..." autofocus>
        <button type="button" class="px-2 py-1 text-xs bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 rounded">Add</button>
      </div>
    `;
    container.insertAdjacentHTML("beforeend", inputHtml);

    const inputWrapper = container.querySelector(".bmc-add-input");
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
    this.currentCanvas.title = document.getElementById("bmcSidenavTitle").value
      .trim();
    this.currentCanvas.date = document.getElementById("bmcSidenavDate").value;

    if (!this.currentCanvas.title) {
      this.showSaveStatus("Title required");
      return;
    }

    try {
      if (this.editingCanvasId) {
        await BusinessModelAPI.update(this.editingCanvasId, this.currentCanvas);
        this.showSaveStatus("Saved");
      } else {
        const response = await BusinessModelAPI.create(this.currentCanvas);
        const result = await response.json();
        this.editingCanvasId = result.id;
        this.currentCanvas.id = result.id;
        this.showSaveStatus("Created");
        document.getElementById("bmcSidenavHeader").textContent =
          "Edit Business Model Canvas";
        document.getElementById("bmcSidenavDelete").classList.remove("hidden");
      }
      await this.tm.businessModelModule.load();
    } catch (error) {
      console.error("Error saving Business Model Canvas:", error);
      this.showSaveStatus("Error");
      showToast("Error saving Business Model Canvas", "error");
    }
  }

  async handleDelete() {
    if (!this.editingCanvasId) return;
    if (
      !confirm(`Delete "${this.currentCanvas.title}"? This cannot be undone.`)
    ) return;

    try {
      await BusinessModelAPI.delete(this.editingCanvasId);
      showToast("Business Model Canvas deleted", "success");
      await this.tm.businessModelModule.load();
      this.close();
    } catch (error) {
      console.error("Error deleting Business Model Canvas:", error);
      showToast("Error deleting Business Model Canvas", "error");
    }
  }

  showSaveStatus(text) {
    const statusEl = document.getElementById("bmcSidenavSaveStatus");
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

export default BusinessModelSidenavModule;
