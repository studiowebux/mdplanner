// Reflection Sidenav Module
// Slide-in panel for reflection and template creation/editing

import { Sidenav } from "../ui/sidenav.js";
import { ReflectionsAPI, ReflectionTemplatesAPI } from "../api.js";
import { showToast } from "../ui/toast.js";
import { escapeHtml } from "../utils.js";
import { showConfirm } from "../ui/confirm.js";

const DEFAULT_QUESTIONS = [
  "What went well?",
  "What didn't go as expected?",
  "What did I learn?",
  "What would I do differently?",
  "What should I carry forward?",
];

export class ReflectionSidenavModule {
  constructor(taskManager) {
    this.tm = taskManager;
    // Reflection sidenav state
    this.editingId = null;
    this.current = null;
    // Template sidenav state
    this.editingTemplateId = null;
    this.currentTemplate = null;
  }

  bindEvents() {
    // Reflection sidenav
    document.getElementById("reflectionSidenavClose")?.addEventListener(
      "click",
      () => this.close(),
    );
    document.getElementById("reflectionSidenavCancel")?.addEventListener(
      "click",
      () => this.close(),
    );
    document.getElementById("reflectionSidenavDelete")?.addEventListener(
      "click",
      () => this.handleDelete(),
    );
    document.getElementById("reflectionSidenavSave")?.addEventListener(
      "click",
      () => this.save(),
    );
    document.getElementById("reflectionSidenavAddQuestion")?.addEventListener(
      "click",
      () => this.addQuestion(),
    );

    // Template sidenav
    document.getElementById("reflectionTemplateSidenavClose")?.addEventListener(
      "click",
      () => this.closeTemplate(),
    );
    document.getElementById(
      "reflectionTemplateSidenavCancel",
    )?.addEventListener("click", () => this.closeTemplate());
    document.getElementById(
      "reflectionTemplateSidenavDelete",
    )?.addEventListener("click", () => this.handleDeleteTemplate());
    document.getElementById("reflectionTemplateSidenavSave")?.addEventListener(
      "click",
      () => this.saveTemplate(),
    );
    document.getElementById(
      "reflectionTemplateSidenavAddQuestion",
    )?.addEventListener("click", () => this.addTemplateQuestion());
  }

  // ============================================================
  // Reflection sidenav
  // ============================================================

  openNew() {
    this.editingId = null;
    this.current = {
      title: "",
      tags: [],
      templateId: null,
      questions: DEFAULT_QUESTIONS.map((q) => ({ question: q, answer: "" })),
    };

    this._renderTemplatePicker();
    document.getElementById("reflectionSidenavHeader").textContent =
      "New Reflection";
    document.getElementById("reflectionSidenavDelete").classList.add("hidden");
    this._fillForm();
    Sidenav.open("reflectionSidenav");
    document.getElementById("reflectionSidenavTitle")?.focus();
  }

  openNewFromTemplate(templateId) {
    const template = (this.tm.reflectionTemplates || []).find(
      (t) => t.id === templateId,
    );
    this.editingId = null;
    this.current = {
      title: template ? `Reflection — ${template.title}` : "",
      tags: [],
      templateId: templateId,
      questions: template
        ? template.questions.map((q) => ({ question: q, answer: "" }))
        : DEFAULT_QUESTIONS.map((q) => ({ question: q, answer: "" })),
    };

    this._renderTemplatePicker();
    document.getElementById("reflectionSidenavHeader").textContent =
      "New Reflection";
    document.getElementById("reflectionSidenavDelete").classList.add("hidden");
    this._fillForm();
    Sidenav.open("reflectionSidenav");
    document.getElementById("reflectionSidenavTitle")?.focus();
  }

