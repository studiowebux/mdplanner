import { ProjectAPI } from './api.js';

export class ProjectsModule {
  constructor(taskManager) {
    this.tm = taskManager;
  }

  async checkVersion() {
    try {
      const data = await ProjectAPI.getVersion();
      document.getElementById("versionDisplay").textContent = `MD Planner v${data.current}`;
      if (data.updateAvailable) {
        document.getElementById("updateBadge").classList.remove("hidden");
        document.getElementById("updateBadge").textContent = `v${data.latest} available`;
      }
    } catch (error) {
      console.error("Error checking version:", error);
    }
  }

  async load() {
    try {
      const projects = await ProjectAPI.listProjects();
      const activeData = await ProjectAPI.getActiveProject();

      const optionsHtml = projects.map(p =>
        `<option value="${p.filename}" ${p.filename === activeData.filename ? "selected" : ""}>${p.name}</option>`
      ).join("");

      // Desktop selector
      const selector = document.getElementById("projectSelector");
      if (selector) {
        selector.innerHTML = optionsHtml;
        selector.addEventListener("change", (e) => {
          this.switch(e.target.value);
          // Sync mobile selector
          const mobile = document.getElementById("projectSelectorMobile");
          if (mobile) mobile.value = e.target.value;
        });
      }

      // Mobile selector
      const selectorMobile = document.getElementById("projectSelectorMobile");
      if (selectorMobile) {
        selectorMobile.innerHTML = optionsHtml;
        selectorMobile.addEventListener("change", (e) => {
          this.switch(e.target.value);
          // Sync desktop selector
          if (selector) selector.value = e.target.value;
        });
      }
    } catch (error) {
      console.error("Error loading projects:", error);
    }
  }

  async switch(filename) {
    try {
      const response = await ProjectAPI.switchProject(filename);
      if (response.ok) {
        // Reset ALL state for new project
        this.resetAllState();

        // Reload core data
        await this.tm.loadProjectConfig();
        await this.tm.loadSections();
        await this.tm.loadTasks();

        // Reload data for current view
        this.reloadCurrentView();

        // Always render tasks (updates UI elements shared across views)
        this.tm.renderTasks();
      }
    } catch (error) {
      console.error("Error switching project:", error);
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
    tm.currentC4Level = 'context';
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

  reloadCurrentView() {
    const tm = this.tm;
    const view = tm.currentView;

    switch (view) {
      case "summary":
        tm.loadProjectInfo();
        break;
      case "notes":
        tm.loadNotes();
        break;
      case "goals":
        tm.loadGoals();
        break;
      case "milestones":
        tm.loadMilestones();
        break;
      case "ideas":
        tm.loadIdeas();
        break;
      case "retrospectives":
        tm.loadRetrospectives();
        break;
      case "swot":
        tm.loadSwotAnalyses();
        break;
      case "risk":
        tm.loadRiskAnalyses();
        break;
      case "lean-canvas":
        tm.loadLeanCanvases();
        break;
      case "business-model":
        tm.loadBusinessModelCanvases();
        break;
      case "project-value":
        tm.loadProjectValueBoards();
        break;
      case "brief":
        tm.loadBriefs();
        break;
      case "capacity":
        tm.loadCapacityPlans();
        break;
      case "time-tracking":
        tm.loadTimeTracking();
        break;
      case "strategic":
        tm.loadStrategicLevelsBuilders();
        break;
      case "billing":
        tm.loadBillingData();
        break;
      case "canvas":
        tm.loadCanvas();
        break;
      case "mindmap":
        tm.loadMindmaps();
        break;
      case "c4":
        tm.loadC4Components();
        break;
      default:
        // Board, list, timeline views use tasks which are already loaded
        tm.renderTasks();
    }
  }
}
