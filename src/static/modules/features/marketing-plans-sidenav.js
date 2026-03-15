// Marketing Plans Sidenav Module
// Slide-in panel for creating, editing, and viewing marketing plans.

import { Sidenav } from "../ui/sidenav.js";
import { MarketingPlansAPI } from "../api.js";
import { showToast } from "../ui/toast.js";
import { showConfirm } from "../ui/confirm.js";
import { escapeHtml, extractErrorMessage, markdownToHtml } from "../utils.js";

const STATUS_OPTIONS = ["draft", "active", "completed", "archived"];
const CHANNEL_STATUS_OPTIONS = ["planned", "active", "paused", "completed"];

export class MarketingPlansSidenavModule {
  constructor(taskManager) {
    this.tm = taskManager;
    this.editingId = null;
    this._editChannels = [];
    this._editCampaigns = [];
    this._editAudiences = [];
    this._editKpis = [];
  }

  bindEvents() {
    document.getElementById("mktplanSidenavClose")?.addEventListener(
      "click",
      () => this.close(),
    );
    document.getElementById("mktplanSidenavCancel")?.addEventListener(
      "click",
      () => this.close(),
    );
    document.getElementById("mktplanSidenavSave")?.addEventListener(
      "click",
      () => this.handleSave(),
    );
    document.getElementById("mktplanSidenavDelete")?.addEventListener(
      "click",
      () => this.handleDelete(),
    );
    document.getElementById("mktplanSidenavEditBtn")?.addEventListener(
      "click",
      () => this._switchToEdit(),
    );

    // Event delegation for array editors
    const form = document.getElementById("mktplanSidenavFormSection");
    if (form) {
      form.addEventListener("click", (e) => {
        const btn = e.target.closest("button");
        if (!btn) return;
        const { action, section, idx } = btn.dataset;
        if (!action) return;
        const index = parseInt(idx, 10);
        if (action === "remove") this._removeArrayItem(section, index);
        if (action === "add") this._addArrayItem(section);
      });
    }
  }

  openView(planId) {
    const plan = (this.tm.marketingPlans || []).find((p) => p.id === planId);
    if (!plan) return;
    this.editingId = planId;
    document.getElementById("mktplanSidenavHeader").textContent = plan.name;
    this._renderViewContent(plan);
    this._showViewMode();
    document.getElementById("mktplanSidenavDelete").classList.remove("hidden");
    Sidenav.open("mktplanSidenav");
  }

  openNew() {
    this.editingId = null;
    document.getElementById("mktplanSidenavHeader").textContent =
      "New Marketing Plan";
    this._clearForm();
    document.getElementById("mktplanSidenavDelete").classList.add("hidden");
    this._showEditMode();
    Sidenav.open("mktplanSidenav");
    document.getElementById("mktplanSidenavName")?.focus();
  }

  close() {
    Sidenav.close("mktplanSidenav");
    this.editingId = null;
  }

  // ------------------------------------------------------------------
  // Mode switching
  // ------------------------------------------------------------------

  _showViewMode() {
    document
      .getElementById("mktplanSidenavViewSection")
      .classList.remove("hidden");
    document
      .getElementById("mktplanSidenavFormSection")
      .classList.add("hidden");
    document.getElementById("mktplanSidenavCancel").classList.add("hidden");
    document
      .getElementById("mktplanSidenavEditBtn")
      .classList.remove("hidden");
    document.getElementById("mktplanSidenavSave").classList.add("hidden");
  }

  _showEditMode() {
    document
      .getElementById("mktplanSidenavViewSection")
      .classList.add("hidden");
    document
      .getElementById("mktplanSidenavFormSection")
      .classList.remove("hidden");
    document.getElementById("mktplanSidenavCancel").classList.remove("hidden");
    document.getElementById("mktplanSidenavEditBtn").classList.add("hidden");
    document.getElementById("mktplanSidenavSave").classList.remove("hidden");
  }

