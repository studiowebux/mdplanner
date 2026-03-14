import { ReflectionsAPI, ReflectionTemplatesAPI } from "../api.js";
import { showLoading, hideLoading } from "../ui/loading.js";
import { filterBySearchQuery } from "../utils.js";

/**
 * ReflectionModule - Handles reflection list display with tabs for
 * Reflections and Templates.
 */
export class ReflectionModule {
  constructor(taskManager) {
    this.taskManager = taskManager;
    this.searchQuery = "";
    this.activeTab = "reflections";
  }

  async load() {
    showLoading("reflectionView");
    try {
      const [reflections, templates] = await Promise.all([
        ReflectionsAPI.fetchAll(),
        ReflectionTemplatesAPI.fetchAll(),
      ]);
      this.taskManager.reflections = reflections;
      this.taskManager.reflectionTemplates = templates;
      this.renderView();
    } catch (error) {
      console.error("ReflectionModule.load failed", { error: error.message });
    } finally {
      hideLoading("reflectionView");
    }
  }

  _getVisibleReflections() {
    return filterBySearchQuery(
      this.taskManager.reflections || [],
      this.searchQuery,
      (r) => [
        r.title || "",
        ...(r.questions || []).flatMap((qn) => [qn.question, qn.answer || ""]),
      ],
    );
  }

  _getVisibleTemplates() {
    return filterBySearchQuery(
      this.taskManager.reflectionTemplates || [],
      this.searchQuery,
      (t) => [t.title || "", t.description || ""],
    );
  }

  renderView() {
    this._syncTabs();

    if (this.activeTab === "reflections") {
      this._renderReflections();
    } else {
      this._renderTemplates();
    }
  }

  _syncTabs() {
    const tabReflections = document.getElementById(
      "reflectionTabReflections",
    );
    const tabTemplates = document.getElementById("reflectionTabTemplates");
    if (!tabReflections || !tabTemplates) return;

    if (this.activeTab === "reflections") {
      tabReflections.classList.add("active");
      tabReflections.setAttribute("aria-selected", "true");
      tabTemplates.classList.remove("active");
      tabTemplates.setAttribute("aria-selected", "false");
    } else {
      tabTemplates.classList.add("active");
      tabTemplates.setAttribute("aria-selected", "true");
      tabReflections.classList.remove("active");
      tabReflections.setAttribute("aria-selected", "false");
    }
  }

  _renderReflections() {
    const container = document.getElementById("reflectionContainer");
    const emptyState = document.getElementById("emptyReflectionState");
    const templateContainer = document.getElementById(
      "reflectionTemplatesContainer",
    );
    if (!container || !emptyState) return;

    if (templateContainer) templateContainer.classList.add("hidden");

    const visible = this._getVisibleReflections();

    if (
      !this.taskManager.reflections ||
      this.taskManager.reflections.length === 0
    ) {
      emptyState.classList.remove("hidden");
      container.innerHTML = "";
      container.classList.add("hidden");
      return;
    }

    emptyState.classList.add("hidden");

    if (visible.length === 0) {
      container.classList.remove("hidden");
      container.innerHTML =
        '<p class="text-sm text-muted col-span-full text-center py-8">No reflections match the current filters.</p>';
      return;
    }

    container.classList.remove("hidden");
    container.innerHTML = visible
      .map((r) => {
        const answeredCount = (r.questions || []).filter(
          (q) => q.answer && q.answer.trim(),
        ).length;
        const totalCount = (r.questions || []).length;
        const tagsHtml = (r.tags || [])
          .map(
            (t) =>
              `<span class="inline-block px-2 py-0.5 text-xs bg-active text-secondary rounded">${t}</span>`,
          )
          .join("");

        const templateLabel = r.templateId
          ? this._templateName(r.templateId)
          : null;

        return `
      <div class="bg-secondary rounded-lg p-4 border border-default reflection-card">
        <div class="flex justify-between items-start mb-2">
          <h3 class="font-medium text-primary">${r.title}</h3>
          <span class="px-2 py-1 text-xs rounded bg-info-bg text-info-text">${answeredCount}/${totalCount}</span>
        </div>
        ${templateLabel ? `<p class="text-xs text-muted mb-1">Template: ${templateLabel}</p>` : ""}
        ${tagsHtml ? `<div class="flex flex-wrap gap-1 mb-2">${tagsHtml}</div>` : ""}
        <p class="text-xs text-muted mb-2">Created: ${r.created ? r.created.slice(0, 10) : ""}</p>
        <div class="reflection-card-questions">
          ${(r.questions || [])
            .slice(0, 3)
            .map(
              (q) =>
                `<p class="text-xs text-secondary truncate">${q.answer ? "&#10003;" : "&#9711;"} ${q.question}</p>`,
            )
            .join("")}
          ${totalCount > 3 ? `<p class="text-xs text-muted">+${totalCount - 3} more</p>` : ""}
        </div>
        <div class="flex justify-end gap-1 mt-3">
          <button type="button" onclick="taskManager.reflectionSidenavModule.openEdit('${r.id}')" class="btn-ghost">Edit</button>
          <button type="button" onclick="taskManager.deleteReflection('${r.id}')" class="btn-danger-ghost">Delete</button>
        </div>
      </div>`;
      })
      .join("");
  }

