// Fishbone Sidenav Module
// Slide-in panel for creating, editing, and viewing Ishikawa diagrams.
// Edit mode uses a markdown-format textarea for causes (## Category / - subcause).

import { Sidenav } from "../ui/sidenav.js";
import { FishboneAPI } from "../api.js";
import { showToast } from "../ui/toast.js";
import { showConfirm } from "../ui/confirm.js";
import { escapeHtml } from "../utils.js";
import { buildFishboneSVG } from "./fishbone.js";

// ---------------------------------------------------------------
// Causes serialization — mirrors the server-side parser
// ---------------------------------------------------------------

function serializeCauses(causes) {
  if (!causes || causes.length === 0) return "";
  return causes
    .map((c) => {
      const lines = [`## ${c.category}`];
      for (const s of c.subcauses) {
        lines.push(`- ${s}`);
      }
      return lines.join("\n");
    })
    .join("\n\n");
}

function parseCausesText(text) {
  const causes = [];
  let current = null;
  for (const line of text.split("\n")) {
    if (line.startsWith("## ")) {
      if (current) causes.push(current);
      current = { category: line.slice(3).trim(), subcauses: [] };
    } else {
      const match = line.match(/^[-*]\s+(.+)$/);
      if (match && current) current.subcauses.push(match[1].trim());
    }
  }
  if (current) causes.push(current);
  return causes;
}

// ---------------------------------------------------------------
// Module
// ---------------------------------------------------------------

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
  }

  openView(diagramId) {
    const diagram = (this.tm.fishbones || []).find(
      (d) => d.id === diagramId,
    );
    if (!diagram) return;

    this.editingId = diagramId;
    document.getElementById("fishboneSidenavHeader").textContent =
      diagram.title;
    this._renderViewContent(diagram);
    this._showViewMode();
    document.getElementById("fishboneSidenavDelete").classList.remove("hidden");
    Sidenav.open("fishboneSidenav");
  }

  openNew() {
    this.editingId = null;
    document.getElementById("fishboneSidenavHeader").textContent =
      "New Diagram";
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
  // Private: mode switching
  // ------------------------------------------------------------------

  _showViewMode() {
    document
      .getElementById("fishboneSidenavViewSection")
      .classList.remove("hidden");
    document
      .getElementById("fishboneSidenavFormSection")
      .classList.add("hidden");
    document.getElementById("fishboneSidenavCancel").classList.add("hidden");
    document
      .getElementById("fishboneSidenavEditBtn")
      .classList.remove("hidden");
    document.getElementById("fishboneSidenavSave").classList.add("hidden");
  }

  _showEditMode() {
    document
      .getElementById("fishboneSidenavViewSection")
      .classList.add("hidden");
    document
      .getElementById("fishboneSidenavFormSection")
      .classList.remove("hidden");
    document
      .getElementById("fishboneSidenavCancel")
      .classList.remove("hidden");
    document.getElementById("fishboneSidenavEditBtn").classList.add("hidden");
    document.getElementById("fishboneSidenavSave").classList.remove("hidden");
  }

  _switchToEdit() {
    const diagram = (this.tm.fishbones || []).find(
      (d) => d.id === this.editingId,
    );
    if (!diagram) return;
    document.getElementById("fishboneSidenavHeader").textContent =
      "Edit Diagram";
    this._fillForm(diagram);
    this._showEditMode();
    document.getElementById("fishboneSidenavTitle")?.focus();
  }

  // ------------------------------------------------------------------
  // Private: view rendering
  // ------------------------------------------------------------------

  _renderViewContent(diagram) {
    const viewSection = document.getElementById("fishboneSidenavViewSection");
    if (!viewSection) return;

    const descHtml = diagram.description
      ? `<p class="fishbone-sidenav-desc">${escapeHtml(diagram.description)}</p>`
      : "";

    viewSection.innerHTML = `
      <div class="sidenav-section">
        ${descHtml}
        <div class="fishbone-sidenav-svg-wrap">${buildFishboneSVG(diagram)}</div>
        <div class="fishbone-sidenav-meta text-sm text-secondary" style="margin-top:0.75rem;">
          ${diagram.causes.length} cause categories &middot;
          ${diagram.causes.reduce((n, c) => n + c.subcauses.length, 0)} sub-causes
        </div>
      </div>
    `;
  }

  // ------------------------------------------------------------------
  // Private: form helpers
  // ------------------------------------------------------------------

  _clearForm() {
    document.getElementById("fishboneSidenavTitle").value = "";
    document.getElementById("fishboneSidenavDescription").value = "";
    // Default categories — matches server-side DEFAULT_CATEGORIES
    const defaultCauses = [
      { category: "People", subcauses: [] },
      { category: "Process", subcauses: [] },
      { category: "Machine", subcauses: [] },
      { category: "Material", subcauses: [] },
      { category: "Method", subcauses: [] },
      { category: "Measurement", subcauses: [] },
    ];
    document.getElementById("fishboneSidenavCauses").value =
      serializeCauses(defaultCauses);
  }

  _fillForm(diagram) {
    document.getElementById("fishboneSidenavTitle").value = diagram.title || "";
    document.getElementById("fishboneSidenavDescription").value =
      diagram.description || "";
    document.getElementById("fishboneSidenavCauses").value = serializeCauses(
      diagram.causes,
    );
  }

  _collectForm() {
    return {
      title: document.getElementById("fishboneSidenavTitle").value.trim(),
      description:
        document.getElementById("fishboneSidenavDescription").value.trim() ||
        undefined,
      causes: parseCausesText(
        document.getElementById("fishboneSidenavCauses").value,
      ),
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
      if (!res.ok) {
        showToast("Failed to save diagram", "error");
        return;
      }
    } else {
      const res = await FishboneAPI.create(data);
      if (!res.ok) {
        showToast("Failed to create diagram", "error");
        return;
      }
      const json = await res.json();
      this.editingId = json.id;
    }

    this.tm.fishbones = await FishboneAPI.fetchAll();
    this.tm.fishboneModule.renderView();
    showToast("Diagram saved");

    const saved = (this.tm.fishbones || []).find(
      (d) => d.id === this.editingId,
    );
    if (saved) {
      document.getElementById("fishboneSidenavHeader").textContent =
        saved.title;
      this._renderViewContent(saved);
      this._showViewMode();
      document
        .getElementById("fishboneSidenavDelete")
        .classList.remove("hidden");
    }
  }

  async handleDelete() {
    if (!this.editingId) return;
    const confirmed = await showConfirm("Delete this diagram?");
    if (!confirmed) return;

    const res = await FishboneAPI.delete(this.editingId);
    if (!res.ok) {
      showToast("Failed to delete diagram", "error");
      return;
    }

    this.tm.fishbones = await FishboneAPI.fetchAll();
    this.tm.fishboneModule.renderView();
    this.close();
    showToast("Diagram deleted");
  }
}
