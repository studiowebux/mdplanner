import { StrategicLevelsAPI, MilestonesAPI } from "../api.js";
import { escapeHtml } from "../utils.js";

/**
 * StrategicLevelsModule - Handles Strategic Levels Builder
 * (Vision, Mission, Goals, Objectives, Strategies, Tactics hierarchy)
 */
export class StrategicLevelsModule {
  constructor(taskManager) {
    this.taskManager = taskManager;
  }

  async load() {
    try {
      this.taskManager.strategicLevelsBuilders =
        await StrategicLevelsAPI.fetchAll();
      this.renderSelector();
      if (
        this.taskManager.strategicLevelsBuilders.length > 0 &&
        !this.taskManager.selectedStrategicBuilderId
      ) {
        this.select(this.taskManager.strategicLevelsBuilders[0].id);
      } else if (this.taskManager.selectedStrategicBuilderId) {
        this.select(this.taskManager.selectedStrategicBuilderId);
      } else {
        this.renderView(null);
      }
    } catch (error) {
      console.error("Error loading strategic levels builders:", error);
    }
  }

  renderSelector() {
    const selector = document.getElementById("strategicLevelsSelector");
    if (!selector) return;
    selector.innerHTML = '<option value="">Select Strategy</option>';
    this.taskManager.strategicLevelsBuilders.forEach((builder) => {
      const option = document.createElement("option");
      option.value = builder.id;
      option.textContent = builder.title;
      if (builder.id === this.taskManager.selectedStrategicBuilderId)
        option.selected = true;
      selector.appendChild(option);
    });
  }

  select(builderId) {
    this.taskManager.selectedStrategicBuilderId = builderId;
    const selector = document.getElementById("strategicLevelsSelector");
    if (selector) selector.value = builderId;
    const builder = this.taskManager.strategicLevelsBuilders.find(
      (b) => b.id === builderId,
    );
    this.renderView(builder);

    const editBtn = document.getElementById("editStrategicLevelsBtn");
    const deleteBtn = document.getElementById("deleteStrategicLevelsBtn");
    if (builder) {
      editBtn?.classList.remove("hidden");
      deleteBtn?.classList.remove("hidden");
    } else {
      editBtn?.classList.add("hidden");
      deleteBtn?.classList.add("hidden");
    }
  }

  renderView(builder) {
    const emptyState = document.getElementById("emptyStrategicLevelsState");
    const treeContainer = document.getElementById("strategicLevelsTree");

    if (!builder) {
      emptyState?.classList.remove("hidden");
      treeContainer?.classList.add("hidden");
      return;
    }

    emptyState?.classList.add("hidden");
    treeContainer?.classList.remove("hidden");

    if (this.taskManager.strategicViewMode === "pyramid") {
      this.renderPyramid(builder, treeContainer);
    } else {
      this.renderTree(builder, treeContainer);
    }
  }

  setViewMode(mode) {
    this.taskManager.strategicViewMode = mode;
    const builder = this.taskManager.strategicLevelsBuilders.find(
      (b) => b.id === this.taskManager.selectedStrategicBuilderId,
    );
    this.renderView(builder);

    document.querySelectorAll(".strategic-view-toggle").forEach((btn) => {
      btn.classList.remove("bg-gray-200", "dark:bg-gray-600");
      if (btn.dataset.mode === mode) {
        btn.classList.add("bg-gray-200", "dark:bg-gray-600");
      }
    });
  }

  buildTree(levels) {
    const levelOrder = [
      "vision",
      "mission",
      "goals",
      "objectives",
      "strategies",
      "tactics",
    ];
    const roots = [];
    const nodeMap = new Map();

    levels.forEach((level) => {
      nodeMap.set(level.id, { ...level, children: [] });
    });

    levels.forEach((level) => {
      const node = nodeMap.get(level.id);
      if (level.parentId && nodeMap.has(level.parentId)) {
        nodeMap.get(level.parentId).children.push(node);
      } else {
        roots.push(node);
      }
    });

    roots.sort(
      (a, b) => levelOrder.indexOf(a.level) - levelOrder.indexOf(b.level),
    );
    const sortChildren = (node) => {
      node.children.sort((a, b) => (a.order || 0) - (b.order || 0));
      node.children.forEach(sortChildren);
    };
    roots.forEach(sortChildren);

    return roots;
  }

