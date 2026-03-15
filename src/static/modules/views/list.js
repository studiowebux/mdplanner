// List View Module
import { GitHubAPI, TasksAPI } from "../api.js";
import { TAG_CLASSES } from "../constants.js";
import {
  formatDate,
  getPriorityBadgeClasses,
  getPriorityText,
} from "../utils.js";
import { showToast } from "../ui/toast.js";

/**
 * List view with filtering, sorting, and drag-drop
 */
export class ListView {
  /** @param {TaskManager} taskManager */
  constructor(taskManager) {
    this.tm = taskManager;
    this._batchMode = false;
    this._selectedIds = new Set();
  }

  getPersonName(personId) {
    return this.tm.getPersonName(personId);
  }

  populateFilters() {
    // Restore persisted filters before populating dropdowns
    this._restoreFilters();

    const sections = this.tm.sections || [];
    const milestoneNames = Array.from(
      new Set((this.tm.milestones || []).map((m) => m.name).filter(Boolean)),
    ).sort();
    const f = this.tm.listFilters;

    const sectionSelect = document.getElementById("filterSection");
    sectionSelect.innerHTML = '<option value="">All Sections</option>' +
      sections.map((s) => `<option value="${s}">${s}</option>`).join("");
    sectionSelect.value = f.section || "";

    // Populate assignee filter from people/ registry
    const assigneeSelect = document.getElementById("filterAssignee");
    const people = Array.from(this.tm.peopleMap.values());
    assigneeSelect.innerHTML = '<option value="">All Assignees</option>' +
      people.map((p) => `<option value="${p.id}">${p.name}</option>`).join("");
    assigneeSelect.value = f.assignee || "";

    const milestoneSelect = document.getElementById("filterMilestone");
    milestoneSelect.innerHTML = '<option value="">All Milestones</option>' +
      milestoneNames.map((n) => `<option value="${n}">${n}</option>`).join("");
    milestoneSelect.value = f.milestone || "";

    const statusSelect = document.getElementById("filterStatus");
    if (statusSelect) statusSelect.value = f.status || "";

    const sortSelect = document.getElementById("sortTasks");
    if (sortSelect) sortSelect.value = f.sort || "default";

    // Project filter — unique project names from tasks + portfolio
    const projectSelect = document.getElementById("filterProject");
    if (projectSelect) {
      const projects = new Set();
      (this.tm.tasks || []).forEach((t) => {
        if (t.config?.project) projects.add(t.config.project);
      });
      (this.tm.portfolio || []).forEach((p) => { if (p.name) projects.add(p.name); });
      projectSelect.innerHTML = '<option value="">All Projects</option>' +
        Array.from(projects).sort().map((p) =>
          `<option value="${p}">${p}</option>`
        ).join("");
      projectSelect.value = f.project || "";
    }

    const hasFilters = f.section || f.assignee || f.milestone || f.project ||
      f.status || f.sort !== "default";
    document.getElementById("clearFilters")?.classList.toggle("hidden", !hasFilters);
  }

  _saveFilters() {
    try {
      localStorage.setItem("taskListFilters", JSON.stringify(this.tm.listFilters));
    } catch { /* ignore */ }
  }

  _restoreFilters() {
    try {
      const saved = JSON.parse(localStorage.getItem("taskListFilters") || "{}");
      if (saved && typeof saved === "object") {
        this.tm.listFilters = {
          section: saved.section || "",
          assignee: saved.assignee || "",
          milestone: saved.milestone || "",
          project: saved.project || "",
          status: saved.status || "",
          sort: saved.sort || "default",
        };
      }
    } catch { /* ignore */ }
  }

