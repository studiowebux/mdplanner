// Brainstorm Sidenav Module
// Slide-in panel for brainstorm viewing, creation, and editing with question management

import { Sidenav } from "../ui/sidenav.js";
import { BrainstormsAPI } from "../api.js";
import { showToast } from "../ui/toast.js";
import { escapeHtml, extractErrorMessage, validateRequired, clearAllFieldErrors } from "../utils.js";
import { showConfirm } from "../ui/confirm.js";

const DEFAULT_QUESTIONS = [
  "What about this sparked my curiosity?",
  "What motivated me to invest my time and energy in this?",
  "What am I trying to achieve?",
  "What will it require? (time, skills, resources, money)",
  "What is my definition of success?",
  "What are the risks or reasons this might fail?",
  "What is the smallest version I could start with?",
];

export class BrainstormSidenavModule {
  constructor(taskManager) {
    this.tm = taskManager;
    this.editingId = null;
    this.current = null;
    this.isViewMode = false;
  }

  bindEvents() {
    document.getElementById("brainstormSidenavClose")?.addEventListener(
      "click",
      () => this.close(),
    );
    document.getElementById("brainstormSidenavCancel")?.addEventListener(
      "click",
      () => this.close(),
    );
    document.getElementById("brainstormSidenavDelete")?.addEventListener(
      "click",
      () => this.handleDelete(),
    );
    document.getElementById("brainstormSidenavSave")?.addEventListener(
      "click",
      () => this.save(),
    );
    document.getElementById("brainstormSidenavAddQuestion")?.addEventListener(
      "click",
      () => this.addQuestion(),
    );
    document.getElementById("brainstormSidenavEdit")?.addEventListener(
      "click",
      () => this._setEditMode(),
    );
  }

  openNew() {
    this.editingId = null;
    this.current = {
      title: "",
      tags: [],
      linkedProjects: [],
      linkedTasks: [],
      linkedGoals: [],
      questions: DEFAULT_QUESTIONS.map((q) => ({ question: q, answer: "" })),
    };

    document.getElementById("brainstormSidenavHeader").textContent =
      "New Brainstorm";
    document.getElementById("brainstormSidenavDelete").classList.add("hidden");
    this._setEditMode();
    this.fillForm();

    Sidenav.open("brainstormSidenav");
    document.getElementById("brainstormSidenavTitle")?.focus();
  }

  openView(id) {
    const brainstorm = (this.tm.brainstorms || []).find((b) => b.id === id);
    if (!brainstorm) return;

    this.editingId = id;
    this.current = JSON.parse(JSON.stringify(brainstorm));

    document.getElementById("brainstormSidenavHeader").textContent =
      brainstorm.title;
    document.getElementById("brainstormSidenavDelete").classList.remove(
      "hidden",
    );
    this._setViewMode();

    Sidenav.open("brainstormSidenav");
  }

  openEdit(id) {
    const brainstorm = (this.tm.brainstorms || []).find((b) => b.id === id);
    if (!brainstorm) return;

    this.editingId = id;
    this.current = JSON.parse(JSON.stringify(brainstorm));

    document.getElementById("brainstormSidenavHeader").textContent =
      "Edit Brainstorm";
    document.getElementById("brainstormSidenavDelete").classList.remove(
      "hidden",
    );
    this._setEditMode();
    this.fillForm();

    Sidenav.open("brainstormSidenav");
  }

  _setViewMode() {
    this.isViewMode = true;
    document.getElementById("brainstormSidenavViewBody")?.classList.remove(
      "hidden",
    );
    document.getElementById("brainstormSidenavEditBody")?.classList.add(
      "hidden",
    );
    document.getElementById("brainstormSidenavEdit")?.classList.remove(
      "hidden",
    );
    document.getElementById("brainstormSidenavSave")?.classList.add("hidden");
    document.getElementById("brainstormSidenavCancel")?.classList.add("hidden");
    this._renderViewBody();
  }

  _setEditMode() {
    this.isViewMode = false;
    document.getElementById("brainstormSidenavViewBody")?.classList.add(
      "hidden",
    );
    document.getElementById("brainstormSidenavEditBody")?.classList.remove(
      "hidden",
    );
    document.getElementById("brainstormSidenavEdit")?.classList.add("hidden");
    document.getElementById("brainstormSidenavSave")?.classList.remove(
      "hidden",
    );
    document.getElementById("brainstormSidenavCancel")?.classList.remove(
      "hidden",
    );
    if (this.editingId) {
      document.getElementById("brainstormSidenavHeader").textContent =
        "Edit Brainstorm";
      this.fillForm();
    }
  }

  _renderViewBody() {
    const viewBody = document.getElementById("brainstormSidenavViewBody");
    if (!viewBody || !this.current) return;

    const tags = (this.current.tags || [])
      .map(
        (t) =>
          `<span class="inline-block px-2 py-0.5 text-xs bg-active text-secondary rounded">${escapeHtml(t)}</span>`,
      )
      .join("");

    const questions = (this.current.questions || [])
      .map(
        (q) => `
      <div class="sidenav-section">
        <h4 class="font-medium text-primary text-sm mb-1">${escapeHtml(q.question)}</h4>
        <p class="text-sm text-secondary whitespace-pre-wrap">${q.answer ? escapeHtml(q.answer) : '<span class="text-muted">No answer yet</span>'}</p>
      </div>`,
      )
      .join("");

    viewBody.innerHTML = `
      ${tags ? `<div class="sidenav-section"><div class="flex flex-wrap gap-1">${tags}</div></div>` : ""}
      <div class="sidenav-section">
        <p class="text-xs text-muted">Created: ${this.current.created ? this.current.created.slice(0, 10) : "Unknown"}</p>
      </div>
      ${questions || '<div class="sidenav-section"><p class="text-sm text-muted">No questions yet.</p></div>'}
    `;
  }