  _renderTemplates() {
    const container = document.getElementById("reflectionContainer");
    const emptyState = document.getElementById("emptyReflectionState");
    const templateContainer = document.getElementById(
      "reflectionTemplatesContainer",
    );
    if (!container || !templateContainer) return;

    container.classList.add("hidden");
    emptyState.classList.add("hidden");
    templateContainer.classList.remove("hidden");

    const visible = this._getVisibleTemplates();

    if (
      !this.taskManager.reflectionTemplates ||
      this.taskManager.reflectionTemplates.length === 0
    ) {
      templateContainer.innerHTML =
        '<p class="text-sm text-muted text-center py-12">No templates yet. Create one to reuse question sets across reflections.</p>';
      return;
    }

    if (visible.length === 0) {
      templateContainer.innerHTML =
        '<p class="text-sm text-muted text-center py-8">No templates match the current filters.</p>';
      return;
    }

    templateContainer.innerHTML = visible
      .map((t) => {
        const tagsHtml = (t.tags || [])
          .map(
            (tag) =>
              `<span class="inline-block px-2 py-0.5 text-xs bg-active text-secondary rounded">${tag}</span>`,
          )
          .join("");
        return `
      <div class="bg-secondary rounded-lg p-4 border border-default reflection-template-item">
        <div class="flex justify-between items-start mb-2">
          <h3 class="font-medium text-primary">${t.title}</h3>
          <span class="px-2 py-1 text-xs rounded bg-active text-secondary">${(t.questions || []).length} questions</span>
        </div>
        ${t.description ? `<p class="text-sm text-muted mb-2">${t.description}</p>` : ""}
        ${tagsHtml ? `<div class="flex flex-wrap gap-1 mb-2">${tagsHtml}</div>` : ""}
        <div class="reflection-template-questions">
          ${(t.questions || [])
            .slice(0, 3)
            .map((q) => `<p class="text-xs text-secondary truncate">&#8212; ${q}</p>`)
            .join("")}
          ${(t.questions || []).length > 3 ? `<p class="text-xs text-muted">+${(t.questions || []).length - 3} more</p>` : ""}
        </div>
        <div class="flex justify-end gap-1 mt-3">
          <button type="button" onclick="taskManager.reflectionSidenavModule.openNewFromTemplate('${t.id}')" class="btn-ghost">Use</button>
          <button type="button" onclick="taskManager.reflectionTemplateSidenavModule.openEdit('${t.id}')" class="btn-ghost">Edit</button>
          <button type="button" onclick="taskManager.deleteReflectionTemplate('${t.id}')" class="btn-danger-ghost">Delete</button>
        </div>
      </div>`;
      })
      .join("");
  }

  _templateName(templateId) {
    const t = (this.taskManager.reflectionTemplates || []).find(
      (t) => t.id === templateId,
    );
    return t ? t.title : templateId;
  }

  async delete(id) {
    const { showConfirm } = await import("../ui/confirm.js");
    const confirmed = await showConfirm(
      "Delete this reflection? This cannot be undone.",
    );
    if (!confirmed) return;

    try {
      await ReflectionsAPI.delete(id);
      this.taskManager.reflections = (
        this.taskManager.reflections || []
      ).filter((r) => r.id !== id);
      this.renderView();
    } catch (error) {
      console.error("ReflectionModule.delete failed", { id, error: error.message });
    }
  }

  async deleteTemplate(id) {
    const { showConfirm } = await import("../ui/confirm.js");
    const confirmed = await showConfirm(
      "Delete this template? Existing reflections that used it are unaffected.",
    );
    if (!confirmed) return;

    try {
      await ReflectionTemplatesAPI.delete(id);
      this.taskManager.reflectionTemplates = (
        this.taskManager.reflectionTemplates || []
      ).filter((t) => t.id !== id);
      this.renderView();
    } catch (error) {
      console.error("ReflectionModule.deleteTemplate failed", { id, error: error.message });
    }
  }

  bindEvents() {
    document
      .getElementById("reflectionViewBtn")
      ?.addEventListener("click", () => {
        this.taskManager.switchView("reflection");
        document
          .getElementById("viewSelectorDropdown")
          ?.classList.add("hidden");
      });

    document
      .getElementById("addReflectionBtn")
      ?.addEventListener("click", () =>
        this.taskManager.reflectionSidenavModule.openNew(),
      );

    document
      .getElementById("addReflectionTemplateBtn")
      ?.addEventListener("click", () =>
        this.taskManager.reflectionTemplateSidenavModule.openNew(),
      );

    document
      .getElementById("reflectionTabReflections")
      ?.addEventListener("click", () => {
        this.activeTab = "reflections";
        this.renderView();
      });

    document
      .getElementById("reflectionTabTemplates")
      ?.addEventListener("click", () => {
        this.activeTab = "templates";
        this.renderView();
      });

    document
      .getElementById("reflectionFilterSearch")
      ?.addEventListener("input", (e) => {
        this.searchQuery = e.target.value.trim();
        this.renderView();
      });
  }
}