  applyFilters() {
    this.tm.listFilters.section =
      document.getElementById("filterSection").value;
    this.tm.listFilters.assignee =
      document.getElementById("filterAssignee").value;
    this.tm.listFilters.milestone =
      document.getElementById("filterMilestone").value;
    this.tm.listFilters.status = document.getElementById("filterStatus").value;
    this.tm.listFilters.project =
      document.getElementById("filterProject")?.value || "";
    this.tm.listFilters.sort = document.getElementById("sortTasks").value;

    const hasFilters = this.tm.listFilters.section ||
      this.tm.listFilters.assignee ||
      this.tm.listFilters.milestone || this.tm.listFilters.project ||
      this.tm.listFilters.status ||
      this.tm.listFilters.sort !== "default";
    document.getElementById("clearFilters").classList.toggle(
      "hidden",
      !hasFilters,
    );

    this._saveFilters();
    this.render();
  }

  clearFilters() {
    document.getElementById("filterSection").value = "";
    document.getElementById("filterAssignee").value = "";
    document.getElementById("filterMilestone").value = "";
    document.getElementById("filterStatus").value = "";
    const fp = document.getElementById("filterProject");
    if (fp) fp.value = "";
    document.getElementById("sortTasks").value = "default";
    this.tm.listFilters = {
      section: "",
      assignee: "",
      milestone: "",
      project: "",
      status: "",
      sort: "default",
    };
    document.getElementById("clearFilters").classList.add("hidden");
    this._saveFilters();
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
    if (this.tm.listFilters.project) {
      result = result.filter((t) =>
        t.config.project === this.tm.listFilters.project
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
    const savedScrollY = window.scrollY;
    // Pin minHeight to current height before clearing — prevents layout collapse
    // that causes scroll jumps and offset click events during re-render.
    container.style.minHeight = container.offsetHeight + "px";
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

      // Non-sticky scroll anchor for hash navigation
      const anchor = document.createElement("div");
      anchor.className = "section-scroll-anchor";
      anchor.id = `section-${section.toLowerCase().replace(/\s+/g, "-")}`;
      container.appendChild(anchor);

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

    // Build section jump bar
    this.renderSectionJumpBar(sections, allTasks);

    // Lazy-load live GitHub issue/PR states after render
    if (this.tm.githubConfigured) this._loadGitHubBadgeStates();

    // Restore scroll position so re-renders after sidenav close/save don't jump to top.
    // Release the minHeight lock and scroll atomically in the same rAF so the browser
    // never sees a collapsed container.
    requestAnimationFrame(() => {
      container.style.minHeight = "";
      window.scrollTo({ top: savedScrollY, behavior: "instant" });
      this.setupScrollSpy();
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
                    <input type="checkbox" class="batch-checkbox"
                           onchange="taskManager.listView.toggleTaskSelection('${task.id}')" />
                    <div>
                        <div class="flex items-center space-x-2 flex-wrap gap-1">
                            <span class="task-title ${
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
      config.tags
        ? config.tags.map((tag) =>
          `<span class="px-2 py-0.5 text-xs font-medium rounded border ${TAG_CLASSES}">${tag}</span>`
        ).join("")
        : ""
    }
                        </div>
                        <div class="task-meta">
                            <span class="text-xs font-mono text-muted">#${task.id}</span>
                            ${config.comments?.length > 0
                              ? `<button onclick="taskManager.editTaskWithComments('${task.id}')" class="flex items-center gap-0.5 text-xs text-muted hover:text-secondary" title="${config.comments.length} comment${config.comments.length !== 1 ? "s" : ""}"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z"/></svg>${config.comments.length}</button>`
                              : ""}
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
                            ${
      config.project
        ? `<span class="flex items-center gap-1"><svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"></path></svg>${config.project}</span>`
        : ""
    }
                            ${
      (config.githubIssue || config.githubPR)
        ? `<span class="github-badges">
              ${config.githubIssue
                ? config.githubRepo
                  ? `<a href="https://github.com/${config.githubRepo}/issues/${config.githubIssue}" target="_blank" rel="noopener noreferrer" class="github-issue-badge" data-gh-issue="${config.githubIssue}" data-gh-repo="${config.githubRepo}">#${config.githubIssue}</a>`
                  : `<span class="github-issue-badge" data-gh-issue="${config.githubIssue}">Issue #${config.githubIssue}</span>`
                : ""}
              ${config.githubPR
                ? config.githubRepo
                  ? `<a href="https://github.com/${config.githubRepo}/pull/${config.githubPR}" target="_blank" rel="noopener noreferrer" class="github-pr-badge" data-gh-pr="${config.githubPR}" data-gh-repo="${config.githubRepo}">PR #${config.githubPR}</a>`
                  : `<span class="github-pr-badge" data-gh-pr="${config.githubPR}">PR #${config.githubPR}</span>`
                : ""}
           </span>`
        : ""
    }
                            <span class="text-muted">${task.section}</span>
                        </div>
                    </div>
                </div>
                <div class="flex items-center space-x-2">
                    ${
      (() => {
        const sections = this.tm.sections || [];
        const others = sections.filter((s) => s !== task.section);
        if (others.length === 0) return "";
        return `<select class="task-section-select text-xs text-muted border border-default rounded px-1 bg-primary"
                        title="Move to section"
                        onchange="(function(el){if(el.value)taskManager.listView.moveTask('${task.id}',el.value);el.value=''})(this)">
                  <option value="">Move to…</option>
                  ${others.map((s) => `<option value="${s}">${s}</option>`).join("")}
                </select>`;
      })()
    }
                    ${
      (() => {
        const people = Array.from(this.tm.peopleMap.values());
        if (people.length === 0) return "";
        const currentAssignee = config.assignee || "";
        return `<select class="text-xs text-muted border border-default rounded px-1 bg-primary"
                        title="Assign person"
                        onchange="(function(el){taskManager.quickUpdate('${task.id}','assignee',el.value)})(this)">
                  <option value="">Assign…</option>
                  ${people.map((p) => `<option value="${p.id}"${currentAssignee === p.id ? " selected" : ""}>${p.name}</option>`).join("")}
                </select>`;
      })()
    }
                    ${
      (() => {
        const portfolio = this.tm.portfolio || [];
        if (portfolio.length === 0) return "";
        const currentProject = config.project || "";
        return `<select class="text-xs text-muted border border-default rounded px-1 bg-primary"
                        title="Assign project"
                        onchange="(function(el){taskManager.quickUpdate('${task.id}','project',el.value)})(this)">
                  <option value="">Project…</option>
                  ${portfolio.map((p) => `<option value="${p.name}"${currentProject === p.name ? " selected" : ""}>${p.name}</option>`).join("")}
                </select>`;
      })()
    }
                    <button onclick="taskManager.toggleTask('${task.id}')"
                            data-complete-btn="${task.id}"
                            class="task-complete-btn ${task.completed ? "task-complete-btn--done" : ""}"
                            title="${task.completed ? "Reopen task" : "Mark complete"}">
                        ${task.completed ? "Reopen" : "Complete"}
                    </button>
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

  /** Build clickable section pills in the jump bar. */
  renderSectionJumpBar(sections, allTasks) {
    const bar = document.getElementById("sectionJumpBar");
    const listView = document.getElementById("listView");
    if (!bar) return;
    bar.innerHTML = "";

    // Hide when section filter narrows to one section
    if (this.tm.listFilters.section) {
      listView?.classList.remove("jump-bar-active");
      return;
    }

    sections.forEach((section) => {
      const count = allTasks.filter(
        (t) => t.section === section && !t.parentId,
      ).length;
      const anchorId = `section-${section.toLowerCase().replace(/\s+/g, "-")}`;
      const pill = document.createElement("button");
      pill.type = "button";
      pill.className = "section-jump-pill";
      pill.dataset.section = section;
      pill.textContent = `${section} (${count})`;
      pill.addEventListener("click", () => {
        document.getElementById(anchorId)?.scrollIntoView({ behavior: "smooth", block: "start" });
      });
      bar.appendChild(pill);
    });

    listView?.classList.toggle("jump-bar-active", bar.children.length > 0);
  }

  /** IntersectionObserver scroll-spy — highlights the pill for the visible section. */
  setupScrollSpy() {
    if (this._scrollSpyObserver) this._scrollSpyObserver.disconnect();

    const headers = document.querySelectorAll(
      "#listContainer .list-section-header",
    );
    if (headers.length === 0) return;

    this._scrollSpyObserver = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);

        if (visible.length === 0) return;

        const topSection = visible[0].target.dataset.section;
        document.querySelectorAll(".section-jump-pill").forEach((pill) => {
          pill.classList.toggle("active", pill.dataset.section === topSection);
        });
      },
      { threshold: 0, rootMargin: "-20% 0px -70% 0px" },
    );

    headers.forEach((h) => this._scrollSpyObserver.observe(h));
  }

  /**
   * Fetch live GitHub issue/PR states and update badge classes.
   * Mirrors board.js _loadGitHubBadgeStates — runs non-blocking after render.
   */
  async _loadGitHubBadgeStates() {
    if (!this.tm.githubConfigured) return;

    const issueBadges = document.querySelectorAll("[data-gh-issue][data-gh-repo]");
    const prBadges = document.querySelectorAll("[data-gh-pr][data-gh-repo]");

    for (const el of issueBadges) {
      const issueNum = parseInt(el.dataset.ghIssue, 10);
      const repo = el.dataset.ghRepo;
      if (!repo || !repo.includes("/")) continue;
      const [owner, repoName] = repo.split("/");
      try {
        const issue = await GitHubAPI.getIssue(owner, repoName, issueNum);
        el.className = `github-issue-badge github-issue-${issue.state}`;
        el.title = issue.title;
      } catch {
        // Silently skip — badge stays neutral
      }
    }

    for (const el of prBadges) {
      const prNum = parseInt(el.dataset.ghPr, 10);
      const repo = el.dataset.ghRepo;
      if (!repo || !repo.includes("/")) continue;
      const [owner, repoName] = repo.split("/");
      try {
        const pr = await GitHubAPI.getPR(owner, repoName, prNum);
        const stateClass = pr.merged
          ? "github-pr-merged"
          : pr.state === "open"
          ? "github-pr-open"
          : "github-pr-closed";
        el.className = `github-pr-badge ${stateClass}`;
        el.title = pr.title;
      } catch {
        // Silently skip — badge stays neutral
      }
    }
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
    let longPressTimer = null;
    const LONG_PRESS_MS = 400;
    const SCROLL_CANCEL_PX = 10;

    const cancelLongPress = () => {
      if (longPressTimer) {
        clearTimeout(longPressTimer);
        longPressTimer = null;
      }
    };

    const activateDrag = () => {
      if (!touchItem || dragActive) return;
      dragActive = true;
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
    };

    document.addEventListener("touchstart", (e) => {
      const item = e.target.closest(".task-list-item");
      if (!item || !item.dataset.taskId || item.draggable === false) return;
      touchItem = item;
      const touch = e.touches[0];
      touchStartX = touch.clientX;
      touchStartY = touch.clientY;
      dragActive = false;

      longPressTimer = setTimeout(activateDrag, LONG_PRESS_MS);
    }, { passive: true });

    document.addEventListener("touchmove", (e) => {
      if (!touchItem) return;
      const touch = e.touches[0];
      const dx = touch.clientX - touchStartX;
      const dy = touch.clientY - touchStartY;

      // Cancel long-press if movement exceeds threshold or is primarily vertical (scrolling)
      if (
        !dragActive &&
        (Math.abs(dx) + Math.abs(dy) > SCROLL_CANCEL_PX ||
          Math.abs(dy) > Math.abs(dx))
      ) {
        cancelLongPress();
        touchItem = null;
        return;
      }

      if (!dragActive) return;

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
    }, { passive: false });

    document.addEventListener("touchend", (e) => {
      cancelLongPress();
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

  // ── Batch Select ──────────────────────────────────────────────────────────

  toggleBatchMode() {
    if (this._batchMode) {
      this.exitBatchMode();
    } else {
      this.enterBatchMode();
    }
  }

  enterBatchMode() {
    this._batchMode = true;
    this._selectedIds = new Set();
    document.getElementById("listContainer")?.classList.add("batch-mode");
    document.getElementById("batchSelectBtn")?.classList.add("active");
    // Disable dragging so clicks register as selection, not drag-start
    document.querySelectorAll('.task-list-item[draggable="true"]').forEach(
      (el) => {
        el.dataset.wasDraggable = "true";
        el.draggable = false;
      },
    );
    this._updateBatchBar();
  }

  exitBatchMode() {
    this._batchMode = false;
    this._selectedIds = new Set();
    document.getElementById("listContainer")?.classList.remove("batch-mode");
    document.querySelectorAll(".batch-selected").forEach((el) =>
      el.classList.remove("batch-selected")
    );
    document.querySelectorAll(".batch-checkbox").forEach((cb) => {
      cb.checked = false;
    });
    // Restore dragging on items that were draggable before batch mode
    document.querySelectorAll(".task-list-item[data-was-draggable]").forEach(
      (el) => {
        el.draggable = true;
        delete el.dataset.wasDraggable;
      },
    );
    document.getElementById("batchSelectBtn")?.classList.remove("active");
    this._updateBatchBar();
    this.closeBatchPanel();
  }

  toggleTaskSelection(taskId) {
    if (!this._batchMode) return;
    if (this._selectedIds.has(taskId)) {
      this._selectedIds.delete(taskId);
    } else {
      this._selectedIds.add(taskId);
    }
    const row = document.querySelector(`[data-task-id="${taskId}"]`);
    const selected = this._selectedIds.has(taskId);
    row?.classList.toggle("batch-selected", selected);
    const cb = row?.querySelector(".batch-checkbox");
    if (cb) cb.checked = selected;
    this._updateBatchBar();
  }

  _updateBatchBar() {
    const bar = document.getElementById("batchActionBar");
    if (!bar) return;
    const count = this._selectedIds.size;
    if (!this._batchMode || count === 0) {
      bar.classList.add("hidden");
      return;
    }
    bar.classList.remove("hidden");
    const countEl = document.getElementById("batchSelectedCount");
    if (countEl) {
      countEl.textContent = `${count} task${count !== 1 ? "s" : ""} selected`;
    }
  }

  openBatchPanel() {
    const panel = document.getElementById("batchEditPanel");
    if (!panel) return;

    const sections = this.tm.sections || [];
    const sectionSel = document.getElementById("batchSection");
    sectionSel.innerHTML = '<option value="">Leave unchanged</option>' +
      sections.map((s) => `<option value="${s}">${s}</option>`).join("");

    const people = Array.from(this.tm.peopleMap.values());
    const assigneeSel = document.getElementById("batchAssignee");
    assigneeSel.innerHTML = '<option value="">Leave unchanged</option>' +
      people.map((p) => `<option value="${p.id}">${p.name}</option>`).join("");

    const milestoneNames = Array.from(
      new Set((this.tm.milestones || []).map((m) => m.name).filter(Boolean)),
    ).sort();
    const milestoneSel = document.getElementById("batchMilestone");
    milestoneSel.innerHTML = '<option value="">Leave unchanged</option>' +
      milestoneNames.map((n) => `<option value="${n}">${n}</option>`).join("");

    document.getElementById("batchPriority").value = "";
    document.getElementById("batchTags").value = "";
    const completedCb = document.getElementById("batchCompleted");
    if (completedCb) completedCb.checked = false;

    panel.classList.remove("hidden");
  }

  closeBatchPanel() {
    const panel = document.getElementById("batchEditPanel");
    if (!panel) return;
    panel.classList.add("hidden");
  }

  async applyBatchUpdate() {
    const section = document.getElementById("batchSection")?.value || "";
    const assignee = document.getElementById("batchAssignee")?.value || "";
    const milestone = document.getElementById("batchMilestone")?.value || "";
    const priorityRaw = document.getElementById("batchPriority")?.value || "";
    const priority = priorityRaw ? parseInt(priorityRaw, 10) : null;
    const tagsRaw = (document.getElementById("batchTags")?.value || "").trim();
    const tags = tagsRaw
      ? tagsRaw.split(",").map((t) => t.trim()).filter(Boolean)
      : null;
    const completedCb = document.getElementById("batchCompleted");
    const markCompleted = completedCb?.checked ?? false;

    const update = {};
    if (section) update.section = section;
    if (assignee) update.assignee = assignee;
    if (milestone) update.milestone = milestone;
    if (priority) update.priority = priority;
    if (tags && tags.length > 0) update.tags = tags;
    if (markCompleted) {
      update.completed = true;
      if (!update.section) update.section = "Done";
    }

    if (Object.keys(update).length === 0) {
      this.closeBatchPanel();
      return;
    }

    const allUpdates = Array.from(this._selectedIds).map((id) => ({
      id,
      ...update,
    }));

    // API batch limit is 50 — chunk to avoid 400 errors
    const BATCH_SIZE = 50;
    let totalUpdated = 0;
    let totalFailed = 0;

    try {
      for (let i = 0; i < allUpdates.length; i += BATCH_SIZE) {
        const chunk = allUpdates.slice(i, i + BATCH_SIZE);
        const response = await TasksAPI.batchUpdate(chunk);
        if (!response.ok) {
          const errBody = await response.json().catch(() => ({}));
          const errMsg = errBody.message || errBody.error || "Server error";
          showToast(`Batch update failed: ${errMsg}`, true);
          return;
        }
        const result = await response.json();
        totalUpdated += result.updated ?? 0;
        totalFailed += result.results?.filter((r) => !r.success).length ?? 0;
      }
      const msg = totalFailed > 0
        ? `${totalUpdated} updated, ${totalFailed} failed`
        : `${totalUpdated} task${totalUpdated !== 1 ? "s" : ""} updated`;
      showToast(msg, totalFailed > 0);
      this.closeBatchPanel();
      this.exitBatchMode();
      await this.tm.loadTasks();
    } catch {
      showToast("Batch update failed", true);
    }
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
      .getElementById("filterProject")
      ?.addEventListener("change", () => this.applyFilters());
    document
      .getElementById("clearFilters")
      .addEventListener("click", () => this.clearFilters());

    document.getElementById("batchSelectBtn")?.addEventListener(
      "click",
      () => this.toggleBatchMode(),
    );
    document.getElementById("batchCancelBtn")?.addEventListener(
      "click",
      () => this.exitBatchMode(),
    );
    document.getElementById("batchEditBtn")?.addEventListener(
      "click",
      () => this.openBatchPanel(),
    );
    document.getElementById("batchPanelCancelBtn")?.addEventListener(
      "click",
      () => this.closeBatchPanel(),
    );
    document.getElementById("batchApplyBtn")?.addEventListener(
      "click",
      () => this.applyBatchUpdate(),
    );
    document.getElementById("batchEditPanel")?.addEventListener("click", (e) => {
      if (e.target.id === "batchEditPanel") this.closeBatchPanel();
    });

    // Row-click delegation: clicking non-interactive area in batch mode selects the row
    document.getElementById("listContainer")?.addEventListener("click", (e) => {
      if (!this._batchMode) return;
      const row = e.target.closest(".task-list-item");
      if (!row || !row.dataset.taskId) return;
      if (e.target.classList.contains("batch-checkbox")) return;
      if (e.target.closest("button, select, a")) return;
      this.toggleTaskSelection(row.dataset.taskId);
    });

    this.bindDrag();
    this.bindTouchDrag();
  }
}
