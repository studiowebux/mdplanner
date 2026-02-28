// Fishbone Sidenav Module
// Slide-in panel for creating, editing, and viewing Ishikawa diagrams.
// View mode: CSS grid layout (problem box + 2-column cause sections).
// Edit mode: inline add/remove causes and sub-causes.

import { Sidenav } from "../ui/sidenav.js";
import { FishboneAPI } from "../api.js";
import { showToast } from "../ui/toast.js";
import { showConfirm } from "../ui/confirm.js";
import { escapeHtml } from "../utils.js";

const DEFAULT_CATEGORIES = [
  "People",
  "Process",
  "Machine",
  "Material",
  "Method",
  "Measurement",
];

export class FishboneSidenavModule {
  constructor(taskManager) {
    this.tm = taskManager;
    this.editingId = null;
  }

  bindEvents() {
    document.getElementById("fishboneSidenavClose")?.addEventListener(
      "click",
      () => this.close(),
    );
    document.getElementById("fishboneSidenavCancel")?.addEventListener(
      "click",
      () => this.close(),
    );
    document.getElementById("fishboneSidenavSave")?.addEventListener(
      "click",
      () => this.handleSave(),
    );
    document.getElementById("fishboneSidenavDelete")?.addEventListener(
      "click",
      () => this.handleDelete(),
    );
    document.getElementById("fishboneSidenavEditBtn")?.addEventListener(
      "click",
      () => this._switchToEdit(),
    );

    // Causes editor — event delegation on the container
    const editor = document.getElementById("fishboneSidenavCausesEditor");
    if (editor) {
      editor.addEventListener("click", (e) => {
        const btn = e.target.closest("button");
        if (!btn) return;
        if (btn.classList.contains("fb-cat-remove")) {
          this._removeCat(parseInt(btn.dataset.catIdx, 10));
        } else if (btn.classList.contains("fb-sub-remove")) {
          this._removeSub(
            parseInt(btn.dataset.catIdx, 10),
            parseInt(btn.dataset.subIdx, 10),
          );
        } else if (btn.classList.contains("fb-sub-add-btn")) {
          const catIdx = parseInt(btn.dataset.catIdx, 10);
          const input = editor.querySelectorAll(".fb-sub-new-input")[catIdx];
          if (input && input.value.trim()) {
            this._addSub(catIdx, input.value.trim());
            input.value = "";
            editor.querySelectorAll(".fb-sub-new-input")[catIdx]?.focus();
          }
        } else if (btn.classList.contains("fb-add-cat-btn")) {
          this._addCat();
        }
      });

      editor.addEventListener("keydown", (e) => {
        if (e.key === "Enter" && e.target.classList.contains("fb-sub-new-input")) {
          e.preventDefault();
          const catIdx = parseInt(e.target.dataset.catIdx, 10);
          if (e.target.value.trim()) {
            this._addSub(catIdx, e.target.value.trim());
            e.target.value = "";
            editor.querySelectorAll(".fb-sub-new-input")[catIdx]?.focus();
          }
        }
      });
    }
  }

  openView(diagramId) {
    const diagram = (this.tm.fishbones || []).find((d) => d.id === diagramId);
    if (!diagram) return;

    this.editingId = diagramId;
    document.getElementById("fishboneSidenavHeader").textContent = diagram.title;
    this._renderViewContent(diagram);
    this._showViewMode();
    document.getElementById("fishboneSidenavDelete").classList.remove("hidden");
    Sidenav.open("fishboneSidenav");
  }

  openNew() {
    this.editingId = null;
    document.getElementById("fishboneSidenavHeader").textContent = "New Diagram";
    this._clearForm();
    document.getElementById("fishboneSidenavDelete").classList.add("hidden");
    this._showEditMode();
    Sidenav.open("fishboneSidenav");
    document.getElementById("fishboneSidenavTitle")?.focus();
  }

  close() {
    Sidenav.close("fishboneSidenav");
    this.editingId = null;
  }

  // ------------------------------------------------------------------
  // Mode switching
  // ------------------------------------------------------------------

