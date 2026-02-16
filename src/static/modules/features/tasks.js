// Tasks Feature Module
import { TasksAPI } from "../api.js";
import { formatDateForInput, markdownToHtml } from "../utils.js";
import { showToast } from "../ui/toast.js";

/**
 * Handles task CRUD operations, search, and modal management
 */
export class TasksModule {
  /** @param {TaskManager} taskManager */
  constructor(taskManager) {
    this.tm = taskManager;
  }

  /**
   * @param {string} id - Task ID
   * @returns {Object|null} Task object or null
   */
  findById(id) {
    const findInTasks = (tasks) => {
      for (const task of tasks) {
        if (task.id === id) return task;
        if (task.children) {
          const found = findInTasks(task.children);
          if (found) return found;
        }
      }
      return null;
    };
    return findInTasks(this.tm.tasks);
  }

  /**
   * @param {Object|string|null} task - Task object, task ID, or null for new
   * @param {string|null} parentTaskId - Parent task ID for subtasks
   */
  async openModal(task = null, parentTaskId = null) {
    // If task is a string (ID), find the actual task object
    if (typeof task === "string") {
      task = this.findById(task);
    }
    this.tm.editingTask = task;
    this.tm.parentTaskId = parentTaskId;
    const modal = document.getElementById("taskModal");
    const form = document.getElementById("taskForm");
    const title = document.getElementById("modalTitle");

    if (parentTaskId) {
      const parentTask = this.findById(parentTaskId);
      title.textContent = `Add Subtask to: ${parentTask.title}`;
    } else {
      title.textContent = task ? "Edit Task" : "Add Task";
    }

    // Populate form options
    await this.populateFormOptions(task ? task.id : null);

    if (task) {
      const config = task.config || {};
      document.getElementById("taskTitle").value = task.title || "";
      document.getElementById("taskSection").value = task.section || "";
      document.getElementById("taskPriority").value = config.priority != null
        ? String(config.priority)
        : "";
      document.getElementById("taskAssignee").value = config.assignee || "";
      document.getElementById("taskEffort").value = config.effort != null
        ? config.effort
        : "";
      document.getElementById("taskDueDate").value =
        formatDateForInput(config.due_date) || "";
      document.getElementById("taskMilestone").value = config.milestone || "";
      document.getElementById("taskPlannedStart").value =
        config.planned_start || "";
      document.getElementById("taskPlannedEnd").value = config.planned_end ||
        "";

      // Show time entries section for existing tasks
      document.getElementById("timeEntriesSection").classList.remove("hidden");
      this.tm.loadTaskTimeEntries(task.id);

      // Set selected tags
      const tagSelect = document.getElementById("taskTags");
      Array.from(tagSelect.options).forEach((option) => {
        option.selected = config.tag && config.tag.includes(option.value);
      });

      // Set selected dependencies
      this.tm.selectedDependencies = config.blocked_by
        ? [...config.blocked_by]
        : [];
      this.tm.dependenciesModule.updateSelected();

      document.getElementById("taskDescription").value = task.description
        ? task.description.join("\n")
        : "";
    } else {
      form.reset();
      this.tm.selectedDependencies = [];
      this.tm.dependenciesModule.updateSelected();
      // Hide time entries section for new tasks
      document.getElementById("timeEntriesSection").classList.add("hidden");
      document.getElementById("timeEntriesList").innerHTML = "";
      // If creating a subtask, inherit parent's section
      if (parentTaskId) {
        const parentTask = this.findById(parentTaskId);
        document.getElementById("taskSection").value = parentTask.section;
      }
    }

    // Hide time entry form on modal open
    this.tm.hideTimeEntryForm();

    modal.classList.remove("hidden");
    modal.classList.add("flex");
  }

  closeModal() {
    const modal = document.getElementById("taskModal");
    modal.classList.add("hidden");
    modal.classList.remove("flex");
    this.tm.editingTask = null;
    this.tm.parentTaskId = null;
    // Clear task hash from URL
    if (window.location.hash.startsWith("#task=")) {
      history.replaceState(
        null,
        "",
        window.location.pathname + window.location.search,
      );
    }
  }

  async handleSubmit(e) {
    e.preventDefault();

    const formData = {
      title: document.getElementById("taskTitle").value,
      section: document.getElementById("taskSection").value,
      completed: false,
      config: {
        priority: document.getElementById("taskPriority").value
          ? parseInt(document.getElementById("taskPriority").value)
          : undefined,
        assignee: document.getElementById("taskAssignee").value || undefined,
        effort: document.getElementById("taskEffort").value
          ? parseInt(document.getElementById("taskEffort").value)
          : undefined,
        due_date: document.getElementById("taskDueDate").value || undefined,
        milestone: document.getElementById("taskMilestone").value || undefined,
        planned_start: document.getElementById("taskPlannedStart").value ||
          undefined,
        planned_end: document.getElementById("taskPlannedEnd").value ||
          undefined,
        tag: this.getSelectedTags(),
        blocked_by: this.tm.selectedDependencies.length > 0
          ? this.tm.selectedDependencies
          : undefined,
      },
      description: document.getElementById("taskDescription").value
        ? document.getElementById("taskDescription").value.split("\n")
        : undefined,
      children: [],
      parentId: this.tm.parentTaskId || undefined,
    };

    try {
      let response;
      if (this.tm.editingTask) {
        response = await TasksAPI.update(this.tm.editingTask.id, formData);
      } else {
        response = await TasksAPI.create(formData);
      }

      if (response.ok) {
        await this.tm.loadTasks();
        this.closeModal();
      } else {
        console.error("Failed to save task");
      }
    } catch (error) {
      console.error("Error saving task:", error);
    }
  }

