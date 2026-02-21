// Task Sidenav Module
// Handles task creation/editing via slide-in panel

import { Sidenav } from "../ui/sidenav.js";
import { TasksAPI } from "../api.js";
import { showToast } from "../ui/toast.js";

export class TaskSidenavModule {
  constructor(taskManager) {
    this.tm = taskManager;
    this.editingTask = null;
    this.parentTaskId = null;
  }

  bindEvents() {
    // Close button
    document.getElementById("sidenavTaskClose")?.addEventListener(
      "click",
      () => {
        this.close();
      },
    );

    // Cancel button
    document.getElementById("sidenavTaskCancel")?.addEventListener(
      "click",
      () => {
        this.close();
      },
    );

    // Form submit
    document.getElementById("sidenavTaskForm")?.addEventListener(
      "submit",
      async (e) => {
        e.preventDefault();
        await this.handleSubmit();
      },
    );
  }

  open(task = null, parentTaskId = null) {
    this.editingTask = task;
    this.parentTaskId = parentTaskId;

    // Update title
    const title = document.getElementById("sidenavTaskTitle");
    if (title) title.textContent = task ? "Edit Task" : "Add Task";

    // Populate selects
    this.populateSelects();

    // Fill form if editing
    if (task) {
      this.fillForm(task);
    } else {
      this.clearForm();
    }

    // Open sidenav
    Sidenav.open("taskSidenav");
  }

  close() {
    Sidenav.close("taskSidenav");
    this.editingTask = null;
    this.parentTaskId = null;
  }

  populateSelects() {
    // Sections
    const sectionSelect = document.getElementById("sidenavTaskSection");
    if (sectionSelect && this.tm.sections) {
      sectionSelect.innerHTML = this.tm.sections.map((s) =>
        `<option value="${s}">${s}</option>`
      ).join("");
    }

    // Assignees from people/ registry
    const assigneeSelect = document.getElementById("sidenavTaskAssignee");
    if (assigneeSelect) {
      const people = Array.from(this.tm.peopleMap.values());
      assigneeSelect.innerHTML = `<option value="">Unassigned</option>` +
        people.map((p) => {
          const role = p.role || p.title || "";
          const label = role ? `${p.name} (${role})` : p.name;
          return `<option value="${p.id}">${label}</option>`;
        }).join("");
    }

    // Tags
    const tagsSelect = document.getElementById("sidenavTaskTags");
    if (tagsSelect && this.tm.projectConfig?.tags) {
      tagsSelect.innerHTML = this.tm.projectConfig.tags.map((t) =>
        `<option value="${t}">${t}</option>`
      ).join("");
    }
  }

  fillForm(task) {
    const setValue = (id, value) => {
      const el = document.getElementById(id);
      if (el) el.value = value || "";
    };

    setValue("sidenavTaskTitleInput", task.title);
    setValue("sidenavTaskDescription", task.description);
    setValue("sidenavTaskSection", task.section);
    setValue("sidenavTaskPriority", task.priority);
    setValue("sidenavTaskAssignee", task.assignee);
    setValue("sidenavTaskEffort", task.effort);
    setValue("sidenavTaskMilestone", task.milestone);

    // Due date
    if (task.due_date) {
      const dueDate = new Date(task.due_date);
      setValue("sidenavTaskDueDate", dueDate.toISOString().slice(0, 16));
    }

    // Planned dates
    setValue("sidenavTaskPlannedStart", task.planned_start || "");
    setValue("sidenavTaskPlannedEnd", task.planned_end || "");

    // Tags (multi-select)
    const tagsSelect = document.getElementById("sidenavTaskTags");
    if (tagsSelect && task.tag) {
      const tags = Array.isArray(task.tag) ? task.tag : [task.tag];
      Array.from(tagsSelect.options).forEach((opt) => {
        opt.selected = tags.includes(opt.value);
      });
    }
  }

  clearForm() {
    const form = document.getElementById("sidenavTaskForm");
    if (form) form.reset();

    // Clear dependencies display
    const deps = document.getElementById("sidenavSelectedDependencies");
    if (deps) deps.innerHTML = "";
  }

  async handleSubmit() {
    const getValue = (id) => {
      const el = document.getElementById(id);
      return el ? el.value : "";
    };

    const getSelectedValues = (id) => {
      const el = document.getElementById(id);
      if (!el) return [];
      return Array.from(el.selectedOptions).map((o) => o.value);
    };

    const taskData = {
      title: getValue("sidenavTaskTitleInput"),
      description: getValue("sidenavTaskDescription"),
      section: getValue("sidenavTaskSection"),
      priority: getValue("sidenavTaskPriority")
        ? parseInt(getValue("sidenavTaskPriority"))
        : null,
      assignee: getValue("sidenavTaskAssignee"),
      effort: getValue("sidenavTaskEffort")
        ? parseInt(getValue("sidenavTaskEffort"))
        : null,
      due_date: getValue("sidenavTaskDueDate") || null,
      planned_start: getValue("sidenavTaskPlannedStart") || null,
      planned_end: getValue("sidenavTaskPlannedEnd") || null,
      milestone: getValue("sidenavTaskMilestone"),
      tag: getSelectedValues("sidenavTaskTags"),
    };

    try {
      if (this.editingTask) {
        await TasksAPI.update(this.editingTask.id, taskData);
        showToast("Task updated", "success");
      } else {
        if (this.parentTaskId) {
          taskData.parentId = this.parentTaskId;
        }
        await TasksAPI.create(taskData);
        showToast("Task created", "success");
      }

      this.close();
      await this.tm.loadTasks();
      this.tm.renderCurrentView();
    } catch (error) {
      console.error("Error saving task:", error);
      showToast("Error saving task", "error");
    }
  }
}

export default TaskSidenavModule;
