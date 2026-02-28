/**
 * Fundraising — KPI Snapshot sidenav (create / edit).
 * Pattern: Sidenav Module with auto-save debounce
 */

import { Sidenav } from "../ui/sidenav.js";
import { KpiAPI } from "../api.js";
import { showToast } from "../ui/toast.js";

const FIELDS = [
  "period",
  "mrr",
  "churn_rate",
  "ltv",
  "cac",
  "growth_rate",
  "active_users",
  "nrr",
  "gross_margin",
  "notes",
];

export class FundraisingKpiSidenavModule {
  constructor(taskManager) {
    this.tm = taskManager;
    this.editingId = null;
  }

  openNew() {
    this.editingId = null;
    this._setHeader("New KPI Period");
    this._fillForm({
      period: this._currentMonth(),
      mrr: "",
      churn_rate: "",
      ltv: "",
      cac: "",
      growth_rate: "",
      active_users: "",
      nrr: "",
      gross_margin: "",
      notes: "",
    });
    this._updateArrPreview(0);
    document.getElementById("kpi-sidenav-delete")?.classList.add("hidden");
    Sidenav.open("kpi-sidenav");
  }

  openEdit(id) {
    const snapshot = (this.tm.kpiSnapshots || []).find((s) => s.id === id);
    if (!snapshot) return;

    this.editingId = id;
    this._setHeader("Edit KPI Period");
    this._fillForm(snapshot);
    this._updateArrPreview(snapshot.mrr);
    document.getElementById("kpi-sidenav-delete")?.classList.remove("hidden");
    Sidenav.open("kpi-sidenav");
  }

  _currentMonth() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  }

  _setHeader(text) {
    const el = document.getElementById("kpi-sidenav-header");
    if (el) el.textContent = text;
  }

  _fillForm(data) {
    FIELDS.forEach((field) => {
      const el = document.getElementById(`kpi-sidenav-${field}`);
      if (el) el.value = data[field] ?? "";
    });
  }

  _readForm() {
    const data = {};
    FIELDS.forEach((field) => {
      const el = document.getElementById(`kpi-sidenav-${field}`);
      data[field] = el ? el.value : "";
    });
    data.mrr = Number(data.mrr) || 0;
    data.arr = data.mrr * 12;
    data.churn_rate = Number(data.churn_rate) || 0;
    data.ltv = Number(data.ltv) || 0;
    data.cac = Number(data.cac) || 0;
    data.growth_rate = Number(data.growth_rate) || 0;
    data.active_users = Number(data.active_users) || 0;
    data.nrr = Number(data.nrr) || 0;
    data.gross_margin = Number(data.gross_margin) || 0;
    return data;
  }

  _updateArrPreview(mrr) {
    const el = document.getElementById("kpi-sidenav-arr-preview");
    if (el) {
      const arr = Number(mrr) * 12;
      el.textContent = arr > 0 ? `ARR: $${arr.toLocaleString()}` : "ARR: —";
    }
  }

  _periodExists(period) {
    return (this.tm.kpiSnapshots || []).some(
      (s) => s.period === period && s.id !== this.editingId,
    );
  }

  async save() {
    const data = this._readForm();

    if (!data.period.trim()) {
      this._showStatus("Period required (YYYY-MM)");
      return;
    }

    if (this._periodExists(data.period)) {
      this._showStatus("Period already exists");
      showToast(`KPI snapshot for ${data.period} already exists`, "error");
      return;
    }

    try {
      if (this.editingId) {
        await KpiAPI.update(this.editingId, data);
        this._showStatus("Saved");
      } else {
        const res = await KpiAPI.create(data);
        const created = await res.json();
        this.editingId = created.id;
        this.tm.selectedKpiId = created.id;
        this._setHeader("Edit KPI Period");
        document.getElementById("kpi-sidenav-delete")?.classList.remove(
          "hidden",
        );
        this._showStatus("Created");
      }
      await this.tm.fundraisingKpiModule.load();
    } catch (err) {
      console.error("Error saving KPI snapshot:", err);
      this._showStatus("Error");
      showToast("Error saving KPI snapshot", "error");
    }
  }

  async handleDelete() {
    if (!this.editingId) return;
    try {
      await KpiAPI.delete(this.editingId);
      Sidenav.close("kpi-sidenav");
      this.editingId = null;
      this.tm.selectedKpiId = null;
      await this.tm.fundraisingKpiModule.load();
      showToast("KPI snapshot deleted", "success");
    } catch (err) {
      console.error("Error deleting KPI snapshot:", err);
      showToast("Error deleting KPI snapshot", "error");
    }
  }

  _showStatus(msg) {
    const el = document.getElementById("kpi-sidenav-status");
    if (el) {
      el.textContent = msg;
      el.classList.remove("hidden");
      setTimeout(() => el.classList.add("hidden"), 3000);
    }
  }

  bindEvents() {
    document.getElementById("kpi-sidenav-close")?.addEventListener(
      "click",
      () => Sidenav.close("kpi-sidenav"),
    );
    document.getElementById("kpi-sidenav-cancel")?.addEventListener(
      "click",
      () => Sidenav.close("kpi-sidenav"),
    );
    document.getElementById("kpi-sidenav-delete")?.addEventListener(
      "click",
      () => this.handleDelete(),
    );
    document.getElementById("kpi-sidenav-save")?.addEventListener(
      "click",
      () => this.save(),
    );

  }
}
