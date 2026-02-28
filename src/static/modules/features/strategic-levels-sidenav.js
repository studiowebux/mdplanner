// Strategic Levels Sidenav Module
// Slide-in panel for Strategic Levels Builder, Levels, and Links

import { Sidenav } from "../ui/sidenav.js";
import { MilestonesAPI, StrategicLevelsAPI } from "../api.js";
import { showToast } from "../ui/toast.js";
import { escapeHtml } from "../utils.js";

export class StrategicLevelsSidenavModule {
  constructor(taskManager) {
    this.tm = taskManager;
    this.mode = null; // 'builder', 'level', 'link'
    this.editingBuilderId = null;
    this.editingLevelId = null;
    this.linkingLevelId = null;
    this.currentEntity = null;
    this.parentLevelId = null;
    this.levelType = null;
  }

  bindEvents() {
    document.getElementById("strategicSidenavClose")?.addEventListener(
      "click",
      () => this.close(),
    );
    document.getElementById("strategicSidenavCancel")?.addEventListener(
      "click",
      () => this.close(),
    );
    document.getElementById("strategicSidenavSave")?.addEventListener(
      "click",
      () => this.save(),
    );
    document.getElementById("strategicSidenavDelete")?.addEventListener(
      "click",
      () => this.handleDelete(),
    );
  }

  // === Builder Operations ===
  openNewBuilder() {
    this.mode = "builder";
    this.editingBuilderId = null;
    this.currentEntity = {
      title: "",
      date: new Date().toISOString().split("T")[0],
    };
    this.openPanel("New Strategy");
  }

  openEditBuilder(builderId) {
    const builder = this.tm.strategicLevelsBuilders.find((b) =>
      b.id === builderId
    );
    if (!builder) return;

    this.mode = "builder";
    this.editingBuilderId = builderId;
    this.currentEntity = JSON.parse(JSON.stringify(builder));
    this.openPanel("Edit Strategy");
  }

  // === Level Operations ===
  openNewLevel(levelType, parentId = null) {
    this.mode = "level";
    this.editingLevelId = null;
    this.levelType = levelType;
    this.parentLevelId = parentId;
    this.currentEntity = {
      title: "",
      description: "",
      level: levelType,
      parentId: parentId,
    };
    const levelLabels = {
      vision: "Vision",
      mission: "Mission",
      goals: "Goal",
      objectives: "Objective",
      strategies: "Strategy",
      tactics: "Tactic",
    };
    this.openPanel(`New ${levelLabels[levelType] || "Level"}`);
  }

  openEditLevel(levelId) {
    const builder = this.tm.strategicLevelsBuilders.find((b) =>
      b.id === this.tm.selectedStrategicBuilderId
    );
    if (!builder) return;
    const level = builder.levels.find((l) => l.id === levelId);
    if (!level) return;

    this.mode = "level";
    this.editingLevelId = levelId;
    this.levelType = level.level;
    this.parentLevelId = level.parentId;
    this.currentEntity = JSON.parse(JSON.stringify(level));
    const levelLabels = {
      vision: "Vision",
      mission: "Mission",
      goals: "Goal",
      objectives: "Objective",
      strategies: "Strategy",
      tactics: "Tactic",
    };
    this.openPanel(`Edit ${levelLabels[level.level] || "Level"}`);
  }

  // === Link Operations ===
  async openLinkPanel(levelId) {
    this.mode = "link";
    this.linkingLevelId = levelId;

    const builder = this.tm.strategicLevelsBuilders.find((b) =>
      b.id === this.tm.selectedStrategicBuilderId
    );
    const level = builder?.levels.find((l) => l.id === levelId);

    this.currentEntity = {
      linkedTasks: level?.linkedTasks || [],
      linkedMilestones: level?.linkedMilestones || [],
    };

    this.openPanel("Link Tasks & Milestones");
  }

  openPanel(title) {
    document.getElementById("strategicSidenavHeader").textContent = title;
    this.renderContent();

    // Show delete button only for edit operations
    const showDelete = (this.mode === "builder" && this.editingBuilderId) ||
      (this.mode === "level" && this.editingLevelId);
    document.getElementById("strategicSidenavDelete").classList.toggle(
      "hidden",
      !showDelete,
    );

    Sidenav.open("strategicSidenav");
  }

