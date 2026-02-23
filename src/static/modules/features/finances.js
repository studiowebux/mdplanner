// Finances Module
// Three tabs: Overview (period table), Burn Rate (runway + bar chart), P&L (category breakdown)

import { FinancesAPI } from "../api.js";

// ----------------------------------------------------------------
// Derived value helpers
// ----------------------------------------------------------------

function totalRevenue(period) {
  return (period.revenue || []).reduce((s, i) => s + (i.amount || 0), 0);
}

function totalExpenses(period) {
  return (period.expenses || []).reduce((s, i) => s + (i.amount || 0), 0);
}

function net(period) {
  return totalRevenue(period) - totalExpenses(period);
}

function burnRate(period) {
  return Math.max(0, totalExpenses(period) - totalRevenue(period));
}

function runwayMonths(period) {
  const burn = burnRate(period);
  if (burn === 0) return Infinity;
  return period.cash_on_hand / burn;
}

function fmtCurrency(n) {
  if (n === undefined || n === null) return "—";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(n);
}

function fmtRunway(months) {
  if (!isFinite(months)) return "∞";
  if (months >= 12) return `${(months / 12).toFixed(1)}y`;
  return `${Math.round(months)}mo`;
}

export class FinancesModule {
  constructor(taskManager) {
    this.taskManager = taskManager;
    this.activeTab = "overview";
  }

  async load() {
    try {
      const periods = await FinancesAPI.fetchAll();
      this.taskManager.financialPeriods = periods;
      this.renderView();
    } catch (err) {
      console.error("Error loading finances:", err);
    }
  }

  renderView() {
    const tab = this.activeTab;
    if (tab === "overview") this._renderOverview();
    else if (tab === "burnrate") this._renderBurnRate();
    else if (tab === "pl") this._renderPL();
  }

  // ----------------------------------------------------------------
  // Overview tab — period table
  // ----------------------------------------------------------------

  _renderOverview() {
    const container = document.getElementById("financesOverviewContainer");
    const empty = document.getElementById("emptyFinancesState");
    if (!container) return;

    const periods = this.taskManager.financialPeriods || [];

    if (periods.length === 0) {
      empty?.classList.remove("hidden");
      container.innerHTML = "";
      return;
    }

    empty?.classList.add("hidden");
    container.innerHTML = `
      <div class="finances-table-wrap">
        <table class="finances-table">
          <thead>
            <tr>
              <th>Period</th>
              <th class="num">Revenue</th>
              <th class="num">Expenses</th>
              <th class="num">Net</th>
              <th class="num">Cash</th>
              <th class="num">Runway</th>
            </tr>
          </thead>
          <tbody>
            ${periods.map((p) => this._renderOverviewRow(p)).join("")}
          </tbody>
        </table>
      </div>`;
  }

  _renderOverviewRow(p) {
    const rev = totalRevenue(p);
    const exp = totalExpenses(p);
    const n = net(p);
    const runway = runwayMonths(p);
    const netClass = n >= 0 ? "finances-positive" : "finances-negative";
    return `
      <tr class="finances-row" data-id="${p.id}">
        <td class="finances-period">${escapeHtml(p.period)}</td>
        <td class="num">${fmtCurrency(rev)}</td>
        <td class="num">${fmtCurrency(exp)}</td>
        <td class="num ${netClass}">${fmtCurrency(n)}</td>
        <td class="num">${fmtCurrency(p.cash_on_hand)}</td>
        <td class="num">${fmtRunway(runway)}</td>
      </tr>`;
  }

  // ----------------------------------------------------------------
  // Burn Rate tab — runway card + bar chart
  // ----------------------------------------------------------------

  _renderBurnRate() {
    const container = document.getElementById("financesBurnRateContainer");
    if (!container) return;

    const periods = this.taskManager.financialPeriods || [];

    if (periods.length === 0) {
      container.innerHTML =
        '<p class="finances-empty-msg">No data yet. Add a period to get started.</p>';
      return;
    }

    const latest = periods[0]; // sorted desc
    const burn = burnRate(latest);
    const runway = runwayMonths(latest);
    const runwayClass = runway < 6 ? "finances-negative" : runway < 12 ? "finances-warn" : "finances-positive";

    // Bar chart: last 12 periods (already sorted desc, reverse for chart)
    const chartPeriods = [...periods].reverse().slice(-12);
    const maxVal = Math.max(
      ...chartPeriods.map((p) => Math.max(totalRevenue(p), totalExpenses(p))),
      1,
    );

    container.innerHTML = `
      <div class="finances-runway-cards">
        <div class="finances-card">
          <div class="finances-card-label">Monthly Burn Rate</div>
          <div class="finances-card-value ${burn === 0 ? "finances-positive" : "finances-negative"}">${fmtCurrency(burn)}</div>
          <div class="finances-card-sub">expenses − revenue</div>
        </div>
        <div class="finances-card">
          <div class="finances-card-label">Cash on Hand</div>
          <div class="finances-card-value">${fmtCurrency(latest.cash_on_hand)}</div>
          <div class="finances-card-sub">as of ${escapeHtml(latest.period)}</div>
        </div>
        <div class="finances-card">
          <div class="finances-card-label">Runway</div>
          <div class="finances-card-value ${runwayClass}">${fmtRunway(runway)}</div>
          <div class="finances-card-sub">${isFinite(runway) ? `~${Math.round(runway)} months` : "profitable / break-even"}</div>
        </div>
      </div>

      <div class="finances-chart-section">
        <div class="finances-chart-title">Revenue vs Expenses</div>
        <div class="finances-chart">
          ${chartPeriods
            .map((p) => {
              const rev = totalRevenue(p);
              const exp = totalExpenses(p);
              const revPct = (rev / maxVal) * 100;
              const expPct = (exp / maxVal) * 100;
              return `
              <div class="finances-chart-col">
                <div class="finances-chart-bars">
                  <div class="finances-bar finances-bar-rev" style="height:${revPct}%" title="Revenue: ${fmtCurrency(rev)}"></div>
                  <div class="finances-bar finances-bar-exp" style="height:${expPct}%" title="Expenses: ${fmtCurrency(exp)}"></div>
                </div>
                <div class="finances-chart-label">${escapeHtml(p.period.slice(5))}</div>
              </div>`;
            })
            .join("")}
        </div>
        <div class="finances-chart-legend">
          <span class="finances-legend-rev">Revenue</span>
          <span class="finances-legend-exp">Expenses</span>
        </div>
      </div>`;
  }