  close() {
    Sidenav.close("brainstormSidenav");
    this.editingId = null;
    this.current = null;
    this.isViewMode = false;
  }

  fillForm() {
    document.getElementById("brainstormSidenavTitle").value =
      this.current.title || "";
    document.getElementById("brainstormSidenavTags").value =
      (this.current.tags || []).join(", ");
    this.renderQuestions();
  }

  renderQuestions() {
    const container = document.getElementById(
      "brainstormSidenavQuestionsContainer",
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
                  placeholder="Your thoughts..."
                  data-field="answer"
                  data-index="${i}"
                  rows="3">${escapeHtml(q.answer || "")}</textarea>
      </div>`,
      )
      .join("");

    // Bind question input changes
    container.querySelectorAll(".sidenav-question-input").forEach((input) => {
      input.addEventListener("input", (e) => {
        const idx = parseInt(e.target.dataset.index, 10);
        this.current.questions[idx].question = e.target.value;
      });
    });

    // Bind answer textarea changes
    container.querySelectorAll(".sidenav-answer-input").forEach((textarea) => {
      textarea.addEventListener("input", (e) => {
        const idx = parseInt(e.target.dataset.index, 10);
        this.current.questions[idx].answer = e.target.value;
      });
    });

    // Bind move buttons
    container.querySelectorAll(".sidenav-question-move").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        const idx = parseInt(e.currentTarget.dataset.index, 10);
        const dir = e.currentTarget.dataset.dir;
        this.moveQuestion(idx, dir);
      });
    });

    // Bind remove buttons
    container.querySelectorAll(".sidenav-question-remove").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        const idx = parseInt(e.currentTarget.dataset.index, 10);
        this.removeQuestion(idx);
      });
    });
  }

  addQuestion() {
    if (!this.current.questions) this.current.questions = [];
    this.current.questions.push({ question: "", answer: "" });
    this.renderQuestions();
    // Focus the new question input
    const inputs = document.querySelectorAll(".sidenav-question-input");
    if (inputs.length > 0) inputs[inputs.length - 1].focus();
  }

  removeQuestion(index) {
    this.current.questions.splice(index, 1);
    this.renderQuestions();
  }

  moveQuestion(index, direction) {
    const questions = this.current.questions;
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= questions.length) return;

    const temp = questions[index];
    questions[index] = questions[targetIndex];
    questions[targetIndex] = temp;
    this.renderQuestions();
  }

  getFormData() {
    const tags = document
      .getElementById("brainstormSidenavTags")
      .value.split(",")
      .map((t) => t.trim())
      .filter(Boolean);

    return {
      title: document.getElementById("brainstormSidenavTitle").value.trim(),
      tags: tags.length > 0 ? tags : null,
      questions: (this.current.questions || []).filter(
        (q) => q.question.trim(),
      ),
    };
  }

  async save() {
    // Clear previous errors
    clearAllFieldErrors(document.getElementById("brainstormSidenav"));
    // Validate required fields
    const errors = validateRequired([
      { id: "brainstormSidenavTitle", label: "Title" },
    ]);
    if (errors.length > 0) {
      if (this.showSaveStatus) this.showSaveStatus(errors[0].message);
      else showToast(errors[0].message, "error");
      return;
    }

    const data = this.getFormData();

    try {
      if (this.editingId) {
        const res = await BrainstormsAPI.update(this.editingId, data);
        if (!res.ok) {
          const errBody = await res.json().catch(() => ({}));
          const errMsg = extractErrorMessage(errBody);
          this.showSaveStatus(errMsg);
          showToast(errMsg, "error");
          return;
        }
        this.showSaveStatus("Saved"); showToast("Saved", "success");
      } else {
        const response = await BrainstormsAPI.create(data);
        if (!response.ok) {
          const errBody = await response.json().catch(() => ({}));
          const errMsg = extractErrorMessage(errBody);
          this.showSaveStatus(errMsg);
          showToast(errMsg, "error");
          return;
        }
        let result;
        try {
          result = await response.json();
        } catch {
          this.showSaveStatus("Error");
          showToast("Unexpected server response", "error");
          return;
        }
        if (!result?.id) {
          this.showSaveStatus("Error");
          showToast("Invalid response from server", "error");
          return;
        }
        this.editingId = result.id;
        this.showSaveStatus("Created"); showToast("Created", "success");

        document.getElementById("brainstormSidenavHeader").textContent =
          "Edit Brainstorm";
        document
          .getElementById("brainstormSidenavDelete")
          .classList.remove("hidden");
      }

      await this.tm.brainstormModule.load();
    } catch (error) {
      console.error("BrainstormSidenavModule.save failed", { id: this.editingId, error: error.message });
      this.showSaveStatus("Error");
      showToast(error.message || "Error saving brainstorm", "error");
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
      const res = await BrainstormsAPI.delete(this.editingId);
      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}));
        showToast(extractErrorMessage(errBody), "error");
        return;
      }
      showToast("Brainstorm deleted", "success");
      await this.tm.brainstormModule.load();
      this.close();
    } catch (error) {
      console.error("BrainstormSidenavModule.handleDelete failed", { id: this.editingId, error: error.message });
      showToast(error.message || "Error deleting brainstorm", "error");
    }
  }

  showSaveStatus(text) {
    const statusEl = document.getElementById("brainstormSidenavSaveStatus");
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
