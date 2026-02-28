/**
 * Fundraising — Investor Pipeline sidenav (create / edit).
 * Pattern: Sidenav Module with auto-save debounce
 */

import { Sidenav } from "../ui/sidenav.js";
import { InvestorAPI } from "../api.js";
import { showToast } from "../ui/toast.js";

const FIELDS = [
  "name",
  "type",
  "stage",
  "status",
  "amount_target",
  "contact",
  "intro_date",
  "last_contact",
  "notes",
];

export class FundraisingPipelineSidenavModule {
  constructor(taskManager) {
    this.tm = taskManager;
    this.editingId = null;
  }

  openNew() {
    this.editingId = null;
    this._setHeader("New Investor");
    this._fillForm({
      name: "",
      type: "vc",
      stage: "lead",
      status: "not_started",
      amount_target: "",
      contact: "",
      intro_date: new Date().toISOString().split("T")[0],
      last_contact: "",
      notes: "",
    });
    document.getElementById("pipeline-sidenav-delete")?.classList.add("hidden");
    Sidenav.open("pipeline-sidenav");
  }

  openEdit(id) {
    const investor = (this.tm.investors || []).find((i) => i.id === id);
    if (!investor) return;

    this.editingId = id;
    this._setHeader("Edit Investor");
    this._fillForm(investor);
    document.getElementById("pipeline-sidenav-delete")?.classList.remove(
      "hidden",
    );
    Sidenav.open("pipeline-sidenav");
  }

  _setHeader(text) {
    const el = document.getElementById("pipeline-sidenav-header");
    if (el) el.textContent = text;
  }

  _fillForm(data) {
    FIELDS.forEach((field) => {
      const el = document.getElementById(`pipeline-sidenav-${field}`);
      if (el) el.value = data[field] ?? "";
    });
  }

  _readForm() {
    const data = {};
    FIELDS.forEach((field) => {
      const el = document.getElementById(`pipeline-sidenav-${field}`);
      data[field] = el ? el.value : "";
    });
    data.amount_target = Number(data.amount_target) || 0;
    return data;
  }

  async save() {
    const data = this._readForm();

    if (!data.name.trim()) {
      this._showStatus("Investor name required");
      return;
    }

    try {
      if (this.editingId) {
        await InvestorAPI.update(this.editingId, data);
        this._showStatus("Saved");
      } else {
        const res = await InvestorAPI.create(data);
        const created = await res.json();
        this.editingId = created.id;
        this._setHeader("Edit Investor");
        document.getElementById("pipeline-sidenav-delete")?.classList.remove(
          "hidden",
        );
        this._showStatus("Created");
      }
      await this.tm.fundraisingPipelineModule.load();
    } catch (err) {
      console.error("Error saving investor:", err);
      this._showStatus("Error");
      showToast("Error saving investor", "error");
    }
  }

  async handleDelete() {
    if (!this.editingId) return;
    try {
      await InvestorAPI.delete(this.editingId);
      Sidenav.close("pipeline-sidenav");
      this.editingId = null;
      await this.tm.fundraisingPipelineModule.load();
      showToast("Investor deleted", "success");
    } catch (err) {
      console.error("Error deleting investor:", err);
      showToast("Error deleting investor", "error");
    }
  }

  _showStatus(msg) {
    const el = document.getElementById("pipeline-sidenav-status");
    if (el) {
      el.textContent = msg;
      el.classList.remove("hidden");
      setTimeout(() => el.classList.add("hidden"), 3000);
    }
  }

  bindEvents() {
    document.getElementById("pipeline-sidenav-close")?.addEventListener(
      "click",
      () => Sidenav.close("pipeline-sidenav"),
    );
    document.getElementById("pipeline-sidenav-cancel")?.addEventListener(
      "click",
      () => Sidenav.close("pipeline-sidenav"),
    );
    document.getElementById("pipeline-sidenav-delete")?.addEventListener(
      "click",
      () => this.handleDelete(),
    );
    document.getElementById("pipeline-sidenav-save")?.addEventListener(
      "click",
      () => this.save(),
    );

  }
}