  openEdit(id) {
    const reflection = (this.tm.reflections || []).find((r) => r.id === id);
    if (!reflection) return;

    this.editingId = id;
    this.current = JSON.parse(JSON.stringify(reflection));

    this._renderTemplatePicker();
    document.getElementById("reflectionSidenavHeader").textContent =
      "Edit Reflection";
    document
      .getElementById("reflectionSidenavDelete")
      .classList.remove("hidden");
    this._fillForm();
    Sidenav.open("reflectionSidenav");
  }

  close() {
    Sidenav.close("reflectionSidenav");
    this.editingId = null;
    this.current = null;
  }

  _fillForm() {
    document.getElementById("reflectionSidenavTitle").value =
      this.current.title || "";
    document.getElementById("reflectionSidenavTags").value =
      (this.current.tags || []).join(", ");
    this._renderQuestions();
  }

  _renderTemplatePicker() {
    const container = document.getElementById(
      "reflectionSidenavTemplatePicker",
    );
    if (!container) return;

    const templates = this.tm.reflectionTemplates || [];
    if (templates.length === 0) {
      container.innerHTML = "";
      return;
    }

    container.innerHTML = templates
      .map(
        (t) =>
          `<button type="button" class="reflection-template-chip" data-template-id="${t.id}">${t.title}</button>`,
      )
      .join("");

    container.querySelectorAll(".reflection-template-chip").forEach((btn) => {
      btn.addEventListener("click", () => {
        const templateId = btn.dataset.templateId;
        const template = templates.find((t) => t.id === templateId);
        if (!template) return;
        this.current.templateId = templateId;
        this.current.questions = template.questions.map((q) => ({
          question: q,
          answer: "",
        }));
        this._renderQuestions();
      });
    });
  }

