// Config View Module
import { ProjectAPI } from "../api.js";
import { AccessibilityManager } from "../ui/accessibility.js";

/**
 * Project configuration - sections, assignees, tags management
 */
export class ConfigView {
  /** @param {TaskManager} taskManager */
  constructor(taskManager) {
    this.tm = taskManager;
  }

  async render() {
    await this.tm.loadProjectConfig();
    this.renderUI();
    this.updateStats();
  }

  updateStats() {
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

    document.getElementById("configTotalTasks").textContent = allTasks.length;
    document.getElementById("configTotalSections").textContent =
      this.tm.projectConfig?.sections?.length || 0;
    document.getElementById("configTotalAssignees").textContent =
      this.tm.peopleMap?.size || 0;
    document.getElementById("configTotalTags").textContent =
      this.tm.projectConfig?.tags?.length || 0;
  }

  renderUI() {
    if (!this.tm.projectConfig) return;

    this.renderSections();
    this.renderTags();
    this.renderFeatures();
    this.renderAccessibilitySettings();
  }

  renderAccessibilitySettings() {
    // Set current values
    const reducedMotion = document.getElementById("accessibilityReducedMotion");
    const highContrast = document.getElementById("accessibilityHighContrast");
    const largeTargets = document.getElementById("accessibilityLargeTargets");
    const showBreadcrumbs = document.getElementById(
      "accessibilityShowBreadcrumbs",
    );

    if (reducedMotion) {
      reducedMotion.value = AccessibilityManager.get("reducedMotion");
    }
    if (highContrast) {
      highContrast.checked = AccessibilityManager.get("highContrast");
    }
    if (largeTargets) {
      largeTargets.checked = AccessibilityManager.get("largeTargets");
    }
    if (showBreadcrumbs) {
      showBreadcrumbs.checked = AccessibilityManager.get("showBreadcrumbs");
    }
  }

  renderSections() {
    const container = document.getElementById("sectionsContainer");
    container.innerHTML = "";

    const sections = this.tm.sections || [];
    sections.forEach((section, index) => {
      const div = document.createElement("div");
      div.className =
        "flex items-center gap-2 p-2 bg-secondary rounded border";
      div.innerHTML = `
                <span class="flex-1 text-primary">${section}</span>
                <div class="flex gap-1">
                    ${
        index > 0
          ? `<button onclick="taskManager.configView.moveSectionUp(${index})" class="p-1 text-muted hover:text-secondary" title="Move Up">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 15l7-7 7 7"></path>
                        </svg>
                    </button>`
          : ""
      }
                    ${
        index < sections.length - 1
          ? `<button onclick="taskManager.configView.moveSectionDown(${index})" class="p-1 text-muted hover:text-secondary" title="Move Down">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
                        </svg>
                    </button>`
          : ""
      }
                    <button onclick="taskManager.configView.removeSection(${index})" class="p-1 text-error hover:text-error-text" title="Remove">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                        </svg>
                    </button>
                </div>
            `;
      container.appendChild(div);
    });
  }

  renderTags() {
    const container = document.getElementById("tagsContainer");
    container.innerHTML = "";

    const tags = this.tm.projectConfig.tags || [];
    tags.forEach((tag, index) => {
      const chip = document.createElement("div");
      chip.className =
        "inline-flex items-center px-3 py-1 rounded-full text-sm bg-success-bg text-success-text";
      chip.innerHTML = `
                <span>${tag}</span>
                <button onclick="taskManager.configView.removeTag(${index})" class="ml-2 text-success hover:text-success-text">
                    <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                    </svg>
                </button>
            `;
      container.appendChild(chip);
    });
  }

  async addSection() {
    const input = document.getElementById("newSectionInput");
    const sectionName = input.value.trim();

    if (sectionName && !this.tm.sections.includes(sectionName)) {
      // Add section to local array
      this.tm.sections.push(sectionName);
      input.value = "";
      this.renderSections();
      this.updateStats();

      // Rewrite the markdown file to include the new section
      await this.rewriteTasksWithUpdatedSections();

      // Refresh summary view if it's currently active
      if (this.tm.currentView === "summary") {
        this.tm.renderSummaryView();
      }
    }
  }