  renderNode(node, allLevels, depth = 0, isLast = true, prefix = "") {
    const levelLabels = {
      vision: "Vision",
      mission: "Mission",
      goals: "Goal",
      objectives: "Objective",
      strategies: "Strategy",
      tactics: "Tactic",
    };
    const levelColors = {
      vision: "border-l-purple-500",
      mission: "border-l-blue-500",
      goals: "border-l-green-500",
      objectives: "border-l-yellow-500",
      strategies: "border-l-orange-500",
      tactics: "border-l-red-500",
    };

    const progress = this.calculateProgress(node, allLevels);
    const childLevelType = this.getChildLevelType(node.level);
    const linkedCount =
      (node.linkedTasks?.length || 0) + (node.linkedMilestones?.length || 0);
    const hasChildren = node.children && node.children.length > 0;

    let html = `
      <div class="strategic-tree-node" style="margin-left: ${depth * 24}px;">
        ${depth > 0 ? `<div class="strategic-tree-connector">${isLast ? "\u2514" : "\u251C"}\u2500</div>` : ""}
        <div class="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3 border-l-4 ${levelColors[node.level]} border border-gray-200 dark:border-gray-600 mb-2">
          <div class="flex items-start justify-between">
            <div class="flex-1">
              <div class="flex items-center gap-2 flex-wrap">
                <span class="text-xs px-1.5 py-0.5 rounded bg-gray-200 dark:bg-gray-600 text-gray-600 dark:text-gray-300">${levelLabels[node.level]}</span>
                <span class="font-medium text-gray-900 dark:text-gray-100">${escapeHtml(node.title)}</span>
                <span class="text-xs text-gray-500 dark:text-gray-400">(${Math.round(progress)}%)</span>
              </div>
              ${node.description ? `<p class="text-sm text-gray-600 dark:text-gray-400 mt-1">${escapeHtml(node.description)}</p>` : ""}
              ${linkedCount > 0 ? `<div class="text-xs text-gray-500 dark:text-gray-400 mt-1">Linked: ${node.linkedTasks?.length || 0} tasks, ${node.linkedMilestones?.length || 0} milestones</div>` : ""}
              <div class="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-1.5 mt-2">
                <div class="bg-gray-900 dark:bg-gray-100 h-1.5 rounded-full" style="width: ${progress}%"></div>
              </div>
            </div>
            <div class="flex items-center gap-1 ml-4 flex-shrink-0">
              <button onclick="taskManager.openStrategicLevelModal('${node.level}', '${node.id}')"
                      class="text-xs text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 px-2 py-1 rounded hover:bg-gray-200 dark:hover:bg-gray-600">Edit</button>
              <button onclick="taskManager.deleteStrategicLevel('${node.id}')"
                      class="text-xs text-red-600 dark:text-red-400 hover:text-red-900 dark:hover:text-red-200 px-2 py-1 rounded hover:bg-red-100 dark:hover:bg-red-900/20">Delete</button>
              <button onclick="taskManager.openStrategicLinkModal('${node.id}')"
                      class="text-xs text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 px-2 py-1 rounded hover:bg-gray-200 dark:hover:bg-gray-600">Link</button>
              ${
                childLevelType
                  ? `
              <button onclick="taskManager.openStrategicLevelModal('${childLevelType}', null, '${node.id}')"
                      class="text-xs text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 px-2 py-1 rounded hover:bg-gray-200 dark:hover:bg-gray-600">+ ${levelLabels[childLevelType]}</button>
              `
                  : ""
              }
            </div>
          </div>
        </div>
      </div>
    `;

    if (hasChildren) {
      node.children.forEach((child, idx) => {
        const childIsLast = idx === node.children.length - 1;
        html += this.renderNode(child, allLevels, depth + 1, childIsLast, prefix);
      });
    }

    return html;
  }

  renderTree(builder, container) {
    const hasVision = builder.levels.some((l) => l.level === "vision");
    let html = "";

    if (!hasVision) {
      html += `
        <div class="flex justify-center py-4">
          <button onclick="taskManager.openStrategicLevelModal('vision')"
                  class="btn-primary py-2 px-4 rounded-lg">+ Add Vision</button>
        </div>
      `;
    }

    const tree = this.buildTree(builder.levels);
    tree.forEach((root, idx) => {
      html += this.renderNode(root, builder.levels, 0, idx === tree.length - 1);
    });

    container.innerHTML = html;
  }