  _switchToEdit() {
    const plan = (this.tm.marketingPlans || []).find(
      (p) => p.id === this.editingId,
    );
    if (!plan) return;
    document.getElementById("mktplanSidenavHeader").textContent = "Edit Plan";
    this._fillForm(plan);
    this._showEditMode();
    document.getElementById("mktplanSidenavName")?.focus();
  }

  // ------------------------------------------------------------------
  // View rendering
  // ------------------------------------------------------------------

  _renderViewContent(plan) {
    const view = document.getElementById("mktplanSidenavViewSection");
    if (!view) return;

    const channels = plan.channels || [];
    const campaigns = plan.campaigns || [];
    const audiences = plan.targetAudiences || [];
    const kpis = plan.kpiTargets || [];

    const budget =
      plan.budgetTotal !== undefined
        ? `${plan.budgetCurrency || "USD"} ${plan.budgetTotal.toLocaleString()}`
        : "Not set";

    const dates =
      plan.startDate || plan.endDate
        ? `${plan.startDate || "?"} to ${plan.endDate || "?"}`
        : "Not set";

    const audienceHtml = audiences.length > 0
      ? audiences
        .map(
          (a) => `
          <div class="mktplan-list-item">
            <div class="mktplan-list-item-name">${escapeHtml(a.name)}</div>
            ${a.description ? `<div class="mktplan-list-item-detail">${escapeHtml(a.description)}</div>` : ""}
            ${a.size ? `<div class="mktplan-list-item-detail">Size: ${escapeHtml(a.size)}</div>` : ""}
          </div>`,
        )
        .join("")
      : `<p class="text-xs text-muted">None defined</p>`;

    const channelHtml = channels.length > 0
      ? channels
        .map(
          (c) => `
          <div class="mktplan-list-item">
            <div class="mktplan-list-item-name">${escapeHtml(c.name)}${c.status ? ` &middot; ${c.status}` : ""}</div>
            ${c.budget !== undefined ? `<div class="mktplan-list-item-detail">Budget: ${(plan.budgetCurrency || "$")}${c.budget.toLocaleString()}</div>` : ""}
            ${c.goals ? `<div class="mktplan-list-item-detail">${escapeHtml(c.goals)}</div>` : ""}
          </div>`,
        )
        .join("")
      : `<p class="text-xs text-muted">None defined</p>`;

    const campaignHtml = campaigns.length > 0
      ? campaigns
        .map(
          (c) => `
          <div class="mktplan-list-item">
            <div class="mktplan-list-item-name">${escapeHtml(c.name)}${c.status ? ` &middot; ${c.status}` : ""}</div>
            ${c.channel ? `<div class="mktplan-list-item-detail">Channel: ${escapeHtml(c.channel)}</div>` : ""}
            ${c.budget !== undefined ? `<div class="mktplan-list-item-detail">Budget: ${(plan.budgetCurrency || "$")}${c.budget.toLocaleString()}</div>` : ""}
            ${c.start_date || c.end_date ? `<div class="mktplan-list-item-detail">${c.start_date || "?"} &rarr; ${c.end_date || "?"}</div>` : ""}
            ${c.goals ? `<div class="mktplan-list-item-detail">${escapeHtml(c.goals)}</div>` : ""}
          </div>`,
        )
        .join("")
      : `<p class="text-xs text-muted">None defined</p>`;

    const kpiHtml = kpis.length > 0
      ? kpis
        .map(
          (k) => `
          <div class="mktplan-list-item">
            <div class="mktplan-list-item-name">${escapeHtml(k.metric)}</div>
            <div class="mktplan-list-item-detail">Target: ${k.target}${k.current !== undefined ? ` &middot; Current: ${k.current}` : ""}</div>
          </div>`,
        )
        .join("")
      : `<p class="text-xs text-muted">None defined</p>`;

    view.innerHTML = `
      <div class="sidenav-section">
        ${plan.description ? `<div class="text-sm text-secondary prose-sm" style="margin-bottom:0.75rem">${markdownToHtml(plan.description)}</div>` : ""}
        <div class="mktplan-view-field">
          <div class="mktplan-view-label">Status</div>
          <div class="mktplan-view-value">${escapeHtml(plan.status)}</div>
        </div>
        <div class="mktplan-view-field">
          <div class="mktplan-view-label">Budget</div>
          <div class="mktplan-view-value">${budget}</div>
        </div>
        <div class="mktplan-view-field">
          <div class="mktplan-view-label">Timeline</div>
          <div class="mktplan-view-value">${dates}</div>
        </div>

        <div class="mktplan-section-title">Target Audiences (${audiences.length})</div>
        ${audienceHtml}

        <div class="mktplan-section-title">Channels (${channels.length})</div>
        ${channelHtml}

        <div class="mktplan-section-title">Campaigns (${campaigns.length})</div>
        ${campaignHtml}

        <div class="mktplan-section-title">KPI Targets (${kpis.length})</div>
        ${kpiHtml}

        ${plan.notes ? `<div class="mktplan-section-title">Notes</div><div class="text-sm text-secondary prose-sm">${markdownToHtml(plan.notes)}</div>` : ""}
      </div>
    `;
  }

