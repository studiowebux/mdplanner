import { BrainstormsAPI } from "../api.js";
import { showLoading, hideLoading } from "../ui/loading.js";
import { filterBySearchQuery } from "../utils.js";

/**
 * BrainstormModule - Handles brainstorm list display and filtering
 */
export class BrainstormModule {
  constructor(taskManager) {
    this.taskManager = taskManager;
    this.searchQuery = "";
  }

  async load() {
    showLoading("brainstormView");
    try {
      this.taskManager.brainstorms = await BrainstormsAPI.fetchAll();
      this.renderView();
    } catch (error) {
      console.error("BrainstormModule.load failed", { error: error.message });
    } finally {
      hideLoading("brainstormView");
    }
  }

  _getVisible() {
    return filterBySearchQuery(
      this.taskManager.brainstorms || [],
      this.searchQuery,
      (b) => [
        b.title || "",
        ...(b.questions || []).flatMap((qn) => [qn.question, qn.answer || ""]),
      ],
    );
  }

  renderView() {
    const container = document.getElementById("brainstormContainer");
    const emptyState = document.getElementById("emptyBrainstormState");
    if (!container || !emptyState) return;

    const visible = this._getVisible();

    if (
      !this.taskManager.brainstorms ||
      this.taskManager.brainstorms.length === 0
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
        '<p class="text-sm text-muted col-span-full text-center py-8">No brainstorms match the current filters.</p>';
      return;
    }

    container.classList.remove("hidden");
    this._renderCards(container, visible);
  }

  _renderCards(container, visible) {
    container.innerHTML = visible
      .map((b) => {
        const answeredCount = (b.questions || []).filter(
          (q) => q.answer && q.answer.trim(),
        ).length;
        const totalCount = (b.questions || []).length;
        const tagsHtml = (b.tags || [])
          .map(
            (t) =>
              `<span class="inline-block px-2 py-0.5 text-xs bg-active text-secondary rounded">${t}</span>`,
          )
          .join("");

        return `
      <div class="bg-secondary rounded-lg p-4 border border-default brainstorm-card">
        <div class="flex justify-between items-start mb-2">
          <h3 class="font-medium text-primary">${b.title}</h3>
          <span class="px-2 py-1 text-xs rounded bg-info-bg text-info-text">${answeredCount}/${totalCount}</span>
        </div>
        ${tagsHtml ? `<div class="flex flex-wrap gap-1 mb-2">${tagsHtml}</div>` : ""}
        <p class="text-xs text-muted mb-2">Created: ${b.created ? b.created.slice(0, 10) : ""}</p>
        <div class="brainstorm-card-questions">
          ${(b.questions || [])
            .slice(0, 3)
            .map(
              (q) =>
                `<p class="text-xs text-secondary truncate">${q.answer ? "&#10003;" : "&#9711;"} ${q.question}</p>`,
            )
            .join("")}
          ${totalCount > 3 ? `<p class="text-xs text-muted">+${totalCount - 3} more</p>` : ""}
        </div>
        <div class="flex justify-end gap-1 mt-3">
          <button type="button" onclick="taskManager.brainstormSidenavModule.openEdit('${b.id}')" class="btn-ghost">Edit</button>
          <button type="button" onclick="taskManager.deleteBrainstorm('${b.id}')" class="btn-danger-ghost">Delete</button>
        </div>
      </div>`;
      })
      .join("");
  }

  async delete(id) {
    const { showConfirm } = await import("../ui/confirm.js");
    const confirmed = await showConfirm(
      "Delete this brainstorm? This cannot be undone.",
    );
    if (!confirmed) return;

    try {
      await BrainstormsAPI.delete(id);
      this.taskManager.brainstorms = (
        this.taskManager.brainstorms || []
      ).filter((b) => b.id !== id);
      this.renderView();
    } catch (error) {
      console.error("BrainstormModule.delete failed", { id, error: error.message });
    }
  }

  bindEvents() {
    document
      .getElementById("brainstormViewBtn")
      .addEventListener("click", () => {
        this.taskManager.switchView("brainstorm");
        document
          .getElementById("viewSelectorDropdown")
          ?.classList.add("hidden");
      });

    document
      .getElementById("addBrainstormBtn")
      .addEventListener("click", () =>
        this.taskManager.brainstormSidenavModule.openNew(),
      );

    document
      .getElementById("brainstormFilterSearch")
      ?.addEventListener("input", (e) => {
        this.searchQuery = e.target.value.trim();
        this.renderView();
      });
  }
}
