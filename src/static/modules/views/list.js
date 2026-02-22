// List View Module
import { TasksAPI } from "../api.js";
import { TAG_CLASSES } from "../constants.js";
import {
  formatDate,
  getPriorityBadgeClasses,
  getPriorityText,
} from "../utils.js";

/**
 * List view with filtering, sorting, and drag-drop
 */
export class ListView {
  /** @param {TaskManager} taskManager */
  constructor(taskManager) {
    this.tm = taskManager;
  }

  getPersonName(personId) {
    return this.tm.getPersonName(personId);
  }

  populateFilters() {
    const sections = this.tm.sections || [];
    const milestones = this.tm.projectConfig?.milestones || [];

    const sectionSelect = document.getElementById("filterSection");
    sectionSelect.innerHTML = '<option value="">All Sections</option>' +
      sections.map((s) => `<option value="${s}">${s}</option>`).join("");

    // Populate assignee filter from people/ registry
    const assigneeSelect = document.getElementById("filterAssignee");
    const people = Array.from(this.tm.peopleMap.values());
    assigneeSelect.innerHTML = '<option value="">All Assignees</option>' +
      people.map((p) => `<option value="${p.id}">${p.name}</option>`).join("");

    const milestoneSelect = document.getElementById("filterMilestone");
    milestoneSelect.innerHTML = '<option value="">All Milestones</option>' +
      milestones.map((m) => `<option value="${m}">${m}</option>`).join("");
  }

  applyFilters() {
    this.tm.listFilters.section =
      document.getElementById("filterSection").value;
    this.tm.listFilters.assignee =
      document.getElementById("filterAssignee").value;
    this.tm.listFilters.milestone =
      document.getElementById("filterMilestone").value;
    this.tm.listFilters.status = document.getElementById("filterStatus").value;
    this.tm.listFilters.sort = document.getElementById("sortTasks").value;

    const hasFilters = this.tm.listFilters.section ||
      this.tm.listFilters.assignee ||
      this.tm.listFilters.milestone || this.tm.listFilters.status ||
      this.tm.listFilters.sort !== "default";
    document.getElementById("clearFilters").classList.toggle(
      "hidden",
      !hasFilters,
    );

    this.render();
  }

  clearFilters() {
    document.getElementById("filterSection").value = "";
    document.getElementById("filterAssignee").value = "";
    document.getElementById("filterMilestone").value = "";
    document.getElementById("filterStatus").value = "";
    document.getElementById("sortTasks").value = "default";
    this.tm.listFilters = {
      section: "",
      assignee: "",
      milestone: "",
      status: "",
      sort: "default",
    };
    document.getElementById("clearFilters").classList.add("hidden");
    this.render();
  }

  getFilteredAndSortedTasks(tasks) {
    let result = [...tasks];

    // Apply filters
    if (this.tm.listFilters.section) {
      result = result.filter((t) => t.section === this.tm.listFilters.section);
    }
    if (this.tm.listFilters.assignee) {
      result = result.filter((t) =>
        t.config.assignee === this.tm.listFilters.assignee
      );
    }
    if (this.tm.listFilters.milestone) {
      result = result.filter((t) =>
        t.config.milestone === this.tm.listFilters.milestone
      );
    }
    if (this.tm.listFilters.status === "completed") {
      result = result.filter((t) => t.completed);
    } else if (this.tm.listFilters.status === "incomplete") {
      result = result.filter((t) => !t.completed);
    }

    // Apply sort
    if (this.tm.listFilters.sort === "due_date") {
      result.sort((a, b) => {
        const dateA = a.config.due_date
          ? new Date(a.config.due_date)
          : new Date("9999-12-31");
        const dateB = b.config.due_date
          ? new Date(b.config.due_date)
          : new Date("9999-12-31");
        return dateA - dateB;
      });
    } else if (this.tm.listFilters.sort === "priority") {
      const priorityOrder = { high: 0, medium: 1, low: 2 };
      result.sort((a, b) => {
        const pA = priorityOrder[a.config.priority] ?? 3;
        const pB = priorityOrder[b.config.priority] ?? 3;
        return pA - pB;
      });
    } else if (this.tm.listFilters.sort === "title") {
      result.sort((a, b) => a.title.localeCompare(b.title));
    }

    return result;
  }

