// Reflection Template Sidenav Module
// Slide-in panel for reflection template creation and editing

import { Sidenav } from "../ui/sidenav.js";
import { ReflectionTemplatesAPI } from "../api.js";
import { showToast } from "../ui/toast.js";
import { escapeHtml, extractErrorMessage } from "../utils.js";
import { showConfirm } from "../ui/confirm.js";

const DEFAULT_QUESTIONS = [
  "What went well?",
  "What didn't go as expected?",
  "What did I learn?",
  "What would I do differently?",
  "What should I carry forward?",
];

export class ReflectionTemplateSidenavModule {
  constructor(taskManager) {
    this.tm = taskManager;
    this.editingTemplateId = null;
    this.currentTemplate = null;
  }

  bindEvents() {
    document.getElementById("reflectionTemplateSidenavClose")?.addEventListener(
      "click",
      () => this.close(),
    );
    document.getElementById(
      "reflectionTemplateSidenavCancel",
    )?.addEventListener("click", () => this.close());
    document.getElementById(
      "reflectionTemplateSidenavDelete",
    )?.addEventListener("click", () => this.handleDelete());
    document.getElementById("reflectionTemplateSidenavSave")?.addEventListener(
      "click",
      () => this.save(),
    );
    document.getElementById(
      "reflectionTemplateSidenavAddQuestion",
    )?.addEventListener("click", () => this.addQuestion());
  }

  openNew() {
    this.editingTemplateId = null;
    this.currentTemplate = {
      title: "",
      description: "",
      tags: [],
      questions: [...DEFAULT_QUESTIONS],
    };

    document.getElementById("reflectionTemplateSidenavHeader").textContent =
      "New Template";
    document
      .getElementById("reflectionTemplateSidenavDelete")
      .classList.add("hidden");
    this._fillForm();
    Sidenav.open("reflectionTemplateSidenav");
    document.getElementById("reflectionTemplateSidenavTitle")?.focus();
  }

  openEdit(id) {
    const template = (this.tm.reflectionTemplates || []).find(
      (t) => t.id === id,
    );
    if (!template) return;

    this.editingTemplateId = id;
    this.currentTemplate = JSON.parse(JSON.stringify(template));

    document.getElementById("reflectionTemplateSidenavHeader").textContent =
      "Edit Template";
    document
      .getElementById("reflectionTemplateSidenavDelete")
      .classList.remove("hidden");
    this._fillForm();
    Sidenav.open("reflectionTemplateSidenav");
  }

  close() {
    Sidenav.close("reflectionTemplateSidenav");
    this.editingTemplateId = null;
    this.currentTemplate = null;
  }

  _fillForm() {
    document.getElementById("reflectionTemplateSidenavTitle").value =
      this.currentTemplate.title || "";
    document.getElementById("reflectionTemplateSidenavDescription").value =
      this.currentTemplate.description || "";
    document.getElementById("reflectionTemplateSidenavTags").value =
      (this.currentTemplate.tags || []).join(", ");
    this._renderQuestions();
  }

