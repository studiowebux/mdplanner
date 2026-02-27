// Summary View Module
import { DEADLINE_CLASSES } from "../constants.js";
import { markdownToHtml } from "../utils.js";
import { showToast } from "../ui/toast.js";
import { ProjectAPI } from "../api.js";

/**
 * Project summary dashboard - stats, deadlines, links, status
 */
export class SummaryView {
  /** @param {TaskManager} taskManager */
  constructor(taskManager) {
    this.tm = taskManager;
  }

  /** Renders the full summary view */
  render() {
    if (!this.tm.projectInfo) return;

    // Update project name and description
    document.getElementById("projectName").textContent =
      this.tm.projectInfo.name;
    const descriptionEl = document.getElementById("projectDescription");

    if (
      this.tm.projectInfo.description &&
      this.tm.projectInfo.description.length > 0
    ) {
      const markdownText = this.tm.projectInfo.description.join("\n");
      descriptionEl.innerHTML = markdownToHtml(markdownText);
    } else {
      descriptionEl.innerHTML =
        '<p class="text-muted italic">No project description available.</p>';
    }

    // Calculate task statistics
    const stats = this.calculateTaskStats();

    // Update task counts
    document.getElementById("totalTasks").textContent = stats.total;
    document.getElementById("completedTasks").textContent = stats.completed;

    // Update dynamic section counts
    this.renderDynamicSectionCounts(stats.allTasks);

    // Update section breakdown dynamically
    this.renderSectionBreakdown();

    // Update milestone breakdown
    this.renderMilestoneBreakdown(stats.allTasks);

    // Update progress bar
    const progressPercent = stats.total > 0
      ? Math.round((stats.completed / stats.total) * 100)
      : 0;
    document.getElementById("progressPercent").textContent =
      `${progressPercent}%`;
    document.getElementById("progressBar").style.width = `${progressPercent}%`;

    // Update project dates in summary view
    const startDateEl = document.getElementById("summaryStartDate");
    const lastUpdatedEl = document.getElementById("summaryLastUpdated");

    if (this.tm.projectConfig && this.tm.projectConfig.startDate) {
      const date = new Date(this.tm.projectConfig.startDate);
      startDateEl.textContent = date.toLocaleDateString();
    } else {
      startDateEl.textContent = "-";
    }

    if (this.tm.projectConfig && this.tm.projectConfig.lastUpdated) {
      const date = new Date(this.tm.projectConfig.lastUpdated);
      lastUpdatedEl.textContent = `${date.toLocaleDateString()} ${
        date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
      }`;
    } else {
      lastUpdatedEl.textContent = "-";
    }

    // Render project links
    this.renderProjectLinks();

    // Render project status
    this.renderProjectStatus();

    // Render task deadlines
    this.renderTaskDeadlines(stats.allTasks);
  }

  renderTaskDeadlines(allTasks) {
    const container = document.getElementById("taskDeadlines");
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const nextWeek = new Date(today);
    nextWeek.setDate(nextWeek.getDate() + 7);

    const tasksWithDueDate = allTasks
      .filter((task) => task.config.due_date && !task.completed)
      .map((task) => {
        let dueDate = new Date(task.config.due_date);
        if (isNaN(dueDate.getTime())) {
          if (task.config.due_date.match(/^\d{4}-\d{2}-\d{2}T\d{1,2}$/)) {
            dueDate = new Date(task.config.due_date + ":00:00");
          } else if (task.config.due_date.match(/^\d{4}-\d{2}-\d{2}$/)) {
            dueDate = new Date(task.config.due_date + "T00:00:00");
          }
        }
        dueDate.setHours(0, 0, 0, 0);
        return { ...task, dueDateParsed: dueDate };
      })
      .filter((task) => !isNaN(task.dueDateParsed.getTime()))
      .sort((a, b) => a.dueDateParsed - b.dueDateParsed);

    const overdue = tasksWithDueDate.filter((t) => t.dueDateParsed < today);
    const dueToday = tasksWithDueDate.filter((t) =>
      t.dueDateParsed.getTime() === today.getTime()
    );
    const dueSoon = tasksWithDueDate.filter((t) =>
      t.dueDateParsed > today && t.dueDateParsed <= nextWeek
    );

    if (overdue.length === 0 && dueToday.length === 0 && dueSoon.length === 0) {
      container.innerHTML =
        '<p class="text-sm text-muted italic">No upcoming deadlines.</p>';
      return;
    }

    let html = "";

    if (overdue.length > 0) {
      html += `
        <div>
          <h4 class="text-sm font-medium text-primary mb-2">Overdue (${overdue.length})</h4>
          <div class="space-y-2">
            ${
        overdue.map((task) => this.renderDeadlineTask(task, "overdue")).join("")
      }
          </div>
        </div>
      `;
    }

    if (dueToday.length > 0) {
      html += `
        <div>
          <h4 class="text-sm font-medium text-primary mb-2">Due Today (${dueToday.length})</h4>
          <div class="space-y-2">
            ${
        dueToday.map((task) => this.renderDeadlineTask(task, "today")).join("")
      }
          </div>
        </div>
      `;
    }

    if (dueSoon.length > 0) {
      html += `
        <div>
          <h4 class="text-sm font-medium text-secondary mb-2">Due This Week (${dueSoon.length})</h4>
          <div class="space-y-2">
            ${
        dueSoon.map((task) => this.renderDeadlineTask(task, "soon")).join("")
      }
          </div>
        </div>
      `;
    }

    container.innerHTML = html;
  }

