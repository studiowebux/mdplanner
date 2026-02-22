// Onboarding Module
// List view with Records and Templates tabs

import { OnboardingAPI, OnboardingTemplatesAPI } from "../api.js";

const CATEGORIES = ["equipment", "accounts", "docs", "training", "intro", "other"];

export class OnboardingModule {
  constructor(taskManager) {
    this.taskManager = taskManager;
    this.activeTab = "records";
  }

  async load() {
    try {
      const [records, templates] = await Promise.all([
        OnboardingAPI.fetchAll(),
        OnboardingTemplatesAPI.fetchAll(),
      ]);
      this.taskManager.onboardingRecords = records;
      this.taskManager.onboardingTemplates = templates;
      this.renderView();
      this._populateTemplateSelect();
    } catch (error) {
      console.error("Error loading onboarding data:", error);
    }
  }

  renderView() {
    if (this.activeTab === "records") {
      this._renderRecords();
    } else {
      this._renderTemplates();
    }
  }

  _renderRecords() {
    const container = document.getElementById("onboardingContainer");
    const emptyState = document.getElementById("emptyOnboardingState");
    if (!container) return;

    const records = this.taskManager.onboardingRecords || [];

    if (records.length === 0) {
      emptyState?.classList.remove("hidden");
      container.innerHTML = "";
      return;
    }

    emptyState?.classList.add("hidden");
    container.innerHTML = `
      <div class="onboarding-list-header">
        <span>Employee</span>
        <span>Role</span>
        <span>Start date</span>
        <span>Progress</span>
      </div>
      ${records.map((r) => this._renderRow(r)).join("")}`;
  }

  _renderRow(record) {
    const steps = record.steps || [];
    const total = steps.length;
    const done = steps.filter((s) => s.status === "complete").length;
    const pct = total > 0 ? Math.round((done / total) * 100) : 0;

    return `
      <div class="onboarding-list-row" data-id="${record.id}">
        <span class="onboarding-row-name">${escapeHtml(record.employeeName)}</span>
        <span class="onboarding-row-role">${escapeHtml(record.role || "—")}</span>
        <span class="onboarding-row-date">${record.startDate}</span>
        <div class="onboarding-row-progress">
          <div class="onboarding-progress-bar">
            <div class="onboarding-progress-fill" style="width:${pct}%"></div>
          </div>
          <span class="onboarding-progress-label">${done}/${total}</span>
        </div>
      </div>`;
  }

  _renderTemplates() {
    const container = document.getElementById("onboardingTemplatesContainer");
    const emptyState = document.getElementById("emptyOnboardingTemplatesState");
    if (!container) return;

    const templates = this.taskManager.onboardingTemplates || [];

    if (templates.length === 0) {
      emptyState?.classList.remove("hidden");
      container.innerHTML = "";
      return;
    }

    emptyState?.classList.add("hidden");
    container.innerHTML = `
      <div class="onboarding-template-list-header">
        <span>Name</span>
        <span>Description</span>
        <span>Steps</span>
      </div>
      ${templates
        .map(
          (t) => `
        <div class="onboarding-template-row" data-template-id="${t.id}">
          <span class="onboarding-template-name">${escapeHtml(t.name)}</span>
          <span class="onboarding-template-description">${escapeHtml(t.description || "—")}</span>
          <span class="onboarding-template-step-count">${t.steps.length} step${t.steps.length !== 1 ? "s" : ""}</span>
        </div>`,
        )
        .join("")}`;
  }

  _populateTemplateSelect() {
    const select = document.getElementById("onboardingTemplateSelect");
    if (!select) return;
    const templates = this.taskManager.onboardingTemplates || [];
    select.innerHTML =
      '<option value="">— pick a template —</option>' +
      templates
        .map((t) => `<option value="${t.id}">${escapeHtml(t.name)}</option>`)
        .join("");
  }

  _switchTab(tab) {
    this.activeTab = tab;
    const recordsEl = document.getElementById("onboardingRecordsList");
    const templatesEl = document.getElementById("onboardingTemplatesList");
    const tabRecords = document.getElementById("onboardingTabRecords");
    const tabTemplates = document.getElementById("onboardingTabTemplates");
    const addBtn = document.getElementById("addOnboardingBtn");
    const addTmplBtn = document.getElementById("addOnboardingTemplateBtn");

    if (tab === "records") {
      recordsEl?.classList.remove("hidden");
      templatesEl?.classList.add("hidden");
      tabRecords?.classList.add("meetings-tab-active");
      tabTemplates?.classList.remove("meetings-tab-active");
      addBtn?.classList.remove("hidden");
      addTmplBtn?.classList.add("hidden");
    } else {
      recordsEl?.classList.add("hidden");
      templatesEl?.classList.remove("hidden");
      tabRecords?.classList.remove("meetings-tab-active");
      tabTemplates?.classList.add("meetings-tab-active");
      addBtn?.classList.add("hidden");
      addTmplBtn?.classList.remove("hidden");
    }

    this.renderView();
  }

  bindEvents() {
    document.getElementById("addOnboardingBtn")?.addEventListener("click", () => {
      this.taskManager.onboardingSidenavModule?.openCreate();
    });

    document.getElementById("addOnboardingTemplateBtn")?.addEventListener("click", () => {
      this.taskManager.onboardingTemplateSidenavModule?.openCreate();
    });

    document.getElementById("onboardingTabRecords")?.addEventListener("click", () =>
      this._switchTab("records"),
    );
    document.getElementById("onboardingTabTemplates")?.addEventListener("click", () =>
      this._switchTab("templates"),
    );

    // Click row → open checklist detail panel
    document.getElementById("onboardingContainer")?.addEventListener("click", (e) => {
      const row = e.target.closest(".onboarding-list-row");
      if (!row) return;
      const id = row.dataset.id;
      const record = (this.taskManager.onboardingRecords || []).find((r) => r.id === id);
      if (record) this.taskManager.onboardingSidenavModule?.openDetail(record);
    });

    // Click template row → open template edit
    document.getElementById("onboardingTemplatesContainer")?.addEventListener("click", (e) => {
      const row = e.target.closest(".onboarding-template-row");
      if (!row) return;
      const id = row.dataset.templateId;
      const template = (this.taskManager.onboardingTemplates || []).find((t) => t.id === id);
      if (template) this.taskManager.onboardingTemplateSidenavModule?.openEdit(template);
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