  close() {
    Sidenav.close("strategicSidenav");
    this.mode = null;
    this.editingBuilderId = null;
    this.editingLevelId = null;
    this.linkingLevelId = null;
    this.currentEntity = null;
    this.parentLevelId = null;
    this.levelType = null;
  }

  renderContent() {
    const container = document.getElementById("strategicSidenavContent");
    if (!container) return;

    switch (this.mode) {
      case "builder":
        container.innerHTML = this.renderBuilderForm();
        break;
      case "level":
        container.innerHTML = this.renderLevelForm();
        break;
      case "link":
        container.innerHTML = this.renderLinkForm();
        this.loadLinkOptions();
        break;
      default:
        container.innerHTML = '<div class="text-muted">Unknown mode</div>';
    }

  }

  renderBuilderForm() {
    const b = this.currentEntity;
    return `
      <div class="sidenav-section">
        <div class="form-group">
          <label class="form-label">Strategy Title *</label>
          <input type="text" id="strategicSidenavTitle" class="form-input" value="${
      escapeHtml(b.title || "")
    }" required placeholder="e.g., 2026 Annual Strategy">
        </div>
        <div class="form-group">
          <label class="form-label">Date</label>
          <input type="date" id="strategicSidenavDate" class="form-input" value="${
      b.date || ""
    }">
        </div>
      </div>
    `;
  }

  renderLevelForm() {
    const l = this.currentEntity;
    const levelLabels = {
      vision: "Vision",
      mission: "Mission",
      goals: "Goal",
      objectives: "Objective",
      strategies: "Strategy",
      tactics: "Tactic",
    };
    const levelTypes = [
      "vision",
      "mission",
      "goals",
      "objectives",
      "strategies",
      "tactics",
    ];

    // Get potential parents based on level type
    const builder = this.tm.strategicLevelsBuilders.find((b) =>
      b.id === this.tm.selectedStrategicBuilderId
    );
    const parentLevelType = this.getParentLevelType(l.level);
    const potentialParents =
      builder?.levels.filter((p) => p.level === parentLevelType) || [];

    return `
      <div class="sidenav-section">
        <div class="form-group">
          <label class="form-label">Title *</label>
          <input type="text" id="strategicSidenavLevelTitle" class="form-input" value="${
      escapeHtml(l.title || "")
    }" required>
        </div>
        <div class="sidenav-grid">
          <div class="form-group">
            <label class="form-label">Level Type</label>
            <select id="strategicSidenavLevelType" class="form-input" onchange="taskManager.strategicLevelsSidenavModule.onLevelTypeChange(this.value)">
              ${
      levelTypes.map((t) =>
        `<option value="${t}" ${t === l.level ? "selected" : ""}>${
          levelLabels[t]
        }</option>`
      ).join("")
    }
            </select>
          </div>
          <div class="form-group" id="strategicSidenavParentGroup" ${
      l.level === "vision" ? 'style="display:none"' : ""
    }>
            <label class="form-label">Parent</label>
            <select id="strategicSidenavParent" class="form-input">
              <option value="">None (Root)</option>
              ${
      potentialParents.map((p) =>
        `<option value="${p.id}" ${p.id === l.parentId ? "selected" : ""}>${
          escapeHtml(p.title)
        }</option>`
      ).join("")
    }
            </select>
          </div>
        </div>
        <div class="form-group">
          <label class="form-label">Description</label>
          <textarea id="strategicSidenavLevelDescription" class="form-input" rows="4">${
      escapeHtml(l.description || "")
    }</textarea>
        </div>
      </div>
    `;
  }

  renderLinkForm() {
    return `
      <div class="sidenav-section">
        <div class="sidenav-section-title">Linked Tasks</div>
        <div id="strategicSidenavTasks" class="max-h-48 overflow-y-auto border border-default rounded p-2 bg-secondary">
          <div class="text-muted text-sm">Loading...</div>
        </div>
      </div>
      <div class="sidenav-section">
        <div class="sidenav-section-title">Linked Milestones</div>
        <div id="strategicSidenavMilestones" class="max-h-48 overflow-y-auto border border-default rounded p-2 bg-secondary">
          <div class="text-muted text-sm">Loading...</div>
        </div>
      </div>
      <div class="sidenav-section">
        <button type="button" onclick="taskManager.strategicLevelsSidenavModule.saveLinks()"
                class="w-full px-4 py-2 bg-inverse text-inverse rounded-md hover:bg-inverse text-sm font-medium">
          Save Links
        </button>
      </div>
    `;
  }

