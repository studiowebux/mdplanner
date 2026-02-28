// Global Search Module
// Full-text search overlay powered by SQLite FTS5 cache.
// Requires --cache flag. Triggered by Cmd+K / Ctrl+K.

import { SearchAPI } from "../api.js";

const VIEW_BY_TYPE = {
  task: "board",
  note: "notes",
  goal: "goals",
  idea: "ideas",
  meeting: "meetings",
  person: "people",
  swot: "swot",
  brief: "brief",
  company: "crm",
  contact: "crm",
  retrospective: "retrospectives",
  portfolio: "portfolio",
  moscow: "moscow",
  eisenhower: "eisenhower",
  onboarding: "onboarding",
  onboarding_template: "onboarding",
  financial_period: "finances",
  journal: "journal",
  dns_domain: "dns",
  habit: "habits",
  fishbone: "fishbone",
};

const TYPE_LABELS = {
  task: "Task",
  note: "Note",
  goal: "Goal",
  idea: "Idea",
  meeting: "Meeting",
  person: "Person",
  swot: "SWOT",
  brief: "Brief",
  company: "Company",
  contact: "Contact",
  retrospective: "Retrospective",
  portfolio: "Portfolio",
  moscow: "MoSCoW",
  eisenhower: "Eisenhower",
  onboarding: "Onboarding",
  onboarding_template: "Template",
  financial_period: "Finance",
  journal: "Journal",
  dns_domain: "Domain",
  habit: "Habit",
  fishbone: "Fishbone",
};

export class GlobalSearch {
  constructor(taskManager) {
    this.taskManager = taskManager;
    this.debounceTimer = null;
    this.activeIndex = -1;
    this.results = [];
    this.cacheEnabled = false;
  }

  async init() {
    try {
      const status = await SearchAPI.status();
      this.cacheEnabled = status.enabled === true;
    } catch {
      this.cacheEnabled = false;
    }
    this.bindEvents();
  }

  open() {
    const overlay = document.getElementById("globalSearchOverlay");
    if (!overlay) return;
    overlay.classList.remove("hidden");
    this.activeIndex = -1;
    this.results = [];

    const input = document.getElementById("globalSearchInput");
    if (input) {
      input.value = "";
      input.focus();
    }

    if (!this.cacheEnabled) {
      this._renderDisabled();
    } else {
      this._renderEmpty();
    }
  }

  close() {
    document.getElementById("globalSearchOverlay")?.classList.add("hidden");
    const input = document.getElementById("globalSearchInput");
    if (input) input.value = "";
    this.results = [];
    this.activeIndex = -1;
  }

  async search(query) {
    if (!this.cacheEnabled || !query.trim()) {
      this._renderEmpty();
      return;
    }
    try {
      const data = await SearchAPI.search(query, { limit: 25 });
      this.results = data.results ?? [];
      this.activeIndex = -1;
      this._renderResults(query);
    } catch {
      this._renderError();
    }
  }

  _navigate(result) {
    const view = VIEW_BY_TYPE[result.type] ?? "board";
    this.taskManager.switchView(view);
    this.close();
  }

  _renderEmpty() {
    const el = document.getElementById("globalSearchResults");
    if (el) el.innerHTML = "";
  }

  _renderDisabled() {
    const el = document.getElementById("globalSearchResults");
    if (!el) return;
    el.innerHTML = `
      <div class="search-empty">
        Start mdplanner with <code>--cache</code> to enable full-text search.
      </div>`;
  }

  _renderError() {
    const el = document.getElementById("globalSearchResults");
    if (!el) return;
    el.innerHTML = `<div class="search-empty">Search unavailable. Is the server running with --cache?</div>`;
  }

  _renderResults(query) {
    const el = document.getElementById("globalSearchResults");
    if (!el) return;

    if (this.results.length === 0) {
      el.innerHTML = `<div class="search-empty">No results for "<strong>${escapeHtml(query)}</strong>"</div>`;
      return;
    }

    el.innerHTML = this.results.map((r, i) => `
      <div class="search-result-row${i === this.activeIndex ? " search-result-active" : ""}"
           data-index="${i}"
           role="option"
           aria-selected="${i === this.activeIndex}">
        <span class="search-result-type search-result-type-${r.type}">${TYPE_LABELS[r.type] ?? r.type}</span>
        <div class="search-result-body">
          <div class="search-result-title">${escapeHtml(r.title)}</div>
          ${r.snippet ? `<div class="search-result-snippet">${sanitizeSnippet(r.snippet)}</div>` : ""}
        </div>
      </div>
    `).join("");

    el.querySelectorAll(".search-result-row").forEach((row) => {
      row.addEventListener("click", () => {
        const idx = parseInt(row.dataset.index, 10);
        this._navigate(this.results[idx]);
      });
    });
  }

  _setActiveIndex(idx) {
    const rows = document.querySelectorAll(".search-result-row");
    this.activeIndex = Math.max(-1, Math.min(idx, rows.length - 1));
    rows.forEach((row, i) => {
      const active = i === this.activeIndex;
      row.classList.toggle("search-result-active", active);
      row.setAttribute("aria-selected", String(active));
      if (active) row.scrollIntoView({ block: "nearest" });
    });
  }

  _isEnabled() {
    const features = this.taskManager.projectConfig?.features;
    return !features || features.length === 0 || features.includes("quick-search");
  }

  bindEvents() {
    // Cmd+K / Ctrl+K to open (respects feature visibility)
    document.addEventListener("keydown", (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        if (!this._isEnabled()) return;
        const overlay = document.getElementById("globalSearchOverlay");
        if (overlay?.classList.contains("hidden")) {
          this.open();
        } else {
          this.close();
        }
      }
    });

    // Close on overlay backdrop click
    document.getElementById("globalSearchOverlay")?.addEventListener(
      "click",
      (e) => {
        if (e.target.id === "globalSearchOverlay") this.close();
      },
    );

    // Header button (desktop + mobile)
    document.getElementById("globalSearchBtn")?.addEventListener(
      "click",
      () => this.open(),
    );
    document.getElementById("globalSearchBtnMobile")?.addEventListener(
      "click",
      () => this.open(),
    );

    const input = document.getElementById("globalSearchInput");
    if (!input) return;

    // Input: debounced search
    input.addEventListener("input", () => {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = setTimeout(() => this.search(input.value), 300);
    });

    // Keyboard navigation within overlay
    input.addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
        this.close();
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        this._setActiveIndex(this.activeIndex + 1);
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        this._setActiveIndex(this.activeIndex - 1);
      } else if (e.key === "Enter" && this.activeIndex >= 0) {
        this._navigate(this.results[this.activeIndex]);
      } else if (e.key === "Enter" && this.results.length > 0) {
        this._navigate(this.results[0]);
      }
    });
  }
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// Strip markdown syntax then allow <mark> tags from the server snippet
function sanitizeSnippet(snippet) {
  return snippet
    .replace(/#{1,6}\s+/g, "")       // headings
    .replace(/\*\*(.+?)\*\*/g, "$1") // bold
    .replace(/\*(.+?)\*/g, "$1")     // italic
    .replace(/__(.+?)__/g, "$1")     // bold alt
    .replace(/_(.+?)_/g, "$1")       // italic alt
    .replace(/`{1,3}[^`]*`{1,3}/g, "") // code
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1") // links
    .replace(/^[-*+]\s+/gm, "")      // list bullets
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/&lt;mark&gt;/g, "<mark>")
    .replace(/&lt;\/mark&gt;/g, "</mark>");
}