  render() {
    const container = document.getElementById("listContainer");
    container.innerHTML = "";

    // Populate filter dropdowns
    this.populateFilters();

    // Show no results message when search is active but no tasks match
    if (this.tm.searchQuery && this.tm.filteredTasks.length === 0) {
      container.innerHTML = `
        <div class="px-6 py-8 text-center text-muted">
          <svg class="w-12 h-12 mx-auto mb-4 text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
          </svg>
          <p class="text-lg font-medium">No tasks found</p>
          <p class="text-sm mt-1">No tasks match "${this.tm.searchQuery}"</p>
        </div>`;
      return;
    }

    // Group tasks by section
    let sections = this.tm.sections || [];

    if (sections.length === 0) {
      container.innerHTML =
        '<div class="px-6 py-8 text-center text-muted">No sections found. Please add sections to your markdown board with "## Section Name".</div>';
      return;
    }

    // If section filter is active, only show that section
    if (this.tm.listFilters.section) {
      sections = sections.filter((s) => s === this.tm.listFilters.section);
    }

    const allTasks = this.getFilteredAndSortedTasks(this.tm.getTasksToRender());

    // Check if all filtered sections are empty
    const hasAnyTasks = sections.some((section) =>
      allTasks.some((task) => task.section === section && !task.parentId)
    );

    if (
      !hasAnyTasks &&
      (this.tm.listFilters.assignee || this.tm.listFilters.milestone ||
        this.tm.listFilters.status)
    ) {
      container.innerHTML = `
        <div class="px-6 py-8 text-center text-muted">
          <p class="text-lg font-medium">No tasks match filters</p>
          <button onclick="taskManager.clearListFilters()" class="mt-2 text-sm text-primary hover:underline">Clear filters</button>
        </div>`;
      return;
    }

    sections.forEach((section) => {
      const sectionTasks = allTasks.filter(
        (task) => task.section === section && !task.parentId,
      );

      // Add section separator (always show, even if empty)
      const sectionHeader = document.createElement("div");
      sectionHeader.className =
        "px-6 py-3 bg-secondary border-b border-default list-section-header";
      sectionHeader.dataset.section = section;
      sectionHeader.innerHTML = `
                <div class="flex items-center justify-between">
                    <h3 class="text-sm font-semibold text-secondary uppercase tracking-wide">${section}</h3>
                    <span class="text-xs text-muted">${sectionTasks.length} task${
        sectionTasks.length !== 1 ? "s" : ""
      }</span>
                </div>
            `;
      container.appendChild(sectionHeader);

      // Add empty state if no tasks
      if (sectionTasks.length === 0) {
        const emptyState = document.createElement("div");
        emptyState.className =
          "px-6 py-8 text-center text-muted text-sm border-b border-default list-drop-zone";
        emptyState.dataset.section = section;
        emptyState.innerHTML = `
                    <div class="border-2 border-dashed border-default rounded-lg py-6">
                        Drop tasks here or click + to add
                    </div>
                `;
        container.appendChild(emptyState);
      } else {
        // Add tasks in this section
        sectionTasks.forEach((task) => {
          const taskElement = this.createTaskElement(task);
          container.appendChild(taskElement);

          // Add children if any
          if (task.children && task.children.length > 0) {
            task.children.forEach((child) => {
              const childElement = this.createTaskElement(child, true);
              container.appendChild(childElement);
            });
          }
        });

        // Add drop zone after existing tasks
        const dropZone = document.createElement("div");
        dropZone.className =
          "px-6 py-2 text-center text-muted text-xs border-b border-default list-drop-zone";
        dropZone.dataset.section = section;
        dropZone.innerHTML = `
                    <div class="border border-dashed border-transparent rounded-lg py-2 transition-colors">
                        Drop tasks here
                    </div>
                `;
        container.appendChild(dropZone);
      }
    });
  }

