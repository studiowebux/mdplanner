// Board View Module
import { TAG_CLASSES } from '../constants.js';
import { formatDate, getPriorityBadgeClasses, getPriorityText } from '../utils.js';
import { TasksAPI } from '../api.js';

/**
 * Kanban board view with drag-drop between sections
 */
export class BoardView {
  /** @param {TaskManager} taskManager */
  constructor(taskManager) {
    this.tm = taskManager;
  }

  render() {
    const sections = this.tm.sections || [];
    const container = document.getElementById("boardContainer");

    // Show no results message when search is active but no tasks match
    if (this.tm.searchQuery && this.tm.filteredTasks.length === 0) {
      container.className = "flex items-center justify-center h-64";
      container.innerHTML = `
        <div class="text-center text-gray-500 dark:text-gray-400">
          <svg class="w-12 h-12 mx-auto mb-4 text-gray-300 dark:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
          </svg>
          <p class="text-lg font-medium">No tasks found</p>
          <p class="text-sm mt-1">No tasks match "${this.tm.searchQuery}"</p>
        </div>`;
      return;
    }

    if (sections.length === 0) {
      container.className = "flex items-center justify-center h-64";
      container.innerHTML =
        '<div class="text-center text-gray-500 dark:text-gray-400">No sections found. Please add sections to your markdown board with "## Section Name".</div>';
      return;
    }

    // Use flex with horizontal scroll to keep all columns on same row
    container.className = "flex gap-6 overflow-x-auto pb-4";
    container.innerHTML = "";

    sections.forEach((section) => {
      const tasksToRender = this.tm.getTasksToRender();
      const sectionTasks = tasksToRender.filter(
        (task) => task.section === section && !task.parentId,
      );

      // Create column with fixed width for consistent layout
      const column = document.createElement("div");
      column.className =
        "bg-white dark:bg-gray-800 rounded-lg shadow flex-shrink-0 w-80";
      column.innerHTML = `
                <div class="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
                    <h3 class="text-sm font-medium text-gray-900 dark:text-gray-100">${section}</h3>
                    <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">${sectionTasks.length} tasks</p>
                </div>
                <div class="p-4 min-h-96 space-y-3" data-section="${section}">
                    <!-- Tasks will be populated here -->
                </div>
            `;

      const tasksContainer = column.querySelector("[data-section]");
      sectionTasks.forEach((task) => {
        const taskCard = this.createTaskElement(task);
        tasksContainer.appendChild(taskCard);
      });

      container.appendChild(column);
    });
  }