  renderDeadlineTask(task, urgency) {
    const dateStr = task.dueDateParsed.toLocaleDateString();
    return `
      <div class="p-2 rounded border ${
      DEADLINE_CLASSES[urgency]
    } cursor-pointer hover:opacity-80 transition-opacity"
           onclick="taskManager.editTask('${task.id}')">
        <div class="text-sm font-medium text-primary truncate">${task.title}</div>
        <div class="text-xs text-muted mt-1 flex items-center gap-1">
          <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
          ${dateStr} · ${task.section || "No section"}
        </div>
      </div>
    `;
  }

  renderProjectStatus() {
    const select = document.getElementById("projectStatus");
    const commentContainer = document.getElementById("projectStatusComment");
    const commentText = document.getElementById("statusCommentText");

    const status = this.tm.projectConfig?.status || "active";
    select.value = status;

    if (status !== "active" && this.tm.projectConfig?.statusComment) {
      commentContainer.classList.remove("hidden");
      commentText.value = this.tm.projectConfig.statusComment;
    } else if (status !== "active") {
      commentContainer.classList.remove("hidden");
      commentText.value = "";
    } else {
      commentContainer.classList.add("hidden");
      commentText.value = "";
    }

    this.updateStatusDropdownStyle();
  }

  renderProjectLinks() {
    const container = document.getElementById("projectLinks");
    const links = (this.tm.projectConfig?.links || []).filter(
      (l) => l != null && l.url && l.title,
    );

    if (links.length === 0) {
      container.innerHTML =
        '<p class="summary-empty-text">No links added yet.</p>';
      return;
    }

    container.innerHTML = links.map((link, index) => `
      <div class="summary-link-row">
        <a href="${link.url}" target="_blank" rel="noopener noreferrer"
           class="summary-link-anchor">
          ${link.title}
        </a>
        <button onclick="taskManager.removeLink(${index})"
                class="summary-link-remove"
                title="Remove link">
          <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
          </svg>
        </button>
      </div>
    `).join("");
  }

  toggleAddLinkForm() {
    const form = document.getElementById("addLinkForm");
    form.classList.toggle("hidden");
    if (!form.classList.contains("hidden")) {
      document.getElementById("linkTitle").focus();
    }
  }

  async addLink() {
    const titleInput = document.getElementById("linkTitle");
    const urlInput = document.getElementById("linkUrl");
    const title = titleInput.value.trim();
    const url = urlInput.value.trim();

    if (!title || !url) {
      showToast("Please enter both title and URL", true);
      return;
    }

    if (!this.tm.projectConfig.links) {
      this.tm.projectConfig.links = [];
    }
    this.tm.projectConfig.links.push({ title, url });

    await this.tm.saveProjectConfig();
    this.renderProjectLinks();

    // Reset form
    titleInput.value = "";
    urlInput.value = "";
    document.getElementById("addLinkForm").classList.add("hidden");
    showToast("Link added");
  }

  async removeLink(index) {
    if (!this.tm.projectConfig.links) return;
    this.tm.projectConfig.links.splice(index, 1);
    await this.tm.saveProjectConfig();
    this.renderProjectLinks();
    showToast("Link removed");
  }

  async updateProjectStatus(status) {
    this.tm.projectConfig.status = status;
    const commentContainer = document.getElementById("projectStatusComment");
    if (status !== "active") {
      commentContainer.classList.remove("hidden");
    } else {
      commentContainer.classList.add("hidden");
    }
    await this.tm.saveProjectConfig();
    this.updateStatusDropdownStyle();
    showToast("Status updated");
  }

