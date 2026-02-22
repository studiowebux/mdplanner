// Onboarding Sidenav Module
// Two panels:
//   1. onboardingSidenav    — create/edit metadata + template load
//   2. onboardingDetailSidenav — checklist view with checkboxes + add/remove steps

import { OnboardingAPI } from "../api.js";
import { Sidenav } from "../ui/sidenav.js";

const CATEGORY_ORDER = ["equipment", "accounts", "docs", "training", "intro", "other"];

export class OnboardingSidenavModule {
  constructor(taskManager) {
    this.taskManager = taskManager;
    this.editingId = null;
    this.detailRecord = null;
  }

  // ----------------------------------------------------------------
  // Metadata panel (create / edit)
  // ----------------------------------------------------------------

  openCreate() {
    this.editingId = null;
    this._resetMetaForm();
    document.getElementById("onboardingSidenavHeader").textContent = "New Onboarding";
    document.getElementById("onboardingDeleteBtn").classList.add("hidden");
    document.getElementById("onboardingSidenavSaveStatus").classList.add("hidden");
    Sidenav.open("onboardingSidenav");
  }

  openEdit(record) {
    this.editingId = record.id;
    document.getElementById("onboardingSidenavHeader").textContent = "Edit Onboarding";
    document.getElementById("onboardingSidenavName").value = record.employeeName || "";
    document.getElementById("onboardingSidenavRole").value = record.role || "";
    document.getElementById("onboardingSidenavStartDate").value = record.startDate || "";
    document.getElementById("onboardingSidenavPersonId").value = record.personId || "";
    document.getElementById("onboardingSidenavNotes").value = record.notes || "";
    document.getElementById("onboardingDeleteBtn").classList.remove("hidden");
    document.getElementById("onboardingSidenavSaveStatus").classList.add("hidden");
    Sidenav.open("onboardingSidenav");
  }

  _resetMetaForm() {
    document.getElementById("onboardingSidenavName").value = "";
    document.getElementById("onboardingSidenavRole").value = "";
    document.getElementById("onboardingSidenavStartDate").value =
      new Date().toISOString().split("T")[0];
    document.getElementById("onboardingSidenavPersonId").value = "";
    document.getElementById("onboardingSidenavNotes").value = "";
    const select = document.getElementById("onboardingTemplateSelect");
    if (select) select.value = "";
  }