  async loadLinkOptions() {
    const tasksContainer = document.getElementById("strategicSidenavTasks");
    const milestonesContainer = document.getElementById(
      "strategicSidenavMilestones",
    );

    // Render tasks
    const allTasks = this.flattenTasks(this.tm.tasks);
    if (allTasks.length > 0) {
      tasksContainer.innerHTML = allTasks.map((task) => `
        <label class="flex items-center gap-2 p-1 hover:bg-tertiary rounded cursor-pointer">
          <input type="checkbox" class="link-checkbox link-task rounded" value="${task.id}"
                 ${
        this.currentEntity.linkedTasks?.includes(task.id) ? "checked" : ""
      }>
          <span class="text-sm text-secondary ${
        task.completed ? "line-through" : ""
      }">${escapeHtml(task.title)}</span>
        </label>
      `).join("");
    } else {
      tasksContainer.innerHTML =
        '<div class="text-muted text-sm italic">No tasks available</div>';
    }

    // Render milestones
    try {
      const milestones = await MilestonesAPI.fetchAll();
      if (milestones.length > 0) {
        milestonesContainer.innerHTML = milestones.map((m) => `
          <label class="flex items-center gap-2 p-1 hover:bg-tertiary rounded cursor-pointer">
            <input type="checkbox" class="link-checkbox link-milestone rounded" value="${m.id}"
                   ${
          this.currentEntity.linkedMilestones?.includes(m.id) ? "checked" : ""
        }>
            <span class="text-sm text-secondary">${
          escapeHtml(m.title || m.name)
        }</span>
          </label>
        `).join("");
      } else {
        milestonesContainer.innerHTML =
          '<div class="text-muted text-sm italic">No milestones available</div>';
      }
    } catch (error) {
      milestonesContainer.innerHTML =
        '<div class="text-error text-sm">Error loading milestones</div>';
    }
  }

  flattenTasks(tasks) {
    const result = [];
    const collect = (taskList) => {
      for (const task of taskList) {
        result.push(task);
        if (task.children) collect(task.children);
      }
    };
    collect(tasks || []);
    return result;
  }

  getParentLevelType(levelType) {
    const levelOrder = [
      "vision",
      "mission",
      "goals",
      "objectives",
      "strategies",
      "tactics",
    ];
    const idx = levelOrder.indexOf(levelType);
    return idx > 0 ? levelOrder[idx - 1] : null;
  }

  onLevelTypeChange(newType) {
    this.levelType = newType;
    const parentGroup = document.getElementById("strategicSidenavParentGroup");
    const parentSelect = document.getElementById("strategicSidenavParent");

    if (newType === "vision") {
      parentGroup.style.display = "none";
      parentSelect.value = "";
    } else {
      parentGroup.style.display = "";
      // Update parent options
      const builder = this.tm.strategicLevelsBuilders.find((b) =>
        b.id === this.tm.selectedStrategicBuilderId
      );
      const parentLevelType = this.getParentLevelType(newType);
      const potentialParents = builder?.levels.filter((p) =>
        p.level === parentLevelType
      ) || [];

      parentSelect.innerHTML = '<option value="">None (Root)</option>' +
        potentialParents.map((p) =>
          `<option value="${p.id}">${escapeHtml(p.title)}</option>`
        ).join("");
    }
  }

  getFormData() {
    switch (this.mode) {
      case "builder":
        return {
          title:
            document.getElementById("strategicSidenavTitle")?.value.trim() ||
            "",
          date: document.getElementById("strategicSidenavDate")?.value || "",
        };

      case "level":
        return {
          title: document.getElementById("strategicSidenavLevelTitle")?.value
            .trim() || "",
          description:
            document.getElementById("strategicSidenavLevelDescription")?.value
              .trim() || "",
          level: document.getElementById("strategicSidenavLevelType")?.value ||
            this.levelType,
          parentId: document.getElementById("strategicSidenavParent")?.value ||
            undefined,
        };

      default:
        return {};
    }
  }

