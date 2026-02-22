/**
 * Fundraising — Runway Calculator.
 * Computes months of runway from cash on hand and monthly burn.
 * Inputs persisted to localStorage. No sidenav needed.
 * Pattern: View Sub-Module (stateless computation)
 *
 * Migration path: when Goal 20 (finances) is implemented, monthly burn
 * can be derived from finances/ expense entries instead of manual input.
 */

const STORAGE_KEY = "mdplanner_runway_config";

export class FundraisingRunwayModule {
  constructor(_taskManager) {
    this.cash = 0;
    this.debt = 0;
    this.burn = 0;
  }

  load() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const config = JSON.parse(saved);
        this.cash = config.cash || 0;
        this.debt = config.debt || 0;
        this.burn = config.burn || 0;
      }
    } catch (_) {
      // ignore parse errors
    }
    this._fillInputs();
    this._compute();
  }

  _fillInputs() {
    const cashEl = document.getElementById("runway-cash");
    const debtEl = document.getElementById("runway-debt");
    const burnEl = document.getElementById("runway-burn");
    if (cashEl) cashEl.value = this.cash || "";
    if (debtEl) debtEl.value = this.debt || "";
    if (burnEl) burnEl.value = this.burn || "";
  }

  _save() {
    this.cash = Number(document.getElementById("runway-cash")?.value) || 0;
    this.debt = Number(document.getElementById("runway-debt")?.value) || 0;
    this.burn = Number(document.getElementById("runway-burn")?.value) || 0;
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ cash: this.cash, debt: this.debt, burn: this.burn }),
      );
    } catch (_) {
      // ignore storage errors
    }
    this._compute();
  }

  _compute() {
    const resultEl = document.getElementById("runway-result");
    const dateEl = document.getElementById("runway-date");
    const effectiveCashEl = document.getElementById("runway-effective-cash");
    if (!resultEl) return;

    const effectiveCash = Math.max(0, this.cash - this.debt);

    if (effectiveCashEl) {
      if (this.debt > 0) {
        effectiveCashEl.textContent =
          `Effective cash: $${effectiveCash.toLocaleString()} (after $${this.debt.toLocaleString()} debt)`;
      } else {
        effectiveCashEl.textContent = "";
      }
    }

    if (!effectiveCash || !this.burn || this.burn <= 0) {
      resultEl.textContent = "—";
      if (dateEl) dateEl.textContent = "";
      return;
    }

    const months = effectiveCash / this.burn;
    const rounded = Math.floor(months);
    const runoutDate = new Date();
    runoutDate.setMonth(runoutDate.getMonth() + rounded);

    resultEl.textContent = `${months.toFixed(1)} months`;

    if (dateEl) {
      dateEl.textContent = `Runway out: ${runoutDate.toLocaleDateString(
        undefined,
        { year: "numeric", month: "long" },
      )}`;
    }
  }

  bindEvents() {
    document.getElementById("runway-cash")?.addEventListener("input", () =>
      this._save()
    );
    document.getElementById("runway-debt")?.addEventListener("input", () =>
      this._save()
    );
    document.getElementById("runway-burn")?.addEventListener("input", () =>
      this._save()
    );
  }
}
