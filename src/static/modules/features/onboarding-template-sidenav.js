// Onboarding Template Sidenav Module
// Create and edit onboarding step templates

import { OnboardingTemplatesAPI } from "../api.js";
import { Sidenav } from "../ui/sidenav.js";

export class OnboardingTemplateSidenavModule {
  constructor(taskManager) {
    this.taskManager = taskManager;
    this.editingId = null;
    this.steps = [];
  }

  openCreate() {
    this.editingId = null;
    this.steps = [];
    this._resetForm();
    document.getElementById("onboardingTemplateSidenavHeader").textContent =
      "New Template";
    document.getElementById("onboardingTemplateDeleteBtn").classList.add("hidden");
    this._openPanel();
  }

  openEdit(template) {
    this.editingId = template.id;
    this.steps = (template.steps || []).map((s) => ({ ...s }));

    document.getElementById("onboardingTemplateSidenavHeader").textContent =
      "Edit Template";
    document.getElementById("onboardingTemplateName").value = template.name || "";
    document.getElementById("onboardingTemplateDescription").value =
      template.description || "";
    document.getElementById("onboardingTemplateDeleteBtn").classList.remove("hidden");

    this._renderSteps();
    this._openPanel();
  }

  _openPanel() {
    document
      .getElementById("onboardingTemplateSidenavSaveStatus")
      .classList.add("hidden");
    Sidenav.open("onboardingTemplateSidenav");
  }

  _closePanel() {
    Sidenav.close("onboardingTemplateSidenav");
  }

  _resetForm() {
    document.getElementById("onboardingTemplateName").value = "";
    document.getElementById("onboardingTemplateDescription").value = "";
    document.getElementById("onboardingTemplateNewStepTitle").value = "";
    this._renderSteps();
  }

  _renderSteps() {
    const container = document.getElementById("onboardingTemplateStepsList");
    if (!container) return;

    if (this.steps.length === 0) {
      container.innerHTML =
        '<p class="text-sm text-secondary">No steps yet. Add steps below.</p>';
      return;
    }

    container.innerHTML = this.steps
      .map(
        (step, i) => `
      <div class="onboarding-step-row" data-index="${i}">
        <div>
          <div class="onboarding-step-title">${escapeHtml(step.title)}</div>
          <div class="onboarding-step-category">${step.category}</div>
        </div>
        <button class="onboarding-step-remove" data-index="${i}" aria-label="Remove">&times;</button>
      </div>`,
      )
      .join("");
  }

  _addStep(title, category) {
    if (!title.trim()) return;
    this.steps.push({ title: title.trim(), category: category || "other" });
    this._renderSteps();
  }

  _removeStep(index) {
    this.steps.splice(index, 1);
    this._renderSteps();
  }

  async _save() {
    const statusEl = document.getElementById("onboardingTemplateSidenavSaveStatus");
    const payload = {
      name:
        document.getElementById("onboardingTemplateName").value.trim() ||
        "New Template",
      description:
        document.getElementById("onboardingTemplateDescription").value.trim() ||
        undefined,
      steps: this.steps,
    };

    try {
      if (this.editingId) {
        await OnboardingTemplatesAPI.update(this.editingId, payload);
      } else {
        await OnboardingTemplatesAPI.create(payload);
      }
      statusEl.textContent = "Saved";
      statusEl.classList.remove("hidden");
      setTimeout(() => statusEl.classList.add("hidden"), 2000);
      await this.taskManager.onboardingModule.load();
      this._closePanel();
    } catch (err) {
      console.error("Error saving template:", err);
      statusEl.textContent = "Error saving";
      statusEl.classList.remove("hidden");
    }
  }

  async _delete() {
    if (!this.editingId) return;
    if (!confirm("Delete this template?")) return;
    try {
      await OnboardingTemplatesAPI.delete(this.editingId);
      await this.taskManager.onboardingModule.load();
      this._closePanel();
    } catch (err) {
      console.error("Error deleting template:", err);
    }
  }

  bindEvents() {
    document
      .getElementById("onboardingTemplateSidenavClose")
      ?.addEventListener("click", () => this._closePanel());

    document
      .getElementById("onboardingTemplateSidenavSave")
      ?.addEventListener("click", () => this._save());

    document
      .getElementById("onboardingTemplateDeleteBtn")
      ?.addEventListener("click", () => this._delete());

    document
      .getElementById("onboardingTemplateAddStepBtn")
      ?.addEventListener("click", () => {
        const titleInput = document.getElementById("onboardingTemplateNewStepTitle");
        const category = document.getElementById(
          "onboardingTemplateNewStepCategory",
        ).value;
        this._addStep(titleInput.value, category);
        titleInput.value = "";
      });

    document
      .getElementById("onboardingTemplateNewStepTitle")
      ?.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          const category = document.getElementById(
            "onboardingTemplateNewStepCategory",
          ).value;
          this._addStep(e.target.value, category);
          e.target.value = "";
        }
      });

    document
      .getElementById("onboardingTemplateStepsList")
      ?.addEventListener("click", (e) => {
        const removeBtn = e.target.closest(".onboarding-step-remove");
        if (removeBtn) this._removeStep(Number(removeBtn.dataset.index));
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
