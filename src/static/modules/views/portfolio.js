// Portfolio View Module - Cross-project dashboard
import { PortfolioAPI } from "../api.js";
import { PROJECT_STATUS_CLASSES, PROJECT_STATUS_LABELS } from "../constants.js";

/**
 * Portfolio dashboard - displays all projects with status, progress, and filtering.
 * Pattern: View Module
 */
export class PortfolioView {
  /** @param {TaskManager} taskManager */
  constructor(taskManager) {
    this.tm = taskManager;
    this.projects = [];
    this.summary = null;
    this.currentFilter = "all";
    this.currentViewMode = "list"; // 'list' or 'tree'
    this.selectedProject = null;
    this.isDetailOpen = false;
  }

  /**
   * Load projects and summary data from API.
   */
  async load() {
    try {
      const [items, summary] = await Promise.all([
        PortfolioAPI.fetchAll(),
        PortfolioAPI.getSummary(),
      ]);
      this.projects = items;
      this.summary = summary;
      this.render();
    } catch (error) {
      console.error("Error loading portfolio data:", error);
    }
  }

  /**
   * Render the complete portfolio view.
   */
  render() {
    this.renderSummaryCards();
    this.renderFilterBar();
    if (this.currentViewMode === "tree") {
      this.renderTreeView();
    } else {
      this.renderListView();
    }
  }

  /**
   * Format currency value.
   * @param {number} value
   * @returns {string}
   */
  formatCurrency(value) {
    if (value === undefined || value === null) return "-";
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  }

  /**
   * Render summary cards with aggregate metrics.
   */
  renderSummaryCards() {
    const container = document.getElementById("portfolioSummaryCards");
    if (!container || !this.summary) return;

    const {
      total,
      byStatus,
      byCategory,
      avgProgress,
      totalRevenue,
      totalExpenses,
    } = this.summary;
    const netProfit = totalRevenue - totalExpenses;
    const profitClass = netProfit >= 0
      ? "text-green-600 dark:text-green-400"
      : "text-red-600 dark:text-red-400";

    container.innerHTML = `
      <div class="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
        <div class="text-sm text-gray-500 dark:text-gray-400">Total Projects</div>
        <div class="text-2xl font-bold text-gray-900 dark:text-gray-100 mt-1">${total}</div>
        <div class="text-xs text-gray-400 dark:text-gray-500 mt-1">${
      Object.keys(byCategory || {}).length
    } categories</div>
      </div>
      <div class="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
        <div class="text-sm text-gray-500 dark:text-gray-400">Active</div>
        <div class="text-2xl font-bold text-green-600 dark:text-green-400 mt-1">${
      byStatus?.active || 0
    }</div>
        <div class="text-xs text-gray-400 dark:text-gray-500 mt-1">${
      byStatus?.["on-hold"] || 0
    } on hold</div>
      </div>
      <div class="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
        <div class="text-sm text-gray-500 dark:text-gray-400">Avg Progress</div>
        <div class="text-2xl font-bold text-gray-900 dark:text-gray-100 mt-1">${
      avgProgress || 0
    }%</div>
        <div class="text-xs text-gray-400 dark:text-gray-500 mt-1">${total} projects</div>
      </div>
      <div class="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
        <div class="text-sm text-gray-500 dark:text-gray-400">Net Revenue</div>
        <div class="text-2xl font-bold ${profitClass} mt-1">${
      this.formatCurrency(netProfit)
    }</div>
        <div class="text-xs text-gray-400 dark:text-gray-500 mt-1">${
      this.formatCurrency(totalRevenue)
    } rev / ${this.formatCurrency(totalExpenses)} exp</div>
      </div>
    `;
  }