  renderPyramid(builder, container) {
    const levelOrder = [
      "vision",
      "mission",
      "goals",
      "objectives",
      "strategies",
      "tactics",
    ];
    const levelLabels = {
      vision: "Vision",
      mission: "Mission",
      goals: "Goals",
      objectives: "Objectives",
      strategies: "Strategies",
      tactics: "Tactics",
    };
    const pyramidWidths = {
      vision: "max-w-sm",
      mission: "max-w-md",
      goals: "max-w-lg",
      objectives: "max-w-xl",
      strategies: "max-w-2xl",
      tactics: "max-w-3xl",
    };

    const hasVision = builder.levels.some((l) => l.level === "vision");
    let html = "";

    if (!hasVision) {
      html += `
        <div class="flex justify-center py-4">
          <button onclick="taskManager.openStrategicLevelModal('vision')"
                  class="btn-primary py-2 px-4 rounded-lg">+ Add Vision</button>
        </div>
      `;
    }

    html += '<div class="strategic-pyramid">';

    for (const levelType of levelOrder) {
      const levelsOfType = builder.levels
        .filter((l) => l.level === levelType)
        .sort((a, b) => (a.order || 0) - (b.order || 0));

      if (levelsOfType.length === 0) continue;

      html += `
        <div class="pyramid-row ${pyramidWidths[levelType]} mx-auto mb-3">
          <div class="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2 text-center">${levelLabels[levelType]}</div>
          <div class="flex flex-wrap justify-center gap-2">
      `;

      for (const level of levelsOfType) {
        const progress = this.calculateProgress(level, builder.levels);
        const childLevelType = this.getChildLevelType(levelType);

        html += `
          <div class="pyramid-card bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3 border border-gray-200 dark:border-gray-600 flex-1 min-w-[140px] max-w-[200px]">
            <div class="text-center">
              <div class="font-medium text-gray-900 dark:text-gray-100 text-sm truncate" title="${escapeHtml(level.title)}">${escapeHtml(level.title)}</div>
              <div class="text-xs text-gray-500 dark:text-gray-400 mt-1">${Math.round(progress)}%</div>
              <div class="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-1 mt-2">
                <div class="bg-gray-900 dark:bg-gray-100 h-1 rounded-full" style="width: ${progress}%"></div>
              </div>
              <div class="flex justify-center gap-1 mt-2">
                <button onclick="taskManager.openStrategicLevelModal('${levelType}', '${level.id}')"
                        class="text-xs text-gray-500 hover:text-gray-700 dark:hover:text-gray-300">Edit</button>
                <button onclick="taskManager.openStrategicLinkModal('${level.id}')"
                        class="text-xs text-gray-500 hover:text-gray-700 dark:hover:text-gray-300">Link</button>
                ${
                  childLevelType
                    ? `
                <button onclick="taskManager.openStrategicLevelModal('${childLevelType}', null, '${level.id}')"
                        class="text-xs text-gray-500 hover:text-gray-700 dark:hover:text-gray-300">+</button>
                `
                    : ""
                }
              </div>
            </div>
          </div>
        `;
      }

      html += `
          </div>
        </div>
      `;
    }

    html += "</div>";
    container.innerHTML = html;
  }

