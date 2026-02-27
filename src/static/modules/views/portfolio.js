// Portfolio View Module - Cross-project dashboard
import { BillingAPI, PeopleAPI, PortfolioAPI } from "../api.js";
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
    this.peopleMap = new Map();
    this.customers = [];
    this.currentFilter = "all";
    this.currentViewMode = "list"; // 'list' or 'tree'
    this.searchQuery = "";
    this.selectedProject = null;
    this.isDetailOpen = false;
    this.isCreating = false;
  }

  getPersonName(personId) {
    const person = this.peopleMap.get(personId);
    return person?.name || personId;
  }

  /**
   * Load projects and summary data from API.
   */
  async load() {
    try {
      const [items, summary, people, customers] = await Promise.all([
        PortfolioAPI.fetchAll(),
        PortfolioAPI.getSummary(),
        PeopleAPI.fetchAll(),
        BillingAPI.fetchCustomers().catch(() => []),
      ]);
      this.projects = items;
      this.tm.portfolio = items;
      this.summary = summary;
      this.customers = customers;
      this.peopleMap.clear();
      for (const person of people) {
        this.peopleMap.set(person.id, person);
      }
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
    this.renderAnalytics();
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
   * Compute human-readable duration between two date strings.
   * Returns null when either date is missing or invalid.
   * @param {string|undefined} startDate - YYYY-MM-DD
   * @param {string|undefined} endDate   - YYYY-MM-DD
   * @param {boolean} compact - compact form for row display ("3 mo", "1 yr 2 mo")
   * @returns {string|null}
   */
  formatDuration(startDate, endDate, compact = false) {
    if (!startDate || !endDate) return null;
    const start = new Date(startDate);
    const end = new Date(endDate);
    if (isNaN(start) || isNaN(end) || end < start) return null;

    const totalDays = Math.max(1, Math.round((end - start) / 86400000));
    const years = Math.floor(totalDays / 365);
    const months = Math.floor((totalDays % 365) / 30);
    const days = totalDays % 30;

    if (compact) {
      if (years > 0 && months > 0) return `${years} yr ${months} mo`;
      if (years > 0) return `${years} yr`;
      if (months > 0) return `${months} mo`;
      return `${totalDays} d`;
    }

    const parts = [];
    if (years > 0) parts.push(`${years} year${years !== 1 ? "s" : ""}`);
    if (months > 0) parts.push(`${months} month${months !== 1 ? "s" : ""}`);
    if (parts.length === 0) parts.push(`${totalDays} day${totalDays !== 1 ? "s" : ""}`);
    else if (days > 0 && years === 0) parts.push(`${days} day${days !== 1 ? "s" : ""}`);
    return parts.join(", ");
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
      ? "text-success"
      : "text-error";

    container.innerHTML = `
      <div class="bg-primary rounded-lg shadow-sm border border-default p-4">
        <div class="text-sm text-muted">Total Projects</div>
        <div class="text-2xl font-bold text-primary mt-1">${total}</div>
        <div class="text-xs text-muted mt-1">${
      Object.keys(byCategory || {}).length
    } categories</div>
      </div>
      <div class="bg-primary rounded-lg shadow-sm border border-default p-4">
        <div class="text-sm text-muted">Active</div>
        <div class="text-2xl font-bold text-success mt-1">${
      byStatus?.active || 0
    }</div>
        <div class="text-xs text-muted mt-1">${
      byStatus?.["on-hold"] || 0
    } on hold</div>
      </div>
      <div class="bg-primary rounded-lg shadow-sm border border-default p-4">
        <div class="text-sm text-muted">Avg Progress</div>
        <div class="text-2xl font-bold text-primary mt-1">${
      avgProgress || 0
    }%</div>
        <div class="text-xs text-muted mt-1">${total} projects</div>
      </div>
      <div class="bg-primary rounded-lg shadow-sm border border-default p-4">
        <div class="text-sm text-muted">Net Revenue</div>
        <div class="text-2xl font-bold ${profitClass} mt-1">${
      this.formatCurrency(netProfit)
    }</div>
        <div class="text-xs text-muted mt-1">${
      this.formatCurrency(totalRevenue)
    } rev / ${this.formatCurrency(totalExpenses)} exp</div>
      </div>
    `;
  }

  /**
   * Render analytics panel — status breakdown, category breakdown, tech stack frequency.
   */
  renderAnalytics() {
    const container = document.getElementById("portfolioAnalytics");
    if (!container || !this.projects.length) return;

    // Status breakdown
    const statusCounts = {};
    for (const p of this.projects) {
      statusCounts[p.status] = (statusCounts[p.status] || 0) + 1;
    }
    const maxStatus = Math.max(...Object.values(statusCounts));

    // Category breakdown
    const catCounts = {};
    for (const p of this.projects) {
      if (p.category) catCounts[p.category] = (catCounts[p.category] || 0) + 1;
    }
    const maxCat = Math.max(...Object.values(catCounts));

    // Tech stack frequency
    const techCounts = {};
    for (const p of this.projects) {
      for (const t of p.techStack || []) {
        techCounts[t] = (techCounts[t] || 0) + 1;
      }
    }
    const topTech = Object.entries(techCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8);
    const maxTech = topTech[0]?.[1] || 1;

    const bar = (count, max) => {
      const pct = Math.round((count / max) * 100);
      return `<div class="portfolio-bar-track"><div class="portfolio-bar-fill" style="width:${pct}%"></div></div>`;
    };

    const statusRows = Object.entries(statusCounts)
      .sort((a, b) => b[1] - a[1])
      .map(([s, n]) =>
        `<div class="portfolio-bar-row">
          <span class="portfolio-bar-label">${PROJECT_STATUS_LABELS[s] || s}</span>
          ${bar(n, maxStatus)}
          <span class="portfolio-bar-count">${n}</span>
        </div>`
      ).join("");

    const catRows = Object.entries(catCounts)
      .sort((a, b) => b[1] - a[1])
      .map(([c, n]) =>
        `<div class="portfolio-bar-row">
          <span class="portfolio-bar-label">${this.escapeHtml(c)}</span>
          ${bar(n, maxCat)}
          <span class="portfolio-bar-count">${n}</span>
        </div>`
      ).join("");

    const techRows = topTech.map(([t, n]) =>
      `<div class="portfolio-bar-row">
        <span class="portfolio-bar-label">${this.escapeHtml(t)}</span>
        ${bar(n, maxTech)}
        <span class="portfolio-bar-count">${n}</span>
      </div>`
    ).join("");

    container.innerHTML = `
      <div class="portfolio-analytics-grid">
        <div class="portfolio-analytics-panel">
          <div class="portfolio-analytics-title">By Status</div>
          ${statusRows || '<p class="text-sm text-muted">No data</p>'}
        </div>
        <div class="portfolio-analytics-panel">
          <div class="portfolio-analytics-title">By Category</div>
          ${catRows || '<p class="text-sm text-muted">No data</p>'}
        </div>
        ${
      topTech.length
        ? `<div class="portfolio-analytics-panel">
          <div class="portfolio-analytics-title">Tech Stack</div>
          ${techRows}
        </div>`
        : ""
    }
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
      { key: "discovery", label: "Discovery" },
      { key: "scoping", label: "Scoping" },
      { key: "planning", label: "Planning" },
      { key: "active", label: "Active" },
      { key: "on-hold", label: "On Hold" },
      { key: "completed", label: "Completed" },
      { key: "production", label: "Production" },
      { key: "maintenance", label: "Maintenance" },
      { key: "cancelled", label: "Cancelled" },
    ];

    const statusHtml = statusFilters.map((f) => {
      const isActive = this.currentFilter === f.key;
      const activeClass = isActive
        ? "bg-inverse text-inverse"
        : "bg-tertiary text-secondary hover:bg-active";
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
      <span class="text-muted mx-2">|</span>
      <button data-portfolio-view="list"
              class="px-3 py-1.5 text-sm font-medium rounded transition-colors ${
      listActive
        ? "bg-inverse text-inverse"
        : "bg-tertiary text-secondary hover:bg-active"
    }">
        List
      </button>
      <button data-portfolio-view="tree"
              class="px-3 py-1.5 text-sm font-medium rounded transition-colors ${
      treeActive
        ? "bg-inverse text-inverse"
        : "bg-tertiary text-secondary hover:bg-active"
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

    // Apply status + search filters
    const filtered = this.projects.filter((p) =>
      (this.currentFilter === "all" ||
        (p.status || "active") === this.currentFilter) &&
      this.matchesSearch(p)
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

    // Apply status + search filters
    const filtered = this.projects.filter((p) =>
      (this.currentFilter === "all" ||
        (p.status || "active") === this.currentFilter) &&
      this.matchesSearch(p)
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
        ? "text-success"
        : "text-error";

      return `
        <div class="bg-primary rounded-lg border border-default overflow-hidden">
          <div class="px-4 py-3 bg-secondary border-b border-default flex items-center justify-between">
            <div class="flex items-center gap-3">
              <span class="text-base font-medium text-primary">${
        this.escapeHtml(category)
      }</span>
              <span class="text-sm text-muted">${projects.length} project${
        projects.length !== 1 ? "s" : ""
      }</span>
            </div>
            <div class="text-sm">
              <span class="text-muted">${
        this.formatCurrency(categoryRevenue)
      } rev</span>
              <span class="mx-2 text-muted">|</span>
              <span class="${netClass} font-medium">${
        this.formatCurrency(categoryNet)
      } net</span>
            </div>
          </div>
          <div class="divide-y divide-y border-default">
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
      ? "text-success"
      : "text-error";

    // KPI indicator
    const hasKpis = project.kpis && project.kpis.length > 0;

    const containerClass = inTree
      ? "px-4 py-3 hover:bg-secondary cursor-pointer transition-colors"
      : "bg-primary rounded-lg border border-default px-4 py-3 hover:bg-secondary cursor-pointer transition-colors";

    // Logo thumbnail
    const logoHtml = project.logo
      ? `<img src="${this.escapeHtml(project.logo)}" alt="" class="portfolio-logo">`
      : "";

    // URL links
    const urlsHtml = project.urls && project.urls.length > 0
      ? `<div class="portfolio-urls">${
        project.urls.map((u) =>
          `<a href="${this.escapeHtml(u.href)}" class="portfolio-url-link" target="_blank" rel="noopener noreferrer" data-stop-propagation>${
            this.escapeHtml(u.label)
          }</a>`
        ).join("")
      }</div>`
      : "";

    // License badge
    const licenseHtml = project.license
      ? `<span class="portfolio-license">${this.escapeHtml(project.license)}</span>`
      : "";

    return `
      <div class="${containerClass}" data-portfolio-id="${project.id}">
        <div class="flex items-center justify-between gap-4">
          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-2 min-w-0">
              ${logoHtml}
              <span class="portfolio-row-name font-medium text-primary truncate">${
      this.escapeHtml(project.name)
    }</span>
              ${
      project.client
        ? `<span class="text-xs text-muted">${
          this.escapeHtml(project.client)
        }</span>`
        : ""
    }
              ${licenseHtml}
              ${
      hasKpis
        ? '<span class="w-2 h-2 bg-info rounded-full" title="Has KPIs"></span>'
        : ""
    }
            </div>
            ${
      project.description
        ? `<p class="text-sm text-muted truncate mt-0.5">${
          this.escapeHtml(project.description)
        }</p>`
        : ""
    }
            ${urlsHtml}
          </div>
          <div class="flex items-center gap-4 flex-shrink-0">
            <div class="portfolio-row-progress text-right w-20">
              <div class="text-sm text-primary">${progressPercent}%</div>
              <div class="w-full bg-active rounded-full h-1.5 mt-1">
                <div class="bg-success h-1.5 rounded-full" style="width: ${progressPercent}%"></div>
              </div>
              ${(() => {
      const dur = this.formatDuration(project.startDate, project.endDate, true);
      return dur
        ? `<div class="portfolio-row-duration">${dur}</div>`
        : "";
    })()}</div>
            ${
      hasFinancials
        ? `
              <div class="portfolio-row-financials text-right w-24">
                <div class="text-xs text-muted">${
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
   * Test whether a project matches the current search query.
   * @param {Object} project
   * @returns {boolean}
   */
  matchesSearch(project) {
    if (!this.searchQuery) return true;
    const q = this.searchQuery.toLowerCase();
    return (
      (project.name || "").toLowerCase().includes(q) ||
      (project.category || "").toLowerCase().includes(q) ||
      (project.client || "").toLowerCase().includes(q) ||
      (project.description || "").toLowerCase().includes(q)
    );
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
   * Render person picker checkboxes for team selection.
   */
  renderTeamPicker(selectedIds) {
    const selected = new Set(selectedIds || []);
    const people = Array.from(this.peopleMap.values());
    if (people.length === 0) {
      return '<p class="text-xs text-muted">No people configured. Add people in the People view first.</p>';
    }
    return people.map((person) => {
      const role = person.role || person.title || "";
      const label = role ? `${this.escapeHtml(person.name)} (${this.escapeHtml(role)})` : this.escapeHtml(person.name);
      const checked = selected.has(person.id) ? "checked" : "";
      return `
        <label class="flex items-center gap-2 p-1 hover:bg-secondary rounded cursor-pointer">
          <input type="checkbox" class="portfolio-team-cb rounded" value="${this.escapeHtml(person.id)}" ${checked}>
          <span class="text-sm text-secondary">${label}</span>
        </label>
      `;
    }).join("");
  }

  /**
   * Render URL input rows for the detail panel.
   * @param {Array<{label: string, href: string}>} urls
   * @returns {string} HTML string
   */
  renderUrlRows(urls) {
    if (urls.length === 0) {
      return '<p class="text-sm text-muted" id="portfolioUrlsEmpty">No URLs defined</p>';
    }
    return urls.map((url, idx) => this.buildUrlRow(idx, url.label, url.href)).join("");
  }

  /**
   * Build a single URL row HTML string.
   * @param {number} idx
   * @param {string} label
   * @param {string} href
   * @returns {string}
   */
  buildUrlRow(idx, label = "", href = "") {
    return `
      <div class="portfolio-url-row" data-url-index="${idx}">
        <input type="text" class="form-input text-sm" placeholder="Label" value="${
      this.escapeHtml(label)
    }" data-url-field="label" data-url-idx="${idx}">
        <input type="text" class="form-input text-sm" placeholder="https://..." value="${
      this.escapeHtml(href)
    }" data-url-field="href" data-url-idx="${idx}">
        <button type="button" class="text-muted hover:text-error" data-remove-url="${idx}">
          <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
        </button>
      </div>
    `;
  }

  /**
   * Add a new URL row to the form.
   */
  addUrl() {
    const list = document.getElementById("portfolioUrlsList");
    if (!list) return;
    const empty = list.querySelector("#portfolioUrlsEmpty");
    if (empty) empty.remove();
    const idx = list.querySelectorAll("[data-url-index]").length;
    list.insertAdjacentHTML("beforeend", this.buildUrlRow(idx));
  }

  /**
   * Remove a URL row from the form.
   * @param {string} idx
   */
  removeUrl(idx) {
    const el = document.querySelector(`[data-url-index="${idx}"]`);
    if (el) el.remove();
  }

  /**
   * Open detail panel for a new project.
   */
  openNewDetailPanel() {
    this.selectedProject = null;
    this.isDetailOpen = true;
    this.isCreating = true;

    const newProject = {
      name: "",
      category: "Uncategorized",
      status: "planning",
      client: "",
      description: "",
      progress: 0,
      revenue: 0,
      expenses: 0,
      startDate: "",
      endDate: "",
      team: [],
      kpis: [],
      urls: [],
      logo: "",
      license: "",
    };

    this.renderDetailPanel(newProject);

    const titleEl = document.getElementById("portfolioDetailTitle");
    if (titleEl) titleEl.textContent = "New Project";

    document.getElementById("portfolioDetailPanel")?.classList.add("active");

    // Focus the name field
    setTimeout(() => {
      document.getElementById("portfolioDetailName")?.focus();
    }, 200);
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
      this.isCreating = false;
      this.renderDetailPanel(project);
      document.getElementById("portfolioDetailPanel")?.classList.add("active");
    } catch (error) {
      console.error("Error loading project details:", error);
    }
  }

  /**
   * Close detail panel.
   */
  closeDetailPanel() {
    this.isDetailOpen = false;
    this.isCreating = false;
    this.selectedProject = null;
    document.getElementById("portfolioDetailPanel")?.classList.remove("active");
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

    const statusOptions = [
      "discovery",
      "scoping",
      "planning",
      "active",
      "on-hold",
      "completed",
      "production",
      "maintenance",
      "cancelled",
    ]
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
      <div class="bg-secondary rounded-lg p-3 relative" data-kpi-index="${idx}">
        <button type="button" class="absolute top-2 right-2 text-muted hover:text-error" data-remove-kpi="${idx}">
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
      : '<p class="text-sm text-muted">No KPIs defined</p>';

    // Team members (person IDs resolved to names)
    const team = project.team || [];
    const teamHtml = team.map((personId) =>
      `<span class="px-2 py-0.5 bg-tertiary text-sm rounded">${
        this.escapeHtml(this.getPersonName(personId))
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
              <input type="text" id="portfolioDetailCategory" class="form-input" list="portfolioCategoryList" autocomplete="off" value="${
      this.escapeHtml(project.category)
    }">
              <datalist id="portfolioCategoryList">${
      [...new Set(this.projects.map((p) => p.category).filter(Boolean))].sort()
        .map((c) => `<option value="${this.escapeHtml(c)}">`)
        .join("")
    }</datalist>
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

        <!-- Links & Identity -->
        <section class="sidenav-section">
          <h3 class="sidenav-section-title">Links &amp; Identity</h3>
          <div class="space-y-4">
            <div>
              <label class="form-label">Logo URL or Path</label>
              <input type="text" id="portfolioDetailLogo" class="form-input" value="${
      this.escapeHtml(project.logo || "")
    }" placeholder="https://... or uploads/logo.png">
            </div>
            <div>
              <label class="form-label">License</label>
              <input type="text" id="portfolioDetailLicense" class="form-input" value="${
      this.escapeHtml(project.license || "")
    }" placeholder="MIT, Apache-2.0, GPL-3.0, Proprietary...">
            </div>
            <div>
              <label class="form-label">Tech Stack</label>
              <input type="text" id="portfolioDetailTechStack" class="form-input" value="${
      this.escapeHtml((project.techStack || []).join(", "))
    }" placeholder="Deno, TypeScript, SQLite, ...">
            </div>
            <div>
              <label class="form-label">Billing Customer</label>
              <input type="text" id="portfolioDetailBillingCustomer" class="form-input" list="portfolioCustomerList" autocomplete="off" value="${
      this.escapeHtml(
        this.customers.find((c) => c.id === project.billingCustomerId)?.name ||
          project.billingCustomerId || "",
      )
    }" placeholder="Link to a billing customer">
              <datalist id="portfolioCustomerList">${
      this.customers.map((c) =>
        `<option value="${this.escapeHtml(c.name)}" data-id="${c.id}">`
      ).join("")
    }</datalist>
            </div>
            <div>
              <label class="form-label flex items-center justify-between">
                <span>URLs</span>
                <button type="button" id="portfolioAddUrl" class="text-sm text-info hover:underline">+ Add URL</button>
              </label>
              <div id="portfolioUrlsList" class="space-y-2">
                ${this.renderUrlRows(project.urls || [])}
              </div>
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
              <div class="form-input bg-tertiary ${
      (project.revenue || 0) - (project.expenses || 0) >= 0
        ? "text-success"
        : "text-error"
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
          ${(() => {
      const dur = this.formatDuration(project.startDate, project.endDate);
      return dur
        ? `<div class="portfolio-duration-label">Duration: ${dur}</div>`
        : "";
    })()}
        </section>

        <!-- Team -->
        <section class="sidenav-section">
          <h3 class="sidenav-section-title">Team</h3>
          <div class="space-y-2">
            ${
      team.length > 0
        ? `<div class="flex flex-wrap gap-2">${teamHtml}</div>`
        : ""
    }
            <div class="space-y-1 max-h-40 overflow-y-auto" id="portfolioTeamPicker">
              ${this.renderTeamPicker(team)}
            </div>
          </div>
        </section>

        <!-- KPIs -->
        <section class="sidenav-section">
          <h3 class="sidenav-section-title flex items-center justify-between">
            <span>KPIs</span>
            <button type="button" id="portfolioAddKpi" class="text-sm text-info hover:underline">+ Add KPI</button>
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
    div.className = "bg-secondary rounded-lg p-3 relative";
    div.dataset.kpiIndex = idx.toString();
    div.innerHTML = `
      <button type="button" class="absolute top-2 right-2 text-muted hover:text-error" data-remove-kpi="${idx}">
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
    if (!this.selectedProject && !this.isCreating) return;

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

    // Collect team members (person IDs from checkboxes)
    const team = Array.from(
      document.querySelectorAll(".portfolio-team-cb:checked"),
    ).map((cb) => cb.value);

    // Collect URLs
    const urls = [];
    document.querySelectorAll("[data-url-index]").forEach((el) => {
      const label = el.querySelector('[data-url-field="label"]')?.value?.trim();
      const href = el.querySelector('[data-url-field="href"]')?.value?.trim();
      if (href) {
        urls.push({ label: label || href, href });
      }
    });

    const updates = {
      name: document.getElementById("portfolioDetailName")?.value?.trim() ||
        this.selectedProject?.name || "",
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
      urls: urls.length > 0 ? urls : undefined,
      logo: document.getElementById("portfolioDetailLogo")?.value?.trim() ||
        undefined,
      license:
        document.getElementById("portfolioDetailLicense")?.value?.trim() ||
        undefined,
      techStack: (() => {
        const raw =
          document.getElementById("portfolioDetailTechStack")?.value?.trim();
        if (!raw) return undefined;
        return raw.split(",").map((s) => s.trim()).filter(Boolean);
      })(),
      billingCustomerId: (() => {
        const name = document.getElementById("portfolioDetailBillingCustomer")
          ?.value?.trim();
        if (!name) return undefined;
        const match = this.customers.find(
          (c) => c.name.toLowerCase() === name.toLowerCase(),
        );
        return match?.id || undefined;
      })(),
    };

    try {
      if (this.isCreating) {
        if (!updates.name) {
          return;
        }
        await PortfolioAPI.create(updates);
      } else {
        await PortfolioAPI.update(this.selectedProject.id, updates);
      }
      this.closeDetailPanel();
      await this.load();
    } catch (error) {
      console.error("Error saving project:", error);
    }
  }

  /**
   * Bind event listeners for the portfolio view.
   */
  bindEvents() {
    // Search input
    document.getElementById("portfolioSearch")?.addEventListener("input", (e) => {
      this.searchQuery = e.target.value.trim();
      if (this.currentViewMode === "tree") {
        this.renderTreeView();
      } else {
        this.renderListView();
      }
    });

    // Add Project button
    document.getElementById("portfolioAddBtn")?.addEventListener(
      "click",
      () => {
        this.openNewDetailPanel();
      },
    );

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
      // Don't open detail panel when clicking URL links
      if (e.target.closest("[data-stop-propagation]")) return;
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
        const removeKpiBtn = e.target.closest("[data-remove-kpi]");
        if (removeKpiBtn) {
          this.removeKpi(removeKpiBtn.dataset.removeKpi);
          return;
        }

        // Add URL button
        if (e.target.closest("#portfolioAddUrl")) {
          this.addUrl();
          return;
        }

        // Remove URL button
        const removeUrlBtn = e.target.closest("[data-remove-url]");
        if (removeUrlBtn) {
          this.removeUrl(removeUrlBtn.dataset.removeUrl);
        }
      },
    );
  }
}