  /**
   * Render filter bar with status filters and view mode toggle.
   */
  renderFilterBar() {
    const container = document.getElementById("portfolioFilterBar");
    if (!container) return;

    const statusFilters = [
      { key: "all", label: "All" },
      { key: "planning", label: "Planning" },
      { key: "active", label: "Active" },
      { key: "on-hold", label: "On Hold" },
      { key: "completed", label: "Completed" },
    ];

    const statusHtml = statusFilters.map((f) => {
      const isActive = this.currentFilter === f.key;
      const activeClass = isActive
        ? "bg-gray-900 text-white dark:bg-white dark:text-gray-900"
        : "bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600";
      return `
        <button data-portfolio-filter="${f.key}"
                class="px-3 py-1.5 text-sm font-medium rounded transition-colors ${activeClass}">
          ${f.label}
        </button>
      `;
    }).join("");

    // View mode toggle
    const listActive = this.currentViewMode === "list";
    const treeActive = this.currentViewMode === "tree";
    const viewToggleHtml = `
      <span class="text-gray-300 dark:text-gray-600 mx-2">|</span>
      <button data-portfolio-view="list"
              class="px-3 py-1.5 text-sm font-medium rounded transition-colors ${
      listActive
        ? "bg-gray-900 text-white dark:bg-white dark:text-gray-900"
        : "bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
    }">
        List
      </button>
      <button data-portfolio-view="tree"
              class="px-3 py-1.5 text-sm font-medium rounded transition-colors ${
      treeActive
        ? "bg-gray-900 text-white dark:bg-white dark:text-gray-900"
        : "bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
    }">
        Tree
      </button>
    `;

    container.innerHTML = statusHtml + viewToggleHtml;
  }

  /**
   * Render list view of projects.
   */
  renderListView() {
    const container = document.getElementById("portfolioGrid");
    const emptyState = document.getElementById("portfolioEmpty");
    if (!container || !emptyState) return;

    // Apply status filter
    const filtered = this.currentFilter === "all"
      ? this.projects
      : this.projects.filter((p) =>
        (p.status || "active") === this.currentFilter
      );

    if (filtered.length === 0) {
      container.innerHTML = "";
      emptyState.classList.remove("hidden");
      return;
    }

    emptyState.classList.add("hidden");
    container.className = "space-y-2";
    container.innerHTML = filtered.map((project) =>
      this.renderProjectRow(project)
    ).join("");
  }

  /**
   * Render tree view grouped by category.
   */
  renderTreeView() {
    const container = document.getElementById("portfolioGrid");
    const emptyState = document.getElementById("portfolioEmpty");
    if (!container || !emptyState) return;

    // Apply status filter
    const filtered = this.currentFilter === "all"
      ? this.projects
      : this.projects.filter((p) =>
        (p.status || "active") === this.currentFilter
      );

    if (filtered.length === 0) {
      container.innerHTML = "";
      emptyState.classList.remove("hidden");
      return;
    }

    emptyState.classList.add("hidden");

    // Group by category
    const byCategory = {};
    for (const project of filtered) {
      const category = project.category || "Uncategorized";
      if (!byCategory[category]) {
        byCategory[category] = [];
      }
      byCategory[category].push(project);
    }

    // Sort categories
    const sortedCategories = Object.keys(byCategory).sort((a, b) => {
      if (a === "Uncategorized") return 1;
      if (b === "Uncategorized") return -1;
      return a.localeCompare(b);
    });

    container.className = "space-y-6";
    container.innerHTML = sortedCategories.map((category) => {
      const projects = byCategory[category];
      const categoryRevenue = projects.reduce(
        (sum, p) => sum + (p.revenue || 0),
        0,
      );
      const categoryExpenses = projects.reduce(
        (sum, p) => sum + (p.expenses || 0),
        0,
      );
      const categoryNet = categoryRevenue - categoryExpenses;
      const netClass = categoryNet >= 0
        ? "text-green-600 dark:text-green-400"
        : "text-red-600 dark:text-red-400";

      return `
        <div class="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div class="px-4 py-3 bg-gray-50 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-600 flex items-center justify-between">
            <div class="flex items-center gap-3">
              <span class="text-base font-medium text-gray-900 dark:text-gray-100">${
        this.escapeHtml(category)
      }</span>
              <span class="text-sm text-gray-500 dark:text-gray-400">${projects.length} project${
        projects.length !== 1 ? "s" : ""
      }</span>
            </div>
            <div class="text-sm">
              <span class="text-gray-500 dark:text-gray-400">${
        this.formatCurrency(categoryRevenue)
      } rev</span>
              <span class="mx-2 text-gray-300 dark:text-gray-600">|</span>
              <span class="${netClass} font-medium">${
        this.formatCurrency(categoryNet)
      } net</span>
            </div>
          </div>
          <div class="divide-y divide-gray-100 dark:divide-gray-700">
            ${projects.map((p) => this.renderProjectRow(p, true)).join("")}
          </div>
        </div>
      `;
    }).join("");
  }

