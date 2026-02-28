// Task Sidenav Module
// Handles task creation/editing via slide-in panel

import { Sidenav } from "../ui/sidenav.js";
import { MilestonesAPI, TasksAPI } from "../api.js";
import { showToast } from "../ui/toast.js";
import { UndoManager } from "../ui/undo-manager.js";

export class TaskSidenavModule {
  constructor(taskManager) {
    this.tm = taskManager;
    this.editingTask = null;
    this.parentTaskId = null;
    this.pendingAttachments = [];
    /** @type {UndoManager | null} */
    this._descUndoManager = null;
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

    // Update "Modified" dot when description changes
    document.getElementById("sidenavTaskDescription")?.addEventListener(
      "input",
      () => this._updateDescUnsavedDot(),
    );

    // File attach button triggers hidden input
    document.getElementById("sidenavAttachBtn")?.addEventListener(
      "click",
      () => document.getElementById("sidenavFileInput")?.click(),
    );

    // Milestone → auto-fill project when milestone has a linked project
    document.getElementById("sidenavTaskMilestone")?.addEventListener(
      "change",
      (e) => {
        const milestoneName = e.target.value;
        if (!milestoneName) return;
        const projectField = document.getElementById("sidenavTaskProject");
        if (!projectField || projectField.value) return; // don't overwrite manual entry
        const milestone = (this.tm.milestones || []).find(
          (m) => m.name === milestoneName,
        );
        if (milestone?.project) projectField.value = milestone.project;
      },
    );

    // File input change — upload each file and insert markdown into description
    document.getElementById("sidenavFileInput")?.addEventListener(
      "change",
      async (e) => {
        const files = Array.from(e.target.files ?? []);
        if (!files.length) return;
        await this.uploadFiles(files);
        e.target.value = "";
      },
    );
  }

  async uploadFiles(files) {
    const status = document.getElementById("sidenavUploadStatus");
    const textarea = document.getElementById("sidenavTaskDescription");
    if (status) status.textContent = "Uploading…";

    for (const file of files) {
      const form = new FormData();
      form.append("file", file);

      try {
        const res = await fetch("/api/uploads", { method: "POST", body: form });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          showToast(`Upload failed: ${err.error ?? res.statusText}`, "error");
          continue;
        }
        const { path } = await res.json();
        const isImage = file.type.startsWith("image/");
        // Use absolute path so the URL resolves correctly from any render context
        const link = isImage
          ? `![${file.name}](/${path})`
          : `[${file.name}](/${path})`;

        if (textarea) {
          const pos = textarea.selectionStart ?? textarea.value.length;
          const before = textarea.value.slice(0, pos);
          const after = textarea.value.slice(pos);
          // Ensure a blank line before the link so marked renders it as a
          // block paragraph rather than inline inside surrounding text
          const pre = before.length
            ? before.endsWith("\n\n")
              ? ""
              : before.endsWith("\n")
                ? "\n"
                : "\n\n"
            : "";
          textarea.value = `${before}${pre}${link}\n\n${after}`;
        }

        // Link to task frontmatter immediately when editing an existing task;
        // for new tasks, collect paths and link after create in handleSubmit.
        if (this.editingTask) {
          await TasksAPI.addAttachments(this.editingTask.id, [path]);
        } else {
          this.pendingAttachments.push(path);
        }
      } catch {
        showToast(`Upload failed: ${file.name}`, "error");
      }
    }