  _showViewMode() {
    document.getElementById("fishboneSidenavViewSection").classList.remove("hidden");
    document.getElementById("fishboneSidenavFormSection").classList.add("hidden");
    document.getElementById("fishboneSidenavCancel").classList.add("hidden");
    document.getElementById("fishboneSidenavEditBtn").classList.remove("hidden");
    document.getElementById("fishboneSidenavSave").classList.add("hidden");
  }

  _showEditMode() {
    document.getElementById("fishboneSidenavViewSection").classList.add("hidden");
    document.getElementById("fishboneSidenavFormSection").classList.remove("hidden");
    document.getElementById("fishboneSidenavCancel").classList.remove("hidden");
    document.getElementById("fishboneSidenavEditBtn").classList.add("hidden");
    document.getElementById("fishboneSidenavSave").classList.remove("hidden");
  }

  _switchToEdit() {
    const diagram = (this.tm.fishbones || []).find((d) => d.id === this.editingId);
    if (!diagram) return;
    document.getElementById("fishboneSidenavHeader").textContent = "Edit Diagram";
    this._fillForm(diagram);
    this._showEditMode();
    document.getElementById("fishboneSidenavTitle")?.focus();
  }

  // ------------------------------------------------------------------
  // View rendering (CSS-based, no SVG)
  // ------------------------------------------------------------------

  _renderViewContent(diagram) {
    const viewSection = document.getElementById("fishboneSidenavViewSection");
    if (!viewSection) return;

    const causes = diagram.causes || [];
    const causesHtml = causes.map((cat) => {
      const items = (cat.subcauses || [])
        .map((s) => `<li>${escapeHtml(s)}</li>`)
        .join("");
      return `
        <div class="fb-cause-section">
          <div class="fb-cause-header">${escapeHtml(cat.category)}</div>
          ${
        items
          ? `<ul class="fb-cause-items">${items}</ul>`
          : `<p class="fb-cause-empty">No sub-causes</p>`
      }
        </div>
      `;
    }).join("");

    const meta = `${causes.length} cause categories &middot; ${
      causes.reduce((n, c) => n + (c.subcauses || []).length, 0)
    } sub-causes`;

    viewSection.innerHTML = `
      <div class="sidenav-section">
        ${
      diagram.description
        ? `<p class="fishbone-sidenav-desc">${escapeHtml(diagram.description)}</p>`
        : ""
    }
        <div class="fb-view-problem">${escapeHtml(diagram.title)}</div>
        ${
      causes.length > 0
        ? `<div class="fb-causes-grid">${causesHtml}</div>`
        : `<p class="text-sm text-muted" style="margin-top:0.75rem">No causes yet. Click Edit to add causes.</p>`
    }
        <p class="text-xs text-muted" style="margin-top:0.75rem">${meta}</p>
      </div>
    `;
  }

  // ------------------------------------------------------------------
  // Inline causes editor
  // ------------------------------------------------------------------

  _renderCausesEditor(causes) {
    const container = document.getElementById("fishboneSidenavCausesEditor");
    if (!container) return;

    container.innerHTML = causes.map((cat, catIdx) => `
      <div class="fb-cat-item" data-cat-idx="${catIdx}">
        <div class="fb-cat-item-header">
          <input class="form-input fb-cat-name-input"
                 data-cat-idx="${catIdx}"
                 value="${escapeHtml(cat.category)}"
                 placeholder="Category name">
          <button type="button" class="fb-cat-remove" data-cat-idx="${catIdx}"
                  title="Remove category">&#x2715;</button>
        </div>
        <ul class="fb-subcauses-list">
          ${
      (cat.subcauses || []).map((sub, subIdx) => `
            <li class="fb-sub-item">
              <span class="fb-sub-text">${escapeHtml(sub)}</span>
              <button type="button" class="fb-sub-remove"
                      data-cat-idx="${catIdx}" data-sub-idx="${subIdx}"
                      title="Remove">&#x2715;</button>
            </li>
          `).join("")
    }
        </ul>
        <div class="fb-add-sub-row">
          <input type="text" class="form-input fb-sub-new-input"
                 data-cat-idx="${catIdx}"
                 placeholder="Add sub-cause and press Enter">
          <button type="button" class="btn-secondary fb-sub-add-btn"
                  data-cat-idx="${catIdx}">Add</button>
        </div>
      </div>
    `).join("") + `
      <button type="button" class="btn-secondary fb-add-cat-btn">+ Add Category</button>
    `;
  }

