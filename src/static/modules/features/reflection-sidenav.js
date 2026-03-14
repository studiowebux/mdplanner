// Reflection Sidenav Module
// Slide-in panel for reflection creation and editing

import { Sidenav } from "../ui/sidenav.js";
import { ReflectionsAPI } from "../api.js";
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
    this.editingId = null;
    this.current = null;
  }

  bindEvents() {
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
  }

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
      <div class="sidenav-question-item" data-index="${i}">
        <div class="sidenav-question-header">
          <input type="text"
                 class="sidenav-question-input"
                 value="${escapeHtml(q.question)}"
                 placeholder="Question..."
                 data-field="question"
                 data-index="${i}">
          <div class="sidenav-question-actions">
            ${i > 0 ? `<button type="button" class="sidenav-question-move btn-ghost" data-dir="up" data-index="${i}" title="Move up">&#9650;</button>` : ""}
            ${i < questions.length - 1 ? `<button type="button" class="sidenav-question-move btn-ghost" data-dir="down" data-index="${i}" title="Move down">&#9660;</button>` : ""}
            <button type="button" class="sidenav-question-remove btn-danger-ghost" data-index="${i}" title="Remove">&#10005;</button>
          </div>
        </div>
        <textarea class="sidenav-answer-input"
                  placeholder="Your answer..."
                  data-field="answer"
                  data-index="${i}"
                  rows="3">${escapeHtml(q.answer || "")}</textarea>
      </div>`,
      )
      .join("");

    container.querySelectorAll(".sidenav-question-input").forEach((input) => {
      input.addEventListener("input", (e) => {
        const idx = parseInt(e.target.dataset.index, 10);
        this.current.questions[idx].question = e.target.value;
      });
    });

    container.querySelectorAll(".sidenav-answer-input").forEach((textarea) => {
      textarea.addEventListener("input", (e) => {
        const idx = parseInt(e.target.dataset.index, 10);
        this.current.questions[idx].answer = e.target.value;
      });
    });

    container.querySelectorAll(".sidenav-question-move").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        const idx = parseInt(e.currentTarget.dataset.index, 10);
        const dir = e.currentTarget.dataset.dir;
        this._moveQuestion(idx, dir);
      });
    });

    container.querySelectorAll(".sidenav-question-remove").forEach((btn) => {
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
    const inputs = document.querySelectorAll(".sidenav-question-input");
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
      console.error("ReflectionSidenavModule.save failed", { id: this.editingId, error: error.message });
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
      console.error("ReflectionSidenavModule.handleDelete failed", { id: this.editingId, error: error.message });
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
}