    if (status) status.textContent = "";
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
    this._attachDescUndo();
  }

  close() {
    this._detachDescUndo();
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

    // Milestones datalist — existing milestone files + unique names referenced in tasks
    const datalist = document.getElementById("milestonesList");
    if (datalist) {
      const names = new Set();
      (this.tm.milestones || []).forEach((m) => { if (m.name) names.add(m.name); });
      // Infer milestones from tasks that have no backing file
      (this.tm.tasks || []).forEach((t) => {
        const ms = t.config?.milestone || t.milestone;
        if (ms) names.add(ms);
      });
      datalist.innerHTML = Array.from(names)
        .sort()
        .map((n) => `<option value="${n}">`)
        .join("");
    }

    // Projects datalist — portfolio item names
    const projectsDatalist = document.getElementById("projectsList");
    if (projectsDatalist) {
      const names = new Set();
      (this.tm.portfolio || []).forEach((p) => { if (p.name) names.add(p.name); });
      projectsDatalist.innerHTML = Array.from(names)
        .sort()
        .map((n) => `<option value="${n}">`)
        .join("");
    }
  }

  fillForm(task) {
    const cfg = task.config || {};
    const setValue = (id, value) => {
      const el = document.getElementById(id);
      if (el) el.value = value || "";
    };

    setValue("sidenavTaskTitleInput", task.title);
    setValue(
      "sidenavTaskDescription",
      Array.isArray(task.description)
        ? task.description.join("\n")
        : (task.description || ""),
    );
    setValue("sidenavTaskSection", task.section);
    setValue("sidenavTaskPriority", cfg.priority);
    setValue("sidenavTaskAssignee", cfg.assignee);
    setValue("sidenavTaskEffort", cfg.effort);
    setValue("sidenavTaskMilestone", cfg.milestone);
    setValue("sidenavTaskProject", cfg.project);

    // Due date — datetime-local requires YYYY-MM-DDTHH:MM (local, no seconds)
    if (cfg.due_date) {
      const dueDate = new Date(cfg.due_date);
      if (!isNaN(dueDate.getTime())) {
        // Produce local time string without seconds/timezone suffix
        const pad = (n) => String(n).padStart(2, "0");
        const local = `${dueDate.getFullYear()}-${pad(dueDate.getMonth() + 1)}-${pad(dueDate.getDate())}T${pad(dueDate.getHours())}:${pad(dueDate.getMinutes())}`;
        setValue("sidenavTaskDueDate", local);
      }
    }

    // Planned dates
    setValue("sidenavTaskPlannedStart", cfg.planned_start || "");
    setValue("sidenavTaskPlannedEnd", cfg.planned_end || "");

    // Tags (multi-select) — use options iteration for cross-browser safety
    const tagsSelect = document.getElementById("sidenavTaskTags");
    if (tagsSelect && cfg.tag) {
      const tags = Array.isArray(cfg.tag) ? cfg.tag : [cfg.tag];
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

    this.pendingAttachments = [];
  }

  async handleSubmit() {
    const getValue = (id) => {
      const el = document.getElementById(id);
      return el ? el.value : "";
    };

    const getSelectedValues = (id) => {
      const el = document.getElementById(id);
      if (!el) return [];
      return Array.from(el.options).filter((o) => o.selected).map((o) =>
        o.value
      );
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
      project: getValue("sidenavTaskProject") || null,
      tag: getSelectedValues("sidenavTaskTags"),
    };

    try {
      // Auto-create milestone file if the name is new
      if (taskData.milestone) {
        const existing = (this.tm.milestones || []).some(
          (m) => m.name === taskData.milestone,
        );
        if (!existing) {
          await MilestonesAPI.create({
            name: taskData.milestone,
            status: "planned",
          });
          await this.tm.loadMilestones();
        }
      }

      if (this.editingTask) {
        await TasksAPI.update(this.editingTask.id, taskData);
        showToast("Task updated", "success");
      } else {
        if (this.parentTaskId) {
          taskData.parentId = this.parentTaskId;
        }
        const res = await TasksAPI.create(taskData);
        if (res.ok && this.pendingAttachments.length) {
          const { id: newId } = await res.json();
          if (newId) {
            await TasksAPI.addAttachments(newId, this.pendingAttachments);
          }
        }
        this.pendingAttachments = [];
        showToast("Task created", "success");
      }

      this._descUndoManager?.markSaved();
      this.close();
      await this.tm.loadTasks();
      this.tm.renderTasks();
    } catch (error) {
      console.error("Error saving task:", error);
      showToast("Error saving task", "error");
    }
  }

  // --- Undo/Redo helpers ---

  _attachDescUndo() {
    const el = document.getElementById("sidenavTaskDescription");
    if (!el) return;
    if (!this._descUndoManager) this._descUndoManager = new UndoManager();
    this._descUndoManager.attach(el);
    this._updateDescUnsavedDot();
  }

  _detachDescUndo() {
    this._descUndoManager?.detach();
    this._updateDescUnsavedDot();
  }

  _updateDescUnsavedDot() {
    const dot = document.getElementById("taskDescUnsavedDot");
    if (!dot) return;
    const show = this._descUndoManager?.hasUnsavedChanges() ?? false;
    dot.classList.toggle("hidden", !show);
  }
}

export default TaskSidenavModule;
