// Summary View Module
import { DEADLINE_CLASSES } from "../constants.js";
import { markdownToHtml } from "../utils.js";
import { showToast } from "../ui/toast.js";

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
        '<p class="text-gray-500 dark:text-gray-400 italic">No project description available.</p>';
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
        '<p class="text-sm text-gray-500 dark:text-gray-400 italic">No upcoming deadlines.</p>';
      return;
    }

    let html = "";

    if (overdue.length > 0) {
      html += `
        <div>
          <h4 class="text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">Overdue (${overdue.length})</h4>
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
          <h4 class="text-sm font-medium text-gray-800 dark:text-gray-200 mb-2">Due Today (${dueToday.length})</h4>
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
          <h4 class="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">Due This Week (${dueSoon.length})</h4>
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
        <div class="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">${task.title}</div>
        <div class="text-xs text-gray-500 dark:text-gray-400 mt-1 flex items-center gap-1">
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
    const links = this.tm.projectConfig?.links || [];

    if (links.length === 0) {
      container.innerHTML =
        '<p class="text-sm text-gray-500 dark:text-gray-400 italic">No links added yet.</p>';
      return;
    }

    container.innerHTML = links.map((link, index) => `
      <div class="flex items-center justify-between group">
        <a href="${link.url}" target="_blank" rel="noopener noreferrer"
           class="text-sm text-gray-900 hover:text-gray-600 dark:text-gray-100 dark:hover:text-gray-300 truncate flex-1 underline">
          ${link.title}
        </a>
        <button onclick="taskManager.removeLink(${index})"
                class="ml-2 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 opacity-0 group-hover:opacity-100 transition-opacity"
                title="Remove link">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
      `text-sm border-2 rounded-md px-2 py-1 font-medium focus:outline-none focus:ring-2 focus:ring-gray-500 focus:border-transparent ${statusClass}`;
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
                <span class="text-sm text-gray-600 dark:text-gray-400">${section}</span>
                <span class="text-lg font-semibold text-gray-900 dark:text-gray-100">${sectionTasks.length}</span>
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
        ? "bg-gray-800 dark:bg-gray-200"
        : "bg-gray-500 dark:bg-gray-400";

      const div = document.createElement("div");
      div.className = "flex items-center justify-between";
      div.innerHTML = `
                <div class="flex items-center space-x-2">
                    <div class="w-3 h-3 ${dotShade} rounded-full"></div>
                    <span class="text-sm text-gray-600 dark:text-gray-400">${section}</span>
                </div>
                <span class="text-sm font-medium text-gray-900 dark:text-gray-100">${count}</span>
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
        ? "bg-gray-800 dark:bg-gray-200"
        : "bg-gray-500 dark:bg-gray-400";

      const div = document.createElement("div");
      div.className = "space-y-2";
      div.innerHTML = `
                <div class="flex items-center justify-between">
                    <div class="flex items-center space-x-2">
                        <div class="w-3 h-3 ${dotShade} rounded-full"></div>
                        <span class="text-sm font-medium text-gray-900 dark:text-gray-100 flex items-center gap-1"><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 21v-4m0 0V5a2 2 0 012-2h6.5l1 1H21l-3 6 3 6h-8.5l-1-1H5a2 2 0 00-2 2zm9-13.5V9"></path></svg>${milestone}</span>
                    </div>
                    <span class="text-sm font-medium text-gray-900 dark:text-gray-100">${data.incomplete} remaining</span>
                </div>
                <div class="flex items-center space-x-2 text-xs text-gray-500 dark:text-gray-400">
                    <span>${completedCount}/${data.total} completed</span>
                    <div class="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
                        <div class="bg-gray-900 dark:bg-gray-100 h-1.5 rounded-full transition-all duration-300" style="width: ${progressPercent}%"></div>
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
  }
}