  async _saveMeta() {
    const statusEl = document.getElementById("onboardingSidenavSaveStatus");
    const name =
      document.getElementById("onboardingSidenavName").value.trim() || "New Employee";
    const role = document.getElementById("onboardingSidenavRole").value.trim();
    const startDate =
      document.getElementById("onboardingSidenavStartDate").value ||
      new Date().toISOString().split("T")[0];
    const personId =
      document.getElementById("onboardingSidenavPersonId").value.trim() || undefined;
    const notes =
      document.getElementById("onboardingSidenavNotes").value.trim() || undefined;

    try {
      if (this.editingId) {
        // Preserve existing steps when editing metadata
        const existing = (this.taskManager.onboardingRecords || []).find(
          (r) => r.id === this.editingId,
        );
        await OnboardingAPI.update(this.editingId, {
          employeeName: name,
          role,
          startDate,
          personId,
          notes,
          steps: existing?.steps ?? [],
        });
      } else {
        // Load steps from selected template if any
        const templateId = document.getElementById("onboardingTemplateSelect")?.value;
        let steps = [];
        if (templateId) {
          const tmpl = (this.taskManager.onboardingTemplates || []).find(
            (t) => t.id === templateId,
          );
          if (tmpl) {
            steps = tmpl.steps.map((def) => ({
              id: `step_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
              title: def.title,
              category: def.category,
              status: "not_started",
            }));
          }
        }
        await OnboardingAPI.create({ employeeName: name, role, startDate, personId, notes, steps });
      }
      statusEl.textContent = "Saved";
      statusEl.classList.remove("hidden");
      setTimeout(() => statusEl.classList.add("hidden"), 1500);
      await this.taskManager.onboardingModule.load();
      Sidenav.close("onboardingSidenav");
    } catch (err) {
      console.error("Error saving onboarding:", err);
      statusEl.textContent = "Error";
      statusEl.classList.remove("hidden");
    }
  }

  async _deleteMeta() {
    if (!this.editingId) return;
    if (!confirm("Delete this onboarding record?")) return;
    try {
      await OnboardingAPI.delete(this.editingId);
      await this.taskManager.onboardingModule.load();
      Sidenav.close("onboardingSidenav");
    } catch (err) {
      console.error("Error deleting:", err);
    }
  }

  // ----------------------------------------------------------------
  // Detail / checklist panel
  // ----------------------------------------------------------------

  openDetail(record) {
    this.detailRecord = { ...record, steps: (record.steps || []).map((s) => ({ ...s })) };
    this._renderDetail();
    Sidenav.open("onboardingDetailSidenav");
  }

  _renderDetail() {
    const record = this.detailRecord;
    if (!record) return;

    document.getElementById("onboardingDetailName").textContent = record.employeeName;
    document.getElementById("onboardingDetailMeta").textContent =
      `${record.role || ""}${record.startDate ? " · Start: " + record.startDate : ""}`;

    const steps = record.steps || [];
    const done = steps.filter((s) => s.status === "complete").length;
    const pct = steps.length > 0 ? Math.round((done / steps.length) * 100) : 0;
    document.getElementById("onboardingDetailProgressFill").style.width = `${pct}%`;
    document.getElementById("onboardingDetailProgressLabel").textContent =
      `${done} / ${steps.length} complete`;

    this._renderChecklist(steps);
  }

  _renderChecklist(steps) {
    const container = document.getElementById("onboardingDetailChecklist");
    if (!container) return;

    if (steps.length === 0) {
      container.innerHTML =
        '<p class="text-secondary text-sm">No steps yet. Add one below.</p>';
      return;
    }

    // Group by category in defined order
    const grouped = {};
    CATEGORY_ORDER.forEach((cat) => { grouped[cat] = []; });
    steps.forEach((step) => {
      const cat = step.category || "other";
      if (!grouped[cat]) grouped[cat] = [];
      grouped[cat].push(step);
    });

    container.innerHTML = CATEGORY_ORDER.filter((cat) => grouped[cat].length > 0)
      .map(
        (cat) => `
        <div class="onboarding-checklist-group">
          <div class="onboarding-checklist-group-label">${cat}</div>
          ${grouped[cat]
            .map(
              (step) => `
            <div class="onboarding-checklist-item${step.status === "complete" ? " done" : ""}">
              <button class="onboarding-check-btn" data-step-id="${step.id}" title="${step.status === "complete" ? "Mark incomplete" : "Mark complete"}">
                <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  ${step.status === "complete"
                    ? '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>'
                    : '<circle cx="12" cy="12" r="9" stroke-width="2"/>'}
                </svg>
              </button>
              <span class="onboarding-checklist-item-label">${escapeHtml(step.title)}</span>
              <button class="onboarding-checklist-item-remove" data-remove-step="${step.id}" aria-label="Remove">&times;</button>
            </div>`,
            )
            .join("")}
        </div>`,
      )
      .join("");
  }

  async _saveSteps() {
    // Always send the full record so no fields get wiped by the API spread
    try {
      await OnboardingAPI.update(this.detailRecord.id, this.detailRecord);
      this.taskManager.onboardingRecords = await OnboardingAPI.fetchAll();
      this.taskManager.onboardingModule.renderView();
    } catch (err) {
      console.error("Error saving steps:", err);
    }
  }

  async _toggleStep(stepId, checked) {
    if (!this.detailRecord) return;
    const step = this.detailRecord.steps.find((s) => s.id === stepId);
    if (!step) return;
    step.status = checked ? "complete" : "not_started";
    this._renderDetail();
    await this._saveSteps();
  }

  async _removeStep(stepId) {
    if (!this.detailRecord) return;
    this.detailRecord.steps = this.detailRecord.steps.filter((s) => s.id !== stepId);
    this._renderDetail();
    await this._saveSteps();
  }

  async _addStep(title, category) {
    if (!title.trim() || !this.detailRecord) return;
    this.detailRecord.steps.push({
      id: `step_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      title: title.trim(),
      category: category || "other",
      status: "not_started",
    });
    this._renderDetail();
    await this._saveSteps();
  }

  // ----------------------------------------------------------------
  // Event binding
  // ----------------------------------------------------------------

  bindEvents() {
    // Metadata panel
    document.getElementById("onboardingSidenavClose")?.addEventListener("click", () =>
      Sidenav.close("onboardingSidenav"),
    );
    document.getElementById("onboardingSidenavSave")?.addEventListener("click", () =>
      this._saveMeta(),
    );
    document.getElementById("onboardingDeleteBtn")?.addEventListener("click", () =>
      this._deleteMeta(),
    );

    // Detail panel close
    document.getElementById("onboardingDetailClose")?.addEventListener("click", () =>
      Sidenav.close("onboardingDetailSidenav"),
    );

    // Detail panel — edit button opens metadata panel for current record
    document.getElementById("onboardingDetailEditBtn")?.addEventListener("click", () => {
      if (!this.detailRecord) return;
      Sidenav.close("onboardingDetailSidenav");
      this.openEdit(this.detailRecord);
    });

    // Detail checklist — toggle and remove (delegated)
    document.getElementById("onboardingDetailChecklist")?.addEventListener("click", (e) => {
      const removeBtn = e.target.closest("[data-remove-step]");
      if (removeBtn) { this._removeStep(removeBtn.dataset.removeStep); return; }

      const checkBtn = e.target.closest("[data-step-id]");
      if (checkBtn) {
        const step = this.detailRecord?.steps.find((s) => s.id === checkBtn.dataset.stepId);
        if (step) this._toggleStep(checkBtn.dataset.stepId, step.status !== "complete");
      }
    });

    // Detail panel — add step
    document.getElementById("onboardingDetailAddStepBtn")?.addEventListener("click", () => {
      const input = document.getElementById("onboardingDetailNewStep");
      const cat = document.getElementById("onboardingDetailNewCategory").value;
      this._addStep(input.value, cat);
      input.value = "";
    });
    document.getElementById("onboardingDetailNewStep")?.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        const cat = document.getElementById("onboardingDetailNewCategory").value;
        this._addStep(e.target.value, cat);
        e.target.value = "";
      }
    });

    // Template load (in meta panel)
    document.getElementById("onboardingLoadTemplateBtn")?.addEventListener("click", () => {
      const select = document.getElementById("onboardingTemplateSelect");
      const templateId = select?.value;
      if (!templateId) return;
      const tmpl = (this.taskManager.onboardingTemplates || []).find(
        (t) => t.id === templateId,
      );
      if (tmpl) {
        // Preview template name in UI — actual loading happens on save
        document.getElementById("onboardingSidenavSaveStatus").textContent =
          `Template "${tmpl.name}" will load on save`;
        document.getElementById("onboardingSidenavSaveStatus").classList.remove("hidden");
      }
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
