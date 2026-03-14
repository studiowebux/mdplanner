// Brainstorm Sidenav Module
// Slide-in panel for brainstorm creation and editing with question management

import { Sidenav } from "../ui/sidenav.js";
import { BrainstormsAPI } from "../api.js";
import { showToast } from "../ui/toast.js";
import { escapeHtml } from "../utils.js";
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
    this.fillForm();

    Sidenav.open("brainstormSidenav");
    document.getElementById("brainstormSidenavTitle")?.focus();
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
    this.fillForm();

    Sidenav.open("brainstormSidenav");
  }

  close() {
    Sidenav.close("brainstormSidenav");
    this.editingId = null;
    this.current = null;
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
      <div class="brainstorm-question-item" data-index="${i}">
        <div class="brainstorm-question-header">
          <input type="text"
                 class="brainstorm-question-input"
                 value="${escapeHtml(q.question)}"
                 placeholder="Question..."
                 data-field="question"
                 data-index="${i}">
          <div class="brainstorm-question-actions">
            ${i > 0 ? `<button type="button" class="brainstorm-question-move btn-ghost" data-dir="up" data-index="${i}" title="Move up">&#9650;</button>` : ""}
            ${i < questions.length - 1 ? `<button type="button" class="brainstorm-question-move btn-ghost" data-dir="down" data-index="${i}" title="Move down">&#9660;</button>` : ""}
            <button type="button" class="brainstorm-question-remove btn-danger-ghost" data-index="${i}" title="Remove">&#10005;</button>
          </div>
        </div>
        <textarea class="brainstorm-answer-input"
                  placeholder="Your thoughts..."
                  data-field="answer"
                  data-index="${i}"
                  rows="3">${escapeHtml(q.answer || "")}</textarea>
      </div>`,
      )
      .join("");

    // Bind question input changes
    container.querySelectorAll(".brainstorm-question-input").forEach((input) => {
      input.addEventListener("input", (e) => {
        const idx = parseInt(e.target.dataset.index, 10);
        this.current.questions[idx].question = e.target.value;
      });
    });

    // Bind answer textarea changes
    container.querySelectorAll(".brainstorm-answer-input").forEach((textarea) => {
      textarea.addEventListener("input", (e) => {
        const idx = parseInt(e.target.dataset.index, 10);
        this.current.questions[idx].answer = e.target.value;
      });
    });

    // Bind move buttons
    container.querySelectorAll(".brainstorm-question-move").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        const idx = parseInt(e.currentTarget.dataset.index, 10);
        const dir = e.currentTarget.dataset.dir;
        this.moveQuestion(idx, dir);
      });
    });

    // Bind remove buttons
    container.querySelectorAll(".brainstorm-question-remove").forEach((btn) => {
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
    const inputs = document.querySelectorAll(".brainstorm-question-input");
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
    const data = this.getFormData();

    if (!data.title) {
      this.showSaveStatus("Title required");
      return;
    }

    try {
      if (this.editingId) {
        const res = await BrainstormsAPI.update(this.editingId, data);
        if (!res.ok) {
          this.showSaveStatus("Error");
          showToast("Failed to save brainstorm", "error");
          return;
        }
        this.showSaveStatus("Saved");
      } else {
        const response = await BrainstormsAPI.create(data);
        if (!response.ok) {
          this.showSaveStatus("Error");
          showToast("Failed to create brainstorm", "error");
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
        this.showSaveStatus("Created");

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
      showToast("Error saving brainstorm", "error");
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
        showToast("Failed to delete brainstorm", "error");
        return;
      }
      showToast("Brainstorm deleted", "success");
      await this.tm.brainstormModule.load();
      this.close();
    } catch (error) {
      console.error("BrainstormSidenavModule.handleDelete failed", { id: this.editingId, error: error.message });
      showToast("Error deleting brainstorm", "error");
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