  async removeSection(index) {
    const remainingSections = this.tm.sections.filter((_, i) => i !== index);
    const targetSection = remainingSections.length > 0
      ? remainingSections[0]
      : "Backlog";

    if (
      confirm(
        `Are you sure you want to remove this section? Tasks in this section will be moved to "${targetSection}".`,
      )
    ) {
      const removedSection = this.tm.sections[index];
      this.tm.sections.splice(index, 1);

      // Move tasks from removed section to first remaining section or Backlog
      await this.moveTasksFromSection(removedSection, targetSection);

      this.renderSections();
      this.updateStats();
      // Rewrite tasks to remove old section headers
      await this.rewriteTasksWithUpdatedSections();
    }
  }

  async moveSectionUp(index) {
    if (index > 0) {
      const sections = this.tm.sections;
      [sections[index - 1], sections[index]] = [
        sections[index],
        sections[index - 1],
      ];
      this.renderSections();
      // Rewrite tasks to reorder section headers
      await this.rewriteTasksWithUpdatedSections();
    }
  }

  async moveSectionDown(index) {
    const sections = this.tm.sections;
    if (index < sections.length - 1) {
      [sections[index], sections[index + 1]] = [
        sections[index + 1],
        sections[index],
      ];
      this.renderSections();
      // Rewrite tasks to reorder section headers
      await this.rewriteTasksWithUpdatedSections();
    }
  }

  async moveTasksFromSection(fromSection, toSection) {
    const tasksToMove = this.tm.tasks.filter(
      (task) => task.section === fromSection,
    );
    for (const task of tasksToMove) {
      await this.tm.updateTask(task.id, { section: toSection });
    }
    await this.tm.loadTasks();
  }

  async addTag() {
    const input = document.getElementById("newTagInput");
    const tagName = input.value.trim();

    if (tagName && !this.tm.projectConfig.tags.includes(tagName)) {
      this.tm.projectConfig.tags.push(tagName);
      // Sort tags alphabetically
      this.tm.projectConfig.tags.sort();
      input.value = "";
      this.renderTags();
      this.updateStats();
      // Auto-save the configuration
      await this.tm.saveProjectConfig();
    }
  }

  async removeTag(index) {
    this.tm.projectConfig.tags.splice(index, 1);
    this.renderTags();
    this.updateStats();
    // Auto-save the configuration
    await this.tm.saveProjectConfig();
  }

  async rewriteTasksWithUpdatedSections() {
    try {
      // Use the dedicated rewrite endpoint to update section headers
      const response = await ProjectAPI.rewrite({ sections: this.tm.sections });
      if (response.ok) {
        // Reload tasks and sections to reflect changes
        await this.tm.loadTasks();
        await this.tm.loadSections();
      } else {
        console.error("Failed to rewrite tasks with updated sections");
      }
    } catch (error) {
      console.error("Error updating sections in markdown:", error);
    }
  }

