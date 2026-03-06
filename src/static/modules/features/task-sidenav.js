// Task Sidenav Module
// Handles task creation/editing via slide-in panel

import { Sidenav } from "../ui/sidenav.js";
import { GitHubAPI, TasksAPI } from "../api.js";
import { FuzzyAutocomplete } from "../ui/fuzzy-autocomplete.js";
import { showToast } from "../ui/toast.js";
import { UndoManager } from "../ui/undo-manager.js";
import { showConfirm } from "../ui/confirm.js";
import { markdownToHtml, escapeHtml } from "../utils.js";

export class TaskSidenavModule {
  constructor(taskManager) {
    this.tm = taskManager;
    this.editingTask = null;
    this.parentTaskId = null;
    this.pendingAttachments = [];
    /** @type {UndoManager | null} */
    this._descUndoManager = null;
    /** @type {FuzzyAutocomplete | null} */
    this._projectFuzzy = null;
  }

  bindEvents() {
    // Close button
    document.getElementById("sidenavTaskClose")?.addEventListener(
      "click",
      () => {
        this._confirmAndClose();
      },
    );

    // Cancel button
    document.getElementById("sidenavTaskCancel")?.addEventListener(
      "click",
      () => {
        this._confirmAndClose();
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

    // GitHub issue actions
    document.getElementById("sidenavFetchIssueBtn")?.addEventListener(
      "click",
      () => this.fetchGitHubIssueStatus(),
    );
    document.getElementById("sidenavCreateIssueBtn")?.addEventListener(
      "click",
      () => this.createGitHubIssue(),
    );
    document.getElementById("sidenavFetchPRBtn")?.addEventListener(
      "click",
      () => this.fetchGitHubPRStatus(),
    );

    // Project → re-filter milestone select when project changes
    // Listen for both input (typing) and change (FuzzyAutocomplete selection)
    const projectInput = document.getElementById("sidenavTaskProject");
    projectInput?.addEventListener("input", () => this._refreshMilestoneSelect());
    projectInput?.addEventListener("change", () => this._refreshMilestoneSelect());

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

    // Comment submit button
    document.getElementById("taskCommentSubmitBtn")?.addEventListener(
      "click",
      () => this._handleAddComment(),
    );

    // @mention autocomplete on comment input
    this._attachMentionAutocomplete();

    // Persist author selection to localStorage on change
    document.getElementById("taskCommentAuthorInput")?.addEventListener(
      "change",
      (e) => localStorage.setItem("commentAuthorName", e.target.value),
    );

    // Comment thread — delegate delete and edit clicks
    document.getElementById("taskCommentThread")?.addEventListener(
      "click",
      (e) => {
        const deleteBtn = e.target.closest("[data-delete-comment]");
        if (deleteBtn) {
          this._handleDeleteComment(deleteBtn.dataset.deleteComment);
          return;
        }
        const editBtn = e.target.closest("[data-edit-comment]");
        if (editBtn) this._handleEditComment(editBtn.dataset.editComment);
        const saveBtn = e.target.closest("[data-save-comment]");
        if (saveBtn) this._handleSaveComment(saveBtn.dataset.saveComment);
        const cancelBtn = e.target.closest("[data-cancel-edit-comment]");
        if (cancelBtn) this._renderCommentThread(this.editingTask);
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
    // Sync to app-level editingTask so TimeTrackingModule can read it
    this.tm.editingTask = task;

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
      // Default new tasks to "Todo" — the section select defaults to the first
      // section in the list (often "Backlog") after form.reset(). Override it.
      const sectionSelect = document.getElementById("sidenavTaskSection");
      if (sectionSelect) {
        const preferred = ["Todo", "todo"];
        const match = Array.from(sectionSelect.options).find((o) => preferred.includes(o.value));
        if (match) sectionSelect.value = match.value;
      }
    }

    // Show/load time entries section for existing tasks only
    const timeSection = document.getElementById("timeEntriesSection");
    if (task && timeSection) {
      timeSection.classList.remove("hidden");
      this.tm.loadTaskTimeEntries(task.id);
    } else if (timeSection) {
      timeSection.classList.add("hidden");
    }

    // Open sidenav
    Sidenav.registerModule(this);
    Sidenav.open("taskSidenav");
    this._attachDescUndo();
  }

  openWithCommentFocus(task) {
    this.open(task);
    // Scroll to comment section after sidenav animation settles
    setTimeout(() => {
      const section = document.getElementById("taskCommentsSection");
      if (section) section.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 300);
  }

  close() {
    Sidenav.unregisterModule();
    this._detachDescUndo();
    this._projectFuzzy?.destroy();
    this._projectFuzzy = null;
    Sidenav.close("taskSidenav");
    this.editingTask = null;
    this.tm.editingTask = null;
    this.parentTaskId = null;
  }

  _confirmAndClose() {
    if (
      this._descUndoManager?.hasUnsavedChanges() &&
      !confirm("You have unsaved changes. Close anyway?")
    ) return;
    this.close();
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

    // Tags — render as checkboxes (mobile-safe, avoids <select multiple> issues on iOS)
    const tagsContainer = document.getElementById("sidenavTaskTags");
    if (tagsContainer && this.tm.projectConfig?.tags) {
      tagsContainer.innerHTML = this.tm.projectConfig.tags.map((t) =>
        `<label class="tag-checkbox-item">
          <input type="checkbox" value="${t}" name="sidenavTag">
          <span>${t}</span>
        </label>`
      ).join("");
    }

    // Milestones select — filtered by selected project if one is set
    const milestoneSelect = document.getElementById("sidenavTaskMilestone");
    if (milestoneSelect) {
      const currentVal = milestoneSelect.value;
      const selectedProject = document.getElementById("sidenavTaskProject")?.value || "";
      const allMilestones = this.tm.milestones || [];
      const filtered = selectedProject
        ? allMilestones.filter((m) => !m.project || m.project === selectedProject)
        : allMilestones;
      const names = Array.from(
        new Set(filtered.map((m) => m.name).filter(Boolean))
      ).sort();
      milestoneSelect.innerHTML =
        '<option value="">— No milestone —</option>' +
        names.map((n) => `<option value="${n}">${n}</option>`).join("");
      // Restore selection if still valid
      if (currentVal && names.includes(currentVal)) milestoneSelect.value = currentVal;
    }

    // Projects fuzzy autocomplete — portfolio item names
    const projectInput = document.getElementById("sidenavTaskProject");
    if (projectInput) {
      this._projectFuzzy?.destroy();
      this._projectFuzzy = new FuzzyAutocomplete(
        projectInput,
        () => {
          const names = new Set();
          (this.tm.portfolio || []).forEach((p) => { if (p.name) names.add(p.name); });
          return Array.from(names).sort();
        },
        {
          onSelect: (name) => {
            // Auto-fill GitHub repo from portfolio item if the field is currently empty
            const repoInput = document.getElementById("sidenavTaskGithubRepo");
            if (!repoInput || repoInput.value.trim()) return;
            const item = (this.tm.portfolio || []).find((p) => p.name === name);
            if (item?.githubRepo) repoInput.value = item.githubRepo;
          },
        },
      );
    }
  }

  _refreshMilestoneSelect() {
    const milestoneSelect = document.getElementById("sidenavTaskMilestone");
    if (!milestoneSelect) return;
    const currentVal = milestoneSelect.value;
    const selectedProject = document.getElementById("sidenavTaskProject")?.value || "";
    const allMilestones = this.tm.milestones || [];
    const filtered = selectedProject
      ? allMilestones.filter((m) => !m.project || m.project === selectedProject)
      : allMilestones;
    const names = Array.from(
      new Set(filtered.map((m) => m.name).filter(Boolean))
    ).sort();
    milestoneSelect.innerHTML =
      '<option value="">— No milestone —</option>' +
      names.map((n) => `<option value="${n}">${n}</option>`).join("");
    if (currentVal && names.includes(currentVal)) milestoneSelect.value = currentVal;
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
    setValue("sidenavTaskGithubRepo", cfg.githubRepo || "");
    setValue("sidenavTaskGithubIssue", cfg.githubIssue ?? "");
    setValue("sidenavTaskGithubPR", cfg.githubPR ?? "");

    // Reset badges — user can click "Fetch status" to refresh
    this._resetGitHubBadge();
    this._resetGitHubPRBadge();

    // Due date — always clear first to avoid stale value from a previous edit session
    setValue("sidenavTaskDueDate", "");
    if (cfg.due_date) {
      const dueDate = new Date(cfg.due_date);
      if (!isNaN(dueDate.getTime())) {
        const pad = (n) => String(n).padStart(2, "0");
        const local = `${dueDate.getFullYear()}-${pad(dueDate.getMonth() + 1)}-${pad(dueDate.getDate())}T${pad(dueDate.getHours())}:${pad(dueDate.getMinutes())}`;
        setValue("sidenavTaskDueDate", local);
      }
    }

    // Planned dates
    setValue("sidenavTaskPlannedStart", cfg.planned_start || "");
    setValue("sidenavTaskPlannedEnd", cfg.planned_end || "");

    // Tags — check matching checkboxes in the tag-checkbox-list container
    const tagsContainer = document.getElementById("sidenavTaskTags");
    if (tagsContainer) {
      const tags = Array.isArray(cfg.tags) ? cfg.tags : [];
      tagsContainer.querySelectorAll('input[type="checkbox"]').forEach((cb) => {
        cb.checked = tags.includes(cb.value);
      });
    }

    // Created date
    const createdAtRow = document.getElementById("taskCreatedAtRow");
    const createdAtSpan = document.getElementById("sidenavTaskCreatedAt");
    if (createdAtRow && createdAtSpan) {
      if (task.createdAt) {
        createdAtSpan.textContent = new Date(task.createdAt).toLocaleString(undefined, {
          year: "numeric", month: "short", day: "numeric",
          hour: "2-digit", minute: "2-digit",
        });
        createdAtRow.classList.remove("hidden");
      } else {
        createdAtRow.classList.add("hidden");
      }
    }

    // Comments — show section and render thread when editing
    const commentsSection = document.getElementById("taskCommentsSection");
    if (commentsSection) commentsSection.classList.remove("hidden");
    this._renderCommentThread(task);
  }

  clearForm() {
    const form = document.getElementById("sidenavTaskForm");
    if (form) form.reset();

    // Clear dependencies display
    const deps = document.getElementById("sidenavSelectedDependencies");
    if (deps) deps.innerHTML = "";

    // Hide comments section (only shown when editing)
    const commentsSection = document.getElementById("taskCommentsSection");
    if (commentsSection) commentsSection.classList.add("hidden");
    const thread = document.getElementById("taskCommentThread");
    if (thread) thread.innerHTML = "";
    const commentInput = document.getElementById("taskCommentInput");
    if (commentInput) commentInput.value = "";

    this._resetGitHubBadge();
    this._resetGitHubPRBadge();
    this.pendingAttachments = [];
    document.getElementById("taskCreatedAtRow")?.classList.add("hidden");
  }

  async handleSubmit() {
    const getValue = (id) => {
      const el = document.getElementById(id);
      return el ? el.value : "";
    };

    const getSelectedValues = (id) => {
      const el = document.getElementById(id);
      if (!el) return [];
      // Checkbox list (tag-checkbox-list div)
      const checkboxes = el.querySelectorAll('input[type="checkbox"]');
      if (checkboxes.length > 0) {
        return Array.from(checkboxes).filter((c) => c.checked).map((c) =>
          c.value
        );
      }
      // Fallback: legacy <select multiple>
      return Array.from(el.options ?? []).filter((o) => o.selected).map((o) =>
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
      tags: getSelectedValues("sidenavTaskTags"),
      githubRepo: getValue("sidenavTaskGithubRepo") || null,
      githubIssue: getValue("sidenavTaskGithubIssue")
        ? parseInt(getValue("sidenavTaskGithubIssue"))
        : null,
      githubPR: getValue("sidenavTaskGithubPR")
        ? parseInt(getValue("sidenavTaskGithubPR"))
        : null,
    };

    try {
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

  // --- GitHub helpers ---

  _resetGitHubBadge() {
    const badge = document.getElementById("githubIssueBadge");
    const result = document.getElementById("githubActionResult");
    if (badge) badge.classList.add("hidden");
    if (result) { result.textContent = ""; result.classList.add("hidden"); }
    this._currentIssueState = null;
  }

  /** Resolve effective repo from the task's githubRepo field */
  _resolveRepo() {
    const taskRepo = document.getElementById("sidenavTaskGithubRepo")?.value?.trim();
    return taskRepo || null;
  }

  _resetGitHubPRBadge() {
    const badge = document.getElementById("githubPRBadge");
    if (badge) badge.classList.add("hidden");
  }

  async fetchGitHubPRStatus() {
    const prInput = document.getElementById("sidenavTaskGithubPR");
    const badge = document.getElementById("githubPRBadge");
    const stateEl = document.getElementById("githubPRState");
    const linkEl = document.getElementById("githubPRLink");
    const btn = document.getElementById("sidenavFetchPRBtn");

    const prNum = parseInt(prInput?.value);
    if (!prNum) { showToast("Enter a PR number first", "error"); return; }

    const repo = this._resolveRepo();
    if (!repo || !repo.includes("/")) {
      showToast("Set a GitHub repo first", "error");
      return;
    }
    const [owner, repoName] = repo.split("/");
    if (btn) { btn.disabled = true; btn.textContent = "Fetching..."; }

    try {
      const pr = await GitHubAPI.getPR(owner, repoName, prNum);
      const stateClass = pr.merged
        ? "github-pr-merged"
        : pr.state === "open"
        ? "github-pr-open"
        : "github-pr-closed";
      const stateText = pr.merged ? "merged" : pr.state;
      if (stateEl) {
        stateEl.textContent = stateText;
        stateEl.className = `github-pr-badge ${stateClass}`;
      }
      if (linkEl) linkEl.href = pr.htmlUrl;
      if (badge) badge.classList.remove("hidden");
    } catch (err) {
      showToast(
        err?.message?.includes("404")
          ? `PR #${prNum} not found`
          : "Failed to fetch PR",
        "error",
      );
    } finally {
      if (btn) { btn.disabled = false; btn.textContent = "Fetch PR status"; }
    }
  }

  async fetchGitHubIssueStatus() {
    const issueInput = document.getElementById("sidenavTaskGithubIssue");
    const badge = document.getElementById("githubIssueBadge");
    const stateEl = document.getElementById("githubIssueState");
    const linkEl = document.getElementById("githubIssueLink");
    const result = document.getElementById("githubActionResult");
    const btn = document.getElementById("sidenavFetchIssueBtn");

    const issueNum = parseInt(issueInput?.value);
    if (!issueNum) { showToast("Enter an issue number first", "error"); return; }

    const repo = this._resolveRepo();
    if (!repo || !repo.includes("/")) {
      showToast("Set a GitHub repo (task field or project default)", "error");
      return;
    }

    const [owner, repoName] = repo.split("/");
    if (btn) { btn.disabled = true; btn.textContent = "Fetching..."; }

    try {
      const issue = await GitHubAPI.getIssue(owner, repoName, issueNum);
      if (stateEl) {
        stateEl.textContent = issue.state;
        stateEl.className = `github-issue-badge github-issue-${issue.state}`;
      }
      if (linkEl) linkEl.href = issue.htmlUrl;
      this._currentIssueState = issue.state;
      const stateBtn = document.getElementById("sidenavIssueStateBtn");
      if (stateBtn) stateBtn.textContent = issue.state === "open" ? "Close issue" : "Reopen issue";
      if (badge) badge.classList.remove("hidden");
    } catch (err) {
      if (result) {
        result.textContent = err?.message?.includes("404")
          ? `Issue #${issueNum} not found`
          : "Failed to fetch issue";
        result.className = "text-xs text-error";
        result.classList.remove("hidden");
      }
    } finally {
      if (btn) { btn.disabled = false; btn.textContent = "Fetch status"; }
    }
  }

  async toggleGitHubIssueState() {
    if (!this._currentIssueState) return;
    const issueInput = document.getElementById("sidenavTaskGithubIssue");
    const stateEl = document.getElementById("githubIssueState");
    const stateBtn = document.getElementById("sidenavIssueStateBtn");
    const issueNum = parseInt(issueInput?.value);
    if (!issueNum) return;

    const repo = this._resolveRepo();
    if (!repo || !repo.includes("/")) {
      showToast("Set a GitHub repo first", "error");
      return;
    }
    const [owner, repoName] = repo.split("/");
    const newState = this._currentIssueState === "open" ? "closed" : "open";

    if (stateBtn) { stateBtn.disabled = true; stateBtn.textContent = "Updating…"; }

    try {
      const issue = await GitHubAPI.setIssueState(owner, repoName, issueNum, newState);
      this._currentIssueState = issue.state;
      if (stateEl) {
        stateEl.textContent = issue.state;
        stateEl.className = `github-issue-badge github-issue-${issue.state}`;
      }
      if (stateBtn) stateBtn.textContent = issue.state === "open" ? "Close issue" : "Reopen issue";
      showToast(`Issue #${issueNum} ${issue.state === "closed" ? "closed" : "reopened"}`, "success");
    } catch (err) {
      showToast(`Failed: ${err?.message || "GitHub API error"}`, "error");
    } finally {
      if (stateBtn) stateBtn.disabled = false;
    }
  }

  async createGitHubIssue() {
    const title = document.getElementById("sidenavTaskTitleInput")?.value?.trim();
    const body = document.getElementById("sidenavTaskDescription")?.value?.trim() || "";
    const result = document.getElementById("githubActionResult");
    const btn = document.getElementById("sidenavCreateIssueBtn");

    if (!title) { showToast("Add a task title first", "error"); return; }

    const repo = this._resolveRepo();
    if (!repo || !repo.includes("/")) {
      showToast("Set a GitHub repo (task field or project default)", "error");
      return;
    }

    const [owner, repoName] = repo.split("/");
    if (btn) { btn.disabled = true; btn.textContent = "Creating..."; }

    try {
      const created = await GitHubAPI.createIssue(owner, repoName, title, body);

      // Save issue number to the task field immediately
      const issueInput = document.getElementById("sidenavTaskGithubIssue");
      if (issueInput) issueInput.value = created.number;

      // Set repo field if it was resolved from default (so it gets saved)
      const repoInput = document.getElementById("sidenavTaskGithubRepo");
      if (repoInput && !repoInput.value.trim()) repoInput.value = repo;

      // If editing an existing task, persist immediately
      if (this.editingTask) {
        await TasksAPI.update(this.editingTask.id, {
          githubIssue: created.number,
          githubRepo: repo,
        });
        showToast(`Issue #${created.number} created`, "success");
      } else {
        showToast(`Issue #${created.number} created — save task to link it`, "success");
      }

      if (result) {
        result.innerHTML = `Created <a href="${created.htmlUrl}" target="_blank" rel="noopener noreferrer" class="text-info hover:underline">#${created.number}</a>`;
        result.className = "text-xs text-success";
        result.classList.remove("hidden");
      }
    } catch (err) {
      if (result) {
        result.textContent = `Failed: ${err?.message || "GitHub API error"}`;
        result.className = "text-xs text-error";
        result.classList.remove("hidden");
      }
    } finally {
      if (btn) { btn.disabled = false; btn.textContent = "Create GitHub issue from task"; }
    }
  }

  // --- Comment thread ---

  _renderCommentThread(task) {
    const thread = document.getElementById("taskCommentThread");
    if (!thread) return;

    // Populate author select from people registry, restore last selection
    const authorSelect = document.getElementById("taskCommentAuthorInput");
    if (authorSelect) {
      const people = Array.from(this.tm.peopleMap?.values() ?? []);
      const saved = localStorage.getItem("commentAuthorName") ?? "";
      authorSelect.innerHTML = people
        .map((p) => `<option value="${p.name}"${p.name === saved ? " selected" : ""}>${p.name}</option>`)
        .join("");
      // If saved name not in list, prepend it as a custom option
      if (saved && !people.some((p) => p.name === saved)) {
        authorSelect.innerHTML =
          `<option value="${saved}" selected>${saved}</option>` +
          authorSelect.innerHTML;
      }
      if (!authorSelect.value && people.length > 0) {
        authorSelect.value = people[0].name;
      }
    }

    const comments = task?.config?.comments ?? [];
    if (comments.length === 0) {
      thread.innerHTML = `<p class="task-comment-empty">No comments yet.</p>`;
      return;
    }

    thread.innerHTML = comments.map((c) => {
      const author = c.author ?? "Anonymous";
      const ts = c.timestamp
        ? new Date(c.timestamp).toLocaleString(undefined, {
            year: "numeric", month: "short", day: "numeric",
            hour: "2-digit", minute: "2-digit",
          })
        : "";
      return `
        <div class="task-comment" data-comment-id="${c.id}" data-raw-body="${escapeHtml(c.body ?? "")}">
          <div class="task-comment-meta">
            <span class="task-comment-author">${author}</span>
            <span class="task-comment-timestamp">${ts}</span>
            <button type="button" class="task-comment-edit" data-edit-comment="${c.id}" title="Edit comment">&#9998;</button>
            <button type="button" class="task-comment-delete" data-delete-comment="${c.id}" title="Delete comment">&times;</button>
          </div>
          <div class="task-comment-body">${this._formatCommentBody(c.body)}</div>
        </div>
      `;
    }).join("");
  }

  _handleEditComment(commentId) {
    const commentEl = document.querySelector(`[data-comment-id="${commentId}"]`);
    if (!commentEl) return;
    const bodyEl = commentEl.querySelector(".task-comment-body");
    // Use raw markdown stored in data attribute, not rendered textContent
    const current = commentEl.dataset.rawBody ?? "";

    bodyEl.innerHTML = `
      <textarea class="form-textarea task-comment-edit-textarea" rows="2">${escapeHtml(current)}</textarea>
      <div class="task-comment-edit-actions">
        <button type="button" class="btn-secondary" data-save-comment="${commentId}">Save</button>
        <button type="button" class="btn-ghost" data-cancel-edit-comment="${commentId}">Cancel</button>
      </div>
    `;
    commentEl.querySelector("textarea")?.focus();
  }

  async _handleSaveComment(commentId) {
    if (!this.editingTask || !commentId) return;
    const commentEl = document.querySelector(`[data-comment-id="${commentId}"]`);
    const textarea = commentEl?.querySelector("textarea");
    const body = textarea?.value?.trim();
    if (!body) return;

    try {
      const res = await TasksAPI.updateComment(this.editingTask.id, commentId, body);
      if (!res.ok) throw new Error("Failed to update comment");

      const updated = await TasksAPI.fetchOne(this.editingTask.id);
      if (updated) {
        this.editingTask = updated;
        this._renderCommentThread(updated);
      }
      showToast("Comment updated", "success");
    } catch {
      showToast("Failed to update comment", "error");
    }
  }

  async _handleAddComment() {
    if (!this.editingTask) return;
    const input = document.getElementById("taskCommentInput");
    const body = input?.value?.trim();
    if (!body) return;

    const author = document.getElementById("taskCommentAuthorInput")?.value?.trim() || undefined;

    const btn = document.getElementById("taskCommentSubmitBtn");
    if (btn) { btn.disabled = true; btn.textContent = "Adding…"; }

    try {
      const res = await TasksAPI.addComment(this.editingTask.id, body, author);
      if (!res.ok) throw new Error("Failed to add comment");

      input.value = "";
      // Re-fetch the task so the comment thread reflects the saved state
      const updated = await TasksAPI.fetchOne(this.editingTask.id);
      if (updated) {
        this.editingTask = updated;
        this._renderCommentThread(updated);
      }
      showToast("Comment added", "success");
    } catch {
      showToast("Failed to add comment", "error");
    } finally {
      if (btn) { btn.disabled = false; btn.textContent = "Add Comment"; }
    }
  }

  async _handleDeleteComment(commentId) {
    if (!this.editingTask || !commentId) return;

    const confirmed = await showConfirm("Delete this comment?");
    if (!confirmed) return;

    try {
      const res = await TasksAPI.deleteComment(this.editingTask.id, commentId);
      if (!res.ok) throw new Error("Failed to delete comment");

      const updated = await TasksAPI.fetchOne(this.editingTask.id);
      if (updated) {
        this.editingTask = updated;
        this._renderCommentThread(updated);
      }
    } catch {
      showToast("Failed to delete comment", "error");
    }
  }

  // --- @mention helpers ---

  /**
   * Format a comment body: escape HTML, then highlight @name mentions.
   * @param {string} body
   * @returns {string} safe HTML
   */
  _formatCommentBody(body) {
    return markdownToHtml(String(body ?? ""));
  }

  /** Attach @mention autocomplete to the comment textarea. */
  _attachMentionAutocomplete() {
    const textarea = document.getElementById("taskCommentInput");
    if (!textarea || textarea._mentionBound) return;
    textarea._mentionBound = true;

    // Create dropdown element (appended once)
    let dropdown = document.getElementById("mentionDropdown");
    if (!dropdown) {
      dropdown = document.createElement("div");
      dropdown.id = "mentionDropdown";
      dropdown.className = "mention-dropdown hidden";
      document.body.appendChild(dropdown);
    }

    const close = () => dropdown.classList.add("hidden");

    textarea.addEventListener("input", (e) => {
      const val = textarea.value;
      const pos = textarea.selectionStart;
      // Find the last @ before the cursor
      const before = val.slice(0, pos);
      const match = before.match(/@([\w.-]*)$/);
      if (!match) { close(); return; }

      const query = match[1].toLowerCase();
      const people = Array.from(this.tm.peopleMap?.values() ?? []);
      const filtered = people.filter((p) =>
        p.name.toLowerCase().includes(query)
      ).slice(0, 6);

      if (filtered.length === 0) { close(); return; }

      // Position dropdown near textarea
      const rect = textarea.getBoundingClientRect();
      dropdown.style.top = `${rect.bottom + window.scrollY + 4}px`;
      dropdown.style.left = `${rect.left + window.scrollX}px`;
      dropdown.style.minWidth = `${Math.max(rect.width * 0.6, 160)}px`;

      dropdown.innerHTML = filtered.map((p) =>
        `<div class="mention-option" data-name="${p.name}">${p.name}</div>`
      ).join("");
      dropdown.classList.remove("hidden");
    });

    textarea.addEventListener("keydown", (e) => {
      if (dropdown.classList.contains("hidden")) return;
      const items = dropdown.querySelectorAll(".mention-option");
      if (e.key === "Escape") { e.preventDefault(); close(); return; }
      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        e.preventDefault();
        const active = dropdown.querySelector(".mention-option.active");
        const idx = active ? Array.from(items).indexOf(active) : -1;
        const next = e.key === "ArrowDown"
          ? Math.min(idx + 1, items.length - 1)
          : Math.max(idx - 1, 0);
        items.forEach((el, i) => el.classList.toggle("active", i === next));
        return;
      }
      if (e.key === "Enter" || e.key === "Tab") {
        const active = dropdown.querySelector(".mention-option.active") || items[0];
        if (active) { e.preventDefault(); this._insertMention(textarea, active.dataset.name, dropdown); }
      }
    });

    dropdown.addEventListener("click", (e) => {
      const opt = e.target.closest(".mention-option");
      if (opt) this._insertMention(textarea, opt.dataset.name, dropdown);
    });

    document.addEventListener("click", (e) => {
      if (!dropdown.contains(e.target) && e.target !== textarea) close();
    }, { capture: true });
  }

  _insertMention(textarea, name, dropdown) {
    const val = textarea.value;
    const pos = textarea.selectionStart;
    const before = val.slice(0, pos);
    const atIdx = before.lastIndexOf("@");
    const after = val.slice(pos);
    textarea.value = before.slice(0, atIdx) + `@${name} ` + after;
    const newPos = atIdx + name.length + 2;
    textarea.setSelectionRange(newPos, newPos);
    dropdown.classList.add("hidden");
    textarea.focus();
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
