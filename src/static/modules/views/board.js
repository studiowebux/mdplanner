// Board View Module
import { TAG_CLASSES } from "../constants.js";
import {
  formatDate,
  getPriorityBadgeClasses,
  getPriorityText,
} from "../utils.js";
import { TasksAPI } from "../api.js";

/**
 * Kanban board view with drag-drop between sections
 * Pattern: Observer - TaskManager notifies views of state changes
 */
export class BoardView {
  /** @param {TaskManager} taskManager */
  constructor(taskManager) {
    this.tm = taskManager;
    this.eventsBound = false;
    this.draggedTaskId = null;
    this.draggedFromSection = null;
    this.draggedFromIndex = null;
  }

  getPersonName(personId) {
    return this.tm.getPersonName(personId);
  }

  render() {
    const sections = this.tm.sections || [];
    const container = document.getElementById("boardContainer");

    // Show no results message when search is active but no tasks match
    if (this.tm.searchQuery && this.tm.filteredTasks.length === 0) {
      container.className = "flex items-center justify-center h-64";
      container.innerHTML = `
        <div class="text-center text-muted">
          <svg class="w-12 h-12 mx-auto mb-4 text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
        '<div class="text-center text-muted">No sections found. Please add sections to your markdown board with "## Section Name".</div>';
      return;
    }

    // Use flex with horizontal scroll, items-stretch ensures equal column heights
    container.className = "flex gap-6 overflow-x-auto pb-4 items-stretch";
    container.innerHTML = "";

    sections.forEach((section) => {
      const tasksToRender = this.tm.getTasksToRender();
      const sectionTasks = tasksToRender.filter(
        (task) => task.section === section && !task.parentId,
      );

      // Column uses flex-col so task container can stretch to fill height
      const column = document.createElement("div");
      column.className =
        "bg-primary rounded-lg shadow flex-shrink-0 w-80 flex flex-col";
      column.innerHTML = `
                <div class="px-4 py-3 border-b border-default">
                    <h3 class="text-sm font-medium text-primary">${section}</h3>
                    <p class="text-xs text-muted mt-1">${sectionTasks.length} tasks</p>
                </div>
                <div class="p-4 min-h-48 flex-1 flex flex-col" data-section="${section}">
                </div>
            `;

      const tasksContainer = column.querySelector("[data-section]");

      // Add drop zone before first card
      tasksContainer.appendChild(this.createDropZone(section, 0, false));

      sectionTasks.forEach((task, index) => {
        const taskCard = this.createTaskElement(task);
        tasksContainer.appendChild(taskCard);
        // Add drop zone after each card (last one should expand)
        const isLast = index === sectionTasks.length - 1;
        tasksContainer.appendChild(
          this.createDropZone(section, index + 1, isLast),
        );
      });

      // If no tasks, make the single drop zone expandable
      if (sectionTasks.length === 0) {
        const existingZone = tasksContainer.querySelector(".drop-zone");
        if (existingZone) {
          existingZone.classList.add("drop-zone-expand");
          existingZone.style.flex = "1";
          existingZone.style.minHeight = "48px";
        }
      }

      container.appendChild(column);
    });
  }

  createDropZone(section, position, expandable = false) {
    const zone = document.createElement("div");
    zone.className = expandable ? "drop-zone drop-zone-expand" : "drop-zone";
    zone.dataset.section = section;
    zone.dataset.position = position;
    // Hidden by default, shown when dragging
    // Last zone in each column expands to fill remaining space
    zone.style.cssText = `
      min-height: 8px;
      border-radius: 4px;
      transition: all 0.15s ease;
      flex-shrink: 0;
    `;
    if (expandable) {
      zone.style.flex = "1";
      zone.style.minHeight = "48px";
    }
    return zone;
  }

  createTaskElement(task) {
    const config = task.config || {};
    const sections = this.tm.sections || [];
    const div = document.createElement("div");
    div.className =
      "task-card bg-primary border border-default rounded-lg p-3 cursor-move my-1";
    div.draggable = true;
    div.dataset.taskId = task.id;

    const priorityBadgeClasses = getPriorityBadgeClasses(config.priority);
    const priorityText = getPriorityText(config.priority);

    div.innerHTML = `
            <div class="flex items-start justify-between mb-2">
                <h4 class="${
      task.completed
        ? "line-through text-muted"
        : "text-primary"
    } font-medium text-sm">
                    ${task.title}
                </h4>
                <div class="flex space-x-1">
                    <button onclick="taskManager.enterFocusMode('${task.id}')"
                            class="focus-task-btn text-muted hover:text-secondary transition-colors" title="Focus Mode">
                        <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path>
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path>
                        </svg>
                    </button>
                    <button onclick="taskManager.addSubtask('${task.id}')"
                            class="text-muted hover:text-secondary transition-colors" title="Add Subtask">
                        <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path>
                        </svg>
                    </button>
                    <button onclick="taskManager.copyTaskLink('${task.id}')"
                            class="text-muted hover:text-secondary transition-colors" title="Copy Link">
                        <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"></path>
                        </svg>
                    </button>
                    <button onclick="taskManager.editTask('${task.id}')"
                            class="text-muted hover:text-secondary transition-colors" title="Edit">
                        <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path>
                        </svg>
                    </button>
                    <button onclick="taskManager.deleteTask('${task.id}')"
                            class="text-muted hover:text-secondary transition-colors" title="Delete">
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
                           class="rounded border-strong text-primary focus:ring-1 text-xs">
                    <span class="text-xs text-muted">Complete</span>
                </div>

                <div class="flex flex-wrap gap-1">
                    ${
      config.priority
        ? `<span class="inline-block px-2 py-0.5 text-xs font-medium rounded ${priorityBadgeClasses}">${priorityText}</span>`
        : ""
    }
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

                <div class="text-xs font-mono text-muted">#${task.id}</div>
                ${
      config.assignee
        ? `<div class="text-xs text-muted flex items-center gap-1"><svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path></svg> ${this.getPersonName(config.assignee)}</div>`
        : ""
    }
                ${
      config.due_date
        ? `<div class="text-xs text-muted flex items-center gap-1"><svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg> ${
          formatDate(config.due_date)
        }</div>`
        : ""
    }
                ${
      config.effort
        ? `<div class="text-xs text-muted flex items-center gap-1"><svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg> ${config.effort}d</div>`
        : ""
    }
                ${
      config.milestone
        ? `<div class="text-xs text-muted flex items-center gap-1"><svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 21v-4m0 0V5a2 2 0 012-2h6.5l1 1H21l-3 6 3 6h-8.5l-1-1H5a2 2 0 00-2 2zm9-13.5V9"></path></svg> ${config.milestone}</div>`
        : ""
    }
                ${
      config.project
        ? `<div class="text-xs text-muted flex items-center gap-1"><svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 7h18M3 12h18M3 17h18"></path></svg> ${config.project}</div>`
        : ""
    }
                ${
      config.blocked_by && config.blocked_by.length > 0
        ? `<div class="text-xs text-muted flex items-center gap-1"><svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"></path></svg> ${
          config.blocked_by.join(", ")
        }</div>`
        : ""
    }

                ${
      sections.length > 1
        ? `<div class="mt-2">
                    <select class="task-section-select text-xs text-muted border border-default rounded px-1 py-0.5 bg-primary w-full"
                            title="Move to section"
                            onchange="(function(el){if(el.value)taskManager.boardView.moveTask('${task.id}',el.value);el.value=''})(this)">
                      <option value="">Move to...</option>
                      ${sections.filter((s) => s !== task.section).map((s) => `<option value="${s}">${s}</option>`).join("")}
                    </select>
                  </div>`
        : ""
    }

                ${
      task.children && task.children.length > 0
        ? `
                    <div class="mt-3 pt-2 border-t border-default">
                        <div class="text-xs text-muted mb-2 flex items-center gap-1"><svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"></path></svg> Subtasks (${task.children.length})</div>
                        <div class="space-y-1">
                            ${
          task.children
            .map(
              (child) => `
                                <div class="flex items-center space-x-2 text-xs">
                                    <input type="checkbox" ${
                child.completed ? "checked" : ""
              }
                                           onchange="taskManager.toggleTask('${child.id}')"
                                           class="rounded border-strong text-primary focus:ring-1" style="transform: scale(0.8);">
                                    <span class="${
                child.completed
                  ? "line-through text-muted"
                  : "text-secondary"
              }">${child.title}</span>
                                </div>
                            `,
            )
            .join("")
        }
                        </div>
                    </div>
                `
        : ""
    }
            </div>
        `;

    return div;
  }

  showDropZones() {
    document.querySelectorAll(".drop-zone").forEach((zone) => {
      const isExpandable = zone.classList.contains("drop-zone-expand");
      zone.style.background = "rgba(59, 130, 246, 0.1)";
      zone.style.border = "2px dashed #3b82f6";
      zone.style.minHeight = isExpandable ? "48px" : "32px";
      zone.style.margin = "4px 0";
    });
  }

  hideDropZones() {
    document.querySelectorAll(".drop-zone").forEach((zone) => {
      const isExpandable = zone.classList.contains("drop-zone-expand");
      zone.style.background = "transparent";
      zone.style.border = "none";
      zone.style.minHeight = isExpandable ? "48px" : "8px";
      zone.style.margin = "0";
    });
  }

  highlightDropZone(zone) {
    // Reset all zones to default drag state
    document.querySelectorAll(".drop-zone").forEach((z) => {
      z.style.background = "rgba(59, 130, 246, 0.1)";
      z.style.border = "2px dashed #3b82f6";
    });
    // Highlight active zone
    if (zone) {
      zone.style.background = "#3b82f6";
      zone.style.border = "2px solid #3b82f6";
    }
  }

  async moveTask(taskId, newSection, position = null) {
    try {
      const payload = { section: newSection };
      if (position !== null) {
        payload.position = position;
      }
      const response = await TasksAPI.move(taskId, payload);
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
    // Guard: prevent binding events multiple times
    if (this.eventsBound) return;
    this.eventsBound = true;

    // Drag start - show all drop zones and track source info
    document.addEventListener("dragstart", (e) => {
      if (
        e.target.classList.contains("task-card") ||
        e.target.classList.contains("task-list-item")
      ) {
        e.target.classList.add("dragging");
        e.target.style.opacity = "0.5";
        e.dataTransfer.setData("text/plain", e.target.dataset.taskId);
        e.dataTransfer.effectAllowed = "move";

        // Track where we're dragging from
        this.draggedTaskId = e.target.dataset.taskId;
        const container = e.target.closest("[data-section]");
        if (container) {
          this.draggedFromSection = container.dataset.section;
          // Find the index of this card among its siblings
          const cards = Array.from(container.querySelectorAll(".task-card"));
          this.draggedFromIndex = cards.indexOf(e.target);
        }

        // Delay to allow drag image to be captured
        setTimeout(() => this.showDropZones(), 0);
      }
    });

    // Drag end - hide all drop zones and clear tracking
    document.addEventListener("dragend", (e) => {
      if (
        e.target.classList.contains("task-card") ||
        e.target.classList.contains("task-list-item")
      ) {
        e.target.classList.remove("dragging");
        e.target.style.opacity = "1";
        this.hideDropZones();
        this.draggedTaskId = null;
        this.draggedFromSection = null;
        this.draggedFromIndex = null;
      }
    });

    // Drag over drop zone - highlight it
    document.addEventListener("dragover", (e) => {
      const dropZone = e.target.closest(".drop-zone");
      if (dropZone) {
        e.preventDefault();
        e.dataTransfer.dropEffect = "move";
        this.highlightDropZone(dropZone);
      }
    });

    // Drag leave drop zone
    document.addEventListener("dragleave", (e) => {
      const dropZone = e.target.closest(".drop-zone");
      if (dropZone && !dropZone.contains(e.relatedTarget)) {
        dropZone.style.background = "rgba(59, 130, 246, 0.1)";
        dropZone.style.border = "2px dashed #3b82f6";
      }
    });

    // Drop on zone
    document.addEventListener("drop", (e) => {
      const dropZone = e.target.closest(".drop-zone");
      if (dropZone) {
        e.preventDefault();
        e.stopPropagation();

        const taskId = e.dataTransfer.getData("text/plain");
        const targetSection = dropZone.dataset.section;
        const zonePosition = parseInt(dropZone.dataset.position, 10);
        let position = zonePosition;

        // For same-section moves: adjust position because backend filters out dragged card
        const isSameSection = this.draggedFromSection === targetSection;

        if (
          isSameSection && this.draggedFromIndex !== null &&
          position > this.draggedFromIndex
        ) {
          position = position - 1;
        }

        this.hideDropZones();

        if (taskId && targetSection !== undefined && !isNaN(position)) {
          this.moveTask(taskId, targetSection, position);
        }

        this.draggedTaskId = null;
        this.draggedFromSection = null;
        this.draggedFromIndex = null;
      }
    });

    // Touch drag support for mobile
    this.bindTouchDrag();
  }

  /**
   * Touch-based drag for task cards on mobile.
   * Creates a visual clone and detects drop zones on touchend.
   */
  bindTouchDrag() {
    let touchCard = null;
    let clone = null;
    let touchStartY = 0;
    let touchStartX = 0;
    let dragActive = false;
    let longPressTimer = null;
    const LONG_PRESS_MS = 400;
    const SCROLL_CANCEL_PX = 8;

    const cancelLongPress = () => {
      if (longPressTimer) {
        clearTimeout(longPressTimer);
        longPressTimer = null;
      }
    };

    const activateDrag = () => {
      if (!touchCard || dragActive) return;
      dragActive = true;

      this.draggedTaskId = touchCard.dataset.taskId;
      const container = touchCard.closest("[data-section]");
      if (container) {
        this.draggedFromSection = container.dataset.section;
        const cards = Array.from(container.querySelectorAll(".task-card"));
        this.draggedFromIndex = cards.indexOf(touchCard);
      }

      this.showDropZones();
      touchCard.style.opacity = "0.5";

      clone = touchCard.cloneNode(true);
      clone.style.position = "fixed";
      clone.style.zIndex = "9999";
      clone.style.pointerEvents = "none";
      clone.style.opacity = "0.8";
      clone.style.width = touchCard.offsetWidth + "px";
      clone.style.transform = "rotate(3deg)";
      document.body.appendChild(clone);
    };

    document.addEventListener("touchstart", (e) => {
      const card = e.target.closest(".task-card, .task-list-item");
      if (!card || !card.dataset.taskId) return;

      touchCard = card;
      const touch = e.touches[0];
      touchStartX = touch.clientX;
      touchStartY = touch.clientY;
      dragActive = false;

      // Long-press activates drag so normal scroll is not blocked
      longPressTimer = setTimeout(activateDrag, LONG_PRESS_MS);
    }, { passive: true });

    document.addEventListener("touchmove", (e) => {
      if (!touchCard) return;

      const touch = e.touches[0];
      const dx = touch.clientX - touchStartX;
      const dy = touch.clientY - touchStartY;

      // Cancel long-press if the finger moved — user is scrolling
      if (!dragActive && Math.abs(dx) + Math.abs(dy) > SCROLL_CANCEL_PX) {
        cancelLongPress();
        touchCard = null;
        return;
      }

      if (!dragActive) return;

      e.preventDefault();
      clone.style.left = (touch.clientX - 40) + "px";
      clone.style.top = (touch.clientY - 20) + "px";

      // Highlight drop zone under finger
      const elemBelow = document.elementFromPoint(touch.clientX, touch.clientY);
      const dropZone = elemBelow?.closest(".drop-zone");
      document.querySelectorAll(".drop-zone").forEach((dz) => {
        if (dz === dropZone) {
          this.highlightDropZone(dz);
        } else {
          dz.style.background = "rgba(59, 130, 246, 0.1)";
          dz.style.border = "2px dashed #3b82f6";
        }
      });
    }, { passive: false });

    document.addEventListener("touchend", (e) => {
      cancelLongPress();
      if (!touchCard || !dragActive) {
        touchCard = null;
        return;
      }

      // Find drop zone under last touch position
      const touch = e.changedTouches[0];
      if (clone) {
        clone.style.display = "none";
      }
      const elemBelow = document.elementFromPoint(touch.clientX, touch.clientY);
      const dropZone = elemBelow?.closest(".drop-zone");

      if (clone) {
        clone.remove();
        clone = null;
      }
      touchCard.style.opacity = "1";
      this.hideDropZones();

      if (dropZone && this.draggedTaskId) {
        const targetSection = dropZone.dataset.section;
        const zonePosition = parseInt(dropZone.dataset.position, 10);
        let position = zonePosition;

        const isSameSection = this.draggedFromSection === targetSection;
        if (isSameSection && this.draggedFromIndex !== null && position > this.draggedFromIndex) {
          position = position - 1;
        }

        if (targetSection !== undefined && !isNaN(position)) {
          this.moveTask(this.draggedTaskId, targetSection, position);
        }
      }

      this.draggedTaskId = null;
      this.draggedFromSection = null;
      this.draggedFromIndex = null;
      touchCard = null;
      dragActive = false;
    });
  }
}