  async edit(taskId) {
    const task = this.findById(taskId);
    if (task) {
      history.replaceState(null, "", `#task=${taskId}`);
      await this.openModal(task);
    }
  }

  copyLink(taskId) {
    const url =
      `${window.location.origin}${window.location.pathname}#task=${taskId}`;
    navigator.clipboard.writeText(url).then(() => {
      showToast("Link copied to clipboard");
    }).catch((err) => {
      console.error("Failed to copy link:", err);
      showToast("Failed to copy link", true);
    });
  }

  async addSubtask(parentTaskId) {
    const parentTask = this.findById(parentTaskId);
    if (parentTask) {
      await this.openModal(null, parentTaskId);
    }
  }

  toggleDescription(taskId) {
    const task = this.findById(taskId);
    if (!task || !task.description || task.description.length === 0) return;

    // Create or toggle description modal
    let modal = document.getElementById("descriptionModal");
    if (!modal) {
      modal = document.createElement("div");
      modal.id = "descriptionModal";
      modal.className =
        "fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50";
      modal.innerHTML = `
        <div class="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto">
          <div class="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
            <h3 id="descriptionModalTitle" class="text-lg font-medium text-gray-900 dark:text-gray-100">Task Description</h3>
            <button onclick="taskManager.closeDescriptionModal()" class="text-gray-400 dark:text-gray-500 hover:text-gray-500 dark:hover:text-gray-400">
              <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
              </svg>
            </button>
          </div>
          <div class="p-6">
            <div id="descriptionContent" class="prose prose-gray dark:prose-invert max-w-none"></div>
          </div>
        </div>
      `;
      document.body.appendChild(modal);

      // Close on background click
      modal.addEventListener("click", (e) => {
        if (e.target === modal) {
          this.closeDescriptionModal();
        }
      });
    }

    // Update content
    document.getElementById("descriptionModalTitle").textContent =
      `${task.title} - Description`;
    const markdownText = task.description.join("\n");
    document.getElementById("descriptionContent").innerHTML = markdownToHtml(
      markdownText,
    );

    modal.classList.remove("hidden");
  }

  closeDescriptionModal() {
    const modal = document.getElementById("descriptionModal");
    if (modal) {
      modal.classList.add("hidden");
    }
  }

  async delete(taskId) {
    if (confirm("Are you sure you want to delete this task?")) {
      try {
        const response = await TasksAPI.delete(taskId);
        if (response.ok) {
          await this.tm.loadTasks();
        } else {
          console.error("Failed to delete task");
        }
      } catch (error) {
        console.error("Error deleting task:", error);
      }
    }
  }

  async populateFormOptions(currentTaskId = null) {
    // Load project config if not already loaded
    if (!this.tm.projectConfig) {
      await this.tm.loadProjectConfig();
    }

    // Populate sections
    const sectionSelect = document.getElementById("taskSection");
    sectionSelect.innerHTML = "";
    const sections = this.tm.sections || [];
    sections.forEach((section) => {
      const option = document.createElement("option");
      option.value = section;
      option.textContent = section;
      sectionSelect.appendChild(option);
    });

    // Populate assignees
    const assigneeSelect = document.getElementById("taskAssignee");
    assigneeSelect.innerHTML = '<option value="">Select Assignee</option>';
    if (this.tm.projectConfig && this.tm.projectConfig.assignees) {
      this.tm.projectConfig.assignees.forEach((assignee) => {
        const option = document.createElement("option");
        option.value = assignee;
        option.textContent = assignee;
        assigneeSelect.appendChild(option);
      });
    }

    // Populate tags
    const tagSelect = document.getElementById("taskTags");
    tagSelect.innerHTML = "";
    if (this.tm.projectConfig && this.tm.projectConfig.tags) {
      this.tm.projectConfig.tags.forEach((tag) => {
        const option = document.createElement("option");
        option.value = tag;
        option.textContent = tag;
        tagSelect.appendChild(option);
      });
    }
  }

  getSelectedTags() {
    const tagSelect = document.getElementById("taskTags");
    const selected = [];
    Array.from(tagSelect.selectedOptions).forEach((option) => {
      selected.push(option.value);
    });
    return selected.length > 0 ? selected : undefined;
  }

