import { ProjectAPI } from "./api.js";

/**
 * ProjectsModule - Handles project display and version checking
 * Pattern: Module pattern with single responsibility
 */
export class ProjectsModule {
  constructor(taskManager) {
    this.tm = taskManager;
  }

  async checkVersion() {
    try {
      const data = await ProjectAPI.getVersion();
      document.getElementById("versionDisplay").textContent =
        `MD Planner v${data.current}`;
      if (data.updateAvailable) {
        document.getElementById("updateBadge").classList.remove("hidden");
        document.getElementById("updateBadge").textContent =
          `v${data.latest} available`;
      }
      if (data.readOnly) {
        document.getElementById("readOnlyBadge").classList.remove("hidden");
      }
    } catch (error) {
      console.error("Error checking version:", error);
    }
  }

  async load() {
    try {
      const activeData = await ProjectAPI.getActiveProject();
      const projectName = activeData.name || "Unnamed Project";

      // Desktop project name
      const nameEl = document.getElementById("projectName");
      if (nameEl) {
        nameEl.textContent = projectName;
        nameEl.title = projectName;
      }

      // Mobile project name
      const nameMobileEl = document.getElementById("projectNameMobile");
      if (nameMobileEl) {
        nameMobileEl.textContent = projectName;
      }
    } catch (error) {
      console.error("Error loading project:", error);
    }
  }

  resetAllState() {
    const tm = this.tm;

    // Core
    tm.tasks = [];
    tm.filteredTasks = [];
    tm.projectInfo = null;
    tm.projectConfig = null;
    tm.sections = [];

    // Notes
    tm.notes = [];
    tm.activeNote = null;
    tm.editingNote = null;
    tm.noteEditMode = false;
    tm.notesLoaded = false;
    tm.enhancedMode = false;
    tm.previewMode = true;
    tm.multiSelectMode = false;
    tm.selectedParagraphs = [];
    tm.activeTabState = {};

    // Goals
    tm.goals = [];
    tm.editingGoal = null;
    tm.currentGoalFilter = "all";

    // Retrospectives
    tm.retrospectives = [];
    tm.editingRetrospectiveId = null;

    // SWOT
    tm.swotAnalyses = [];
    tm.selectedSwotId = null;
    tm.editingSwotId = null;
    tm.swotItemQuadrant = null;

    // Risk
    tm.riskAnalyses = [];
    tm.selectedRiskId = null;
    tm.editingRiskId = null;
    tm.riskItemQuadrant = null;

    // Lean Canvas
    tm.leanCanvases = [];
    tm.selectedLeanCanvasId = null;
    tm.editingLeanCanvasId = null;
    tm.leanCanvasSection = null;

    // Business Model
    tm.businessModelCanvases = [];
    tm.selectedBusinessModelId = null;
    tm.editingBusinessModelId = null;
    tm.businessModelSection = null;

    // Project Value
    tm.projectValueBoards = [];
    tm.selectedProjectValueId = null;
    tm.editingProjectValueId = null;
    tm.projectValueSection = null;

    // Briefs
    tm.briefs = [];
    tm.selectedBriefId = null;
    tm.editingBriefId = null;
    tm.briefSection = null;

    // Capacity
    tm.capacityPlans = [];
    tm.selectedCapacityPlanId = null;
    tm.editingCapacityPlanId = null;
    tm.capacityTab = "team";
    tm.allocWeekOffset = 0;
    tm.editingAllocationId = null;
    tm.editingAllocationMemberId = null;
    tm.editingAllocationWeek = null;
    tm.editingTeamMemberId = null;
    tm.autoAssignSuggestions = [];

    // Time Tracking
    tm.timeEntries = {};

    // Strategic Levels
    tm.strategicLevelsBuilders = [];
    tm.selectedStrategicBuilderId = null;
    tm.editingStrategicBuilderId = null;
    tm.editingStrategicLevelId = null;
    tm.strategicLevelParentId = null;
    tm.strategicLevelType = null;
    tm.linkingStrategicLevelId = null;
    tm.strategicViewMode = "tree";

    // Canvas
    tm.stickyNotes = [];
    tm.selectedStickyNoteColor = "yellow";
    tm.canvasZoom = 1;
    tm.canvasOffset = { x: 0, y: 0 };

    // Mindmap
    tm.mindmaps = [];
    tm.selectedMindmap = null;
    tm.editingMindmap = null;
    tm.mindmapZoom = 1;
    tm.mindmapOffset = { x: 0, y: 0 };
    tm.currentLayout = "horizontal";

    // C4
    tm.c4Components = [];
    tm.c4Zoom = 1;
    tm.c4Offset = { x: 0, y: 0 };
    tm.c4NavigationStack = [];
    tm.currentC4Level = "context";
    tm.editingC4Component = null;

    // Dependencies & editing
    tm.editingTask = null;
    tm.selectedDependencies = [];

    // List filters
    tm.listFilters = {
      section: "",
      assignee: "",
      milestone: "",
      status: "",
      sort: "default",
    };
  }
}