  // ------------------------------------------------------------------
  // Array editors
  // ------------------------------------------------------------------

  _renderArrayEditor(containerId, items, section, renderFn) {
    const container = document.getElementById(containerId);
    if (!container) return;
    container.innerHTML =
      items
        .map((item, idx) => renderFn(item, idx, section))
        .join("") +
      `<button type="button" class="btn-secondary" data-action="add" data-section="${section}" style="align-self:flex-start;margin-top:0.25rem">+ Add</button>`;
  }

  _renderAudienceItem(item, idx, section) {
    return `
      <div class="mktplan-array-item">
        <div class="mktplan-array-item-header">
          <input class="form-input" data-section="${section}" data-idx="${idx}" data-field="name" value="${escapeHtml(item.name || "")}" placeholder="Audience name">
          <button type="button" class="mktplan-remove-btn" data-action="remove" data-section="${section}" data-idx="${idx}">&#x2715;</button>
        </div>
        <div class="mktplan-array-item-fields">
          <input class="form-input" data-section="${section}" data-idx="${idx}" data-field="description" value="${escapeHtml(item.description || "")}" placeholder="Description">
          <input class="form-input" data-section="${section}" data-idx="${idx}" data-field="size" value="${escapeHtml(item.size || "")}" placeholder="Size (small/medium/large)">
        </div>
      </div>`;
  }

  _renderChannelItem(item, idx, section) {
    const statusOpts = CHANNEL_STATUS_OPTIONS.map(
      (s) =>
        `<option value="${s}"${item.status === s ? " selected" : ""}>${s}</option>`,
    ).join("");
    return `
      <div class="mktplan-array-item">
        <div class="mktplan-array-item-header">
          <input class="form-input" data-section="${section}" data-idx="${idx}" data-field="name" value="${escapeHtml(item.name || "")}" placeholder="Channel name">
          <button type="button" class="mktplan-remove-btn" data-action="remove" data-section="${section}" data-idx="${idx}">&#x2715;</button>
        </div>
        <div class="mktplan-array-item-fields">
          <input class="form-input" type="number" data-section="${section}" data-idx="${idx}" data-field="budget" value="${item.budget ?? ""}" placeholder="Budget">
          <select data-section="${section}" data-idx="${idx}" data-field="status">${statusOpts}</select>
        </div>
        <div style="padding:0.25rem 0.5rem 0">
          <input class="form-input" style="width:100%;font-size:var(--font-size-xs)" data-section="${section}" data-idx="${idx}" data-field="goals" value="${escapeHtml(item.goals || "")}" placeholder="Goals">
        </div>
      </div>`;
  }