  /**
   * Render a single project row.
   * @param {Object} project - Project metadata
   * @param {boolean} inTree - Whether rendering inside tree view
   * @returns {string} HTML string
   */
  renderProjectRow(project, inTree = false) {
    const status = project.status || "active";
    const statusClass = PROJECT_STATUS_CLASSES[status] ||
      PROJECT_STATUS_CLASSES.active;
    const statusLabel = PROJECT_STATUS_LABELS[status] || "Active";
    const progressPercent = project.progress || 0;

    // Financial info
    const revenue = project.revenue || 0;
    const expenses = project.expenses || 0;
    const netProfit = revenue - expenses;
    const hasFinancials = project.revenue !== undefined ||
      project.expenses !== undefined;
    const profitClass = netProfit >= 0
      ? "text-green-600 dark:text-green-400"
      : "text-red-600 dark:text-red-400";

    // KPI indicator
    const hasKpis = project.kpis && project.kpis.length > 0;

    const containerClass = inTree
      ? "px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700/30 cursor-pointer transition-colors"
      : "bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700/30 cursor-pointer transition-colors";

    return `
      <div class="${containerClass}" data-portfolio-id="${project.id}">
        <div class="flex items-center justify-between gap-4">
          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-2">
              <span class="font-medium text-gray-900 dark:text-gray-100 truncate">${
      this.escapeHtml(project.name)
    }</span>
              ${
      project.client
        ? `<span class="text-xs text-gray-400 dark:text-gray-500">${
          this.escapeHtml(project.client)
        }</span>`
        : ""
    }
              ${
      hasKpis
        ? '<span class="w-2 h-2 bg-purple-500 rounded-full" title="Has KPIs"></span>'
        : ""
    }
            </div>
            ${
      project.description
        ? `<p class="text-sm text-gray-500 dark:text-gray-400 truncate mt-0.5">${
          this.escapeHtml(project.description)
        }</p>`
        : ""
    }
          </div>
          <div class="flex items-center gap-4 flex-shrink-0">
            <div class="text-right w-20">
              <div class="text-sm text-gray-900 dark:text-gray-100">${progressPercent}%</div>
              <div class="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5 mt-1">
                <div class="bg-green-500 dark:bg-green-400 h-1.5 rounded-full" style="width: ${progressPercent}%"></div>
              </div>
            </div>
            ${
      hasFinancials
        ? `
              <div class="text-right w-24">
                <div class="text-xs text-gray-400 dark:text-gray-500">${
          this.formatCurrency(revenue)
        }</div>
                <div class="text-sm font-medium ${profitClass}">${
          this.formatCurrency(netProfit)
        }</div>
              </div>
            `
        : ""
    }
            <span class="px-2 py-0.5 text-xs font-medium rounded ${statusClass} whitespace-nowrap">
              ${statusLabel}
            </span>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Filter projects by status.
   * @param {string} status - Status to filter by
   */
  filterByStatus(status) {
    this.currentFilter = status;
    this.renderFilterBar();
    if (this.currentViewMode === "tree") {
      this.renderTreeView();
    } else {
      this.renderListView();
    }
  }

  /**
   * Set view mode.
   * @param {string} mode - 'list' or 'tree'
   */
  setViewMode(mode) {
    this.currentViewMode = mode;
    this.renderFilterBar();
    if (mode === "tree") {
      this.renderTreeView();
    } else {
      this.renderListView();
    }
  }

  /**
   * Format a date as relative time.
   * @param {Date} date
   * @returns {string}
   */
  formatRelativeTime(date) {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHour = Math.floor(diffMin / 60);
    const diffDay = Math.floor(diffHour / 24);

    if (diffDay > 30) {
      return date.toLocaleDateString();
    } else if (diffDay > 0) {
      return `${diffDay}d ago`;
    } else if (diffHour > 0) {
      return `${diffHour}h ago`;
    } else if (diffMin > 0) {
      return `${diffMin}m ago`;
    } else {
      return "Just now";
    }
  }

  /**
   * Escape HTML to prevent XSS.
   * @param {string} str
   * @returns {string}
   */
  escapeHtml(str) {
    const div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
  }

  /**
   * Open detail panel for a project.
   * @param {string} projectId
   */
  async openDetailPanel(projectId) {
    try {
      const project = await PortfolioAPI.get(projectId);
      this.selectedProject = project;
      this.isDetailOpen = true;
      this.renderDetailPanel(project);
      document.getElementById("portfolioDetailPanel")?.classList.add("open");
    } catch (error) {
      console.error("Error loading project details:", error);
    }
  }

  /**
   * Close detail panel.
   */
  closeDetailPanel() {
    this.isDetailOpen = false;
    this.selectedProject = null;
    document.getElementById("portfolioDetailPanel")?.classList.remove("open");
  }

  /**
   * Render the detail panel content.
   * @param {Object} project
   */
  renderDetailPanel(project) {
    const titleEl = document.getElementById("portfolioDetailTitle");
    const contentEl = document.getElementById("portfolioDetailContent");
    if (!titleEl || !contentEl) return;

    titleEl.textContent = project.name;

    const statusOptions = ["planning", "active", "on-hold", "completed"]
      .map((s) =>
        `<option value="${s}" ${project.status === s ? "selected" : ""}>${
          PROJECT_STATUS_LABELS[s] || s
        }</option>`
      )
      .join("");

    // Build KPIs section
    const kpis = project.kpis || [];
    const kpisHtml = kpis.length > 0
      ? kpis.map((kpi, idx) => `
      <div class="bg-gray-50 dark:bg-gray-700 rounded-lg p-3 relative" data-kpi-index="${idx}">
        <button type="button" class="absolute top-2 right-2 text-gray-400 hover:text-red-500 dark:hover:text-red-400" data-remove-kpi="${idx}">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
        </button>
        <div class="grid grid-cols-2 gap-2">
          <input type="text" class="form-input text-sm" value="${
        this.escapeHtml(kpi.name)
      }" placeholder="KPI Name" data-kpi-field="name" data-kpi-idx="${idx}">
          <input type="text" class="form-input text-sm" value="${kpi.value}" placeholder="Value" data-kpi-field="value" data-kpi-idx="${idx}">
          <input type="text" class="form-input text-sm" value="${
        kpi.target || ""
      }" placeholder="Target" data-kpi-field="target" data-kpi-idx="${idx}">
          <input type="text" class="form-input text-sm" value="${
        kpi.unit || ""
      }" placeholder="Unit" data-kpi-field="unit" data-kpi-idx="${idx}">
        </div>
      </div>
    `).join("")
      : '<p class="text-sm text-gray-500 dark:text-gray-400">No KPIs defined</p>';

    // Team members
    const team = project.team || [];
    const teamHtml = team.map((member) =>
      `<span class="px-2 py-0.5 bg-gray-100 dark:bg-gray-700 text-sm rounded">${
        this.escapeHtml(member)
      }</span>`
    ).join(" ");

    contentEl.innerHTML = `
      <div class="space-y-6">
        <!-- Basic Info -->
        <section class="sidenav-section">
          <h3 class="sidenav-section-title">Basic Information</h3>
          <div class="space-y-4">
            <div>
              <label class="form-label">Name</label>
              <input type="text" id="portfolioDetailName" class="form-input" value="${
      this.escapeHtml(project.name)
    }">
            </div>
            <div>
              <label class="form-label">Category</label>
              <input type="text" id="portfolioDetailCategory" class="form-input" value="${
      this.escapeHtml(project.category)
    }">
            </div>
            <div>
              <label class="form-label">Status</label>
              <select id="portfolioDetailStatus" class="form-input">
                ${statusOptions}
              </select>
            </div>
            <div>
              <label class="form-label">Client</label>
              <input type="text" id="portfolioDetailClient" class="form-input" value="${
      this.escapeHtml(project.client || "")
    }">
            </div>
            <div>
              <label class="form-label">Description</label>
              <textarea id="portfolioDetailDescription" class="form-input" rows="3">${
      this.escapeHtml(project.description || "")
    }</textarea>
            </div>
          </div>
        </section>

        <!-- Progress & Financials -->
        <section class="sidenav-section">
          <h3 class="sidenav-section-title">Progress & Financials</h3>
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="form-label">Progress (%)</label>
              <input type="number" id="portfolioDetailProgress" class="form-input" min="0" max="100" value="${
      project.progress || 0
    }">
            </div>
            <div>
              <label class="form-label">Revenue</label>
              <input type="number" id="portfolioDetailRevenue" class="form-input" min="0" value="${
      project.revenue || 0
    }">
            </div>
            <div>
              <label class="form-label">Expenses</label>
              <input type="number" id="portfolioDetailExpenses" class="form-input" min="0" value="${
      project.expenses || 0
    }">
            </div>
            <div>
              <label class="form-label">Net</label>
              <div class="form-input bg-gray-100 dark:bg-gray-700 ${
      (project.revenue || 0) - (project.expenses || 0) >= 0
        ? "text-green-600 dark:text-green-400"
        : "text-red-600 dark:text-red-400"
    }">
                ${
      this.formatCurrency((project.revenue || 0) - (project.expenses || 0))
    }
              </div>
            </div>
          </div>
        </section>

        <!-- Dates -->
        <section class="sidenav-section">
          <h3 class="sidenav-section-title">Timeline</h3>
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="form-label">Start Date</label>
              <input type="date" id="portfolioDetailStartDate" class="form-input" value="${
      project.startDate || ""
    }">
            </div>
            <div>
              <label class="form-label">End Date</label>
              <input type="date" id="portfolioDetailEndDate" class="form-input" value="${
      project.endDate || ""
    }">
            </div>
          </div>
        </section>

        <!-- Team -->
        <section class="sidenav-section">
          <h3 class="sidenav-section-title">Team</h3>
          <div>
            <label class="form-label">Team Members (comma-separated)</label>
            <input type="text" id="portfolioDetailTeam" class="form-input" value="${
      team.join(", ")
    }" placeholder="John, Jane, Bob">
          </div>
          ${
      team.length > 0
        ? `<div class="flex flex-wrap gap-2 mt-2">${teamHtml}</div>`
        : ""
    }
        </section>

        <!-- KPIs -->
        <section class="sidenav-section">
          <h3 class="sidenav-section-title flex items-center justify-between">
            <span>KPIs</span>
            <button type="button" id="portfolioAddKpi" class="text-sm text-blue-600 dark:text-blue-400 hover:underline">+ Add KPI</button>
          </h3>
          <div id="portfolioKpisList" class="space-y-3">
            ${kpisHtml}
          </div>
        </section>
      </div>
    `;
  }

  /**
   * Add a new KPI to the form.
   */
  addKpi() {
    const list = document.getElementById("portfolioKpisList");
    if (!list) return;

    const idx = list.querySelectorAll("[data-kpi-index]").length;
    const div = document.createElement("div");
    div.className = "bg-gray-50 dark:bg-gray-700 rounded-lg p-3 relative";
    div.dataset.kpiIndex = idx.toString();
    div.innerHTML = `
      <button type="button" class="absolute top-2 right-2 text-gray-400 hover:text-red-500 dark:hover:text-red-400" data-remove-kpi="${idx}">
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
      </button>
      <div class="grid grid-cols-2 gap-2">
        <input type="text" class="form-input text-sm" placeholder="KPI Name" data-kpi-field="name" data-kpi-idx="${idx}">
        <input type="text" class="form-input text-sm" placeholder="Value" data-kpi-field="value" data-kpi-idx="${idx}">
        <input type="text" class="form-input text-sm" placeholder="Target" data-kpi-field="target" data-kpi-idx="${idx}">
        <input type="text" class="form-input text-sm" placeholder="Unit" data-kpi-field="unit" data-kpi-idx="${idx}">
      </div>
    `;
    list.appendChild(div);

    // Remove the "No KPIs defined" message if it exists
    const emptyMsg = list.querySelector("p");
    if (emptyMsg) emptyMsg.remove();
  }

  /**
   * Remove a KPI from the form.
   * @param {number} idx
   */
  removeKpi(idx) {
    const kpiEl = document.querySelector(`[data-kpi-index="${idx}"]`);
    if (kpiEl) kpiEl.remove();
  }

  /**
   * Collect form data and save.
   */
  async saveDetailPanel() {
    if (!this.selectedProject) return;

    // Collect KPIs
    const kpis = [];
    const kpiElements = document.querySelectorAll("[data-kpi-index]");
    kpiElements.forEach((el) => {
      const name = el.querySelector('[data-kpi-field="name"]')?.value?.trim();
      const value = el.querySelector('[data-kpi-field="value"]')?.value?.trim();
      const target = el.querySelector('[data-kpi-field="target"]')?.value
        ?.trim();
      const unit = el.querySelector('[data-kpi-field="unit"]')?.value?.trim();

      if (name && value) {
        const kpi = {
          name,
          value: isNaN(Number(value)) ? value : Number(value),
        };
        if (target) {
          kpi.target = isNaN(Number(target)) ? target : Number(target);
        }
        if (unit) kpi.unit = unit;
        kpis.push(kpi);
      }
    });

    // Collect team members
    const teamInput = document.getElementById("portfolioDetailTeam")?.value ||
      "";
    const team = teamInput.split(",").map((t) => t.trim()).filter((t) =>
      t.length > 0
    );

    const updates = {
      name: document.getElementById("portfolioDetailName")?.value?.trim() ||
        this.selectedProject.name,
      category:
        document.getElementById("portfolioDetailCategory")?.value?.trim() ||
        "Uncategorized",
      status: document.getElementById("portfolioDetailStatus")?.value ||
        "active",
      client: document.getElementById("portfolioDetailClient")?.value?.trim() ||
        undefined,
      description:
        document.getElementById("portfolioDetailDescription")?.value?.trim() ||
        undefined,
      progress:
        parseInt(document.getElementById("portfolioDetailProgress")?.value) ||
        0,
      revenue:
        parseInt(document.getElementById("portfolioDetailRevenue")?.value) || 0,
      expenses:
        parseInt(document.getElementById("portfolioDetailExpenses")?.value) ||
        0,
      startDate: document.getElementById("portfolioDetailStartDate")?.value ||
        undefined,
      endDate: document.getElementById("portfolioDetailEndDate")?.value ||
        undefined,
      team: team.length > 0 ? team : undefined,
      kpis: kpis.length > 0 ? kpis : undefined,
    };

    try {
      await PortfolioAPI.update(this.selectedProject.id, updates);
      this.closeDetailPanel();
      await this.load(); // Refresh the list
    } catch (error) {
      console.error("Error saving project:", error);
      alert("Failed to save project");
    }
  }

  /**
   * Bind event listeners for the portfolio view.
   */
  bindEvents() {
    // Filter button clicks
    document.getElementById("portfolioFilterBar")?.addEventListener(
      "click",
      (e) => {
        const filterBtn = e.target.closest("[data-portfolio-filter]");
        if (filterBtn) {
          const filter = filterBtn.dataset.portfolioFilter;
          this.filterByStatus(filter);
          return;
        }

        const viewBtn = e.target.closest("[data-portfolio-view]");
        if (viewBtn) {
          const mode = viewBtn.dataset.portfolioView;
          this.setViewMode(mode);
        }
      },
    );

    // Project row clicks
    document.getElementById("portfolioGrid")?.addEventListener("click", (e) => {
      const row = e.target.closest("[data-portfolio-id]");
      if (row) {
        const projectId = row.dataset.portfolioId;
        this.openDetailPanel(projectId);
      }
    });

    // Detail panel close
    document.getElementById("portfolioDetailClose")?.addEventListener(
      "click",
      () => {
        this.closeDetailPanel();
      },
    );

    // Detail panel save
    document.getElementById("portfolioDetailSave")?.addEventListener(
      "click",
      () => {
        this.saveDetailPanel();
      },
    );

    // Detail panel content events (delegated)
    document.getElementById("portfolioDetailContent")?.addEventListener(
      "click",
      (e) => {
        // Add KPI button
        if (e.target.closest("#portfolioAddKpi")) {
          this.addKpi();
          return;
        }

        // Remove KPI button
        const removeBtn = e.target.closest("[data-remove-kpi]");
        if (removeBtn) {
          const idx = removeBtn.dataset.removeKpi;
          this.removeKpi(idx);
        }
      },
    );
  }
}