  getChildLevelType(parentLevel) {
    const levelOrder = [
      "vision",
      "mission",
      "goals",
      "objectives",
      "strategies",
      "tactics",
    ];
    const idx = levelOrder.indexOf(parentLevel);
    return idx < levelOrder.length - 1 ? levelOrder[idx + 1] : null;
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

  calculateProgress(level, allLevels) {
    const linkedTasks = (level.linkedTasks || [])
      .map((id) => this.findTaskInArray(this.taskManager.tasks, id))
      .filter(Boolean);
    const linkedMilestones = (level.linkedMilestones || [])
      .map((id) => this.taskManager.milestones?.find((m) => m.id === id))
      .filter(Boolean);

    let directProgress = 0;
    let directCount = linkedTasks.length + linkedMilestones.length;

    if (directCount > 0) {
      const tasksDone = linkedTasks.filter((t) => t.completed).length;
      const milestonesDone = linkedMilestones.filter(
        (m) => m.status === "closed",
      ).length;
      directProgress = (tasksDone + milestonesDone) / directCount;
    }

    // Get children progress (rollup)
    const children = allLevels.filter((l) => l.parentId === level.id);
    if (children.length === 0) return directProgress * 100;

    const childrenProgress = children.map((c) =>
      this.calculateProgress(c, allLevels),
    );
    const avgChildProgress =
      childrenProgress.reduce((a, b) => a + b, 0) / children.length;

    // Combine direct + children (weighted if both exist)
    if (directCount > 0 && children.length > 0) {
      return directProgress * 100 * 0.3 + avgChildProgress * 0.7;
    }
    return directCount > 0 ? directProgress * 100 : avgChildProgress;
  }

  findTaskInArray(tasks, id) {
    for (const task of tasks) {
      if (task.id === id) return task;
      if (task.children) {
        const found = this.findTaskInArray(task.children, id);
        if (found) return found;
      }
    }
    return null;
  }

  flattenTasks(tasks) {
    const result = [];
    const collect = (taskList) => {
      for (const task of taskList) {
        result.push(task);
        if (task.children) collect(task.children);
      }
    };
    collect(tasks);
    return result;
  }

  // Builder modal methods
  openBuilderModal(editId = null) {
    const modal = document.getElementById("strategicLevelsModal");
    const title = document.getElementById("strategicLevelsModalTitle");
    document.getElementById("strategicLevelsTitle").value = "";
    document.getElementById("strategicLevelsDate").value = new Date()
      .toISOString()
      .split("T")[0];

    if (editId) {
      this.taskManager.editingStrategicBuilderId = editId;
      const builder = this.taskManager.strategicLevelsBuilders.find(
        (b) => b.id === editId,
      );
      if (builder) {
        document.getElementById("strategicLevelsTitle").value = builder.title;
        document.getElementById("strategicLevelsDate").value = builder.date;
      }
      title.textContent = "Edit Strategy";
    } else {
      this.taskManager.editingStrategicBuilderId = null;
      title.textContent = "New Strategy";
    }

    modal?.classList.remove("hidden");
    modal?.classList.add("flex");
    document.getElementById("strategicLevelsTitle").focus();
  }

  closeBuilderModal() {
    const modal = document.getElementById("strategicLevelsModal");
    modal?.classList.add("hidden");
    modal?.classList.remove("flex");
    this.taskManager.editingStrategicBuilderId = null;
  }

  async saveBuilder(e) {
    e.preventDefault();
    const titleEl = document.getElementById("strategicLevelsTitle");
    const dateEl = document.getElementById("strategicLevelsDate");
    const title = titleEl.value.trim();
    const date = dateEl.value;

    if (!title) return;

    try {
      if (this.taskManager.editingStrategicBuilderId) {
        await StrategicLevelsAPI.update(
          this.taskManager.editingStrategicBuilderId,
          { title, date },
        );
      } else {
        const response = await StrategicLevelsAPI.create({ title, date });
        const newBuilder = await response.json();
        this.taskManager.selectedStrategicBuilderId = newBuilder.id;
      }
      this.closeBuilderModal();
      await this.load();
    } catch (error) {
      console.error("Error saving strategic levels builder:", error);
    }
  }

  editBuilder() {
    if (!this.taskManager.selectedStrategicBuilderId) return;
    this.openBuilderModal(this.taskManager.selectedStrategicBuilderId);
  }

  async deleteBuilder() {
    if (!this.taskManager.selectedStrategicBuilderId) return;
    if (!confirm("Are you sure you want to delete this strategy?")) return;

    try {
      await StrategicLevelsAPI.delete(
        this.taskManager.selectedStrategicBuilderId,
      );
      this.taskManager.selectedStrategicBuilderId = null;
      await this.load();
    } catch (error) {
      console.error("Error deleting strategic builder:", error);
    }
  }

  // Level modal methods
  openLevelModal(levelType, editId = null, parentId = null) {
    const modal = document.getElementById("strategicLevelModal");
    const title = document.getElementById("strategicLevelModalTitle");
    const typeSelect = document.getElementById("strategicLevelType");
    const parentGroup = document.getElementById("strategicLevelParentGroup");
    const parentSelect = document.getElementById("strategicLevelParent");

    document.getElementById("strategicLevelTitle").value = "";
    document.getElementById("strategicLevelDescription").value = "";
    typeSelect.value = levelType;

    this.taskManager.strategicLevelParentId = parentId;
    this.taskManager.strategicLevelType = levelType;

    // Populate parent options
    const builder = this.taskManager.strategicLevelsBuilders.find(
      (b) => b.id === this.taskManager.selectedStrategicBuilderId,
    );
    parentSelect.innerHTML = '<option value="">None (Root)</option>';

    if (builder) {
      const parentLevelType = this.getParentLevelType(levelType);
      if (parentLevelType) {
        const potentialParents = builder.levels.filter(
          (l) => l.level === parentLevelType,
        );
        potentialParents.forEach((p) => {
          const option = document.createElement("option");
          option.value = p.id;
          option.textContent = p.title;
          if (p.id === parentId) option.selected = true;
          parentSelect.appendChild(option);
        });
      }
    }

    // Show/hide parent group based on level type
    if (levelType === "vision") {
      parentGroup?.classList.add("hidden");
    } else {
      parentGroup?.classList.remove("hidden");
    }

    if (editId) {
      this.taskManager.editingStrategicLevelId = editId;
      const level = builder?.levels.find((l) => l.id === editId);
      if (level) {
        document.getElementById("strategicLevelTitle").value = level.title;
        document.getElementById("strategicLevelDescription").value =
          level.description || "";
        typeSelect.value = level.level;
        parentSelect.value = level.parentId || "";
      }
      title.textContent = "Edit Level";
    } else {
      this.taskManager.editingStrategicLevelId = null;
      title.textContent = "Add Level";
    }

    modal?.classList.remove("hidden");
    modal?.classList.add("flex");
    document.getElementById("strategicLevelTitle").focus();
  }

  closeLevelModal() {
    const modal = document.getElementById("strategicLevelModal");
    modal?.classList.add("hidden");
    modal?.classList.remove("flex");
    this.taskManager.editingStrategicLevelId = null;
    this.taskManager.strategicLevelParentId = null;
    this.taskManager.strategicLevelType = null;
  }

  async saveLevel(e) {
    e.preventDefault();
    if (!this.taskManager.selectedStrategicBuilderId) return;

    const title = document.getElementById("strategicLevelTitle").value.trim();
    const description = document
      .getElementById("strategicLevelDescription")
      .value.trim();
    const level = document.getElementById("strategicLevelType").value;
    const parentId =
      document.getElementById("strategicLevelParent").value || undefined;

    if (!title) return;

    try {
      if (this.taskManager.editingStrategicLevelId) {
        await StrategicLevelsAPI.updateLevel(
          this.taskManager.selectedStrategicBuilderId,
          this.taskManager.editingStrategicLevelId,
          { title, description, level, parentId },
        );
      } else {
        await StrategicLevelsAPI.createLevel(
          this.taskManager.selectedStrategicBuilderId,
          { title, description, level, parentId },
        );
      }
      this.closeLevelModal();
      await this.load();
    } catch (error) {
      console.error("Error saving strategic level:", error);
    }
  }

  async deleteLevel(levelId) {
    if (!this.taskManager.selectedStrategicBuilderId || !levelId) return;

    const builder = this.taskManager.strategicLevelsBuilders.find(
      (b) => b.id === this.taskManager.selectedStrategicBuilderId,
    );
    if (!builder) return;

    const children = builder.levels.filter((l) => l.parentId === levelId);
    if (children.length > 0) {
      const childNames = children.map((c) => c.title).join(", ");
      if (
        !confirm(
          `This level has ${children.length} child level(s): ${childNames}.\n\nDeleting will also remove all children. Continue?`,
        )
      ) {
        return;
      }
    } else {
      if (!confirm("Are you sure you want to delete this level?")) return;
    }

    try {
      await StrategicLevelsAPI.deleteLevel(
        this.taskManager.selectedStrategicBuilderId,
        levelId,
      );
      await this.load();
    } catch (error) {
      console.error("Error deleting strategic level:", error);
    }
  }

  // Link modal methods
  async openLinkModal(levelId) {
    this.taskManager.linkingStrategicLevelId = levelId;
    const modal = document.getElementById("strategicLinkModal");
    const tasksContainer = document.getElementById("strategicLinkTasks");
    const milestonesContainer = document.getElementById(
      "strategicLinkMilestones",
    );

    const builder = this.taskManager.strategicLevelsBuilders.find(
      (b) => b.id === this.taskManager.selectedStrategicBuilderId,
    );
    const level = builder?.levels.find((l) => l.id === levelId);

    // Render task checkboxes
    const allTasks = this.flattenTasks(this.taskManager.tasks);
    tasksContainer.innerHTML =
      allTasks.length > 0
        ? allTasks
            .map(
              (task) => `
      <label class="flex items-center gap-2 p-1 hover:bg-gray-50 dark:hover:bg-gray-700 rounded cursor-pointer">
        <input type="checkbox" class="strategic-link-task rounded" value="${task.id}"
               ${level?.linkedTasks?.includes(task.id) ? "checked" : ""}>
        <span class="text-sm text-gray-700 dark:text-gray-300 ${task.completed ? "line-through" : ""}">${escapeHtml(task.title)}</span>
      </label>
    `,
            )
            .join("")
        : '<p class="text-sm text-gray-500 dark:text-gray-400 p-2">No tasks available</p>';

    // Render milestone checkboxes
    try {
      const milestones = await MilestonesAPI.fetchAll();
      milestonesContainer.innerHTML =
        milestones.length > 0
          ? milestones
              .map(
                (m) => `
        <label class="flex items-center gap-2 p-1 hover:bg-gray-50 dark:hover:bg-gray-700 rounded cursor-pointer">
          <input type="checkbox" class="strategic-link-milestone rounded" value="${m.id}"
                 ${level?.linkedMilestones?.includes(m.id) ? "checked" : ""}>
          <span class="text-sm text-gray-700 dark:text-gray-300">${escapeHtml(m.name)}</span>
        </label>
      `,
              )
              .join("")
          : '<p class="text-sm text-gray-500 dark:text-gray-400 p-2">No milestones available</p>';
    } catch (error) {
      milestonesContainer.innerHTML =
        '<p class="text-sm text-gray-500 dark:text-gray-400 p-2">Error loading milestones</p>';
    }

    modal?.classList.remove("hidden");
    modal?.classList.add("flex");
  }

  closeLinkModal() {
    const modal = document.getElementById("strategicLinkModal");
    modal?.classList.add("hidden");
    modal?.classList.remove("flex");
    this.taskManager.linkingStrategicLevelId = null;
  }

  async saveLinks() {
    if (
      !this.taskManager.selectedStrategicBuilderId ||
      !this.taskManager.linkingStrategicLevelId
    ) {
      return;
    }

    const linkedTasks = Array.from(
      document.querySelectorAll(".strategic-link-task:checked"),
    ).map((cb) => cb.value);
    const linkedMilestones = Array.from(
      document.querySelectorAll(".strategic-link-milestone:checked"),
    ).map((cb) => cb.value);

    try {
      await StrategicLevelsAPI.updateLevel(
        this.taskManager.selectedStrategicBuilderId,
        this.taskManager.linkingStrategicLevelId,
        { linkedTasks, linkedMilestones },
      );
      this.closeLinkModal();
      await this.load();
    } catch (error) {
      console.error("Error saving strategic links:", error);
    }
  }

  bindEvents() {
    // View button
    document
      .getElementById("strategicLevelsViewBtn")
      ?.addEventListener("click", () => {
        this.taskManager.switchView("strategicLevels");
        document.getElementById("viewSelectorDropdown")?.classList.add("hidden");
      });

    // Builder modal events
    document
      .getElementById("addStrategicLevelsBtn")
      ?.addEventListener("click", () => this.openBuilderModal());
    document
      .getElementById("cancelStrategicLevelsBtn")
      ?.addEventListener("click", () => this.closeBuilderModal());
    document
      .getElementById("strategicLevelsForm")
      ?.addEventListener("submit", (e) => this.saveBuilder(e));

    // Builder selector
    document
      .getElementById("strategicLevelsSelector")
      ?.addEventListener("change", (e) => this.select(e.target.value));
    document
      .getElementById("editStrategicLevelsBtn")
      ?.addEventListener("click", () => this.editBuilder());
    document
      .getElementById("deleteStrategicLevelsBtn")
      ?.addEventListener("click", () => this.deleteBuilder());

    // Level modal events
    document
      .getElementById("cancelStrategicLevelBtn")
      ?.addEventListener("click", () => this.closeLevelModal());
    document
      .getElementById("strategicLevelForm")
      ?.addEventListener("submit", (e) => this.saveLevel(e));

    // Link modal events
    document
      .getElementById("cancelStrategicLinkBtn")
      ?.addEventListener("click", () => this.closeLinkModal());
    document
      .getElementById("saveStrategicLinkBtn")
      ?.addEventListener("click", () => this.saveLinks());

    // Close modals on background click
    document.getElementById("strategicLevelsModal")?.addEventListener("click", (e) => {
      if (e.target.id === "strategicLevelsModal") {
        this.closeBuilderModal();
      }
    });
    document.getElementById("strategicLevelModal")?.addEventListener("click", (e) => {
      if (e.target.id === "strategicLevelModal") {
        this.closeLevelModal();
      }
    });
    document.getElementById("strategicLinkModal")?.addEventListener("click", (e) => {
      if (e.target.id === "strategicLinkModal") {
        this.closeLinkModal();
      }
    });
  }
}