  _collectCauses() {
    const container = document.getElementById("fishboneSidenavCausesEditor");
    if (!container) return [];
    return [...container.querySelectorAll(".fb-cat-item")].map((item, i) => {
      const nameInput = item.querySelector(".fb-cat-name-input");
      const subcauses = [...item.querySelectorAll(".fb-sub-text")]
        .map((el) => el.textContent.trim())
        .filter(Boolean);
      return {
        category: nameInput ? nameInput.value.trim() || `Category ${i + 1}` : `Category ${i + 1}`,
        subcauses,
      };
    });
  }

  _addCat() {
    const causes = this._collectCauses();
    causes.push({ category: "New Category", subcauses: [] });
    this._renderCausesEditor(causes);
    const inputs = document.querySelectorAll(".fb-cat-name-input");
    const last = inputs[inputs.length - 1];
    if (last) { last.focus(); last.select(); }
  }

  _removeCat(catIdx) {
    const causes = this._collectCauses();
    causes.splice(catIdx, 1);
    this._renderCausesEditor(causes);
  }

  _addSub(catIdx, text) {
    const causes = this._collectCauses();
    if (!causes[catIdx]) return;
    causes[catIdx].subcauses.push(text);
    this._renderCausesEditor(causes);
  }

  _removeSub(catIdx, subIdx) {
    const causes = this._collectCauses();
    if (!causes[catIdx]) return;
    causes[catIdx].subcauses.splice(subIdx, 1);
    this._renderCausesEditor(causes);
  }

  // ------------------------------------------------------------------
  // Form helpers
  // ------------------------------------------------------------------

  _clearForm() {
    document.getElementById("fishboneSidenavTitle").value = "";
    document.getElementById("fishboneSidenavDescription").value = "";
    this._renderCausesEditor(
      DEFAULT_CATEGORIES.map((cat) => ({ category: cat, subcauses: [] })),
    );
  }

  _fillForm(diagram) {
    document.getElementById("fishboneSidenavTitle").value = diagram.title || "";
    document.getElementById("fishboneSidenavDescription").value =
      diagram.description || "";
    this._renderCausesEditor(diagram.causes || []);
  }

  _collectForm() {
    return {
      title: document.getElementById("fishboneSidenavTitle").value.trim(),
      description:
        document.getElementById("fishboneSidenavDescription").value.trim() ||
        undefined,
      causes: this._collectCauses(),
    };
  }

  // ------------------------------------------------------------------
  // Handlers
  // ------------------------------------------------------------------

  async handleSave() {
    const data = this._collectForm();
    if (!data.title) {
      showToast("Diagram title is required", "error");
      return;
    }

    if (this.editingId) {
      const res = await FishboneAPI.update(this.editingId, data);
      if (!res.ok) { showToast("Failed to save diagram", "error"); return; }
    } else {
      const res = await FishboneAPI.create(data);
      if (!res.ok) { showToast("Failed to create diagram", "error"); return; }
      const json = await res.json();
      this.editingId = json.id;
    }

    this.tm.fishbones = await FishboneAPI.fetchAll();
    this.tm.fishboneModule.renderView();
    showToast("Diagram saved");

    const saved = (this.tm.fishbones || []).find((d) => d.id === this.editingId);
    if (saved) {
      document.getElementById("fishboneSidenavHeader").textContent = saved.title;
      this._renderViewContent(saved);
      this._showViewMode();
      document.getElementById("fishboneSidenavDelete").classList.remove("hidden");
    }
  }

  async handleDelete() {
    if (!this.editingId) return;
    const confirmed = await showConfirm("Delete this diagram?");
    if (!confirmed) return;

    const res = await FishboneAPI.delete(this.editingId);
    if (!res.ok) { showToast("Failed to delete diagram", "error"); return; }

    this.tm.fishbones = await FishboneAPI.fetchAll();
    this.tm.fishboneModule.renderView();
    this.close();
    showToast("Diagram deleted");
  }
}