  renderFeatures() {
    const container = document.getElementById("featuresContainer");
    if (!container) return;
    container.innerHTML = "";

    const featureGroups = {
      "Summary": [
        { id: "summary", label: "Summary" },
      ],
      "Tasks": [
        { id: "list", label: "List" },
        { id: "board", label: "Board" },
        { id: "timeline", label: "Timeline" },
      ],
      "Planning": [
        { id: "goals", label: "Goals" },
        { id: "milestones", label: "Milestones" },
        { id: "ideas", label: "Ideas" },
        { id: "retrospectives", label: "Retrospectives" },
        { id: "moscow", label: "MoSCoW" },
        { id: "eisenhower", label: "Eisenhower Matrix" },
        { id: "ideaSorter", label: "Idea Sorter" },
      ],
      "Strategy": [
        { id: "swot", label: "SWOT Analysis" },
        { id: "riskAnalysis", label: "Risk Analysis" },
        { id: "leanCanvas", label: "Lean Canvas" },
        { id: "businessModel", label: "Business Model" },
        { id: "projectValue", label: "Value Board" },
        { id: "brief", label: "Brief" },
      ],
      "Finances": [
        { id: "fundraising", label: "Fundraising" },
        { id: "billing", label: "Billing" },
      ],
      "Diagrams": [
        { id: "canvas", label: "Canvas" },
        { id: "mindmap", label: "Mindmap" },
        { id: "c4", label: "C4 Architecture" },
      ],
      "Team": [
        { id: "orgchart", label: "Org Chart" },
        { id: "people", label: "People" },
        { id: "capacity", label: "Capacity" },
        { id: "timeTracking", label: "Time Tracking" },
        { id: "crm", label: "CRM" },
        { id: "onboarding", label: "Onboarding" },
      ],
      "Notes": [
        { id: "notes", label: "Notes" },
        { id: "strategicLevels", label: "Strategic Levels" },
        { id: "meetings", label: "Meetings" },
      ],
      "Portfolio": [
        { id: "portfolio", label: "Portfolio" },
      ],
    };

    const enabledFeatures = this.tm.projectConfig?.features || [];
    const showAll = enabledFeatures.length === 0;

    for (const [group, features] of Object.entries(featureGroups)) {
      const groupDiv = document.createElement("div");

      const groupTitle = document.createElement("h4");
      groupTitle.className = "text-sm font-medium text-secondary mb-2";
      groupTitle.textContent = group;
      groupDiv.appendChild(groupTitle);

      const checkboxes = document.createElement("div");
      checkboxes.className = "space-y-1";

      for (const feature of features) {
        const isEnabled = showAll || enabledFeatures.includes(feature.id);
        const label = document.createElement("label");
        label.className = "flex items-center space-x-2 cursor-pointer";
        label.innerHTML = `
          <input type="checkbox" data-feature="${feature.id}"
            class="feature-checkbox rounded border-strong text-primary focus:ring-1"
            ${isEnabled ? "checked" : ""}>
          <span class="text-sm text-secondary">${feature.label}</span>
        `;
        checkboxes.appendChild(label);
      }

      groupDiv.appendChild(checkboxes);
      container.appendChild(groupDiv);
    }

    // Bind change events via delegation
    container.addEventListener("change", (e) => {
      if (e.target.classList.contains("feature-checkbox")) {
        this.toggleFeature();
      }
    });
  }

  async toggleFeature() {
    const checkboxes = document.querySelectorAll(".feature-checkbox");
    const allChecked = document.querySelectorAll(".feature-checkbox:checked");

    // If all are checked, store empty array (show all)
    if (allChecked.length === checkboxes.length) {
      this.tm.projectConfig.features = [];
    } else {
      const features = [];
      allChecked.forEach((cb) => features.push(cb.dataset.feature));
      this.tm.projectConfig.features = features;
    }

    await this.tm.saveProjectConfig();
  }

  bindEvents() {
    // Save project config button
    document
      .getElementById("saveProjectConfig")
      .addEventListener("click", () => this.tm.saveProjectConfig());

    // Working days dropdown change
    document
      .getElementById("workingDays")
      .addEventListener("change", (e) => {
        const customContainer = document.getElementById("customDaysContainer");
        if (e.target.value === "custom") {
          customContainer.classList.remove("hidden");
        } else {
          customContainer.classList.add("hidden");
        }
      });

    // Section management events
    document
      .getElementById("addSectionBtn")
      .addEventListener("click", () => this.addSection());
    document
      .getElementById("newSectionInput")
      .addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          this.addSection();
        }
      });

    // Tag management events
    document
      .getElementById("addTagBtn")
      .addEventListener("click", () => this.addTag());
    document
      .getElementById("newTagInput")
      .addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          this.addTag();
        }
      });

    // Accessibility settings events
    document
      .getElementById("accessibilityReducedMotion")
      ?.addEventListener("change", (e) => {
        AccessibilityManager.set("reducedMotion", e.target.value);
      });
    document
      .getElementById("accessibilityHighContrast")
      ?.addEventListener("change", (e) => {
        AccessibilityManager.set("highContrast", e.target.checked);
      });
    document
      .getElementById("accessibilityLargeTargets")
      ?.addEventListener("change", (e) => {
        AccessibilityManager.set("largeTargets", e.target.checked);
      });
    document
      .getElementById("accessibilityShowBreadcrumbs")
      ?.addEventListener("change", (e) => {
        AccessibilityManager.set("showBreadcrumbs", e.target.checked);
      });
  }
}
