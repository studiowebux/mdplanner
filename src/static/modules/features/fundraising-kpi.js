/**
 * Fundraising — KPI Tracker tab.
 * Period selector + metric display with computed fields.
 * Pattern: View Sub-Module
 */

import { KpiAPI } from "../api.js";
import { escapeHtml } from "../utils.js";

function fmt(n, decimals = 0) {
  if (n === null || n === undefined || n === "") return "—";
  return Number(n).toLocaleString(undefined, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

function fmtCurrency(n) {
  if (!n) return "—";
  return "$" + fmt(n);
}

function fmtPct(n) {
  if (n === null || n === undefined || n === "") return "—";
  return Number(n).toFixed(1) + "%";
}

export class FundraisingKpiModule {
  constructor(taskManager) {
    this.tm = taskManager;
  }

  async load() {
    try {
      this.tm.kpiSnapshots = await KpiAPI.fetchAll();
      // Sort newest period first
      this.tm.kpiSnapshots.sort((a, b) => b.period.localeCompare(a.period));
      this.renderSelector();

      if (this.tm.kpiSnapshots.length > 0 && !this.tm.selectedKpiId) {
        this.select(this.tm.kpiSnapshots[0].id);
      } else if (this.tm.selectedKpiId) {
        this.select(this.tm.selectedKpiId);
      } else {
        this.renderMetrics(null);
      }
    } catch (err) {
      console.error("Error loading KPI snapshots:", err);
    }
  }

  renderSelector() {
    const selector = document.getElementById("kpi-selector");
    if (!selector) return;

    selector.innerHTML = '<option value="">Select period</option>';
    (this.tm.kpiSnapshots || []).forEach((s) => {
      const opt = document.createElement("option");
      opt.value = s.id;
      opt.textContent = s.period;
      selector.appendChild(opt);
    });
    if (this.tm.selectedKpiId) selector.value = this.tm.selectedKpiId;
  }

  select(id) {
    this.tm.selectedKpiId = id;
    const selector = document.getElementById("kpi-selector");
    if (selector) selector.value = id || "";

    const snapshot = (this.tm.kpiSnapshots || []).find((s) => s.id === id);
    this.renderMetrics(snapshot);

    const editBtn = document.getElementById("kpi-edit-btn");
    const deleteBtn = document.getElementById("kpi-delete-btn");
    if (snapshot) {
      editBtn?.classList.remove("hidden");
      deleteBtn?.classList.remove("hidden");
    } else {
      editBtn?.classList.add("hidden");
      deleteBtn?.classList.add("hidden");
    }
  }

  renderMetrics(snapshot) {
    const empty = document.getElementById("kpi-empty");
    const grid = document.getElementById("kpi-grid");
    if (!snapshot) {
      empty?.classList.remove("hidden");
      grid?.classList.add("hidden");
      return;
    }

    empty?.classList.add("hidden");
    grid?.classList.remove("hidden");

    const ltvcac = snapshot.cac > 0
      ? (snapshot.ltv / snapshot.cac).toFixed(1) + "x"
      : "—";

    // Payback period = CAC / (MRR × gross_margin / 100), in months
    const grossMarginRate = (snapshot.gross_margin || 0) / 100;
    const payback = snapshot.cac > 0 && snapshot.mrr > 0 && grossMarginRate > 0
      ? (snapshot.cac / (snapshot.mrr * grossMarginRate)).toFixed(1) + " mo"
      : "—";

    // Rule of 40 = growth_rate + (gross_margin - 100) ... simplified: growth + gross_margin - 100
    // Common startup variant: growth_rate% + profit_margin%. We use growth_rate + (gross_margin - 100).
    const rule40 = snapshot.growth_rate != null && snapshot.gross_margin != null
      ? (snapshot.growth_rate + snapshot.gross_margin - 100).toFixed(1) + "%"
      : "—";

    const metrics = [
      { label: "MRR", value: fmtCurrency(snapshot.mrr) },
      { label: "ARR", value: fmtCurrency(snapshot.mrr * 12) },
      { label: "MoM Growth", value: fmtPct(snapshot.growth_rate) },
      { label: "Churn Rate", value: fmtPct(snapshot.churn_rate) },
      { label: "NRR", value: fmtPct(snapshot.nrr) },
      { label: "Gross Margin", value: fmtPct(snapshot.gross_margin) },
      { label: "LTV", value: fmtCurrency(snapshot.ltv) },
      { label: "CAC", value: fmtCurrency(snapshot.cac) },
      { label: "LTV / CAC", value: ltvcac },
      { label: "Payback Period", value: payback },
      { label: "Rule of 40", value: rule40 },
      { label: "Active Users", value: fmt(snapshot.active_users) },
    ];

    if (grid) {
      grid.innerHTML = metrics.map((m) => `
        <div class="kpi-metric">
          <span class="kpi-metric-label">${escapeHtml(m.label)}</span>
          <span class="kpi-metric-value">${escapeHtml(m.value)}</span>
        </div>
      `).join("");
    }

    const notesEl = document.getElementById("kpi-notes");
    if (notesEl) {
      notesEl.textContent = snapshot.notes || "";
      notesEl.closest(".kpi-notes-row")?.classList.toggle(
        "hidden",
        !snapshot.notes,
      );
    }
  }

  async handleDelete() {
    if (!this.tm.selectedKpiId) return;
    try {
      await KpiAPI.delete(this.tm.selectedKpiId);
      this.tm.selectedKpiId = null;
      await this.load();
    } catch (err) {
      console.error("Error deleting KPI snapshot:", err);
    }
  }

  bindEvents() {
    document.getElementById("kpi-add-btn")?.addEventListener("click", () => {
      this.tm.fundraisingKpiSidenavModule.openNew();
    });

    document.getElementById("kpi-edit-btn")?.addEventListener("click", () => {
      if (this.tm.selectedKpiId) {
        this.tm.fundraisingKpiSidenavModule.openEdit(this.tm.selectedKpiId);
      }
    });

    document.getElementById("kpi-delete-btn")?.addEventListener(
      "click",
      () => this.handleDelete(),
    );

    document.getElementById("kpi-selector")?.addEventListener(
      "change",
      (e) => this.select(e.target.value),
    );
  }
}