  _renderQuestions() {
    const container = document.getElementById(
      "reflectionSidenavQuestionsContainer",
    );
    if (!container) return;

    const questions = this.current.questions || [];

    if (questions.length === 0) {
      container.innerHTML =
        '<p class="text-sm text-muted py-4 text-center">No questions yet. Add one below.</p>';
      return;
    }

    container.innerHTML = questions
      .map(
        (q, i) => `
      <div class="reflection-question-item" data-index="${i}">
        <div class="reflection-question-header">
          <input type="text"
                 class="reflection-question-input"
                 value="${escapeHtml(q.question)}"
                 placeholder="Question..."
                 data-field="question"
                 data-index="${i}">
          <div class="reflection-question-actions">
            ${i > 0 ? `<button type="button" class="reflection-question-move btn-ghost" data-dir="up" data-index="${i}" title="Move up">&#9650;</button>` : ""}
            ${i < questions.length - 1 ? `<button type="button" class="reflection-question-move btn-ghost" data-dir="down" data-index="${i}" title="Move down">&#9660;</button>` : ""}
            <button type="button" class="reflection-question-remove btn-danger-ghost" data-index="${i}" title="Remove">&#10005;</button>
          </div>
        </div>
        <textarea class="reflection-answer-input"
                  placeholder="Your answer..."
                  data-field="answer"
                  data-index="${i}"
                  rows="3">${escapeHtml(q.answer || "")}</textarea>
      </div>`,
      )
      .join("");

    container.querySelectorAll(".reflection-question-input").forEach((input) => {
      input.addEventListener("input", (e) => {
        const idx = parseInt(e.target.dataset.index, 10);
        this.current.questions[idx].question = e.target.value;
      });
    });

    container.querySelectorAll(".reflection-answer-input").forEach((textarea) => {
      textarea.addEventListener("input", (e) => {
        const idx = parseInt(e.target.dataset.index, 10);
        this.current.questions[idx].answer = e.target.value;
      });
    });

    container.querySelectorAll(".reflection-question-move").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        const idx = parseInt(e.currentTarget.dataset.index, 10);
        const dir = e.currentTarget.dataset.dir;
        this._moveQuestion(idx, dir);
      });
    });

    container.querySelectorAll(".reflection-question-remove").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        const idx = parseInt(e.currentTarget.dataset.index, 10);
        this._removeQuestion(idx);
      });
    });
  }

  addQuestion() {
    if (!this.current.questions) this.current.questions = [];
    this.current.questions.push({ question: "", answer: "" });
    this._renderQuestions();
    const inputs = document.querySelectorAll(".reflection-question-input");
    if (inputs.length > 0) inputs[inputs.length - 1].focus();
  }

  _removeQuestion(index) {
    this.current.questions.splice(index, 1);
    this._renderQuestions();
  }

  _moveQuestion(index, direction) {
    const questions = this.current.questions;
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= questions.length) return;
    const temp = questions[index];
    questions[index] = questions[targetIndex];
    questions[targetIndex] = temp;
    this._renderQuestions();
  }

  _getFormData() {
    const tags = document
      .getElementById("reflectionSidenavTags")
      .value.split(",")
      .map((t) => t.trim())
      .filter(Boolean);

    return {
      title: document.getElementById("reflectionSidenavTitle").value.trim(),
      tags: tags.length > 0 ? tags : null,
      templateId: this.current.templateId || null,
      questions: (this.current.questions || []).filter(
        (q) => q.question.trim(),
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
      if (this.editingId) {
        const res = await ReflectionsAPI.update(this.editingId, data);
        if (!res.ok) {
          this._showSaveStatus("Error");
          showToast("Failed to save reflection", "error");
          return;
        }
        this._showSaveStatus("Saved");
      } else {
        const response = await ReflectionsAPI.create(data);
        if (!response.ok) {
          this._showSaveStatus("Error");
          showToast("Failed to create reflection", "error");
          return;
        }
        const result = await response.json();
        this.editingId = result.id;
        this._showSaveStatus("Created");
        document.getElementById("reflectionSidenavHeader").textContent =
          "Edit Reflection";
        document
          .getElementById("reflectionSidenavDelete")
          .classList.remove("hidden");
      }

      await this.tm.reflectionModule.load();
    } catch (error) {
      console.error("Error saving reflection:", error);
      this._showSaveStatus("Error");
      showToast("Error saving reflection", "error");
    }
  }

  async handleDelete() {
    if (!this.editingId) return;

    if (
      !(await showConfirm(
        `Delete "${this.current.title}"? This cannot be undone.`,
      ))
    ) {
      return;
    }

    try {
      const res = await ReflectionsAPI.delete(this.editingId);
      if (!res.ok) {
        showToast("Failed to delete reflection", "error");
        return;
      }
      showToast("Reflection deleted", "success");
      await this.tm.reflectionModule.load();
      this.close();
    } catch (error) {
      console.error("Error deleting reflection:", error);
      showToast("Error deleting reflection", "error");
    }
  }

  _showSaveStatus(text) {
    const statusEl = document.getElementById("reflectionSidenavSaveStatus");
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

  // ============================================================
  // Template sidenav
  // ============================================================

  openNewTemplate() {
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
    this._fillTemplateForm();
    Sidenav.open("reflectionTemplateSidenav");
    document.getElementById("reflectionTemplateSidenavTitle")?.focus();
  }

  openEditTemplate(id) {
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
    this._fillTemplateForm();
    Sidenav.open("reflectionTemplateSidenav");
  }

  closeTemplate() {
    Sidenav.close("reflectionTemplateSidenav");
    this.editingTemplateId = null;
    this.currentTemplate = null;
  }

  _fillTemplateForm() {
    document.getElementById("reflectionTemplateSidenavTitle").value =
      this.currentTemplate.title || "";
    document.getElementById("reflectionTemplateSidenavDescription").value =
      this.currentTemplate.description || "";
    document.getElementById("reflectionTemplateSidenavTags").value =
      (this.currentTemplate.tags || []).join(", ");
    this._renderTemplateQuestions();
  }

  _renderTemplateQuestions() {
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
      <div class="reflection-question-item" data-index="${i}">
        <div class="reflection-question-header">
          <input type="text"
                 class="reflection-template-question-input"
                 value="${escapeHtml(q)}"
                 placeholder="Question..."
                 data-index="${i}">
          <div class="reflection-question-actions">
            ${i > 0 ? `<button type="button" class="reflection-template-question-move btn-ghost" data-dir="up" data-index="${i}" title="Move up">&#9650;</button>` : ""}
            ${i < questions.length - 1 ? `<button type="button" class="reflection-template-question-move btn-ghost" data-dir="down" data-index="${i}" title="Move down">&#9660;</button>` : ""}
            <button type="button" class="reflection-template-question-remove btn-danger-ghost" data-index="${i}" title="Remove">&#10005;</button>
          </div>
        </div>
      </div>`,
      )
      .join("");

    container
      .querySelectorAll(".reflection-template-question-input")
      .forEach((input) => {
        input.addEventListener("input", (e) => {
          const idx = parseInt(e.target.dataset.index, 10);
          this.currentTemplate.questions[idx] = e.target.value;
        });
      });

    container
      .querySelectorAll(".reflection-template-question-move")
      .forEach((btn) => {
        btn.addEventListener("click", (e) => {
          const idx = parseInt(e.currentTarget.dataset.index, 10);
          const dir = e.currentTarget.dataset.dir;
          this._moveTemplateQuestion(idx, dir);
        });
      });

    container
      .querySelectorAll(".reflection-template-question-remove")
      .forEach((btn) => {
        btn.addEventListener("click", (e) => {
          const idx = parseInt(e.currentTarget.dataset.index, 10);
          this.currentTemplate.questions.splice(idx, 1);
          this._renderTemplateQuestions();
        });
      });
  }

  addTemplateQuestion() {
    if (!this.currentTemplate.questions) this.currentTemplate.questions = [];
    this.currentTemplate.questions.push("");
    this._renderTemplateQuestions();
    const inputs = document.querySelectorAll(
      ".reflection-template-question-input",
    );
    if (inputs.length > 0) inputs[inputs.length - 1].focus();
  }

  _moveTemplateQuestion(index, direction) {
    const questions = this.currentTemplate.questions;
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= questions.length) return;
    const temp = questions[index];
    questions[index] = questions[targetIndex];
    questions[targetIndex] = temp;
    this._renderTemplateQuestions();
  }

  _getTemplateFormData() {
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

  async saveTemplate() {
    const data = this._getTemplateFormData();

    if (!data.title) {
      this._showTemplateSaveStatus("Title required");
      return;
    }

    try {
      if (this.editingTemplateId) {
        const res = await ReflectionTemplatesAPI.update(
          this.editingTemplateId,
          data,
        );
        if (!res.ok) {
          this._showTemplateSaveStatus("Error");
          showToast("Failed to save template", "error");
          return;
        }
        this._showTemplateSaveStatus("Saved");
      } else {
        const response = await ReflectionTemplatesAPI.create(data);
        if (!response.ok) {
          this._showTemplateSaveStatus("Error");
          showToast("Failed to create template", "error");
          return;
        }
        const result = await response.json();
        this.editingTemplateId = result.id;
        this._showTemplateSaveStatus("Created");
        document.getElementById(
          "reflectionTemplateSidenavHeader",
        ).textContent = "Edit Template";
        document
          .getElementById("reflectionTemplateSidenavDelete")
          .classList.remove("hidden");
      }

      await this.tm.reflectionModule.load();
    } catch (error) {
      console.error("Error saving template:", error);
      this._showTemplateSaveStatus("Error");
      showToast("Error saving template", "error");
    }
  }

  async handleDeleteTemplate() {
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
        showToast("Failed to delete template", "error");
        return;
      }
      showToast("Template deleted", "success");
      await this.tm.reflectionModule.load();
      this.closeTemplate();
    } catch (error) {
      console.error("Error deleting template:", error);
      showToast("Error deleting template", "error");
    }
  }

  _showTemplateSaveStatus(text) {
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