  _renderCampaignItem(item, idx, section) {
    const statusOpts = CHANNEL_STATUS_OPTIONS.map(
      (s) =>
        `<option value="${s}"${item.status === s ? " selected" : ""}>${s}</option>`,
    ).join("");
    return `
      <div class="mktplan-array-item">
        <div class="mktplan-array-item-header">
          <input class="form-input" data-section="${section}" data-idx="${idx}" data-field="name" value="${escapeHtml(item.name || "")}" placeholder="Campaign name">
          <button type="button" class="mktplan-remove-btn" data-action="remove" data-section="${section}" data-idx="${idx}">&#x2715;</button>
        </div>
        <div class="mktplan-array-item-fields">
          <input class="form-input" data-section="${section}" data-idx="${idx}" data-field="channel" value="${escapeHtml(item.channel || "")}" placeholder="Channel">
          <input class="form-input" type="number" data-section="${section}" data-idx="${idx}" data-field="budget" value="${item.budget ?? ""}" placeholder="Budget">
          <input class="form-input" type="date" data-section="${section}" data-idx="${idx}" data-field="start_date" value="${item.start_date || ""}">
          <input class="form-input" type="date" data-section="${section}" data-idx="${idx}" data-field="end_date" value="${item.end_date || ""}">
        </div>
        <div style="padding:0.25rem 0.5rem 0;display:flex;gap:0.375rem">
          <select data-section="${section}" data-idx="${idx}" data-field="status" style="font-size:var(--font-size-xs)">${statusOpts}</select>
          <input class="form-input" style="flex:1;font-size:var(--font-size-xs)" data-section="${section}" data-idx="${idx}" data-field="goals" value="${escapeHtml(item.goals || "")}" placeholder="Goals">
        </div>
      </div>`;
  }

  _renderKpiItem(item, idx, section) {
    return `
      <div class="mktplan-array-item">
        <div class="mktplan-array-item-header">
          <input class="form-input" data-section="${section}" data-idx="${idx}" data-field="metric" value="${escapeHtml(item.metric || "")}" placeholder="Metric name">
          <button type="button" class="mktplan-remove-btn" data-action="remove" data-section="${section}" data-idx="${idx}">&#x2715;</button>
        </div>
        <div class="mktplan-array-item-fields">
          <input class="form-input" type="number" data-section="${section}" data-idx="${idx}" data-field="target" value="${item.target ?? ""}" placeholder="Target">
          <input class="form-input" type="number" data-section="${section}" data-idx="${idx}" data-field="current" value="${item.current ?? ""}" placeholder="Current">
        </div>
      </div>`;
  }

  _collectArrayItems(section) {
    const form = document.getElementById("mktplanSidenavFormSection");
    if (!form) return [];
    const items = [];
    const inputs = form.querySelectorAll(
      `[data-section="${section}"][data-idx]`,
    );
    const maxIdx = -1;
    const map = new Map();
    for (const el of inputs) {
      const idx = parseInt(el.dataset.idx, 10);
      if (!map.has(idx)) map.set(idx, {});
      const field = el.dataset.field;
      const val = el.tagName === "SELECT" ? el.value : el.value.trim();
      if (field === "budget" || field === "target" || field === "current") {
        map.get(idx)[field] = val ? Number(val) : undefined;
      } else {
        map.get(idx)[field] = val || undefined;
      }
    }
    for (const [, obj] of [...map.entries()].sort((a, b) => a[0] - b[0])) {
      if (obj.name || obj.metric) items.push(obj);
    }
    return items;
  }

