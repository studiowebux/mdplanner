/**
 * Fundraising — SAFE Agreement sidenav (create / edit).
 * Pattern: Sidenav Module with auto-save debounce
 */

import { Sidenav } from "../ui/sidenav.js";
import { SafeAPI } from "../api.js";
import { showToast } from "../ui/toast.js";

const FIELDS = [
  "investor",
  "amount",
  "valuation_cap",
  "discount",
  "type",
  "date",
  "status",
  "notes",
];

export class FundraisingSafeSidenavModule {
  constructor(taskManager) {
    this.tm = taskManager;
    this.editingId = null;
    this.autoSaveTimeout = null;
  }

  openNew() {
    this.editingId = null;
    this._setHeader("New SAFE Agreement");
    this._fillForm({
      investor: "",
      amount: "",
      valuation_cap: "",
      discount: "",
      type: "post-money",
      date: new Date().toISOString().split("T")[0],
      status: "draft",
      notes: "",
    });
    document.getElementById("safe-sidenav-delete")?.classList.add("hidden");
    Sidenav.open("safe-sidenav");
  }

  openEdit(id) {
    const agreement = (this.tm.safeAgreements || []).find((a) => a.id === id);
    if (!agreement) return;

    this.editingId = id;
    this._setHeader("Edit SAFE Agreement");
    this._fillForm(agreement);
    document.getElementById("safe-sidenav-delete")?.classList.remove("hidden");
    Sidenav.open("safe-sidenav");
  }

  _setHeader(text) {
    const el = document.getElementById("safe-sidenav-header");
    if (el) el.textContent = text;
  }

  _fillForm(data) {
    FIELDS.forEach((field) => {
      const el = document.getElementById(`safe-sidenav-${field}`);
      if (el) el.value = data[field] ?? "";
    });
  }

  _readForm() {
    const data = {};
    FIELDS.forEach((field) => {
      const el = document.getElementById(`safe-sidenav-${field}`);
      data[field] = el ? el.value : "";
    });
    data.amount = Number(data.amount) || 0;
    data.valuation_cap = Number(data.valuation_cap) || 0;
    data.discount = Number(data.discount) || 0;
    return data;
  }

  scheduleAutoSave() {
    if (this.autoSaveTimeout) clearTimeout(this.autoSaveTimeout);
    this._showStatus("Saving...");
    this.autoSaveTimeout = setTimeout(() => this.save(), 1000);
  }

  async save() {
    const data = this._readForm();

    if (!data.investor.trim()) {
      this._showStatus("Investor name required");
      return;
    }

    try {
      if (this.editingId) {
        await SafeAPI.update(this.editingId, data);
        this._showStatus("Saved");
      } else {
        const res = await SafeAPI.create(data);
        const created = await res.json();
        this.editingId = created.id;
        this._setHeader("Edit SAFE Agreement");
        document.getElementById("safe-sidenav-delete")?.classList.remove(
          "hidden",
        );
        this._showStatus("Created");
      }
      await this.tm.fundraisingSafeModule.load();
    } catch (err) {
      console.error("Error saving SAFE agreement:", err);
      this._showStatus("Error");
      showToast("Error saving SAFE agreement", "error");
    }
  }

  async handleDelete() {
    if (!this.editingId) return;
    try {
      await SafeAPI.delete(this.editingId);
      Sidenav.close("safe-sidenav");
      this.editingId = null;
      await this.tm.fundraisingSafeModule.load();
      showToast("SAFE agreement deleted", "success");
    } catch (err) {
      console.error("Error deleting SAFE agreement:", err);
      showToast("Error deleting SAFE agreement", "error");
    }
  }

  _showStatus(msg) {
    const el = document.getElementById("safe-sidenav-status");
    if (el) {
      el.textContent = msg;
      el.classList.remove("hidden");
      setTimeout(() => el.classList.add("hidden"), 3000);
    }
  }

  bindEvents() {
    document.getElementById("safe-sidenav-close")?.addEventListener(
      "click",
      () => Sidenav.close("safe-sidenav"),
    );
    document.getElementById("safe-sidenav-cancel")?.addEventListener(
      "click",
      () => Sidenav.close("safe-sidenav"),
    );
    document.getElementById("safe-sidenav-delete")?.addEventListener(
      "click",
      () => this.handleDelete(),
    );
    document.getElementById("safe-sidenav-save")?.addEventListener(
      "click",
      () => this.save(),
    );

    FIELDS.forEach((field) => {
      const el = document.getElementById(`safe-sidenav-${field}`);
      el?.addEventListener("input", () => this.scheduleAutoSave());
      el?.addEventListener("change", () => this.scheduleAutoSave());
    });
  }
}