  _renderQuestions() {
    const container = document.getElementById(
      "reflectionTemplateSidenavQuestionsContainer",
    );
    if (!container) return;

    const questions = this.currentTemplate.questions || [];

    if (questions.length === 0) {
      container.innerHTML =
        '<p class="text-sm text-muted py-4 text-center">No questions yet. Add one below.</p>';
      return;
    }

    container.innerHTML = questions
      .map(
        (q, i) => `
      <div class="sidenav-question-item" data-index="${i}">
        <div class="sidenav-question-header">
          <input type="text"
                 class="sidenav-question-input"
                 value="${escapeHtml(q)}"
                 placeholder="Question..."
                 data-index="${i}">
          <div class="sidenav-question-actions">
            ${i > 0 ? `<button type="button" class="sidenav-question-move btn-ghost" data-dir="up" data-index="${i}" title="Move up">&#9650;</button>` : ""}
            ${i < questions.length - 1 ? `<button type="button" class="sidenav-question-move btn-ghost" data-dir="down" data-index="${i}" title="Move down">&#9660;</button>` : ""}
            <button type="button" class="sidenav-question-remove btn-danger-ghost" data-index="${i}" title="Remove">&#10005;</button>
          </div>
        </div>
      </div>`,
      )
      .join("");

    container
      .querySelectorAll(".sidenav-question-input")
      .forEach((input) => {
        input.addEventListener("input", (e) => {
          const idx = parseInt(e.target.dataset.index, 10);
          this.currentTemplate.questions[idx] = e.target.value;
        });
      });

    container
      .querySelectorAll(".sidenav-question-move")
      .forEach((btn) => {
        btn.addEventListener("click", (e) => {
          const idx = parseInt(e.currentTarget.dataset.index, 10);
          const dir = e.currentTarget.dataset.dir;
          this._moveQuestion(idx, dir);
        });
      });

    container
      .querySelectorAll(".sidenav-question-remove")
      .forEach((btn) => {
        btn.addEventListener("click", (e) => {
          const idx = parseInt(e.currentTarget.dataset.index, 10);
          this.currentTemplate.questions.splice(idx, 1);
          this._renderQuestions();
        });
      });
  }

  addQuestion() {
    if (!this.currentTemplate.questions) this.currentTemplate.questions = [];
    this.currentTemplate.questions.push("");
    this._renderQuestions();
    const inputs = document.querySelectorAll(
      ".sidenav-question-input",
    );
    if (inputs.length > 0) inputs[inputs.length - 1].focus();
  }

  _moveQuestion(index, direction) {
    const questions = this.currentTemplate.questions;
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= questions.length) return;
    const temp = questions[index];
    questions[index] = questions[targetIndex];
    questions[targetIndex] = temp;
    this._renderQuestions();
  }

  _getFormData() {
    const tags = document
      .getElementById("reflectionTemplateSidenavTags")
      .value.split(",")
      .map((t) => t.trim())
      .filter(Boolean);

    return {
      title: document
        .getElementById("reflectionTemplateSidenavTitle")
        .value.trim(),
      description:
        document
          .getElementById("reflectionTemplateSidenavDescription")
          .value.trim() || null,
      tags: tags.length > 0 ? tags : null,
      questions: (this.currentTemplate.questions || []).filter((q) =>
        q.trim(),
      ),
    };
  }

  async save() {
    const data = this._getFormData();

    if (!data.title) {
      this._showSaveStatus("Title required");
      return;
    }

    try {
      if (this.editingTemplateId) {
        const res = await ReflectionTemplatesAPI.update(
          this.editingTemplateId,
          data,
        );
        if (!res.ok) {
          const errBody = await res.json().catch(() => ({}));
          const errMsg = extractErrorMessage(errBody);
          this._showSaveStatus(errMsg);
          showToast(errMsg, "error");
          return;
        }
        this._showSaveStatus("Saved"); showToast("Saved", "success");
      } else {
        const response = await ReflectionTemplatesAPI.create(data);
        if (!response.ok) {
          const errBody = await response.json().catch(() => ({}));
          const errMsg = extractErrorMessage(errBody);
          this._showSaveStatus(errMsg);
          showToast(errMsg, "error");
          return;
        }
        let result;
        try {
          result = await response.json();
        } catch {
          this._showSaveStatus("Error");
          showToast("Unexpected server response", "error");
          return;
        }
        if (!result?.id) {
          this._showSaveStatus("Error");
          showToast("Invalid response from server", "error");
          return;
        }
        this.editingTemplateId = result.id;
        this._showSaveStatus("Created"); showToast("Created", "success");
        document.getElementById(
          "reflectionTemplateSidenavHeader",
        ).textContent = "Edit Template";
        document
          .getElementById("reflectionTemplateSidenavDelete")
          .classList.remove("hidden");
      }

      await this.tm.reflectionModule.load();
    } catch (error) {
      console.error("ReflectionTemplateSidenavModule.save failed", { id: this.editingTemplateId, error: error.message });
      this._showSaveStatus(error.message || "Error");
      showToast(error.message || "Error saving template", "error");
    }
  }

  async handleDelete() {
    if (!this.editingTemplateId) return;

    if (
      !(await showConfirm(
        `Delete template "${this.currentTemplate.title}"? Existing reflections are unaffected.`,
      ))
    ) {
      return;
    }

    try {
      const res = await ReflectionTemplatesAPI.delete(this.editingTemplateId);
      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}));
        const errMsg = extractErrorMessage(errBody);
        showToast(errMsg, "error");
        return;
      }
      showToast("Template deleted", "success");
      await this.tm.reflectionModule.load();
      this.close();
    } catch (error) {
      console.error("ReflectionTemplateSidenavModule.handleDelete failed", { id: this.editingTemplateId, error: error.message });
      showToast(error.message || "Error deleting template", "error");
    }
  }

  _showSaveStatus(text) {
    const statusEl = document.getElementById(
      "reflectionTemplateSidenavSaveStatus",
    );
    if (!statusEl) return;

    statusEl.textContent = text;
    statusEl.classList.remove(
      "hidden",
      "sidenav-status-saved",
      "sidenav-status-saving",
      "sidenav-status-error",
    );

    if (text === "Saved" || text === "Created") {
      statusEl.classList.add("sidenav-status-saved");
    } else if (text === "Error" || text === "Title required") {
      statusEl.classList.add("sidenav-status-error");
    } else {
      statusEl.classList.add("sidenav-status-saving");
    }

    if (text === "Saved" || text === "Created" || text === "Error") {
      setTimeout(() => statusEl.classList.add("hidden"), 2000);
    }
  }
}