  _addArrayItem(section) {
    if (section === "audiences") {
      this._editAudiences = this._collectArrayItems("audiences");
      this._editAudiences.push({ name: "" });
      this._renderArrayEditor(
        "mktplanAudiencesEditor",
        this._editAudiences,
        "audiences",
        (i, idx, s) => this._renderAudienceItem(i, idx, s),
      );
    } else if (section === "channels") {
      this._editChannels = this._collectArrayItems("channels");
      this._editChannels.push({ name: "", status: "planned" });
      this._renderArrayEditor(
        "mktplanChannelsEditor",
        this._editChannels,
        "channels",
        (i, idx, s) => this._renderChannelItem(i, idx, s),
      );
    } else if (section === "campaigns") {
      this._editCampaigns = this._collectArrayItems("campaigns");
      this._editCampaigns.push({ name: "", status: "planned" });
      this._renderArrayEditor(
        "mktplanCampaignsEditor",
        this._editCampaigns,
        "campaigns",
        (i, idx, s) => this._renderCampaignItem(i, idx, s),
      );
    } else if (section === "kpis") {
      this._editKpis = this._collectArrayItems("kpis");
      this._editKpis.push({ metric: "" });
      this._renderArrayEditor(
        "mktplanKpisEditor",
        this._editKpis,
        "kpis",
        (i, idx, s) => this._renderKpiItem(i, idx, s),
      );
    }
  }

  _removeArrayItem(section, idx) {
    if (section === "audiences") {
      this._editAudiences = this._collectArrayItems("audiences");
      this._editAudiences.splice(idx, 1);
      this._renderArrayEditor(
        "mktplanAudiencesEditor",
        this._editAudiences,
        "audiences",
        (i, ix, s) => this._renderAudienceItem(i, ix, s),
      );
    } else if (section === "channels") {
      this._editChannels = this._collectArrayItems("channels");
      this._editChannels.splice(idx, 1);
      this._renderArrayEditor(
        "mktplanChannelsEditor",
        this._editChannels,
        "channels",
        (i, ix, s) => this._renderChannelItem(i, ix, s),
      );
    } else if (section === "campaigns") {
      this._editCampaigns = this._collectArrayItems("campaigns");
      this._editCampaigns.splice(idx, 1);
      this._renderArrayEditor(
        "mktplanCampaignsEditor",
        this._editCampaigns,
        "campaigns",
        (i, ix, s) => this._renderCampaignItem(i, ix, s),
      );
    } else if (section === "kpis") {
      this._editKpis = this._collectArrayItems("kpis");
      this._editKpis.splice(idx, 1);
      this._renderArrayEditor(
        "mktplanKpisEditor",
        this._editKpis,
        "kpis",
        (i, ix, s) => this._renderKpiItem(i, ix, s),
      );
    }
  }

  // ------------------------------------------------------------------
  // Form helpers
  // ------------------------------------------------------------------

  _clearForm() {
    document.getElementById("mktplanSidenavName").value = "";
    document.getElementById("mktplanSidenavDesc").value = "";
    document.getElementById("mktplanSidenavStatus").value = "draft";
    document.getElementById("mktplanSidenavBudget").value = "";
    document.getElementById("mktplanSidenavCurrency").value = "USD";
    document.getElementById("mktplanSidenavStart").value = "";
    document.getElementById("mktplanSidenavEnd").value = "";
    document.getElementById("mktplanSidenavNotes").value = "";
    this._editAudiences = [];
    this._editChannels = [];
    this._editCampaigns = [];
    this._editKpis = [];
    this._renderAllEditors();
  }

  _fillForm(plan) {
    document.getElementById("mktplanSidenavName").value = plan.name || "";
    document.getElementById("mktplanSidenavDesc").value =
      plan.description || "";
    document.getElementById("mktplanSidenavStatus").value =
      plan.status || "draft";
    document.getElementById("mktplanSidenavBudget").value =
      plan.budgetTotal ?? "";
    document.getElementById("mktplanSidenavCurrency").value =
      plan.budgetCurrency || "USD";
    document.getElementById("mktplanSidenavStart").value =
      plan.startDate || "";
    document.getElementById("mktplanSidenavEnd").value = plan.endDate || "";
    document.getElementById("mktplanSidenavNotes").value = plan.notes || "";
    this._editAudiences = [...(plan.targetAudiences || [])];
    this._editChannels = [...(plan.channels || [])];
    this._editCampaigns = [...(plan.campaigns || [])];
    this._editKpis = [...(plan.kpiTargets || [])];
    this._renderAllEditors();
  }

