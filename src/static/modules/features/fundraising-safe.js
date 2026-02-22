/**
 * Fundraising — SAFE Rounds tab.
 * Renders SAFE agreement table and computed cap table.
 * Pattern: View Sub-Module
 */

import { SafeAPI } from "../api.js";
import { escapeHtml } from "../utils.js";

const SUMMARY_STORAGE_KEY = "mdplanner_safe_target";

const SAFE_TYPE_LABELS = {
  "pre-money": "Pre-Money",
  "post-money": "Post-Money",
  "mfn": "MFN",
};

const SAFE_STATUS_LABELS = {
  draft: "Draft",
  signed: "Signed",
  converted: "Converted",
};

function formatCurrency(n) {
  if (!n) return "$0";
  return "$" + Number(n).toLocaleString();
}

function computeOwnership(amount, cap) {
  if (!cap || cap === 0) return 0;
  return ((amount / cap) * 100).toFixed(2);
}

export class FundraisingSafeModule {
  constructor(taskManager) {
    this.tm = taskManager;
  }

  async load() {
    try {
      this.tm.safeAgreements = await SafeAPI.fetchAll();
      this.render();
    } catch (err) {
      console.error("Error loading SAFE agreements:", err);
    }
  }

  render() {
    this.renderSummaryCard();
    this.renderTable();
    this.renderCapTable();
  }

  renderSummaryCard() {
    const container = document.getElementById("safe-summary-card");
    if (!container) return;

    const agreements = this.tm.safeAgreements || [];
    const active = agreements.filter((a) => a.status !== "converted");

    const totalCommitted = active.reduce((sum, a) => sum + (a.amount || 0), 0);
    const totalDilution = active.reduce((sum, a) => {
      return sum + Number(computeOwnership(a.amount, a.valuation_cap));
    }, 0);

    let target = 0;
    try {
      target = Number(localStorage.getItem(SUMMARY_STORAGE_KEY)) || 0;
    } catch (_) { /* ignore */ }

    const progressPct = target > 0
      ? Math.min((totalCommitted / target) * 100, 100).toFixed(1)
      : 0;

    container.innerHTML = `
      <div class="safe-summary">
        <div class="safe-summary-stat">
          <span class="safe-summary-label">Total Committed</span>
          <span class="safe-summary-value">${formatCurrency(totalCommitted)}</span>
          <span class="safe-summary-sub">${active.length} agreement${active.length !== 1 ? "s" : ""}</span>
        </div>
        <div class="safe-summary-stat">
          <span class="safe-summary-label">Target Raise</span>
          <span class="safe-summary-value">
            <span class="safe-summary-currency">$</span><input
              type="number"
              id="safe-target-input"
              class="safe-target-input"
              value="${target || ""}"
              placeholder="0"
              min="0"
            >
          </span>
        </div>
        <div class="safe-summary-stat">
          <span class="safe-summary-label">Est. Total Dilution</span>
          <span class="safe-summary-value">${totalDilution.toFixed(2)}%</span>
        </div>
      </div>
      ${
      target > 0
        ? `<div class="safe-progress-wrap">
          <div class="safe-progress-bar" style="width: ${progressPct}%"></div>
        </div>
        <p class="safe-progress-label">${progressPct}% of target raised</p>`
        : ""
    }
    `;

    document.getElementById("safe-target-input")?.addEventListener(
      "input",
      (e) => {
        try {
          localStorage.setItem(SUMMARY_STORAGE_KEY, e.target.value);
        } catch (_) { /* ignore */ }
        this.renderSummaryCard();
      },
    );
  }

  renderTable() {
    const tbody = document.getElementById("safe-table-body");
    if (!tbody) return;

    const agreements = this.tm.safeAgreements || [];

    if (agreements.length === 0) {
      tbody.innerHTML = `<tr><td colspan="7" class="safe-empty">No SAFE agreements yet. Add one to get started.</td></tr>`;
      return;
    }

    tbody.innerHTML = agreements.map((a) => `
      <tr class="safe-row" data-id="${escapeHtml(a.id)}">
        <td>${escapeHtml(a.investor)}</td>
        <td>${formatCurrency(a.amount)}</td>
        <td>${formatCurrency(a.valuation_cap)}</td>
        <td>${a.discount ? a.discount + "%" : "—"}</td>
        <td>${SAFE_TYPE_LABELS[a.type] || a.type}</td>
        <td><span class="safe-status safe-status--${escapeHtml(a.status)}">${SAFE_STATUS_LABELS[a.status] || a.status}</span></td>
        <td>${escapeHtml(a.date)}</td>
      </tr>
    `).join("");

    tbody.querySelectorAll(".safe-row").forEach((row) => {
      row.addEventListener("click", () => {
        this.tm.fundraisingSafeSidenavModule.openEdit(row.dataset.id);
      });
    });
  }

  renderCapTable() {
    const container = document.getElementById("safe-cap-table");
    if (!container) return;

    const agreements = (this.tm.safeAgreements || []).filter(
      (a) => a.status !== "converted",
    );

    if (agreements.length === 0) {
      container.innerHTML = `<p class="safe-empty">No active SAFE agreements to display.</p>`;
      return;
    }

    const totalAmount = agreements.reduce((sum, a) => sum + a.amount, 0);
    const rows = agreements.map((a) => {
      const ownership = computeOwnership(a.amount, a.valuation_cap);
      return `
        <tr>
          <td>${escapeHtml(a.investor)}</td>
          <td>${formatCurrency(a.amount)}</td>
          <td>${formatCurrency(a.valuation_cap)}</td>
          <td>${SAFE_TYPE_LABELS[a.type] || a.type}</td>
          <td>${ownership}%</td>
        </tr>
      `;
    }).join("");

    container.innerHTML = `
      <div class="fundraising-table-wrap">
      <table class="safe-table cap-table">
        <thead>
          <tr>
            <th>Investor</th>
            <th>Amount</th>
            <th>Valuation Cap</th>
            <th>Type</th>
            <th>Est. Ownership</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
        <tfoot>
          <tr>
            <td><strong>Total</strong></td>
            <td><strong>${formatCurrency(totalAmount)}</strong></td>
            <td colspan="3"></td>
          </tr>
        </tfoot>
      </table>
      </div>
      <p class="cap-table-note">Est. ownership = amount / valuation cap. Post-money SAFEs dilute existing holders differently — consult your attorney for an accurate cap table.</p>
    `;
  }

  bindEvents() {
    document.getElementById("safe-add-btn")?.addEventListener("click", () => {
      this.tm.fundraisingSafeSidenavModule.openNew();
    });
  }
}
