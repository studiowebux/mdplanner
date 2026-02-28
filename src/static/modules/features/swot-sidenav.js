// SWOT Analysis Sidenav Module
// Slide-in panel for SWOT analysis with inline item management

import { Sidenav } from "../ui/sidenav.js";
import { SwotAPI } from "../api.js";
import { showToast } from "../ui/toast.js";
import { escapeHtml } from "../utils.js";

export class SwotSidenavModule {
  constructor(taskManager) {
    this.tm = taskManager;
    this.editingSwotId = null;
    this.currentSwot = null;
  }

  bindEvents() {
    document.getElementById("swotSidenavClose")?.addEventListener(
      "click",
      () => this.close(),
    );
    document.getElementById("swotSidenavCancel")?.addEventListener(
      "click",
      () => this.close(),
    );
    document.getElementById("swotSidenavDelete")?.addEventListener(
      "click",
      () => this.handleDelete(),
    );
    document.getElementById("swotSidenavSave")?.addEventListener(
      "click",
      () => this.save(),
    );

    // Add item buttons
    ["strengths", "weaknesses", "opportunities", "threats"].forEach(
      (quadrant) => {
        document.getElementById(`swotSidenav_add_${quadrant}`)
          ?.addEventListener("click", () => {
            this.showAddItemInput(quadrant);
          });
      },
    );
  }

  openNew() {
    this.editingSwotId = null;
    this.currentSwot = {
      title: "",
      date: new Date().toISOString().split("T")[0],
      strengths: [],
      weaknesses: [],
      opportunities: [],
      threats: [],
    };

    document.getElementById("swotSidenavHeader").textContent =
      "New SWOT Analysis";
    this.fillForm();
    document.getElementById("swotSidenavDelete").classList.add("hidden");
    Sidenav.open("swotSidenav");
  }

  openEdit(swotId) {
    const swot = this.tm.swotAnalyses.find((s) => s.id === swotId);
    if (!swot) return;

    this.editingSwotId = swotId;
    this.currentSwot = JSON.parse(JSON.stringify(swot)); // Deep copy

    document.getElementById("swotSidenavHeader").textContent =
      "Edit SWOT Analysis";
    this.fillForm();
    document.getElementById("swotSidenavDelete").classList.remove("hidden");
    Sidenav.open("swotSidenav");
  }

  close() {
    Sidenav.close("swotSidenav");
    this.editingSwotId = null;
    this.currentSwot = null;
  }

  fillForm() {
    document.getElementById("swotSidenavTitle").value =
      this.currentSwot.title || "";
    document.getElementById("swotSidenavDate").value = this.currentSwot.date ||
      "";
    this.renderAllQuadrants();
  }

  renderAllQuadrants() {
    ["strengths", "weaknesses", "opportunities", "threats"].forEach((q) =>
      this.renderQuadrant(q)
    );
  }

  renderQuadrant(quadrant) {
    const container = document.getElementById(`swotSidenav_${quadrant}`);
    if (!container) return;

    const items = this.currentSwot[quadrant] || [];

    container.innerHTML = items.length === 0
      ? '<div class="text-muted text-sm italic py-2">No items yet</div>'
      : items.map((item, idx) => `
        <div class="flex items-start gap-2 py-1 group">
          <span class="flex-1 text-sm text-secondary">${
        escapeHtml(item)
      }</span>
          <button onclick="taskManager.swotSidenavModule.removeItem('${quadrant}', ${idx})"
                  class="opacity-0 group-hover:opacity-100 text-muted hover:text-error flex-shrink-0">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
            </svg>
          </button>
        </div>
      `).join("");
  }

  showAddItemInput(quadrant) {
    const container = document.getElementById(`swotSidenav_${quadrant}`);
    const existingInput = container.querySelector(".swot-add-input");
    if (existingInput) {
      existingInput.querySelector("input").focus();
      return;
    }

    const inputHtml = `
      <div class="swot-add-input flex gap-2 mt-2">
        <input type="text" class="flex-1 px-2 py-1 text-sm border border-strong rounded bg-primary text-primary"
               placeholder="Enter item..." autofocus>
        <button type="button" class="px-2 py-1 text-xs bg-inverse text-inverse rounded hover:bg-inverse">Add</button>
        <button type="button" class="px-2 py-1 text-xs text-muted hover:text-secondary">Cancel</button>
      </div>
    `;
    container.insertAdjacentHTML("beforeend", inputHtml);

    const inputWrapper = container.querySelector(".swot-add-input");
    const input = inputWrapper.querySelector("input");
    const addBtn = inputWrapper.querySelectorAll("button")[0];
    const cancelBtn = inputWrapper.querySelectorAll("button")[1];

    const addItem = () => {
      const text = input.value.trim();
      if (text) {
        this.currentSwot[quadrant].push(text);
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
    this.currentSwot[quadrant].splice(index, 1);
    this.renderQuadrant(quadrant);
  }

  async save() {
    this.currentSwot.title = document.getElementById("swotSidenavTitle").value
      .trim();
    this.currentSwot.date = document.getElementById("swotSidenavDate").value;

    if (!this.currentSwot.title) {
      this.showSaveStatus("Title required");
      return;
    }

    try {
      if (this.editingSwotId) {
        await SwotAPI.update(this.editingSwotId, this.currentSwot);
        this.showSaveStatus("Saved");
      } else {
        const response = await SwotAPI.create(this.currentSwot);
        const result = await response.json();
        this.editingSwotId = result.id;
        this.currentSwot.id = result.id;
        this.showSaveStatus("Created");
        document.getElementById("swotSidenavHeader").textContent =
          "Edit SWOT Analysis";
        document.getElementById("swotSidenavDelete").classList.remove("hidden");
      }
      await this.tm.swotModule.load();
    } catch (error) {
      console.error("Error saving SWOT:", error);
      this.showSaveStatus("Error");
      showToast("Error saving SWOT analysis", "error");
    }
  }

  async handleDelete() {
    if (!this.editingSwotId) return;
    if (
      !confirm(`Delete "${this.currentSwot.title}"? This cannot be undone.`)
    ) return;

    try {
      await SwotAPI.delete(this.editingSwotId);
      showToast("SWOT analysis deleted", "success");
      await this.tm.swotModule.load();
      this.close();
    } catch (error) {
      console.error("Error deleting SWOT:", error);
      showToast("Error deleting SWOT analysis", "error");
    }
  }

  showSaveStatus(text) {
    const statusEl = document.getElementById("swotSidenavSaveStatus");
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

export default SwotSidenavModule;