  createTaskElement(task) {
    const config = task.config || {};
    const div = document.createElement("div");
    div.className =
      "task-card bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg p-3 cursor-move";
    div.draggable = true;
    div.dataset.taskId = task.id;

    const priorityBadgeClasses = getPriorityBadgeClasses(config.priority);
    const priorityText = getPriorityText(config.priority);

    div.innerHTML = `
            <div class="flex items-start justify-between mb-2">
                <h4 class="${task.completed ? "line-through text-gray-500 dark:text-gray-400" : "text-gray-900 dark:text-gray-100"} font-medium text-sm">
                    ${task.title}
                </h4>
                <div class="flex space-x-1">
                    <button onclick="taskManager.addSubtask('${task.id}')"
                            class="text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors" title="Add Subtask">
                        <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path>
                        </svg>
                    </button>
                    ${
                      task.description && task.description.length > 0
                        ? `
                        <button onclick="taskManager.toggleDescription('${task.id}')"
                                class="text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors" title="View Description">
                            <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                            </svg>
                        </button>
                    `
                        : ""
                    }
                    <button onclick="taskManager.copyTaskLink('${task.id}')"
                            class="text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors" title="Copy Link">
                        <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"></path>
                        </svg>
                    </button>
                    <button onclick="taskManager.editTask('${task.id}')"
                            class="text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors" title="Edit">
                        <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path>
                        </svg>
                    </button>
                    <button onclick="taskManager.deleteTask('${task.id}')"
                            class="text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors" title="Delete">
                        <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                        </svg>
                    </button>
                </div>
            </div>

            <div class="space-y-2">
                <div class="flex items-center space-x-1">
                    <input type="checkbox" ${task.completed ? "checked" : ""}
                           onchange="taskManager.toggleTask('${task.id}')"
                           class="rounded border-gray-300 dark:border-gray-600 text-gray-900 focus:ring-gray-500 dark:bg-gray-600 text-xs">
                    <span class="text-xs text-gray-500 dark:text-gray-400">Complete</span>
                </div>

                <div class="flex flex-wrap gap-1">
                    ${config.priority ? `<span class="inline-block px-2 py-0.5 text-xs font-medium rounded ${priorityBadgeClasses}">${priorityText}</span>` : ""}
                    ${
                      config.tag
                        ? config.tag
                            .map(
                              (tag) =>
                                `<span class="inline-block px-2 py-0.5 text-xs font-medium rounded border ${TAG_CLASSES}">${tag}</span>`,
                            )
                            .join("")
                        : ""
                    }
                </div>

                <div class="text-xs font-mono text-gray-400">#${task.id}</div>
                ${config.assignee ? `<div class="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1"><svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path></svg> ${config.assignee}</div>` : ""}
                ${config.due_date ? `<div class="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1"><svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg> ${formatDate(config.due_date)}</div>` : ""}
                ${config.effort ? `<div class="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1"><svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg> ${config.effort}d</div>` : ""}
                ${config.milestone ? `<div class="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1"><svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 21v-4m0 0V5a2 2 0 012-2h6.5l1 1H21l-3 6 3 6h-8.5l-1-1H5a2 2 0 00-2 2zm9-13.5V9"></path></svg> ${config.milestone}</div>` : ""}
                ${config.blocked_by && config.blocked_by.length > 0 ? `<div class="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1"><svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"></path></svg> ${config.blocked_by.join(", ")}</div>` : ""}

                ${
                  task.children && task.children.length > 0
                    ? `
                    <div class="mt-3 pt-2 border-t border-gray-100 dark:border-gray-600">
                        <div class="text-xs text-gray-500 dark:text-gray-400 mb-2 flex items-center gap-1"><svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"></path></svg> Subtasks (${task.children.length})</div>
                        <div class="space-y-1">
                            ${task.children
                              .map(
                                (child) => `
                                <div class="flex items-center space-x-2 text-xs">
                                    <input type="checkbox" ${child.completed ? "checked" : ""}
                                           onchange="taskManager.toggleTask('${child.id}')"
                                           class="rounded border-gray-300 dark:border-gray-600 text-gray-900 focus:ring-gray-500 dark:bg-gray-600" style="transform: scale(0.8);">
                                    <span class="${child.completed ? "line-through text-gray-400 dark:text-gray-500" : "text-gray-600 dark:text-gray-300"}">${child.title}</span>
                                </div>
                            `,
                              )
                              .join("")}
                        </div>
                    </div>
                `
                    : ""
                }
            </div>
        `;

    return div;
  }

  // Drag and drop handlers
  handleDragOver(e) {
    e.preventDefault();
  }

  handleDragEnter(e) {
    e.preventDefault();
    const target = e.target.hasAttribute("data-section")
      ? e.target
      : e.target.closest("[data-section]");
    if (target) {
      target.classList.add("drag-over");
    }
  }

  handleDragLeave(e) {
    const target = e.target.hasAttribute("data-section")
      ? e.target
      : e.target.closest("[data-section]");
    if (target) {
      target.classList.remove("drag-over");
    }
  }

  async handleDrop(e) {
    e.preventDefault();
    const taskId = e.dataTransfer.getData("text/plain");
    const target = e.target.hasAttribute("data-section")
      ? e.target
      : e.target.closest("[data-section]");
    const newSection = target ? target.dataset.section : null;

    if (taskId && newSection) {
      target.classList.remove("drag-over");
      await this.moveTask(taskId, newSection);
    }
  }

  async moveTask(taskId, newSection) {
    try {
      const response = await TasksAPI.move(taskId, { section: newSection });
      if (response.ok) {
        await this.tm.loadTasks();
      } else {
        console.error("Failed to move task");
      }
    } catch (error) {
      console.error("Error moving task:", error);
    }
  }

  bindEvents() {
    // Drag event listeners for board columns and list drop zones
    document.addEventListener("dragover", (e) => {
      if (
        e.target.hasAttribute("data-section") ||
        e.target.closest("[data-section]")
      ) {
        this.handleDragOver(e);
      }
    });

    document.addEventListener("drop", (e) => {
      if (
        e.target.hasAttribute("data-section") ||
        e.target.closest("[data-section]")
      ) {
        this.handleDrop(e);
      }
    });

    document.addEventListener("dragenter", (e) => {
      if (
        e.target.hasAttribute("data-section") ||
        e.target.closest("[data-section]")
      ) {
        this.handleDragEnter(e);
      }
    });

    document.addEventListener("dragleave", (e) => {
      if (
        e.target.hasAttribute("data-section") ||
        e.target.closest("[data-section]")
      ) {
        this.handleDragLeave(e);
      }
    });

    // Drag start/end listeners for task cards and list items
    document.addEventListener("dragstart", (e) => {
      if (
        e.target.classList.contains("task-card") ||
        e.target.classList.contains("task-list-item")
      ) {
        e.target.classList.add("dragging");
        e.dataTransfer.setData("text/plain", e.target.dataset.taskId);
      }
    });

    document.addEventListener("dragend", (e) => {
      if (
        e.target.classList.contains("task-card") ||
        e.target.classList.contains("task-list-item")
      ) {
        e.target.classList.remove("dragging");
        // Remove drag-over class from all elements
        document
          .querySelectorAll(".drag-over")
          .forEach((el) => el.classList.remove("drag-over"));
      }
    });
  }
}