  /** @param {string} query - Filters tasks and updates view */
  handleSearch(query) {
    this.tm.searchQuery = query.toLowerCase().trim();
    if (this.tm.searchQuery === "") {
      this.tm.filteredTasks = this.tm.tasks;
    } else {
      this.tm.filteredTasks = this.filterRecursive(this.tm.tasks);
      // Auto-switch to list view when searching from non-task pages
      if (!["list", "board"].includes(this.tm.currentView)) {
        this.tm.switchView("list");
        return; // switchView will call renderTasks
      }
    }
    this.tm.renderTasks();
  }

  filterRecursive(tasks) {
    const filtered = [];
    for (const task of tasks) {
      if (this.matchesSearch(task)) {
        // Include the task with all its children if it matches
        filtered.push({
          ...task,
          children: task.children || [],
        });
      } else if (task.children && task.children.length > 0) {
        // Check if any children match
        const filteredChildren = this.filterRecursive(task.children);
        if (filteredChildren.length > 0) {
          // Include parent if children match
          filtered.push({
            ...task,
            children: filteredChildren,
          });
        }
      }
    }
    return filtered;
  }

  matchesSearch(task) {
    const query = this.tm.searchQuery;
    return (
      task.title.toLowerCase().includes(query) ||
      task.id.toLowerCase().includes(query) ||
      task.section.toLowerCase().includes(query) ||
      (task.config.assignee &&
        task.config.assignee.toLowerCase().includes(query)) ||
      (task.config.milestone &&
        task.config.milestone.toLowerCase().includes(query)) ||
      (task.config.tag &&
        task.config.tag.some((tag) => tag.toLowerCase().includes(query))) ||
      (task.description &&
        task.description.some((desc) => desc.toLowerCase().includes(query)))
    );
  }

  getToRender() {
    return this.tm.searchQuery ? this.tm.filteredTasks : this.tm.tasks;
  }

  /** @param {string} taskId - Toggles task completion status */
  async toggle(taskId) {
    const task = this.findById(taskId);
    if (task) {
      // Optimistic update - update local state immediately
      const newCompleted = !task.completed;
      task.completed = newCompleted;

      // Update UI immediately without full re-render
      this.updateInView(taskId, task);

      try {
        const response = await TasksAPI.update(taskId, {
          completed: newCompleted,
        });
        if (!response.ok) {
          // Revert on failure
          task.completed = !newCompleted;
          this.updateInView(taskId, task);
          console.error("Failed to toggle task");
        }
      } catch (error) {
        // Revert on error
        task.completed = !newCompleted;
        this.updateInView(taskId, task);
        console.error("Error toggling task:", error);
      }
    }
  }

  updateInView(taskId, task) {
    // Update checkbox state
    const checkboxes = document.querySelectorAll(
      `input[onchange*="toggleTask('${taskId}')"]`,
    );
    checkboxes.forEach((cb) => {
      cb.checked = task.completed;
    });

    // Update task card styling (board view uses h4, list view uses different structure)
    const card = document.querySelector(`[data-task-id="${taskId}"]`);
    if (card) {
      // Board view - h4 title
      const h4Title = card.querySelector("h4");
      if (h4Title) {
        if (task.completed) {
          h4Title.classList.add("line-through");
          h4Title.classList.remove("text-gray-900", "dark:text-gray-100");
          h4Title.classList.add("text-gray-500", "dark:text-gray-400");
        } else {
          h4Title.classList.remove(
            "line-through",
            "text-gray-500",
            "dark:text-gray-400",
          );
          h4Title.classList.add("text-gray-900", "dark:text-gray-100");
        }
      }

      // List view - task-title span
      const titleSpan = card.querySelector(".task-title");
      if (titleSpan) {
        if (task.completed) {
          titleSpan.classList.add(
            "line-through",
            "text-gray-400",
            "dark:text-gray-500",
          );
          titleSpan.classList.remove("text-gray-900", "dark:text-gray-100");
        } else {
          titleSpan.classList.remove(
            "line-through",
            "text-gray-400",
            "dark:text-gray-500",
          );
          titleSpan.classList.add("text-gray-900", "dark:text-gray-100");
        }
      }
    }
  }

  bindEvents() {
    // Task form submit
    document
      .getElementById("taskForm")
      .addEventListener("submit", (e) => this.handleSubmit(e));

    // Cancel button
    document
      .getElementById("cancelBtn")
      .addEventListener("click", () => this.closeModal());

    // Close modal on background click
    document.getElementById("taskModal").addEventListener("click", (e) => {
      if (e.target.id === "taskModal") {
        this.closeModal();
      }
    });

    // Search functionality - Desktop and Mobile
    document.getElementById("searchInput").addEventListener("input", (e) => {
      this.handleSearch(e.target.value);
    });
    document
      .getElementById("searchInputMobile")
      .addEventListener("input", (e) => {
        this.handleSearch(e.target.value);
      });
  }
}
