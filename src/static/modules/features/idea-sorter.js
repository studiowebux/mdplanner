import { IdeasAPI } from "../api.js";
import { escapeHtml } from "../utils.js";

const PRIORITY_ORDER = { high: 0, medium: 1, low: 2, "": 3 };

/**
 * IdeaSorterModule - Sortable/filterable table view of ideas
 */
export class IdeaSorterModule {
  constructor(taskManager) {
    this.tm = taskManager;
    this.sortKey = "title";
    this.sortDir = "asc";
    this.filterCategory = "";
    this.filterPriority = "";
    this.filterStatus = "";
    this.expandedRows = new Set();
  }

  async load() {
    try {
      this.tm.ideas = await IdeasAPI.fetchAll();
      this.renderView();
    } catch (error) {
      console.error("Error loading idea sorter:", error);
    }
  }

  bindEvents() {
    // Sort headers
    document.querySelectorAll(".idea-sorter-th[data-sort]").forEach((th) => {
      th.addEventListener("click", () => {
        const key = th.dataset.sort;
        if (this.sortKey === key) {
          this.sortDir = this.sortDir === "asc" ? "desc" : "asc";
        } else {
          this.sortKey = key;
          this.sortDir = "asc";
        }
        this.renderView();
      });
    });

    // Filters
    document.getElementById("ideaSorterFilterCategory")?.addEventListener("input", (e) => {
      this.filterCategory = e.target.value.toLowerCase();
      this.renderView();
    });
    document.getElementById("ideaSorterFilterPriority")?.addEventListener("change", (e) => {
      this.filterPriority = e.target.value;
      this.renderView();
    });
    document.getElementById("ideaSorterFilterStatus")?.addEventListener("change", (e) => {
      this.filterStatus = e.target.value;
      this.renderView();
    });

    // New idea button
    document.getElementById("addIdeaSorterBtn")?.addEventListener("click", () => {
      this.tm.ideaSidenavModule.openNew();
    });

    // Clear filters
    document.getElementById("ideaSorterClearFilters")?.addEventListener("click", () => {
      this.filterCategory = "";
      this.filterPriority = "";
      this.filterStatus = "";
      document.getElementById("ideaSorterFilterCategory").value = "";
      document.getElementById("ideaSorterFilterPriority").value = "";
      document.getElementById("ideaSorterFilterStatus").value = "";
      this.renderView();
    });
  }

  getFilteredSorted() {
    let ideas = (this.tm.ideas || []).filter((idea) => {
      if (this.filterCategory && !(idea.category || "").toLowerCase().includes(this.filterCategory)) return false;
      if (this.filterPriority && idea.priority !== this.filterPriority) return false;
      if (this.filterStatus && idea.status !== this.filterStatus) return false;
      return true;
    });

    ideas.sort((a, b) => {
      let av, bv;
      switch (this.sortKey) {
        case "priority":
          av = PRIORITY_ORDER[a.priority || ""] ?? 3;
          bv = PRIORITY_ORDER[b.priority || ""] ?? 3;
          break;
        case "startDate":
          av = a.startDate || "9999";
          bv = b.startDate || "9999";
          break;
        case "endDate":
          av = a.endDate || "9999";
          bv = b.endDate || "9999";
          break;
        case "category":
          av = (a.category || "").toLowerCase();
          bv = (b.category || "").toLowerCase();
          break;
        case "status":
          av = a.status || "";
          bv = b.status || "";
          break;
        default:
          av = (a.title || "").toLowerCase();
          bv = (b.title || "").toLowerCase();
      }
      if (av < bv) return this.sortDir === "asc" ? -1 : 1;
      if (av > bv) return this.sortDir === "asc" ? 1 : -1;
      return 0;
    });

    return ideas;
  }

  renderView() {
    const empty = document.getElementById("emptyIdeaSorterState");
    const table = document.getElementById("ideaSorterTable");
    const body = document.getElementById("ideaSorterBody");
    if (!empty || !table || !body) return;

    this.updateSortHeaders();

    const ideas = this.getFilteredSorted();

    if ((this.tm.ideas || []).length === 0) {
      empty.classList.remove("hidden");
      table.classList.add("hidden");
      return;
    }

    empty.classList.add("hidden");
    table.classList.remove("hidden");

    body.innerHTML = ideas.map((idea) => this.renderRow(idea)).join("");

    // Bind row events
    body.querySelectorAll(".idea-sorter-row").forEach((row) => {
      const id = row.dataset.id;
      row.querySelector(".idea-sorter-edit")?.addEventListener("click", (e) => {
        e.stopPropagation();
        this.tm.ideaSidenavModule.openEdit(id);
      });
      row.querySelector(".idea-sorter-expand")?.addEventListener("click", (e) => {
        e.stopPropagation();
        this.toggleExpand(id);
      });
    });
  }

  renderRow(idea) {
    const priority = idea.priority || "";
    const priorityClass = priority ? `idea-priority-${priority}` : "idea-priority-none";
    const subtasks = idea.subtasks || [];
    const expanded = this.expandedRows.has(idea.id);

    return `
      <tr class="idea-sorter-row" data-id="${escapeHtml(idea.id)}">
        <td class="idea-sorter-td">
          <span class="idea-sorter-title">${escapeHtml(idea.title)}</span>
          ${idea.description ? `<p class="idea-sorter-desc">${escapeHtml(idea.description.slice(0, 80))}${idea.description.length > 80 ? "…" : ""}</p>` : ""}
        </td>
        <td class="idea-sorter-td">${idea.category ? escapeHtml(idea.category) : '<span class="text-muted">—</span>'}</td>
        <td class="idea-sorter-td">
          ${priority ? `<span class="idea-priority-badge ${priorityClass}">${priority}</span>` : '<span class="text-muted">—</span>'}
        </td>
        <td class="idea-sorter-td"><span class="idea-status-badge idea-status-${idea.status}">${idea.status}</span></td>
        <td class="idea-sorter-td">${idea.startDate || '<span class="text-muted">—</span>'}</td>
        <td class="idea-sorter-td">${idea.endDate || '<span class="text-muted">—</span>'}</td>
        <td class="idea-sorter-td">${idea.resources ? escapeHtml(idea.resources) : '<span class="text-muted">—</span>'}</td>
        <td class="idea-sorter-td">
          ${subtasks.length > 0
            ? `<button class="idea-sorter-expand text-secondary hover:text-primary text-xs">
                ${subtasks.length} task${subtasks.length > 1 ? "s" : ""} ${expanded ? "▲" : "▼"}
               </button>
               ${expanded ? `<ul class="idea-subtask-list">${subtasks.map((t) => `<li>${escapeHtml(t)}</li>`).join("")}</ul>` : ""}`
            : '<span class="text-muted">—</span>'}
        </td>
        <td class="idea-sorter-td">
          <button class="idea-sorter-edit btn-secondary">Edit</button>
        </td>
      </tr>
    `;
  }

  toggleExpand(id) {
    if (this.expandedRows.has(id)) {
      this.expandedRows.delete(id);
    } else {
      this.expandedRows.add(id);
    }
    this.renderView();
  }

  updateSortHeaders() {
    document.querySelectorAll(".idea-sorter-th[data-sort]").forEach((th) => {
      th.classList.remove("sort-asc", "sort-desc");
      if (th.dataset.sort === this.sortKey) {
        th.classList.add(this.sortDir === "asc" ? "sort-asc" : "sort-desc");
      }
    });
  }
}