  async saveStatusComment() {
    const comment = document.getElementById("statusCommentText").value.trim();
    this.tm.projectConfig.statusComment = comment || undefined;
    await this.tm.saveProjectConfig();
  }

  updateStatusDropdownStyle() {
    const select = document.getElementById("projectStatus");
    const status = select.value;
    const statusClass = `status-select-${status}`;
    select.className =
      `text-sm border-2 rounded-md px-2 py-1 font-medium focus:outline-none focus:ring-2 focus:ring-1 focus:border-transparent ${statusClass}`;
  }

  renderDynamicSectionCounts(allTasks) {
    const container = document.getElementById("dynamicSectionCounts");
    container.innerHTML = "";

    const sections = this.tm.sections || [];

    sections.forEach((section, index) => {
      const sectionTasks = allTasks.filter(
        (task) => task.section === section && !task.completed,
      );

      const div = document.createElement("div");
      div.className = "flex justify-between items-center";
      div.innerHTML = `
                <span class="text-sm text-secondary">${section}</span>
                <span class="text-lg font-semibold text-primary">${sectionTasks.length}</span>
            `;
      container.appendChild(div);
    });
  }

  calculateTaskStats() {
    // Count all tasks including children
    let allTasks = [];

    const addTasksRecursively = (tasks) => {
      for (const task of tasks) {
        allTasks.push(task);
        if (task.children && task.children.length > 0) {
          addTasksRecursively(task.children);
        }
      }
    };

    addTasksRecursively(this.tm.tasks);

    return {
      total: allTasks.length,
      completed: allTasks.filter((t) => t.completed).length,
      allTasks: allTasks, // Return all tasks for section breakdown
    };
  }

  renderSectionBreakdown() {
    const container = document.getElementById("sectionBreakdown");
    const sections = this.tm.sections || [];

    // Get all tasks including children
    let allTasks = [];
    const addTasksRecursively = (tasks) => {
      for (const task of tasks) {
        allTasks.push(task);
        if (task.children && task.children.length > 0) {
          addTasksRecursively(task.children);
        }
      }
    };
    addTasksRecursively(this.tm.tasks);

    container.innerHTML = "";

    sections.forEach((section, index) => {
      const count = allTasks.filter((task) => task.section === section).length;
      // Alternate between different grey shades for visual distinction
      const dotShade = index % 2 === 0
        ? "bg-inverse"
        : "bg-active";

      const div = document.createElement("div");
      div.className = "flex items-center justify-between";
      div.innerHTML = `
                <div class="flex items-center space-x-2">
                    <div class="w-3 h-3 ${dotShade} rounded-full"></div>
                    <span class="text-sm text-secondary">${section}</span>
                </div>
                <span class="text-sm font-medium text-primary">${count}</span>
            `;
      container.appendChild(div);
    });
  }

  renderMilestoneBreakdown(allTasks) {
    const milestonesSection = document.getElementById("milestonesSection");
    const container = document.getElementById("milestoneBreakdown");

    // Find all unique milestones from tasks
    const milestoneData = {};

    allTasks.forEach((task) => {
      if (task.config.milestone) {
        const milestone = task.config.milestone;
        if (!milestoneData[milestone]) {
          milestoneData[milestone] = {
            total: 0,
            incomplete: 0,
          };
        }
        milestoneData[milestone].total++;
        if (!task.completed) {
          milestoneData[milestone].incomplete++;
        }
      }
    });

    const milestones = Object.keys(milestoneData);

    // Show/hide milestones section based on whether we have milestones
    if (milestones.length === 0) {
      milestonesSection.classList.add("hidden");
      return;
    }

    milestonesSection.classList.remove("hidden");
    container.innerHTML = "";

    milestones.sort().forEach((milestone, index) => {
      const data = milestoneData[milestone];
      const completedCount = data.total - data.incomplete;
      const progressPercent = data.total > 0
        ? Math.round((completedCount / data.total) * 100)
        : 0;
      // Alternate between different grey shades for visual distinction
      const dotShade = index % 2 === 0
        ? "bg-inverse"
        : "bg-active";

      const div = document.createElement("div");
      div.className = "space-y-2";
      div.innerHTML = `
                <div class="flex items-center justify-between">
                    <div class="flex items-center space-x-2">
                        <div class="w-3 h-3 ${dotShade} rounded-full"></div>
                        <span class="text-sm font-medium text-primary flex items-center gap-1"><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 21v-4m0 0V5a2 2 0 012-2h6.5l1 1H21l-3 6 3 6h-8.5l-1-1H5a2 2 0 00-2 2zm9-13.5V9"></path></svg>${milestone}</span>
                    </div>
                    <span class="text-sm font-medium text-primary">${data.incomplete} remaining</span>
                </div>
                <div class="flex items-center space-x-2 text-xs text-muted">
                    <span>${completedCount}/${data.total} completed</span>
                    <div class="flex-1 bg-active rounded-full h-1.5">
                        <div class="bg-inverse h-1.5 rounded-full transition-all duration-300" style="width: ${progressPercent}%"></div>
                    </div>
                    <span>${progressPercent}%</span>
                </div>
            `;
      container.appendChild(div);
    });
  }

