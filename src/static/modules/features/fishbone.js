// Fishbone (Ishikawa) Diagram Module
// Card grid view — CSS-based, no SVG.

import { FishboneAPI } from "../api.js";
import { escapeHtml } from "../utils.js";
import { showLoading, hideLoading } from "../ui/loading.js";

export class FishboneModule {
  constructor(taskManager) {
    this.taskManager = taskManager;
  }

  async load() {
    showLoading("fishboneView");
    try {
      this.taskManager.fishbones = await FishboneAPI.fetchAll();
      this.renderView();
    } catch (error) {
      console.error("Error loading fishbone diagrams:", error);
    } finally {
      hideLoading("fishboneView");
    }
  }

  renderView() {
    const container = document.getElementById("fishboneContainer");
    const emptyState = document.getElementById("emptyFishboneState");
    if (!container) return;

    const diagrams = this.taskManager.fishbones || [];

    if (diagrams.length === 0) {
      emptyState?.classList.remove("hidden");
      container.innerHTML = "";
      return;
    }

    emptyState?.classList.add("hidden");
    container.innerHTML = diagrams.map((d) => this._renderCard(d)).join("");
  }

  _renderCard(diagram) {
    const desc = diagram.description
      ? `<p class="fishbone-card-desc">${escapeHtml(diagram.description)}</p>`
      : "";

    const causes = diagram.causes || [];
    const subCount = causes.reduce((n, c) => n + (c.subcauses || []).length, 0);

    const tags = causes.length > 0
      ? causes.map((c) =>
        `<span class="fishbone-cause-tag">${escapeHtml(c.category)}</span>`
      ).join("")
      : `<span class="fishbone-cause-empty">No causes yet</span>`;

    return `
      <div class="fishbone-card" onclick="taskManager.fishboneSidenavModule.openView('${diagram.id}')">
        <div class="fishbone-card-header">
          <span class="fishbone-card-title">${escapeHtml(diagram.title)}</span>
          <span class="fishbone-card-count">${causes.length} causes &middot; ${subCount} sub-causes</span>
        </div>
        ${desc}
        <div class="fishbone-card-causes">${tags}</div>
      </div>
    `;
  }

  bindEvents() {
    document.getElementById("addFishboneBtn")?.addEventListener(
      "click",
      () => this.taskManager.fishboneSidenavModule.openNew(),
    );
  }
}