  createTaskElement(task, isChild = false) {
    const config = task.config || {};
    const div = document.createElement("div");
    div.className =
      `task-list-item px-6 py-4 hover:bg-secondary ${
        isChild ? "pl-12 bg-secondary" : ""
      } cursor-move border-b border-default`;
    div.draggable = !isChild; // Only allow parent tasks to be dragged
    div.dataset.taskId = task.id;

    const priorityBadgeClasses = getPriorityBadgeClasses(config.priority);
    const priorityText = getPriorityText(config.priority);

    div.innerHTML = `
            <div class="flex items-center justify-between">
                <div class="flex items-center space-x-3">
                    <input type="checkbox" ${task.completed ? "checked" : ""}
                           onchange="taskManager.toggleTask('${task.id}')"
                           class="rounded border-strong text-primary focus:ring-1">
                    <div>
                        <div class="flex items-center space-x-2 flex-wrap gap-1">
                            <span class="${
      task.completed
        ? "line-through text-muted"
        : "text-primary"
    } font-medium">
                                ${task.title}
                            </span>
                            ${
      config.priority
        ? `<span class="px-2 py-0.5 text-xs font-medium rounded ${priorityBadgeClasses}">${priorityText}</span>`
        : ""
    }
                            ${
      config.tag
        ? config.tag.map((tag) =>
          `<span class="px-2 py-0.5 text-xs font-medium rounded border ${TAG_CLASSES}">${tag}</span>`
        ).join("")
        : ""
    }
                        </div>
                        <div class="text-sm text-muted mt-1 flex flex-wrap items-center gap-x-2 gap-y-1">
                            <span class="text-xs font-mono text-muted">#${task.id}</span>
                            ${
      config.assignee
        ? `<span class="flex items-center gap-1"><svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path></svg>${this.getPersonName(config.assignee)}</span>`
        : ""
    }
                            ${
      config.due_date
        ? `<span class="flex items-center gap-1"><svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>${
          formatDate(config.due_date)
        }</span>`
        : ""
    }
                            ${
      config.effort
        ? `<span class="flex items-center gap-1"><svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>${config.effort}d</span>`
        : ""
    }
                            ${
      config.milestone
        ? `<span class="flex items-center gap-1"><svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 21v-4m0 0V5a2 2 0 012-2h6.5l1 1H21l-3 6 3 6h-8.5l-1-1H5a2 2 0 00-2 2zm9-13.5V9"></path></svg>${config.milestone}</span>`
        : ""
    }
                            ${
      config.blocked_by && config.blocked_by.length > 0
        ? `<span class="flex items-center gap-1"><svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"></path></svg>${
          config.blocked_by.join(", ")
        }</span>`
        : ""
    }
                            <span class="text-muted">${task.section}</span>
                        </div>
                    </div>
                </div>
                <div class="flex space-x-2">
                    <button onclick="taskManager.enterFocusMode('${task.id}')"
                            class="focus-task-btn text-muted hover:text-secondary transition-colors" title="Focus Mode">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path>
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path>
                        </svg>
                    </button>
                    ${
      !isChild
        ? `
                        <button onclick="taskManager.addSubtask('${task.id}')"
                                class="text-muted hover:text-secondary transition-colors" title="Add Subtask">
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path>
                            </svg>
                        </button>
                    `
        : ""
    }
                    ${
      task.description && task.description.length > 0
        ? `
                        <button onclick="taskManager.toggleDescription('${task.id}')"
                                class="text-muted hover:text-secondary transition-colors" title="View Description">
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                            </svg>
                        </button>
                    `
        : ""
    }
                    <button onclick="taskManager.copyTaskLink('${task.id}')"
                            class="text-muted hover:text-secondary transition-colors" title="Copy Link">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"></path>
                        </svg>
                    </button>
                    <button onclick="taskManager.editTask('${task.id}')"
                            class="text-muted hover:text-secondary transition-colors" title="Edit">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path>
                        </svg>
                    </button>
                    <button onclick="taskManager.deleteTask('${task.id}')"
                            class="text-muted hover:text-secondary transition-colors">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                        </svg>
                    </button>
                </div>
            </div>
        `;

    return div;
  }

  async moveTask(taskId, targetSection) {
    try {
      const response = await TasksAPI.move(taskId, { section: targetSection });
      if (response.ok) {
        await this.tm.loadTasks();
      } else {
        console.error("Failed to move task");
      }
    } catch (error) {
      console.error("Error moving task:", error);
    }
  }

  /** Desktop HTML5 drag-drop between list sections. */
  bindDrag() {
    // Guard: prevent binding multiple times on re-render
    if (this.dragBound) return;
    this.dragBound = true;

    document.addEventListener("dragstart", (e) => {
      const item = e.target.closest(".task-list-item");
      if (!item || !item.dataset.taskId || item.draggable === false) return;
      item.classList.add("dragging");
      e.dataTransfer.setData("text/plain", item.dataset.taskId);
      e.dataTransfer.effectAllowed = "move";
      this.draggedTaskId = item.dataset.taskId;
    });

    document.addEventListener("dragover", (e) => {
      // Must preventDefault anywhere inside the list container — restricting to
      // .list-drop-zone means dragging over task items never enables drop
      // (browser shows "no-drop" cursor and the drop event never fires).
      if (!e.target.closest("#listContainer")) return;
      e.preventDefault();
      e.dataTransfer.dropEffect = "move";

      const zone = e.target.closest(".list-drop-zone, .list-section-header");
      document.querySelectorAll(".list-drop-zone, .list-section-header")
        .forEach((z) => z.classList.toggle("drag-over", z === zone));
    });

    document.addEventListener("drop", (e) => {
      if (!e.target.closest("#listContainer") || !this.draggedTaskId) return;
      e.preventDefault();

      // Prefer explicit drop zone; fall back to task item's containing section
      const zone = e.target.closest(".list-drop-zone, .list-section-header");
      let targetSection = zone?.dataset.section;

      if (!targetSection) {
        const taskItem = e.target.closest(".task-list-item");
        const allNodes = Array.from(
          document.querySelectorAll(
            "#listContainer .list-section-header, #listContainer .task-list-item",
          ),
        );
        const idx = allNodes.indexOf(taskItem);
        for (let i = idx - 1; i >= 0; i--) {
          if (allNodes[i].classList.contains("list-section-header")) {
            targetSection = allNodes[i].dataset.section;
            break;
          }
        }
      }

      document.querySelectorAll(".list-drop-zone, .list-section-header")
        .forEach((z) => z.classList.remove("drag-over"));

      if (targetSection) {
        this.moveTask(this.draggedTaskId, targetSection);
      }
      this.draggedTaskId = null;
    });

    document.addEventListener("dragend", (e) => {
      const item = e.target.closest(".task-list-item");
      if (item) item.classList.remove("dragging");
      document.querySelectorAll(".list-drop-zone, .list-section-header")
        .forEach((z) => z.classList.remove("drag-over"));
      this.draggedTaskId = null;
    });
  }

  /** Touch drag-and-drop for mobile — mirrors board.js bindTouchDrag pattern. */
  bindTouchDrag() {
    if (this.touchBound) return;
    this.touchBound = true;

    let touchItem = null;
    let clone = null;
    let touchStartX = 0;
    let touchStartY = 0;
    let dragActive = false;

    document.addEventListener("touchstart", (e) => {
      const item = e.target.closest(".task-list-item");
      if (!item || !item.dataset.taskId || item.draggable === false) return;
      touchItem = item;
      const touch = e.touches[0];
      touchStartX = touch.clientX;
      touchStartY = touch.clientY;
      dragActive = false;
    }, { passive: true });

    document.addEventListener("touchmove", (e) => {
      if (!touchItem) return;
      const touch = e.touches[0];
      const dx = touch.clientX - touchStartX;
      const dy = touch.clientY - touchStartY;

      if (!dragActive && Math.abs(dx) + Math.abs(dy) < 10) return;

      if (!dragActive) {
        dragActive = true;
        e.preventDefault();
        this.draggedTaskId = touchItem.dataset.taskId;
        touchItem.style.opacity = "0.5";

        clone = touchItem.cloneNode(true);
        clone.style.position = "fixed";
        clone.style.zIndex = "9999";
        clone.style.pointerEvents = "none";
        clone.style.opacity = "0.8";
        clone.style.width = touchItem.offsetWidth + "px";
        clone.style.transform = "rotate(2deg)";
        document.body.appendChild(clone);
      }

      if (dragActive) {
        e.preventDefault();
        clone.style.left = (touch.clientX - 40) + "px";
        clone.style.top = (touch.clientY - 20) + "px";

        // Highlight drop zone under finger
        const elemBelow = document.elementFromPoint(
          touch.clientX,
          touch.clientY,
        );
        const activeZone = elemBelow?.closest(
          ".list-drop-zone, .list-section-header",
        );
        document.querySelectorAll(".list-drop-zone, .list-section-header")
          .forEach((z) => {
            z.classList.toggle("drag-over", z === activeZone);
          });
      }
    }, { passive: false });

    document.addEventListener("touchend", (e) => {
      if (!touchItem || !dragActive) {
        touchItem = null;
        return;
      }

      const touch = e.changedTouches[0];
      if (clone) {
        clone.style.display = "none";
      }
      const elemBelow = document.elementFromPoint(
        touch.clientX,
        touch.clientY,
      );
      const dropZone = elemBelow?.closest(
        ".list-drop-zone, .list-section-header",
      );

      if (clone) {
        clone.remove();
        clone = null;
      }
      touchItem.style.opacity = "1";
      document.querySelectorAll(".list-drop-zone, .list-section-header")
        .forEach((z) => z.classList.remove("drag-over"));

      if (dropZone?.dataset.section && this.draggedTaskId) {
        this.moveTask(this.draggedTaskId, dropZone.dataset.section);
      }

      this.draggedTaskId = null;
      touchItem = null;
      dragActive = false;
    });
  }

  bindEvents() {
    // Filter change events
    document
      .getElementById("filterSection")
      .addEventListener("change", () => this.applyFilters());
    document
      .getElementById("filterAssignee")
      .addEventListener("change", () => this.applyFilters());
    document
      .getElementById("filterMilestone")
      .addEventListener("change", () => this.applyFilters());
    document
      .getElementById("filterStatus")
      .addEventListener("change", () => this.applyFilters());
    document
      .getElementById("sortTasks")
      .addEventListener("change", () => this.applyFilters());
    document
      .getElementById("clearFilters")
      .addEventListener("click", () => this.clearFilters());

    this.bindDrag();
    this.bindTouchDrag();
  }
}