  bindEvents() {
    // Project links events
    document
      .getElementById("addLinkBtn")
      .addEventListener("click", () => this.toggleAddLinkForm());
    document
      .getElementById("cancelLinkBtn")
      .addEventListener("click", () => this.toggleAddLinkForm());
    document
      .getElementById("saveLinkBtn")
      .addEventListener("click", () => this.addLink());

    // Project status events
    document
      .getElementById("projectStatus")
      .addEventListener(
        "change",
        (e) => this.updateProjectStatus(e.target.value),
      );
    document
      .getElementById("statusCommentText")
      .addEventListener("blur", () => this.saveStatusComment());

    // Inline name editing — save on blur and Enter
    const nameEl = document.getElementById("projectName");
    if (nameEl) {
      nameEl.contentEditable = "true";
      nameEl.classList.add("summary-editable-name");

      nameEl.addEventListener("blur", () => this.saveName(nameEl));
      nameEl.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          nameEl.blur();
        }
        if (e.key === "Escape") {
          nameEl.textContent = this.tm.projectInfo?.name || "";
          nameEl.blur();
        }
      });
    }

    // Description edit button
    const editDescBtn = document.getElementById("editDescriptionBtn");
    if (editDescBtn) {
      editDescBtn.addEventListener("click", () => this.toggleDescriptionEdit());
    }
    const saveDescBtn = document.getElementById("saveDescriptionBtn");
    if (saveDescBtn) {
      saveDescBtn.addEventListener("click", () => this.saveDescription());
    }
    const cancelDescBtn = document.getElementById("cancelDescriptionBtn");
    if (cancelDescBtn) {
      cancelDescBtn.addEventListener(
        "click",
        () => this.cancelDescriptionEdit(),
      );
    }
  }

  async saveName(nameEl) {
    const newName = nameEl.textContent.trim();
    if (!newName || newName === this.tm.projectInfo?.name) return;
    try {
      await ProjectAPI.saveInfo({ name: newName });
      this.tm.projectInfo.name = newName;
      // Update nav header too
      const navName = document.getElementById("projectNameMobile");
      if (navName) navName.textContent = newName;
      showToast("Project name updated");
    } catch {
      showToast("Failed to save name", true);
      nameEl.textContent = this.tm.projectInfo?.name || "";
    }
  }

  toggleDescriptionEdit() {
    const rendered = document.getElementById("projectDescription");
    const editor = document.getElementById("projectDescriptionEditor");
    if (!rendered || !editor) return;

    const textarea = editor.querySelector("textarea");
    if (textarea) {
      textarea.value = this.tm.projectInfo?.description?.join("\n") || "";
    }
    rendered.classList.add("hidden");
    editor.classList.remove("hidden");
    textarea?.focus();
  }

  cancelDescriptionEdit() {
    document.getElementById("projectDescription")?.classList.remove("hidden");
    document.getElementById("projectDescriptionEditor")?.classList.add(
      "hidden",
    );
  }

  async saveDescription() {
    const textarea = document.getElementById("projectDescriptionEditor")
      ?.querySelector("textarea");
    if (!textarea) return;

    const lines = textarea.value.split("\n").filter((l) => l.trim());
    try {
      await ProjectAPI.saveInfo({ description: lines });
      this.tm.projectInfo.description = lines;
      // Re-render the description area
      const rendered = document.getElementById("projectDescription");
      if (rendered) {
        rendered.innerHTML = lines.length
          ? markdownToHtml(lines.join("\n"))
          : '<p class="summary-empty-text">No project description available.</p>';
      }
      this.cancelDescriptionEdit();
      showToast("Description updated");
    } catch {
      showToast("Failed to save description", true);
    }
  }
}
