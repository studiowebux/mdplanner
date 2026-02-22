/**
 * Fundraising — Investor Pipeline tab.
 * Renders a sortable table of investors grouped by status.
 * Pattern: View Sub-Module
 */

import { InvestorAPI } from "../api.js";
import { escapeHtml } from "../utils.js";

const STATUS_ORDER = [
  "not_started",
  "in_progress",
  "term_sheet",
  "invested",
  "passed",
];

const STATUS_LABELS = {
  not_started: "Not Started",
  in_progress: "In Progress",
  term_sheet: "Term Sheet",
  invested: "Invested",
  passed: "Passed",
};

const TYPE_LABELS = {
  vc: "VC",
  angel: "Angel",
  family_office: "Family Office",
  corporate: "Corporate",
  accelerator: "Accelerator",
};

function formatCurrency(n) {
  if (!n) return "—";
  return "$" + Number(n).toLocaleString();
}

export class FundraisingPipelineModule {
  constructor(taskManager) {
    this.tm = taskManager;
    this.filterStatus = "all";
  }

  async load() {
    try {
      this.tm.investors = await InvestorAPI.fetchAll();
      this.render();
    } catch (err) {
      console.error("Error loading investors:", err);
    }
  }

  render() {
    const tbody = document.getElementById("pipeline-table-body");
    if (!tbody) return;

    let investors = this.tm.investors || [];

    if (this.filterStatus !== "all") {
      investors = investors.filter((i) => i.status === this.filterStatus);
    }

    const sorted = [...investors].sort(
      (a, b) =>
        STATUS_ORDER.indexOf(a.status) - STATUS_ORDER.indexOf(b.status),
    );

    if (sorted.length === 0) {
      tbody.innerHTML = `<tr><td colspan="6" class="pipeline-empty">No investors yet. Add one to get started.</td></tr>`;
      return;
    }

    tbody.innerHTML = sorted.map((inv) => `
      <tr class="pipeline-row" data-id="${escapeHtml(inv.id)}">
        <td>${escapeHtml(inv.name)}</td>
        <td>${TYPE_LABELS[inv.type] || inv.type}</td>
        <td>${formatCurrency(inv.amount_target)}</td>
        <td><span class="pipeline-status pipeline-status--${escapeHtml(inv.status)}">${STATUS_LABELS[inv.status] || inv.status}</span></td>
        <td>${escapeHtml(inv.last_contact || "—")}</td>
        <td>${escapeHtml(inv.contact || "—")}</td>
      </tr>
    `).join("");

    tbody.querySelectorAll(".pipeline-row").forEach((row) => {
      row.addEventListener("click", () => {
        this.tm.fundraisingPipelineSidenavModule.openEdit(row.dataset.id);
      });
    });

    this._updateSummary(investors);
  }

  _updateSummary(investors) {
    const totalTarget = investors
      .filter((i) => i.status !== "passed")
      .reduce((sum, i) => sum + i.amount_target, 0);
    const invested = investors
      .filter((i) => i.status === "invested")
      .reduce((sum, i) => sum + i.amount_target, 0);

    const summaryEl = document.getElementById("pipeline-summary");
    if (summaryEl) {
      summaryEl.textContent = `${investors.length} investors · $${invested.toLocaleString()} closed · $${totalTarget.toLocaleString()} pipeline`;
    }
  }

  bindEvents() {
    document.getElementById("pipeline-add-btn")?.addEventListener(
      "click",
      () => this.tm.fundraisingPipelineSidenavModule.openNew(),
    );

    document.querySelectorAll(".pipeline-filter-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        document.querySelectorAll(".pipeline-filter-btn").forEach((b) =>
          b.classList.remove("active")
        );
        btn.classList.add("active");
        this.filterStatus = btn.dataset.status;
        this.render();
      });
    });
  }
}