  _renderAllEditors() {
    this._renderArrayEditor(
      "mktplanAudiencesEditor",
      this._editAudiences,
      "audiences",
      (i, idx, s) => this._renderAudienceItem(i, idx, s),
    );
    this._renderArrayEditor(
      "mktplanChannelsEditor",
      this._editChannels,
      "channels",
      (i, idx, s) => this._renderChannelItem(i, idx, s),
    );
    this._renderArrayEditor(
      "mktplanCampaignsEditor",
      this._editCampaigns,
      "campaigns",
      (i, idx, s) => this._renderCampaignItem(i, idx, s),
    );
    this._renderArrayEditor(
      "mktplanKpisEditor",
      this._editKpis,
      "kpis",
      (i, idx, s) => this._renderKpiItem(i, idx, s),
    );
  }

  _collectForm() {
    return {
      name: document.getElementById("mktplanSidenavName").value.trim(),
      description:
        document.getElementById("mktplanSidenavDesc").value.trim() || undefined,
      status: document.getElementById("mktplanSidenavStatus").value,
      budgetTotal:
        document.getElementById("mktplanSidenavBudget").value !== ""
          ? Number(document.getElementById("mktplanSidenavBudget").value)
          : undefined,
      budgetCurrency:
        document.getElementById("mktplanSidenavCurrency").value || undefined,
      startDate:
        document.getElementById("mktplanSidenavStart").value || undefined,
      endDate: document.getElementById("mktplanSidenavEnd").value || undefined,
      targetAudiences: this._collectArrayItems("audiences"),
      channels: this._collectArrayItems("channels"),
      campaigns: this._collectArrayItems("campaigns"),
      kpiTargets: this._collectArrayItems("kpis"),
      notes:
        document.getElementById("mktplanSidenavNotes").value.trim() ||
        undefined,
    };
  }

  // ------------------------------------------------------------------
  // Handlers
  // ------------------------------------------------------------------

  async handleSave() {
    const data = this._collectForm();
    if (!data.name) {
      showToast("Plan name is required", "error");
      return;
    }

    if (this.editingId) {
      const res = await MarketingPlansAPI.update(this.editingId, data);
      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}));
        showToast(extractErrorMessage(errBody), "error");
        return;
      }
    } else {
      const res = await MarketingPlansAPI.create(data);
      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}));
        showToast(extractErrorMessage(errBody), "error");
        return;
      }
      const json = await res.json();
      this.editingId = json.id;
    }

    this.tm.marketingPlans = await MarketingPlansAPI.fetchAll();
    this.tm.marketingPlansModule.renderView();
    showToast("Plan saved");

    const saved = (this.tm.marketingPlans || []).find(
      (p) => p.id === this.editingId,
    );
    if (saved) {
      document.getElementById("mktplanSidenavHeader").textContent = saved.name;
      this._renderViewContent(saved);
      this._showViewMode();
      document
        .getElementById("mktplanSidenavDelete")
        .classList.remove("hidden");
    }
  }

  async handleDelete() {
    if (!this.editingId) return;
    const confirmed = await showConfirm("Delete this marketing plan?");
    if (!confirmed) return;

    const res = await MarketingPlansAPI.delete(this.editingId);
    if (!res.ok) {
      const errBody = await res.json().catch(() => ({}));
      showToast(extractErrorMessage(errBody), "error");
      return;
    }

    this.tm.marketingPlans = await MarketingPlansAPI.fetchAll();
    this.tm.marketingPlansModule.renderView();
    this.close();
    showToast("Plan deleted");
  }
}