  async save() {
    const data = this.getFormData();

    // Validate required fields
    if (!data.title) {
      this.showSaveStatus("Title required");
      return;
    }

    try {
      if (this.mode === "builder") {
        if (this.editingBuilderId) {
          await StrategicLevelsAPI.update(this.editingBuilderId, data);
          this.showSaveStatus("Saved");
        } else {
          const response = await StrategicLevelsAPI.create(data);
          const result = await response.json();
          this.editingBuilderId = result.id;
          this.tm.selectedStrategicBuilderId = result.id;
          this.showSaveStatus("Created");
          document.getElementById("strategicSidenavDelete").classList.remove(
            "hidden",
          );
        }
      } else if (this.mode === "level") {
        if (!this.tm.selectedStrategicBuilderId) {
          this.showSaveStatus("No builder selected");
          return;
        }

        if (this.editingLevelId) {
          await StrategicLevelsAPI.updateLevel(
            this.tm.selectedStrategicBuilderId,
            this.editingLevelId,
            data,
          );
          this.showSaveStatus("Saved");
        } else {
          await StrategicLevelsAPI.createLevel(
            this.tm.selectedStrategicBuilderId,
            data,
          );
          this.editingLevelId = true; // Mark as created
          this.showSaveStatus("Created");
          document.getElementById("strategicSidenavDelete").classList.remove(
            "hidden",
          );
        }
      }

      await this.tm.strategicLevelsModule?.load();
    } catch (error) {
      console.error(`Error saving ${this.mode}:`, error);
      this.showSaveStatus("Error");
      showToast(`Error saving ${this.mode}`, "error");
    }
  }

  async saveLinks() {
    if (!this.tm.selectedStrategicBuilderId || !this.linkingLevelId) {
      showToast("No level selected for linking", "error");
      return;
    }

    const linkedTasks = Array.from(
      document.querySelectorAll(".link-task:checked"),
    ).map((cb) => cb.value);
    const linkedMilestones = Array.from(
      document.querySelectorAll(".link-milestone:checked"),
    ).map((cb) => cb.value);

    try {
      await StrategicLevelsAPI.updateLevel(
        this.tm.selectedStrategicBuilderId,
        this.linkingLevelId,
        { linkedTasks, linkedMilestones },
      );
      showToast("Links saved", "success");
      await this.tm.strategicLevelsModule?.load();
      this.close();
    } catch (error) {
      console.error("Error saving links:", error);
      showToast("Error saving links", "error");
    }
  }

  async handleDelete() {
    try {
      if (this.mode === "builder" && this.editingBuilderId) {
        if (!confirm("Delete this strategy? This will remove all levels.")) {
          return;
        }
        await StrategicLevelsAPI.delete(this.editingBuilderId);
        this.tm.selectedStrategicBuilderId = null;
        showToast("Strategy deleted", "success");
      } else if (this.mode === "level" && this.editingLevelId) {
        // Check for children
        const builder = this.tm.strategicLevelsBuilders.find((b) =>
          b.id === this.tm.selectedStrategicBuilderId
        );
        const children = builder?.levels.filter((l) =>
          l.parentId === this.editingLevelId
        ) || [];

        if (children.length > 0) {
          if (
            !confirm(
              `This level has ${children.length} child level(s). Deleting will also remove all children. Continue?`,
            )
          ) return;
        } else {
          if (!confirm("Delete this level?")) return;
        }

        await StrategicLevelsAPI.deleteLevel(
          this.tm.selectedStrategicBuilderId,
          this.editingLevelId,
        );
        showToast("Level deleted", "success");
      }

      await this.tm.strategicLevelsModule?.load();
      this.close();
    } catch (error) {
      console.error(`Error deleting ${this.mode}:`, error);
      showToast(`Error deleting ${this.mode}`, "error");
    }
  }

  showSaveStatus(text) {
    const statusEl = document.getElementById("strategicSidenavSaveStatus");
    if (!statusEl) return;

    statusEl.textContent = text;
    statusEl.classList.remove(
      "hidden",
      "sidenav-status-saved",
      "sidenav-status-saving",
      "sidenav-status-error",
    );

    if (text === "Saved" || text === "Created") {
      statusEl.classList.add("sidenav-status-saved");
    } else if (text === "Error" || text.includes("required")) {
      statusEl.classList.add("sidenav-status-error");
    } else {
      statusEl.classList.add("sidenav-status-saving");
    }

    if (text === "Saved" || text === "Created" || text === "Error") {
      setTimeout(() => statusEl.classList.add("hidden"), 2000);
    }
  }
}

export default StrategicLevelsSidenavModule;
