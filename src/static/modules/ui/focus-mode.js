// Focus Mode Module
// Provides distraction-free single-task view for ADHD/autism accessibility

import { markdownToHtml } from "../utils.js";

/**
 * Focus Mode for single-task distraction-free view
 */
export class FocusMode {
  static currentTaskId = null;
  static previousScrollPos = 0;

  /**
   * Enter focus mode with a specific task
   * @param {string} taskId
   * @param {TaskManager} taskManager
   */
  static enter(taskId, taskManager) {
    const task = taskManager.findTaskById(taskId);
    if (!task) return;

    this.currentTaskId = taskId;
    this.previousScrollPos = window.scrollY;

    // Add focus mode class to body
    document.body.classList.add("focus-mode-active");

    // Render focus mode UI
    this.render(task, taskManager);

    // Show container
    const container = document.getElementById("focusModeContainer");
    if (container) {
      container.classList.remove("hidden");
    }

    // Bind escape key
    this.escapeHandler = (e) => {
      if (e.key === "Escape") {
        this.exit();
      }
    };
    document.addEventListener("keydown", this.escapeHandler);
  }

  /**
   * Exit focus mode and return to previous view
   */
  static exit() {
    this.currentTaskId = null;

    // Remove focus mode class
    document.body.classList.remove("focus-mode-active");

    // Hide container
    const container = document.getElementById("focusModeContainer");
    if (container) {
      container.classList.add("hidden");
      container.innerHTML = "";
    }

    // Restore scroll position
    window.scrollTo(0, this.previousScrollPos);

    // Remove escape handler
    if (this.escapeHandler) {
      document.removeEventListener("keydown", this.escapeHandler);
      this.escapeHandler = null;
    }
  }

  /**
   * Render focus mode content
   * @param {object} task
   * @param {TaskManager} taskManager
   */
  static render(task, taskManager) {
    const container = document.getElementById("focusModeContainer");
    if (!container) return;

    const config = task.config || {};
    const subtasks = task.children || [];

    container.innerHTML = `
      <div class="focus-mode-overlay" onclick="window.FocusMode.exit()"></div>
      <div class="focus-mode-panel">
        <div class="focus-mode-header">
          <button class="focus-mode-close" onclick="window.FocusMode.exit()" title="Exit Focus Mode (Esc)">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
            </svg>
          </button>
          <span class="focus-mode-hint">Press Esc to exit</span>
        </div>

        <div class="focus-mode-content">
          <div class="focus-mode-task">
            <div class="focus-mode-checkbox-row">
              <input
                type="checkbox"
                id="focusModeCheckbox"
                ${task.completed ? "checked" : ""}
                onchange="window.FocusMode.toggleTask('${task.id}')"
                class="focus-mode-checkbox"
              >
              <label for="focusModeCheckbox" class="focus-mode-title ${
      task.completed ? "completed" : ""
    }">
                ${this.escapeHtml(task.title)}
              </label>
            </div>

            ${
      config.due_date
        ? `
              <div class="focus-mode-meta">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
                </svg>
                <span>Due: ${this.formatDate(config.due_date)}</span>
              </div>
            `
        : ""
    }

            ${
      config.assignee
        ? `
              <div class="focus-mode-meta">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path>
                </svg>
                <span>${this.escapeHtml(taskManager.getPersonName(config.assignee))}</span>
              </div>
            `
        : ""
    }

            ${
      task.description
        ? `
              <div class="focus-mode-description">
                ${markdownToHtml(Array.isArray(task.description) ? task.description.join("\n") : (task.description || ""))}
              </div>
            `
        : ""
    }

            ${
      subtasks.length > 0
        ? `
              <div class="focus-mode-subtasks">
                <h4 class="focus-mode-subtasks-header">Subtasks (${
          subtasks.filter((s) => s.completed).length
        }/${subtasks.length})</h4>
                <div class="focus-mode-subtasks-list">
                  ${
          subtasks.map((subtask) => `
                    <div class="focus-mode-subtask">
                      <input
                        type="checkbox"
                        id="focusSubtask_${subtask.id}"
                        ${subtask.completed ? "checked" : ""}
                        onchange="window.FocusMode.toggleTask('${subtask.id}')"
                        class="focus-mode-subtask-checkbox"
                      >
                      <label for="focusSubtask_${subtask.id}" class="${
            subtask.completed ? "completed" : ""
          }">
                        ${this.escapeHtml(subtask.title)}
                      </label>
                    </div>
                  `).join("")
        }
                </div>
              </div>
            `
        : ""
    }
          </div>
        </div>

        <div class="focus-mode-footer">
          <button class="focus-mode-action" onclick="taskManager.editTask('${task.id}'); window.FocusMode.exit();">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path>
            </svg>
            Edit Task
          </button>
        </div>
      </div>
    `;

    // Store reference to taskManager for toggle
    this.taskManager = taskManager;
  }

  /**
   * Toggle task completion from focus mode
   * @param {string} taskId
   */
  static async toggleTask(taskId) {
    if (this.taskManager) {
      await this.taskManager.toggleTask(taskId);
      // Re-render focus mode with updated task
      const task = this.taskManager.findTaskById(this.currentTaskId);
      if (task) {
        this.render(task, this.taskManager);
      }
    }
  }

  /**
   * Escape HTML to prevent XSS
   * @param {string} text
   * @returns {string}
   */
  static escapeHtml(text) {
    if (!text) return "";
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
  }

  /**
   * Format date for display
   * @param {string} dateStr
   * @returns {string}
   */
  static formatDate(dateStr) {
    if (!dateStr) return "";
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  }
}

// Expose to window for onclick handlers
window.FocusMode = FocusMode;
