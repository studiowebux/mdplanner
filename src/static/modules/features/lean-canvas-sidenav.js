// Lean Canvas Sidenav Module
// Slide-in panel for Lean Canvas with inline item management

import { Sidenav } from "../ui/sidenav.js";
import { LeanCanvasAPI } from "../api.js";
import { showToast } from "../ui/toast.js";
import { escapeHtml, extractErrorMessage } from "../utils.js";
import { showConfirm } from "../ui/confirm.js";

export class LeanCanvasSidenavModule {
  constructor(taskManager) {
    this.tm = taskManager;
    this.editingCanvasId = null;
    this.currentCanvas = null;
    this._originalCanvas = null;
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
    // Intercept ESC before sidenav.js closes without running our state cleanup.
    // lean-canvas has its own dirty-state check and close() logic, so we handle
    // ESC here to ensure both are exercised.
    this._escCapture = (e) => {
      if (e.key === "Escape" && Sidenav.isOpen("leanCanvasSidenav")) {
        e.stopImmediatePropagation();
        this.close();
      }
    };
    document.addEventListener("keydown", this._escCapture, true);

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
    document.getElementById("leanCanvasSidenavSave")?.addEventListener(
      "click",
      () => this.save(),
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
    this._originalCanvas = JSON.parse(JSON.stringify(this.currentCanvas));

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
    this._originalCanvas = JSON.parse(JSON.stringify(canvas));

    document.getElementById("leanCanvasSidenavHeader").textContent =
      "Edit Lean Canvas";
    this.fillForm();
    document.getElementById("leanCanvasSidenavDelete").classList.remove(
      "hidden",
    );
    Sidenav.open("leanCanvasSidenav");
  }

  _isDirty() {
    if (!this.currentCanvas) return false;
    const title =
      document.getElementById("leanCanvasSidenavTitle")?.value.trim() ?? "";
    if (title !== (this._originalCanvas?.title ?? "")) return true;
    for (const s of this.sections) {
      if (
        JSON.stringify(this.currentCanvas[s] || []) !==
          JSON.stringify(this._originalCanvas?.[s] || [])
      ) return true;
    }
    return false;
  }

  async close() {
    if (this._isDirty() && !(await showConfirm("You have unsaved changes. Close anyway?", "Close"))) {
      return;
    }
    Sidenav.close("leanCanvasSidenav");
    this.editingCanvasId = null;
    this.currentCanvas = null;
    this._originalCanvas = null;
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
      ? '<div class="text-muted text-sm italic py-1">No items</div>'
      : items.map((item, idx) => `
        <div class="flex items-start gap-2 py-1 group" data-item-idx="${idx}">
          <span class="flex-1 text-sm text-secondary">${escapeHtml(item)}</span>
          <button onclick="taskManager.leanCanvasSidenavModule.editItem('${section}', ${idx})"
                  class="opacity-0 group-hover:opacity-100 text-muted hover:text-primary flex-shrink-0" title="Edit">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"/>
            </svg>
          </button>
          <button onclick="taskManager.leanCanvasSidenavModule.removeItem('${section}', ${idx})"
                  class="opacity-0 group-hover:opacity-100 text-muted hover:text-error flex-shrink-0" title="Remove">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
            </svg>
          </button>
        </div>
      `).join("");
  }

  editItem(section, index) {
    const container = document.getElementById(`leanSidenav_${section}`);
    const row = container.querySelector(`[data-item-idx="${index}"]`);
    if (!row) return;

    const currentText = this.currentCanvas[section][index];
    const inputHtml = `
      <div class="lean-edit-input flex gap-2 w-full mt-1">
        <input type="text" class="flex-1 px-2 py-1 text-sm border border-strong rounded bg-primary text-primary"
               value="${escapeHtml(currentText)}">
        <button type="button" class="px-2 py-1 text-xs bg-inverse text-inverse rounded">Save</button>
        <button type="button" class="px-2 py-1 text-xs border border-default rounded">Cancel</button>
      </div>
    `;
    row.outerHTML = inputHtml;

    const inputWrapper = container.querySelector(".lean-edit-input");
    const input = inputWrapper.querySelector("input");
    const [saveBtn, cancelBtn] = inputWrapper.querySelectorAll("button");

    const saveEdit = () => {
      const text = input.value.trim();
      if (text) this.currentCanvas[section][index] = text;
      this.renderSection(section);
    };

    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter") { e.preventDefault(); saveEdit(); }
      if (e.key === "Escape") { e.stopPropagation(); this.renderSection(section); }
    });
    saveBtn.addEventListener("click", saveEdit);
    cancelBtn.addEventListener("click", () => this.renderSection(section));
    input.focus();
    input.select();
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
        <input type="text" class="flex-1 px-2 py-1 text-sm border border-strong rounded bg-primary text-primary"
               placeholder="Enter item..." autofocus>
        <button type="button" class="px-2 py-1 text-xs bg-inverse text-inverse rounded">Add</button>
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
        const res = await LeanCanvasAPI.update(this.editingCanvasId, this.currentCanvas);
        if (!res.ok) {
          const errBody = await res.json().catch(() => ({}));
          const errMsg = extractErrorMessage(errBody);
          this.showSaveStatus(errMsg);
          showToast(errMsg, "error");
          return;
        }
        this.showSaveStatus("Saved"); showToast("Saved", "success");
      } else {
        const response = await LeanCanvasAPI.create(this.currentCanvas);
        if (!response.ok) {
          const errBody = await response.json().catch(() => ({}));
          const errMsg = extractErrorMessage(errBody);
          this.showSaveStatus(errMsg);
          showToast(errMsg, "error");
          return;
        }
        const result = await response.json();
        this.editingCanvasId = result.id;
        this.currentCanvas.id = result.id;
        this.showSaveStatus("Created"); showToast("Created", "success");
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
      showToast(error.message || "Error saving Lean Canvas", "error");
    }
  }

  async handleDelete() {
    if (!this.editingCanvasId) return;
    if (
      !(await showConfirm(`Delete "${this.currentCanvas.title}"? This cannot be undone.`))
    ) return;

    try {
      const res = await LeanCanvasAPI.delete(this.editingCanvasId);
      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}));
        showToast(extractErrorMessage(errBody), "error");
        return;
      }
      showToast("Lean Canvas deleted", "success");
      await this.tm.leanCanvasModule.load();
      this.close();
    } catch (error) {
      console.error("Error deleting Lean Canvas:", error);
      showToast(error.message || "Error deleting Lean Canvas", "error");
    }
  }

  showSaveStatus(text) {
    const statusEl = document.getElementById("leanCanvasSidenavSaveStatus");
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

export default LeanCanvasSidenavModule;