  // ----------------------------------------------------------------
  // P&L tab — category breakdown pivot
  // ----------------------------------------------------------------

  _renderPL() {
    const container = document.getElementById("financesPLContainer");
    if (!container) return;

    const periods = this.taskManager.financialPeriods || [];

    if (periods.length === 0) {
      container.innerHTML =
        '<p class="finances-empty-msg">No data yet. Add a period to get started.</p>';
      return;
    }

    // Collect all categories
    const revCats = new Set();
    const expCats = new Set();
    periods.forEach((p) => {
      (p.revenue || []).forEach((i) => revCats.add(i.category));
      (p.expenses || []).forEach((i) => expCats.add(i.category));
    });

    const cols = [...periods].reverse(); // oldest → newest for P&L

    const headerCols = cols.map((p) => `<th class="num">${escapeHtml(p.period)}</th>`).join("");

    const makeRows = (cats, items, label) => {
      if (cats.size === 0) return "";
      const catRows = [...cats]
        .map((cat) => {
          const cells = cols
            .map((p) => {
              const item = (items(p) || []).find((i) => i.category === cat);
              return `<td class="num">${item ? fmtCurrency(item.amount) : "—"}</td>`;
            })
            .join("");
          return `<tr><td class="finances-pl-cat">${escapeHtml(cat)}</td>${cells}</tr>`;
        })
        .join("");
      const totalCells = cols
        .map((p) => {
          const sum = (items(p) || []).reduce((s, i) => s + (i.amount || 0), 0);
          return `<td class="num finances-pl-total">${fmtCurrency(sum)}</td>`;
        })
        .join("");

      return `
        <tr class="finances-pl-section-header">
          <td colspan="${cols.length + 1}">${label}</td>
        </tr>
        ${catRows}
        <tr class="finances-pl-subtotal">
          <td>Total ${label}</td>${totalCells}
        </tr>`;
    };

    const netCells = cols
      .map((p) => {
        const n = net(p);
        const cls = n >= 0 ? "finances-positive" : "finances-negative";
        return `<td class="num ${cls}">${fmtCurrency(n)}</td>`;
      })
      .join("");

    container.innerHTML = `
      <div class="finances-table-wrap">
        <table class="finances-table finances-pl-table">
          <thead>
            <tr><th>Category</th>${headerCols}</tr>
          </thead>
          <tbody>
            ${makeRows(revCats, (p) => p.revenue, "Revenue")}
            ${makeRows(expCats, (p) => p.expenses, "Expenses")}
            <tr class="finances-pl-net">
              <td>Net</td>${netCells}
            </tr>
          </tbody>
        </table>
      </div>`;
  }

  // ----------------------------------------------------------------
  // Tab switching
  // ----------------------------------------------------------------

  _switchTab(tab) {
    this.activeTab = tab;
    ["overview", "burnrate", "pl"].forEach((t) => {
      document.getElementById(`financesTab-${t}`)?.classList.toggle("finances-tab-active", t === tab);
      document.getElementById(`financesPanel-${t}`)?.classList.toggle("hidden", t !== tab);
    });
    this.renderView();
  }

  // ----------------------------------------------------------------
  // Event binding
  // ----------------------------------------------------------------

  bindEvents() {
    document.getElementById("addFinancesBtn")?.addEventListener("click", () => {
      this.taskManager.financesSidenavModule?.openCreate();
    });

    ["overview", "burnrate", "pl"].forEach((tab) => {
      document.getElementById(`financesTab-${tab}`)?.addEventListener("click", () =>
        this._switchTab(tab),
      );
    });

    // Row click → edit
    document.getElementById("financesOverviewContainer")?.addEventListener("click", (e) => {
      const row = e.target.closest(".finances-row");
      if (!row) return;
      const id = row.dataset.id;
      const period = (this.taskManager.financialPeriods || []).find((p) => p.id === id);
      if (period) this.taskManager.financesSidenavModule?.openEdit(period);
    });
  }
}

function escapeHtml(str) {
  return String(str ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
