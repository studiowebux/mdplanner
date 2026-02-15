import { showToast } from './modules/ui/toast.js';
import { ThemeManager } from './modules/ui/theme.js';
import { toggleMobileMenu, closeMobileMenu } from './modules/ui/mobile.js';
import { AccessibilityManager } from './modules/ui/accessibility.js';
import { FocusMode } from './modules/ui/focus-mode.js';
import { Breadcrumb } from './modules/ui/breadcrumb.js';
import { Sidenav } from './modules/ui/sidenav.js';
import { Help } from './modules/ui/help.js';
import { TaskSidenavModule } from './modules/features/task-sidenav.js';
import { TasksAPI, ProjectAPI } from './modules/api.js';
import { markdownToHtml as markdownToHtmlUtil } from './modules/utils.js';
import { SummaryView } from './modules/views/summary.js';
import { ListView } from './modules/views/list.js';
import { BoardView } from './modules/views/board.js';
import { TimelineView } from './modules/views/timeline.js';
import { ConfigView } from './modules/views/config.js';
import { PortfolioView } from './modules/views/portfolio.js';
import { TasksModule } from './modules/features/tasks.js';
import { DependenciesModule } from './modules/dependencies.js';
import { NotesModule } from './modules/features/notes.js';
import { EnhancedNotesModule } from './modules/features/notes-enhanced.js';
import { NoteSidenavModule } from './modules/features/note-sidenav.js';
import { GoalSidenavModule } from './modules/features/goal-sidenav.js';
import { MilestoneSidenavModule } from './modules/features/milestone-sidenav.js';
import { RetrospectiveSidenavModule } from './modules/features/retrospective-sidenav.js';
import { MindmapSidenavModule } from './modules/features/mindmap-sidenav.js';
import { StickyNoteSidenavModule } from './modules/features/sticky-note-sidenav.js';
import { SwotSidenavModule } from './modules/features/swot-sidenav.js';
import { RiskSidenavModule } from './modules/features/risk-sidenav.js';
import { LeanCanvasSidenavModule } from './modules/features/lean-canvas-sidenav.js';
import { BusinessModelSidenavModule } from './modules/features/business-model-sidenav.js';
import { ProjectValueSidenavModule } from './modules/features/project-value-sidenav.js';
import { BriefSidenavModule } from './modules/features/brief-sidenav.js';
import { IdeaSidenavModule } from './modules/features/idea-sidenav.js';
import { C4SidenavModule } from './modules/features/c4-sidenav.js';
import { CapacitySidenavModule } from './modules/features/capacity-sidenav.js';
import { CRMSidenavModule } from './modules/features/crm-sidenav.js';
import { BillingSidenavModule } from './modules/features/billing-sidenav.js';
import { StrategicLevelsSidenavModule } from './modules/features/strategic-levels-sidenav.js';
import { GoalsModule } from './modules/features/goals.js';
import { MilestonesModule } from './modules/features/milestones.js';
import { IdeasModule } from './modules/features/ideas.js';
import { RetrospectivesModule } from './modules/features/retrospectives.js';
import { SwotModule } from './modules/features/swot.js';
import { RiskModule } from './modules/features/risk.js';
import { LeanCanvasModule } from './modules/features/lean-canvas.js';
import { BusinessModelModule } from './modules/features/business-model.js';
import { ProjectValueModule } from './modules/features/project-value.js';
import { BriefModule } from './modules/features/brief.js';
import { CapacityModule } from './modules/features/capacity.js';
import { TimeTrackingModule } from './modules/features/time-tracking.js';
import { StrategicLevelsModule } from './modules/features/strategic-levels.js';
import { BillingModule } from './modules/features/billing.js';
import { CRMModule } from './modules/features/crm.js';
import { CanvasModule } from './modules/features/canvas.js';
import { MindmapModule } from './modules/features/mindmap.js';
import { C4Module } from './modules/features/c4.js';
import { OrgChartModule } from './modules/views/orgchart.js';
import { OrgChartSidenavModule } from './modules/features/orgchart-sidenav.js';
import { PomodoroModule } from './modules/features/pomodoro.js';
import { ImportExportModule } from './modules/import-export.js';
import { ProjectsModule } from './modules/projects.js';

class TaskManager {
  constructor() {
    this.tasks = [];
    this.filteredTasks = [];
    this.searchQuery = "";
    this.projectInfo = null;
    this.projectConfig = null;
    this.sections = [];
    this.currentView = "summary";
    this.editingTask = null;
    this.selectedDependencies = [];
    this.notes = [];
    this.goals = [];
    this.activeNote = null;
    this.editingNote = null;
    this.editingGoal = null;
    this.currentGoalFilter = "all";
    this.noteEditMode = false;
    this.autoSaveTimeout = null;
    this.enhancedMode = false;
    this.previewMode = true;
    this.multiSelectMode = false;
    this.selectedParagraphs = [];
    this.stickyNotes = [];
    this.mindmaps = [];
    this.selectedStickyNoteColor = "yellow";
    this.activeTabState = {}; // Track active tabs for each section
    this.canvasZoom = 1;
    this.canvasOffset = { x: 0, y: 0 };
    this.mindmapZoom = 1;
    this.mindmapOffset = { x: 0, y: 0 };
    this.selectedMindmap = null;
    this.editingMindmap = null;
    this.currentLayout = "horizontal";
    this.resizableEvents = [];
    this.notesLoaded = false;
    this.retrospectives = [];
    this.editingRetrospectiveId = null;
    this.swotAnalyses = [];
    this.selectedSwotId = null;
    this.editingSwotId = null;
    this.swotItemQuadrant = null;
    this.riskAnalyses = [];
    this.selectedRiskId = null;
    this.editingRiskId = null;
    this.riskItemQuadrant = null;
    this.leanCanvases = [];
    this.selectedLeanCanvasId = null;
    this.editingLeanCanvasId = null;
    this.leanCanvasSection = null;
    this.businessModelCanvases = [];
    this.selectedBusinessModelId = null;
    this.editingBusinessModelId = null;
    this.businessModelSection = null;
    this.projectValueBoards = [];
    this.selectedProjectValueId = null;
    this.editingProjectValueId = null;
    this.projectValueSection = null;
    this.briefs = [];
    this.selectedBriefId = null;
    this.editingBriefId = null;
    this.briefSection = null;
    this.capacityPlans = [];
    this.selectedCapacityPlanId = null;
    this.editingCapacityPlanId = null;
    this.capacityTab = "team";
    this.allocWeekOffset = 0;
    this.editingAllocationId = null;
    this.editingAllocationMemberId = null;
    this.editingAllocationWeek = null;
    this.editingTeamMemberId = null;
    this.autoAssignSuggestions = [];
    this.timeEntries = {};
    this.strategicLevelsBuilders = [];
    this.selectedStrategicBuilderId = null;
    this.editingStrategicBuilderId = null;
    this.editingStrategicLevelId = null;
    this.strategicLevelParentId = null;
    this.strategicLevelType = null;
    this.linkingStrategicLevelId = null;
    this.strategicViewMode = "tree";
    this.c4Components = [];
    this.c4Zoom = 1;
    this.c4Offset = { x: 0, y: 0 };
    this.c4NavigationStack = [];
    this.currentC4Level = 'context';
    this.editingC4Component = null;
    this.c4PanningInitialized = false;
    this.c4ForceSimulation = null;
    this.c4AnimationFrame = null;
    this.c4PhysicsEnabled = false; // Disabled by default - causes jumping issues
    this.listFilters = {
      section: "",
      assignee: "",
      milestone: "",
      status: "",
      sort: "default",
    };
    this.pomodoro = {
      duration: 25 * 60,
      timeLeft: 25 * 60,
      isRunning: false,
      worker: null,
      mode: "focus",
      count: 0,
      endTime: null,
    };
    // Initialize view modules
    this.summaryView = new SummaryView(this);
    this.listView = new ListView(this);
    this.boardView = new BoardView(this);
    this.timelineView = new TimelineView(this);
    this.configView = new ConfigView(this);
    this.portfolioView = new PortfolioView(this);

    // Initialize feature modules
    this.tasksModule = new TasksModule(this);
    this.taskSidenavModule = new TaskSidenavModule(this);
    this.dependenciesModule = new DependenciesModule(this);
    this.notesModule = new NotesModule(this);
    this.enhancedNotesModule = new EnhancedNotesModule(this);
    this.noteSidenavModule = new NoteSidenavModule(this);
    this.noteSidenav = this.noteSidenavModule; // Alias for HTML onclick handlers
    this.goalSidenavModule = new GoalSidenavModule(this);
    this.milestoneSidenavModule = new MilestoneSidenavModule(this);
    this.retrospectiveSidenavModule = new RetrospectiveSidenavModule(this);
    this.mindmapSidenavModule = new MindmapSidenavModule(this);
    this.stickyNoteSidenavModule = new StickyNoteSidenavModule(this);
    this.swotSidenavModule = new SwotSidenavModule(this);
    this.riskSidenavModule = new RiskSidenavModule(this);
    this.leanCanvasSidenavModule = new LeanCanvasSidenavModule(this);
    this.businessModelSidenavModule = new BusinessModelSidenavModule(this);
    this.projectValueSidenavModule = new ProjectValueSidenavModule(this);
    this.briefSidenavModule = new BriefSidenavModule(this);
    this.ideaSidenavModule = new IdeaSidenavModule(this);
    this.c4SidenavModule = new C4SidenavModule(this);
    this.capacitySidenavModule = new CapacitySidenavModule(this);
    this.crmSidenavModule = new CRMSidenavModule(this);
    this.billingSidenavModule = new BillingSidenavModule(this);
    this.strategicLevelsSidenavModule = new StrategicLevelsSidenavModule(this);
    this.goalsModule = new GoalsModule(this);
    this.milestonesModule = new MilestonesModule(this);
    this.ideasModule = new IdeasModule(this);
    this.retrospectivesModule = new RetrospectivesModule(this);
    this.swotModule = new SwotModule(this);
    this.riskModule = new RiskModule(this);
    this.leanCanvasModule = new LeanCanvasModule(this);
    this.businessModelModule = new BusinessModelModule(this);
    this.projectValueModule = new ProjectValueModule(this);
    this.briefModule = new BriefModule(this);
    this.capacityModule = new CapacityModule(this);
    this.timeTrackingModule = new TimeTrackingModule(this);
    this.strategicLevelsModule = new StrategicLevelsModule(this);
    this.billingModule = new BillingModule(this);
    this.crmModule = new CRMModule(this);
    this.orgchartModule = new OrgChartModule(this);
    this.orgchartSidenavModule = new OrgChartSidenavModule(this);
    this.canvasModule = new CanvasModule(this);
    this.mindmapModule = new MindmapModule(this);
    this.c4Module = new C4Module(this);
    this.pomodoroModule = new PomodoroModule(this);
    this.pomodoroModule.initWorker();
    this.importExportModule = new ImportExportModule(this);
    this.projectsModule = new ProjectsModule(this);

    this.init();
  }

  async init() {
    ThemeManager.initDarkMode();
    ThemeManager.initFullscreenMode();
    AccessibilityManager.init();
    Sidenav.init();
    Help.init();
    this.bindEvents();
    await this.loadProjects(); // Load projects first
    await this.loadProjectConfig();
    await this.loadSections();
    const savedView = localStorage.getItem("mdplanner_current_view") || "summary";
    this.switchView(savedView);
    await this.loadTasks();
    this.checkTaskHashOnLoad();
    this.checkVersion();
  }

  // Projects functionality - delegated to ProjectsModule
  async checkVersion() {
    return this.projectsModule.checkVersion();
  }

  async loadProjects() {
    return this.projectsModule.load();
  }

  checkTaskHashOnLoad() {
    const hash = window.location.hash;
    if (hash.startsWith("#task=")) {
      const taskId = hash.substring(6); // Remove "#task="
      const task = this.findTaskById(taskId);
      if (task) {
        this.switchView("list");
        this.taskSidenavModule.open(task);
      }
    }
  }

  bindEvents() {
    // View toggle - Desktop
    document
      .getElementById("summaryViewBtn")
      .addEventListener("click", () => this.switchView("summary"));
    document
      .getElementById("listViewBtn")
      .addEventListener("click", () => this.switchView("list"));
    document
      .getElementById("boardViewBtn")
      .addEventListener("click", () => this.switchView("board"));
    document
      .getElementById("timelineViewBtn")
      .addEventListener("click", () => this.switchView("timeline"));
    document
      .getElementById("notesViewBtn")
      .addEventListener("click", () => this.switchView("notes"));
    document
      .getElementById("goalsViewBtn")
      .addEventListener("click", () => this.switchView("goals"));
    document
      .getElementById("configViewBtn")
      .addEventListener("click", () => this.switchView("config"));
    document
      .getElementById("canvasViewBtn")
      .addEventListener("click", () => {
        this.switchView("canvas");
        document.querySelectorAll(".nav-dropdown-menu").forEach(m => m.classList.add("hidden"));
      });
    document
      .getElementById("mindmapViewBtn")
      .addEventListener("click", () => {
        this.switchView("mindmap");
        document.querySelectorAll(".nav-dropdown-menu").forEach(m => m.classList.add("hidden"));
      });
    document
      .getElementById("c4ViewBtn")
      .addEventListener("click", () => {
        this.switchView("c4");
        document.querySelectorAll(".nav-dropdown-menu").forEach(m => m.classList.add("hidden"));
      });

    // Additional desktop view buttons
    const additionalViews = [
      { id: "milestonesViewBtn", view: "milestones" },
      { id: "ideasViewBtn", view: "ideas" },
      { id: "retrospectivesViewBtn", view: "retrospectives" },
      { id: "swotViewBtn", view: "swot" },
      { id: "riskAnalysisViewBtn", view: "riskAnalysis" },
      { id: "leanCanvasViewBtn", view: "leanCanvas" },
      { id: "businessModelViewBtn", view: "businessModel" },
      { id: "projectValueViewBtn", view: "projectValue" },
      { id: "briefViewBtn", view: "brief" },
      { id: "timeTrackingViewBtn", view: "timeTracking" },
      { id: "capacityViewBtn", view: "capacity" },
      { id: "strategicLevelsViewBtn", view: "strategicLevels" },
      { id: "billingViewBtn", view: "billing" },
      { id: "crmViewBtn", view: "crm" },
      { id: "orgchartViewBtn", view: "orgchart" },
      { id: "portfolioViewBtn", view: "portfolio" },
    ];
    additionalViews.forEach(({ id, view }) => {
      document.getElementById(id)?.addEventListener("click", () => {
        this.switchView(view);
        document.querySelectorAll(".nav-dropdown-menu").forEach(m => m.classList.add("hidden"));
      });
    });

    // Navigation dropdowns (multiple category dropdowns)
    document.querySelectorAll(".nav-dropdown").forEach((dropdown) => {
      const btn = dropdown.querySelector(".nav-dropdown-btn");
      const menu = dropdown.querySelector(".nav-dropdown-menu");
      if (btn && menu) {
        btn.addEventListener("click", (e) => {
          e.stopPropagation();
          // Close all other dropdowns first
          document.querySelectorAll(".nav-dropdown-menu").forEach((m) => {
            if (m !== menu) m.classList.add("hidden");
          });
          menu.classList.toggle("hidden");
        });
      }
    });
    // Close dropdowns when clicking outside
    document.addEventListener("click", (e) => {
      if (!e.target.closest(".nav-dropdown")) {
        document.querySelectorAll(".nav-dropdown-menu").forEach((menu) => {
          menu.classList.add("hidden");
        });
      }
    });

    // Mobile menu toggle
    document
      .getElementById("mobileMenuToggle")
      .addEventListener("click", () => this.toggleMobileMenu());

    // View toggle - Mobile
    document
      .getElementById("summaryViewBtnMobile")
      .addEventListener("click", () => {
        this.switchView("summary");
        this.closeMobileMenu();
      });
    document
      .getElementById("listViewBtnMobile")
      .addEventListener("click", () => {
        this.switchView("list");
        this.closeMobileMenu();
      });
    document
      .getElementById("boardViewBtnMobile")
      .addEventListener("click", () => {
        this.switchView("board");
        this.closeMobileMenu();
      });
    document
      .getElementById("timelineViewBtnMobile")
      .addEventListener("click", () => {
        this.switchView("timeline");
        this.closeMobileMenu();
      });
    document
      .getElementById("notesViewBtnMobile")
      .addEventListener("click", () => {
        this.switchView("notes");
        this.closeMobileMenu();
      });
    document
      .getElementById("goalsViewBtnMobile")
      .addEventListener("click", () => {
        this.switchView("goals");
        this.closeMobileMenu();
      });
    document
      .getElementById("configViewBtnMobile")
      .addEventListener("click", () => {
        this.switchView("config");
        this.closeMobileMenu();
      });
    document
      .getElementById("canvasViewBtnMobile")
      .addEventListener("click", () => {
        this.switchView("canvas");
        this.closeMobileMenu();
      });
    document
      .getElementById("mindmapViewBtnMobile")
      .addEventListener("click", () => {
        this.switchView("mindmap");
        this.closeMobileMenu();
      });
    document
      .getElementById("c4ViewBtnMobile")
      .addEventListener("click", () => {
        this.switchView("c4");
        this.closeMobileMenu();
      });
    document
      .getElementById("milestonesViewBtnMobile")
      ?.addEventListener("click", () => {
        this.switchView("milestones");
        this.closeMobileMenu();
      });
    document
      .getElementById("ideasViewBtnMobile")
      ?.addEventListener("click", () => {
        this.switchView("ideas");
        this.closeMobileMenu();
      });
    document
      .getElementById("retrospectivesViewBtnMobile")
      ?.addEventListener("click", () => {
        this.switchView("retrospectives");
        this.closeMobileMenu();
      });
    document
      .getElementById("swotViewBtnMobile")
      ?.addEventListener("click", () => {
        this.switchView("swot");
        this.closeMobileMenu();
      });
    document
      .getElementById("riskAnalysisViewBtnMobile")
      ?.addEventListener("click", () => {
        this.switchView("riskAnalysis");
        this.closeMobileMenu();
      });
    document
      .getElementById("leanCanvasViewBtnMobile")
      ?.addEventListener("click", () => {
        this.switchView("leanCanvas");
        this.closeMobileMenu();
      });
    document
      .getElementById("businessModelViewBtnMobile")
      ?.addEventListener("click", () => {
        this.switchView("businessModel");
        this.closeMobileMenu();
      });
    document
      .getElementById("projectValueViewBtnMobile")
      ?.addEventListener("click", () => {
        this.switchView("projectValue");
        this.closeMobileMenu();
      });
    document
      .getElementById("briefViewBtnMobile")
      ?.addEventListener("click", () => {
        this.switchView("brief");
        this.closeMobileMenu();
      });
    document
      .getElementById("timeTrackingViewBtnMobile")
      ?.addEventListener("click", () => {
        this.switchView("timeTracking");
        this.closeMobileMenu();
      });
    document
      .getElementById("capacityViewBtnMobile")
      ?.addEventListener("click", () => {
        this.switchView("capacity");
        this.closeMobileMenu();
      });
    document
      .getElementById("strategicLevelsViewBtnMobile")
      ?.addEventListener("click", () => {
        this.switchView("strategicLevels");
        this.closeMobileMenu();
      });
    document
      .getElementById("billingViewBtnMobile")
      ?.addEventListener("click", () => {
        this.switchView("billing");
        this.closeMobileMenu();
      });
    document
      .getElementById("crmViewBtnMobile")
      ?.addEventListener("click", () => {
        this.switchView("crm");
        this.closeMobileMenu();
      });
    document
      .getElementById("orgchartViewBtnMobile")
      ?.addEventListener("click", () => {
        this.switchView("orgchart");
        this.closeMobileMenu();
      });
    document
      .getElementById("portfolioViewBtnMobile")
      ?.addEventListener("click", () => {
        this.switchView("portfolio");
        this.closeMobileMenu();
      });

    // Dark mode toggle
    document
      .getElementById("darkModeToggle")
      .addEventListener("click", () => this.toggleDarkMode());
    document
      .getElementById("darkModeToggleMobile")
      ?.addEventListener("click", () => {
        this.toggleDarkMode();
        this.closeMobileMenu();
      });
    document
      .getElementById("pomodoroBtnMobile")
      ?.addEventListener("click", () => {
        this.closeMobileMenu();
        document.getElementById("pomodoroBtn")?.click();
      });
    document
      .getElementById("importExportBtnMobile")
      ?.addEventListener("click", () => {
        this.closeMobileMenu();
        document.getElementById("importExportBtn")?.click();
      });
    document
      .getElementById("fullscreenToggle")
      .addEventListener("click", () => this.toggleFullscreen());

    // Add task - Desktop and Mobile (uses sidenav)
    document
      .getElementById("addTaskBtn")
      .addEventListener("click", () => this.taskSidenavModule.open());
    document
      .getElementById("addTaskBtnMobile")
      .addEventListener("click", () => {
        this.taskSidenavModule.open();
        this.closeMobileMenu();
      });

    // Task sidenav bindings
    this.taskSidenavModule.bindEvents();

    // Note sidenav bindings
    this.noteSidenavModule.bindEvents();

    // Batch 1 sidenav bindings
    this.goalSidenavModule.bindEvents();
    this.milestoneSidenavModule.bindEvents();
    this.retrospectiveSidenavModule.bindEvents();
    this.mindmapSidenavModule.bindEvents();
    this.stickyNoteSidenavModule.bindEvents();

    // Batch 2 sidenav bindings (Analysis Tools)
    this.swotSidenavModule.bindEvents();
    this.riskSidenavModule.bindEvents();
    this.leanCanvasSidenavModule.bindEvents();
    this.businessModelSidenavModule.bindEvents();
    this.projectValueSidenavModule.bindEvents();
    this.briefSidenavModule.bindEvents();

    // Batch 3 sidenav bindings (Ideas & Diagrams)
    this.ideaSidenavModule.bindEvents();
    this.c4SidenavModule.bindEvents();

    // Batch 4 sidenav bindings (Complex modules)
    this.capacitySidenavModule.bindEvents();
    this.crmSidenavModule.bindEvents();
    this.billingSidenavModule.bindEvents();
    this.strategicLevelsSidenavModule.bindEvents();

    // Import/Export operations - delegated to ImportExportModule
    this.importExportModule.bindEvents();

    // Task events - delegated to TasksModule
    this.tasksModule.bindEvents();

    // Config view events - delegated to ConfigView
    this.configView.bindEvents();

    // Summary view events - delegated to SummaryView
    this.summaryView.bindEvents();

    // List view events - delegated to ListView
    this.listView.bindEvents();

    // Working days select in timeline view
    document
      .getElementById("timelineWorkingDays")
      .addEventListener("change", (e) => {
        this.updateWorkingDays(parseInt(e.target.value));
      });

    // Pomodoro timer events - delegated to PomodoroModule
    this.pomodoroModule.bindEvents();

    // Dependency autocomplete events
    this.dependenciesModule.bindEvents();

    // Notes events - delegated to NotesModule
    this.notesModule.bindEvents();

    // Enhanced Notes Events - delegated to EnhancedNotesModule
    this.enhancedNotesModule.bindEvents();

    // Goals events - delegated to GoalsModule
    this.goalsModule.bindEvents();

    // Milestones events - delegated to MilestonesModule
    this.milestonesModule.bindEvents();

    // Ideas events - delegated to IdeasModule
    this.ideasModule.bindEvents();

    // Billing events - delegated to BillingModule
    this.billingModule.bindEvents();

    // CRM events - delegated to CRMModule
    this.crmModule.bindEvents();

    // Org Chart events - delegated to OrgChartModule
    this.orgchartModule.bindEvents();
    this.orgchartSidenavModule.bindEvents();

    // Retrospectives events - delegated to RetrospectivesModule
    this.retrospectivesModule.bindEvents();

    // SWOT Analysis events - delegated to SwotModule
    this.swotModule.bindEvents();

    // Risk Analysis events - delegated to RiskModule
    this.riskModule.bindEvents();

    // Lean Canvas events - delegated to LeanCanvasModule
    this.leanCanvasModule.bindEvents();

    // Business Model Canvas events - delegated to BusinessModelModule
    this.businessModelModule.bindEvents();

    // Project Value Board events - delegated to ProjectValueModule
    this.projectValueModule.bindEvents();

    // Brief events - delegated to BriefModule
    this.briefModule.bindEvents();

    // Time Tracking events - delegated to TimeTrackingModule
    this.timeTrackingModule.bindEvents();

    // Capacity Planning events - delegated to CapacityModule
    this.capacityModule.bindEvents();

    // Strategic Levels events - delegated to StrategicLevelsModule
    this.strategicLevelsModule.bindEvents();

    // Canvas events - delegated to CanvasModule
    this.canvasModule.bindEvents();

    // Mindmap events - delegated to MindmapModule
    this.mindmapModule.bindEvents();

    // C4 Architecture events - delegated to C4Module
    this.c4Module.bindEvents();

    // Portfolio View events - delegated to PortfolioView
    this.portfolioView.bindEvents();

    // Modal close on background click - track mousedown to prevent closing during text selection
    let noteModalMouseDownTarget = null;
    document.getElementById("noteModal").addEventListener("mousedown", (e) => {
      noteModalMouseDownTarget = e.target;
    });
    document.getElementById("noteModal").addEventListener("click", (e) => {
      if (e.target.id === "noteModal" && noteModalMouseDownTarget?.id === "noteModal") {
        this.closeNoteModal();
      }
      noteModalMouseDownTarget = null;
    });

    // Track mousedown target to prevent closing modal during text selection
    let goalModalMouseDownTarget = null;
    document.getElementById("goalModal").addEventListener("mousedown", (e) => {
      goalModalMouseDownTarget = e.target;
    });
    document.getElementById("goalModal").addEventListener("click", (e) => {
      if (e.target.id === "goalModal" && goalModalMouseDownTarget?.id === "goalModal") {
        this.closeGoalModal();
      }
      goalModalMouseDownTarget = null;
    });

    document.getElementById("swotModal").addEventListener("click", (e) => {
      if (e.target.id === "swotModal") {
        this.closeSwotModal();
      }
    });

    document.getElementById("swotItemModal").addEventListener("click", (e) => {
      if (e.target.id === "swotItemModal") {
        this.closeSwotItemModal();
      }
    });

    // Close modals on ESC key
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
        this.closeAllModals();
      }
    });

    // Board view drag and drop events - delegated to BoardView
    this.boardView.bindEvents();
  }

  async loadTasks() {
    document.getElementById("loading").classList.remove("hidden");
    try {
      this.tasks = await TasksAPI.fetchAll();
      this.filteredTasks = this.tasks; // Initialize filtered tasks
      this.renderTasks();
    } catch (error) {
      console.error("Error loading tasks:", error);
    } finally {
      document.getElementById("loading").classList.add("hidden");
    }
  }

  activateViewButton(view) {
    // Update the view selector label
    const viewLabels = {
      summary: "Summary", list: "List", board: "Board", timeline: "Timeline",
      notes: "Notes", goals: "Goals", milestones: "Milestones", ideas: "Ideas",
      canvas: "Canvas", mindmap: "Mindmap", c4: "C4 Architecture",
      retrospectives: "Retrospectives", swot: "SWOT Analysis", riskAnalysis: "Risk Analysis", leanCanvas: "Lean Canvas", businessModel: "Business Model", brief: "Brief", timeTracking: "Time Tracking", capacity: "Capacity", strategicLevels: "Strategic Levels", billing: "Billing", crm: "CRM", portfolio: "Portfolio", config: "Settings"
    };
    const label = document.getElementById("currentViewLabel");
    if (label) label.textContent = viewLabels[view] || view;

    // Close dropdown
    document.querySelectorAll(".nav-dropdown-menu").forEach(m => m.classList.add("hidden"));

    // Activate desktop button in dropdown
    const desktopBtn = document.getElementById(`${view}ViewBtn`);
    if (desktopBtn) {
      desktopBtn.classList.add("text-gray-900", "dark:text-white", "bg-gray-100", "dark:bg-gray-700");
      desktopBtn.classList.remove("text-gray-600", "dark:text-gray-300");
    }

    // Activate mobile button
    const mobileBtn = document.getElementById(`${view}ViewBtnMobile`);
    if (mobileBtn) {
      mobileBtn.classList.add("text-gray-900", "dark:text-white", "bg-gray-100", "dark:bg-gray-800");
      mobileBtn.classList.remove("text-gray-600", "dark:text-gray-300");
    }
  }

  async switchView(view) {
    this.currentView = view;
    localStorage.setItem("mdplanner_current_view", view);
    // Set data attribute on body for CSS targeting
    document.body.setAttribute('data-current-view', view);

    // Update breadcrumb
    Breadcrumb.render(view);

    // Update help panel context
    Help.setCurrentView(view);

    // Disable multi-select mode when switching views
    if (this.multiSelectMode) {
      this.toggleMultiSelect();
    }

    this.resizableEvents.forEach((elem) => elem.disconnect());
    this.notesLoaded = false;

    // Reset all desktop nav buttons in dropdown
    const desktopNavBtns = ["summaryViewBtn", "listViewBtn", "boardViewBtn", "timelineViewBtn", "notesViewBtn", "goalsViewBtn", "milestonesViewBtn", "ideasViewBtn", "canvasViewBtn", "mindmapViewBtn", "c4ViewBtn", "retrospectivesViewBtn", "swotViewBtn", "riskAnalysisViewBtn", "leanCanvasViewBtn", "businessModelViewBtn", "projectValueViewBtn", "briefViewBtn", "timeTrackingViewBtn", "capacityViewBtn", "strategicLevelsViewBtn", "billingViewBtn", "crmViewBtn", "orgchartViewBtn", "portfolioViewBtn"];
    desktopNavBtns.forEach((id) => {
      const btn = document.getElementById(id);
      if (btn) {
        btn.classList.remove("text-gray-900", "dark:text-white", "bg-gray-100", "dark:bg-gray-700");
        btn.classList.add("text-gray-600", "dark:text-gray-300");
      }
    });

    // Reset mobile buttons
    const mobileBtnIds = ["summaryViewBtnMobile", "listViewBtnMobile", "boardViewBtnMobile", "timelineViewBtnMobile", "notesViewBtnMobile", "goalsViewBtnMobile", "milestonesViewBtnMobile", "canvasViewBtnMobile", "mindmapViewBtnMobile", "c4ViewBtnMobile", "ideasViewBtnMobile", "retrospectivesViewBtnMobile", "swotViewBtnMobile", "riskAnalysisViewBtnMobile", "leanCanvasViewBtnMobile", "businessModelViewBtnMobile", "projectValueViewBtnMobile", "briefViewBtnMobile", "timeTrackingViewBtnMobile", "capacityViewBtnMobile", "strategicLevelsViewBtnMobile", "billingViewBtnMobile", "crmViewBtnMobile", "orgchartViewBtnMobile", "portfolioViewBtnMobile", "configViewBtnMobile"];
    mobileBtnIds.forEach((id) => {
      const btn = document.getElementById(id);
      if (btn) {
        btn.classList.remove("text-gray-900", "dark:text-white", "bg-gray-100", "dark:bg-gray-800");
        btn.classList.add("text-gray-600", "dark:text-gray-300");
      }
    });

    // Hide all views
    document.getElementById("summaryView").classList.add("hidden");
    document.getElementById("listView").classList.add("hidden");
    document.getElementById("boardView").classList.add("hidden");
    document.getElementById("timelineView").classList.add("hidden");
    document.getElementById("notesView").classList.add("hidden");
    document.getElementById("goalsView").classList.add("hidden");
    document.getElementById("milestonesView").classList.add("hidden");
    document.getElementById("ideasView").classList.add("hidden");
    document.getElementById("retrospectivesView").classList.add("hidden");
    document.getElementById("swotView").classList.add("hidden");
    document.getElementById("riskAnalysisView").classList.add("hidden");
    document.getElementById("leanCanvasView").classList.add("hidden");
    document.getElementById("businessModelView").classList.add("hidden");
    document.getElementById("projectValueView").classList.add("hidden");
    document.getElementById("briefView").classList.add("hidden");
    document.getElementById("timeTrackingView").classList.add("hidden");
    document.getElementById("capacityView").classList.add("hidden");
    document.getElementById("strategicLevelsView").classList.add("hidden");
    document.getElementById("billingView")?.classList.add("hidden");
    document.getElementById("crmView")?.classList.add("hidden");
    document.getElementById("orgchartView")?.classList.add("hidden");
    document.getElementById("portfolioView")?.classList.add("hidden");
    document.getElementById("canvasView").classList.add("hidden");
    document.getElementById("mindmapView").classList.add("hidden");
    document.getElementById("c4View").classList.add("hidden");
    document.getElementById("configView").classList.add("hidden");
    
    // Clear C4 connections SVG when switching away from C4 view
    const c4Svg = document.getElementById('c4Connections');
    if (c4Svg && view !== 'c4') {
      // Clear all connections when leaving C4 view
      c4Svg.innerHTML = '';
    }

    // Activate current view
    if (view === "summary") {
      this.activateViewButton("summary");
      document.getElementById("summaryView").classList.remove("hidden");
      this.loadProjectInfo();
    } else if (view === "list") {
      this.activateViewButton("list");
      document.getElementById("listView").classList.remove("hidden");
    } else if (view === "board") {
      this.activateViewButton("board");
      document.getElementById("boardView").classList.remove("hidden");
    } else if (view === "timeline") {
      this.activateViewButton("timeline");
      document.getElementById("timelineView").classList.remove("hidden");
      this.renderTimelineView();
    } else if (view === "notes") {
      this.activateViewButton("notes");
      document.getElementById("notesView").classList.remove("hidden");
      this.loadNotes();
    } else if (view === "goals") {
      this.activateViewButton("goals");
      document.getElementById("goalsView").classList.remove("hidden");
      this.loadGoals();
    } else if (view === "milestones") {
      this.activateViewButton("milestones");
      document.getElementById("milestonesView").classList.remove("hidden");
      this.loadMilestones();
    } else if (view === "ideas") {
      this.activateViewButton("ideas");
      document.getElementById("ideasView").classList.remove("hidden");
      this.loadIdeas();
    } else if (view === "retrospectives") {
      this.activateViewButton("retrospectives");
      document.getElementById("retrospectivesView").classList.remove("hidden");
      this.loadRetrospectives();
    } else if (view === "swot") {
      this.activateViewButton("swot");
      document.getElementById("swotView").classList.remove("hidden");
      this.loadSwotAnalyses();
    } else if (view === "riskAnalysis") {
      this.activateViewButton("riskAnalysis");
      document.getElementById("riskAnalysisView").classList.remove("hidden");
      this.loadRiskAnalyses();
    } else if (view === "leanCanvas") {
      this.activateViewButton("leanCanvas");
      document.getElementById("leanCanvasView").classList.remove("hidden");
      this.loadLeanCanvases();
    } else if (view === "businessModel") {
      this.activateViewButton("businessModel");
      document.getElementById("businessModelView").classList.remove("hidden");
      this.loadBusinessModelCanvases();
    } else if (view === "projectValue") {
      this.activateViewButton("projectValue");
      document.getElementById("projectValueView").classList.remove("hidden");
      this.projectValueModule.load();
    } else if (view === "brief") {
      this.activateViewButton("brief");
      document.getElementById("briefView").classList.remove("hidden");
      this.briefModule.load();
    } else if (view === "timeTracking") {
      this.activateViewButton("timeTracking");
      document.getElementById("timeTrackingView").classList.remove("hidden");
      this.timeTrackingModule.load();
    } else if (view === "capacity") {
      this.activateViewButton("capacity");
      document.getElementById("capacityView").classList.remove("hidden");
      this.capacityModule.load();
    } else if (view === "strategicLevels") {
      this.activateViewButton("strategicLevels");
      document.getElementById("strategicLevelsView").classList.remove("hidden");
      this.strategicLevelsModule.load();
    } else if (view === "billing") {
      this.activateViewButton("billing");
      document.getElementById("billingView").classList.remove("hidden");
      this.billingModule.load();
    } else if (view === "crm") {
      this.activateViewButton("crm");
      document.getElementById("crmView").classList.remove("hidden");
      this.crmModule.load();
    } else if (view === "orgchart") {
      this.activateViewButton("orgchart");
      document.getElementById("orgchartView").classList.remove("hidden");
      this.orgchartModule.load();
    } else if (view === "canvas") {
      this.activateViewButton("canvas");
      document.getElementById("canvasView").classList.remove("hidden");
      await this.canvasModule.load();
      this.notesLoaded = true;
    } else if (view === "mindmap") {
      this.activateViewButton("mindmap");
      document.getElementById("mindmapView").classList.remove("hidden");
      this.mindmapModule.load();
    } else if (view === "c4") {
      this.activateViewButton("c4");
      document.getElementById("c4View").classList.remove("hidden");
      this.loadC4Components();
    } else if (view === "portfolio") {
      this.activateViewButton("portfolio");
      document.getElementById("portfolioView").classList.remove("hidden");
      this.portfolioView.load();
    } else if (view === "config") {
      this.activateViewButton("config");
      document.getElementById("configView").classList.remove("hidden");
      this.renderConfigView();
    }

    this.renderTasks();
  }

  renderTasks() {
    if (this.currentView === "list") {
      this.renderListView();
    } else if (this.currentView === "board") {
      this.renderBoardView();
    } else if (this.currentView === "summary") {
      this.renderSummaryView();
    }
  }

  async loadProjectInfo() {
    try {
      this.projectInfo = await ProjectAPI.getInfo();
      this.renderSummaryView();
    } catch (error) {
      console.error("Error loading project info:", error);
    }
  }

  // Summary View - delegating to SummaryView module
  renderSummaryView() {
    this.summaryView.render();
  }

  toggleAddLinkForm() {
    this.summaryView.toggleAddLinkForm();
  }

  async addLink() {
    await this.summaryView.addLink();
  }

  async removeLink(index) {
    await this.summaryView.removeLink(index);
  }

  async updateProjectStatus(status) {
    await this.summaryView.updateProjectStatus(status);
  }

  async saveStatusComment() {
    await this.summaryView.saveStatusComment();
  }

  // List View - delegating to ListView module
  populateListFilters() {
    this.listView.populateFilters();
  }

  applyListFilters() {
    this.listView.applyFilters();
  }

  clearListFilters() {
    this.listView.clearFilters();
  }

  // Pomodoro Timer - delegated to PomodoroModule
  initPomodoroWorker() {
    return this.pomodoroModule.initWorker();
  }

  updateNotificationStatus() {
    return this.pomodoroModule.updateNotificationStatus();
  }

  startPomodoro() {
    return this.pomodoroModule.start();
  }

  tickPomodoro() {
    return this.pomodoroModule.tick();
  }

  stopPomodoro() {
    return this.pomodoroModule.stop();
  }

  setPomodoroMode(mode) {
    return this.pomodoroModule.setMode(mode);
  }

  updatePomodoroDisplay() {
    return this.pomodoroModule.updateDisplay();
  }

  pomodoroComplete() {
    return this.pomodoroModule.complete();
  }

  showPomodoroNotification(title, body) {
    return this.pomodoroModule.showNotification(title, body);
  }

  stopPomodoroSound() {
    return this.pomodoroModule.stopSound();
  }

  playPomodoroSound() {
    return this.pomodoroModule.playSound();
  }

  getFilteredAndSortedTasks(tasks) {
    return this.listView.getFilteredAndSortedTasks(tasks);
  }

  renderListView() {
    this.listView.render();
  }

  createListTaskElement(task, isChild = false) {
    return this.listView.createTaskElement(task, isChild);
  }

  // Board View - delegating to BoardView module
  renderBoardView() {
    this.boardView.render();
  }

  createBoardTaskElement(task) {
    return this.boardView.createTaskElement(task);
  }

  async toggleTask(taskId) {
    return this.tasksModule.toggle(taskId);
  }

  findTaskById(id) {
    return this.tasksModule.findById(id);
  }

  async openTaskModal(task = null, parentTaskId = null) {
    return this.tasksModule.openModal(task, parentTaskId);
  }

  closeTaskModal() {
    return this.tasksModule.closeModal();
  }

  closeAllModals() {
    // Find all modal elements by their common class pattern
    const allModals = document.querySelectorAll('[id$="Modal"]:not(.hidden)');
    allModals.forEach(modal => {
      modal.classList.add("hidden");
      modal.classList.remove("flex");
    });
    // Clear any modal state
    this.editingTask = null;
    this.parentTaskId = null;
    if (window.location.hash.startsWith("#task=")) {
      history.replaceState(null, "", window.location.pathname + window.location.search);
    }
    // Exit focus mode if active
    FocusMode.exit();
  }

  // Focus Mode - enter distraction-free single-task view
  enterFocusMode(taskId) {
    FocusMode.enter(taskId, this);
  }

  exitFocusMode() {
    FocusMode.exit();
  }

  async handleTaskSubmit(e) {
    return this.tasksModule.handleSubmit(e);
  }

  async editTask(taskId) {
    const task = this.findTaskById(taskId);
    if (task) {
      this.taskSidenavModule.open(task);
    }
  }

  copyTaskLink(taskId) {
    return this.tasksModule.copyLink(taskId);
  }

  showToast(message, isError = false) {
    showToast(message, isError);
  }

  async addSubtask(parentTaskId) {
    return this.tasksModule.addSubtask(parentTaskId);
  }

  toggleDescription(taskId) {
    return this.tasksModule.toggleDescription(taskId);
  }

  closeDescriptionModal() {
    return this.tasksModule.closeDescriptionModal();
  }

  async deleteTask(taskId) {
    return this.tasksModule.delete(taskId);
  }

  toggleDarkMode() {
    ThemeManager.toggleDarkMode();
  }

  toggleFullscreen() {
    ThemeManager.toggleFullscreen();
  }

  async renderTimelineView() {
    await this.timelineView.render();
  }

  async renderConfigView() {
    await this.configView.render();
  }

  async updateWorkingDays(workingDays) {
    await this.timelineView.updateWorkingDays(workingDays);
  }

  async loadProjectConfig() {
    try {
      this.projectConfig = await ProjectAPI.getConfig();

      // Update UI with loaded config
      document.getElementById("projectStartDate").value =
        this.projectConfig.startDate || "";

      // Handle working days - check if custom schedule
      if (this.projectConfig.workingDays && this.projectConfig.workingDays.length > 0) {
        document.getElementById("workingDays").value = "custom";
        document.getElementById("customDaysContainer").classList.remove("hidden");
        // Set checkboxes
        document.querySelectorAll(".working-day-checkbox").forEach(cb => {
          cb.checked = this.projectConfig.workingDays.includes(cb.value);
        });
      } else {
        document.getElementById("workingDays").value =
          this.projectConfig.workingDaysPerWeek || 5;
        document.getElementById("customDaysContainer").classList.add("hidden");
      }

      // Render config UI if in config or timeline view
      if (this.currentView === "config") {
        this.configView.renderUI();
        this.configView.updateStats();
      } else if (this.currentView === "timeline") {
        this.timelineView.updateConfig();
      }
    } catch (error) {
      console.error("Error loading project config:", error);
      // Set defaults
      this.projectConfig = {
        startDate: new Date().toISOString().split("T")[0],
        workingDaysPerWeek: 5,
      };
      document.getElementById("projectStartDate").value =
        this.projectConfig.startDate;
      document.getElementById("workingDays").value =
        this.projectConfig.workingDaysPerWeek;
      document.getElementById("customDaysContainer").classList.add("hidden");
    }
  }

  async loadSections() {
    try {
      this.sections = await ProjectAPI.getSections();
    } catch (error) {
      console.error("Error loading sections:", error);
      this.sections = ["Ideas", "Todo", "In Progress", "Done"];
    }
  }

  async saveProjectConfig() {
    const startDateInput = document.getElementById("projectStartDate");
    const workingDaysInput = document.getElementById("workingDays");

    // Get custom working days if selected
    let workingDays = null;
    let workingDaysPerWeek = 5;

    if (workingDaysInput.value === "custom") {
      workingDays = [];
      document.querySelectorAll(".working-day-checkbox:checked").forEach(cb => {
        workingDays.push(cb.value);
      });
      workingDaysPerWeek = workingDays.length;
    } else {
      workingDaysPerWeek = parseInt(workingDaysInput.value) || 5;
    }

    const config = {
      startDate: startDateInput ? startDateInput.value : this.projectConfig?.startDate,
      workingDaysPerWeek,
      workingDays,
      assignees: this.projectConfig?.assignees || [],
      tags: this.projectConfig?.tags || [],
      links: this.projectConfig?.links || [],
    };

    console.log("Saving config:", config);

    try {
      const response = await ProjectAPI.saveConfig(config);
      const result = await response.text();
      console.log("Save response:", result);

      if (response.ok) {
        this.projectConfig = config;
        if (this.currentView === "timeline") {
          this.timelineView.generate();
        }
        // Show success message
        const button = document.getElementById("saveProjectConfig");
        const originalText = button.textContent;
        button.textContent = "Saved!";
        button.classList.add("bg-green-600");
        setTimeout(() => {
          button.textContent = originalText;
          button.classList.remove("bg-green-600");
        }, 2000);
      } else {
        console.error("Failed to save project config:", result);
      }
    } catch (error) {
      console.error("Error saving project config:", error);
    }
  }

  // Delegate config methods to configView
  async addSection() { await this.configView.addSection(); }
  async removeSection(index) { await this.configView.removeSection(index); }
  async moveSectionUp(index) { await this.configView.moveSectionUp(index); }
  async moveSectionDown(index) { await this.configView.moveSectionDown(index); }
  async addAssignee() { await this.configView.addAssignee(); }
  async removeAssignee(index) { await this.configView.removeAssignee(index); }
  async addTag() { await this.configView.addTag(); }
  async removeTag(index) { await this.configView.removeTag(index); }

  async updateTask(taskId, updates) {
    try {
      const response = await TasksAPI.update(taskId, updates);
      return response.ok;
    } catch (error) {
      console.error("Error updating task:", error);
      return false;
    }
  }

  getTasksToRender() {
    return this.tasksModule.getToRender();
  }

  // Notes functionality - delegation to NotesModule
  async loadNotes() {
    await this.notesModule.load();
  }

  renderNotesView() {
    this.notesModule.renderView();
  }

  renderActiveNote() {
    this.notesModule.renderActive();
  }

  updateNoteDisplay() {
    this.notesModule.updateDisplay();
  }

  renderCustomSectionPreview(section) {
    return this.enhancedNotesModule.renderCustomSectionPreview(section);
  }

  parseContentAndCustomSections(content) {
    return this.enhancedNotesModule.parseContentAndCustomSections(content);
  }

  markdownToHtml(content) {
    return markdownToHtmlUtil(content);
  }

  switchPreviewTab(sectionId, tabId) {
    this.enhancedNotesModule.switchPreviewTab(sectionId, tabId);
  }

  selectNote(noteIndex) {
    this.notesModule.select(noteIndex);
  }

  openNoteModal() {
    this.notesModule.openModal();
  }

  closeNoteModal() {
    this.notesModule.closeModal();
  }

  async handleNoteSubmit(e) {
    await this.notesModule.handleSubmit(e);
  }

  async deleteCurrentNote() {
    await this.notesModule.deleteCurrent();
  }

  // Note Sidenav - delegation to NoteSidenavModule
  openNewNoteSidenav() {
    this.noteSidenavModule.openNew();
  }

  openEditNoteSidenav(noteIndex) {
    this.noteSidenavModule.openEdit(noteIndex);
  }

  // Enhanced Notes Functionality - delegation to EnhancedNotesModule
  toggleEnhancedMode() {
    this.enhancedNotesModule.toggleMode();
  }

  addParagraph(type = 'text') {
    this.enhancedNotesModule.addParagraph(type);
  }

  openMarkdownFile() {
    this.enhancedNotesModule.openMarkdownFile();
  }

  async handleMarkdownFileSelect(event) {
    await this.enhancedNotesModule.handleMarkdownFileSelect(event);
  }

  toggleMultiSelect() {
    this.enhancedNotesModule.toggleMultiSelect();
  }

  deleteSelectedParagraphs() {
    this.enhancedNotesModule.deleteSelectedParagraphs();
  }

  duplicateSelectedParagraphs() {
    this.enhancedNotesModule.duplicateSelectedParagraphs();
  }

  moveSelectedParagraphs(direction) {
    this.enhancedNotesModule.moveSelectedParagraphs(direction);
  }

  showAutoSaveIndicator() {
    this.enhancedNotesModule.showAutoSaveIndicator();
  }

  addCustomSection() {
    this.enhancedNotesModule.addCustomSection();
  }

  openCustomSectionModal() {
    this.enhancedNotesModule.openCustomSectionModal();
  }

  closeCustomSectionModal() {
    this.enhancedNotesModule.closeCustomSectionModal();
  }

  createCustomSection() {
    this.enhancedNotesModule.createCustomSection();
  }

  generateSectionId() {
    return this.enhancedNotesModule.generateSectionId();
  }

  getInitialSectionConfig(type) {
    return this.enhancedNotesModule.getInitialSectionConfig(type);
  }

  generateTabId() {
    return this.enhancedNotesModule.generateTabId();
  }

  generateTimelineId() {
    return this.enhancedNotesModule.generateTimelineId();
  }

  renderParagraphs() {
    this.enhancedNotesModule.renderParagraphs();
  }

  renderCustomSections() {
    this.enhancedNotesModule.renderCustomSections();
  }

  renderEnhancedViewMode() {
    return this.enhancedNotesModule.renderEnhancedViewMode();
  }

  createCustomSectionElement(section) {
    return this.enhancedNotesModule.createCustomSectionElement(section);
  }

  renderTabsSection(section) {
    return this.enhancedNotesModule.renderTabsSection(section);
  }

  renderTimelineSection(section) {
    return this.enhancedNotesModule.renderTimelineSection(section);
  }

  renderSplitViewSection(section) {
    return this.enhancedNotesModule.renderSplitViewSection(section);
  }

  renderTabContent(content) {
    return this.enhancedNotesModule.renderTabContent(content);
  }

  handleParagraphBlur(event, paragraphId, content) {
    this.enhancedNotesModule.handleParagraphBlur(event, paragraphId, content);
  }

  updateParagraphContent(paragraphId, content) {
    this.enhancedNotesModule.updateParagraphContent(paragraphId, content);
  }

  syncParagraphsToContent() {
    this.enhancedNotesModule.syncParagraphsToContent();
  }

  renderCustomSectionAsMarkdown(section) {
    return this.enhancedNotesModule.renderCustomSectionAsMarkdown(section);
  }

  updateParagraphLanguage(paragraphId, language) {
    this.enhancedNotesModule.updateParagraphLanguage(paragraphId, language);
  }

  duplicateParagraph(paragraphId) {
    this.enhancedNotesModule.duplicateParagraph(paragraphId);
  }

  toggleParagraphType(paragraphId) {
    this.enhancedNotesModule.toggleParagraphType(paragraphId);
  }

  deleteParagraph(paragraphId) {
    this.enhancedNotesModule.deleteParagraph(paragraphId);
  }

  toggleParagraphSelection(paragraphId) {
    this.enhancedNotesModule.toggleParagraphSelection(paragraphId);
  }

  handleParagraphKeyDown(event, paragraphId) {
    this.enhancedNotesModule.handleParagraphKeyDown(event, paragraphId);
  }

  initDragAndDrop() {
    this.enhancedNotesModule.initDragAndDrop();
  }

  initParagraphDragAndDrop() {
    this.enhancedNotesModule.initParagraphDragAndDrop();
  }

  getDragAfterElement(container, y) {
    return this.enhancedNotesModule.getDragAfterElement(container, y);
  }

  updateParagraphOrder() {
    this.enhancedNotesModule.updateParagraphOrder();
  }

  async handleFileDrop(e) {
    await this.enhancedNotesModule.handleFileDrop(e);
  }

  async addImageToNote(file) {
    await this.enhancedNotesModule.addImageToNote(file);
  }

  async addTextFileToNote(file) {
    await this.enhancedNotesModule.addTextFileToNote(file);
  }

  async addFileReference(file) {
    await this.enhancedNotesModule.addFileReference(file);
  }

  preventDefaults(e) {
    this.enhancedNotesModule.preventDefaults(e);
  }


  parseMarkdownContent(content) {
    // Basic markdown parsing
    return content
      .replace(/^### (.*$)/gim, '<h3>$1</h3>')
      .replace(/^## (.*$)/gim, '<h2>$1</h2>')
      .replace(/^# (.*$)/gim, '<h1>$1</h1>')
      .replace(/\*\*(.*)\*\*/gim, '<strong>$1</strong>')
      .replace(/\*(.*)\*/gim, '<em>$1</em>')
      .replace(/`([^`]+)`/gim, '<code>$1</code>')
      .replace(/\[([^\]]+)\]\(([^)]+)\)/gim, '<a href="$2" target="_blank">$1</a>')
      .replace(/!\[([^\]]*)\]\(([^)]+)\)/gim, '<img src="$2" alt="$1" class="max-w-full h-auto">')
      .replace(/\n/g, '<br>');
  }

  deleteCustomSection(sectionId) {
    this.enhancedNotesModule.deleteCustomSection(sectionId);
  }

  switchTab(sectionId, tabId) {
    this.enhancedNotesModule.switchTab(sectionId, tabId);
  }

  addTab(sectionId) {
    this.enhancedNotesModule.addTab(sectionId);
  }

  updateTabTitle(sectionId, tabId, title) {
    this.enhancedNotesModule.updateTabTitle(sectionId, tabId, title);
  }

  deleteTab(sectionId, tabId) {
    this.enhancedNotesModule.deleteTab(sectionId, tabId);
  }

  addContentToTab(sectionId, tabId, type) {
    this.enhancedNotesModule.addContentToTab(sectionId, tabId, type);
  }

  addTimelineItem(sectionId) {
    this.enhancedNotesModule.addTimelineItem(sectionId);
  }

  updateTimelineItemTitle(sectionId, itemId, title) {
    this.enhancedNotesModule.updateTimelineItemTitle(sectionId, itemId, title);
  }

  updateTimelineItemDate(sectionId, itemId, date) {
    this.enhancedNotesModule.updateTimelineItemDate(sectionId, itemId, date);
  }

  updateTimelineItemStatus(sectionId, itemId, status) {
    this.enhancedNotesModule.updateTimelineItemStatus(sectionId, itemId, status);
  }

  deleteTimelineItem(sectionId, itemId) {
    this.enhancedNotesModule.deleteTimelineItem(sectionId, itemId);
  }

  addContentToTimeline(sectionId, itemId, type) {
    this.enhancedNotesModule.addContentToTimeline(sectionId, itemId, type);
  }

  addColumnToSplitView(sectionId) {
    this.enhancedNotesModule.addColumnToSplitView(sectionId);
  }

  removeColumnFromSplitView(sectionId, columnIndex) {
    this.enhancedNotesModule.removeColumnFromSplitView(sectionId, columnIndex);
  }

  addContentToSplitView(sectionId, columnIndex, type) {
    this.enhancedNotesModule.addContentToSplitView(sectionId, columnIndex, type);
  }

  updateCustomContent(contentId, content) {
    this.enhancedNotesModule.updateCustomContent(contentId, content);
  }

  deleteTabContent(contentId) {
    this.enhancedNotesModule.deleteTabContent(contentId);
  }

  // Goals functionality - delegated to GoalsModule
  async loadGoals() {
    return this.goalsModule.load();
  }

  renderGoalsView() {
    this.goalsModule.renderView();
  }

  filterGoals(type) {
    this.goalsModule.filter(type);
  }

  openGoalModal() {
    // Legacy modal method - redirect to sidenav
    this.goalSidenavModule.openNew();
  }

  openGoalSidenav() {
    this.goalSidenavModule.openNew();
  }

  closeGoalModal() {
    this.goalSidenavModule.close();
  }

  async handleGoalSubmit(e) {
    // Form is now handled by sidenav auto-save
    e.preventDefault();
    return this.goalSidenavModule.save();
  }

  editGoal(goalIndex) {
    const goal = this.goals[goalIndex];
    if (goal) {
      this.goalSidenavModule.openEdit(goal.id);
    }
  }

  async deleteGoal(goalIndex) {
    return this.goalsModule.delete(goalIndex);
  }

  // Milestones functionality - delegated to MilestonesModule
  async loadMilestones() {
    return this.milestonesModule.load();
  }

  renderMilestonesView() {
    this.milestonesModule.renderView();
  }

  openMilestoneModal(id = null) {
    // Legacy modal method - redirect to sidenav
    if (id) {
      this.milestoneSidenavModule.openEdit(id);
    } else {
      this.milestoneSidenavModule.openNew();
    }
  }

  openMilestoneSidenav() {
    this.milestoneSidenavModule.openNew();
  }

  closeMilestoneModal() {
    this.milestoneSidenavModule.close();
  }

  async saveMilestone(e) {
    // Form is now handled by sidenav auto-save
    e.preventDefault();
    return this.milestoneSidenavModule.save();
  }

  async deleteMilestone(id) {
    return this.milestonesModule.delete(id);
  }

  // Ideas functionality - delegated to IdeasModule
  async loadIdeas() {
    return this.ideasModule.load();
  }

  renderIdeasView() {
    this.ideasModule.renderView();
  }

  openIdeaModal(id = null) {
    if (id) {
      this.ideaSidenavModule.openEdit(id);
    } else {
      this.ideaSidenavModule.openNew();
    }
  }

  closeIdeaModal() {
    this.ideaSidenavModule.close();
  }

  async saveIdea(e) {
    // Not used - sidenav handles save internally
    return this.ideasModule.save(e);
  }

  async deleteIdea(id) {
    return this.ideasModule.delete(id);
  }

  // Retrospectives functionality - delegated to RetrospectivesModule
  async loadRetrospectives() {
    return this.retrospectivesModule.load();
  }

  renderRetrospectivesView() {
    this.retrospectivesModule.renderView();
  }

  openRetrospectiveModal(id = null) {
    // Legacy modal method - redirect to sidenav
    if (id) {
      this.retrospectiveSidenavModule.openEdit(id);
    } else {
      this.retrospectiveSidenavModule.openNew();
    }
  }

  openRetrospectiveSidenav() {
    this.retrospectiveSidenavModule.openNew();
  }

  closeRetrospectiveModal() {
    this.retrospectiveSidenavModule.close();
  }

  async saveRetrospective(e) {
    // Form is now handled by sidenav auto-save
    e.preventDefault();
    return this.retrospectiveSidenavModule.save();
  }

  async deleteRetrospective(id) {
    return this.retrospectivesModule.delete(id);
  }

  // SWOT Analysis functionality - delegated to SwotModule
  async loadSwotAnalyses() {
    return this.swotModule.load();
  }

  renderSwotSelector() {
    this.swotModule.renderSelector();
  }

  selectSwot(swotId) {
    this.swotModule.select(swotId);
  }

  renderSwotView(swot) {
    this.swotModule.renderView(swot);
  }

  openSwotModal(id = null) {
    this.swotModule.openModal(id);
  }

  closeSwotModal() {
    this.swotModule.closeModal();
  }

  async saveSwot(e) {
    return this.swotModule.save(e);
  }

  editSelectedSwot() {
    this.swotModule.editSelected();
  }

  async deleteSelectedSwot() {
    return this.swotModule.deleteSelected();
  }

  openSwotItemModal(quadrant) {
    this.swotModule.openItemModal(quadrant);
  }

  closeSwotItemModal() {
    this.swotModule.closeItemModal();
  }

  async saveSwotItem(e) {
    return this.swotModule.saveItem(e);
  }

  async removeSwotItem(quadrant, index) {
    return this.swotModule.removeItem(quadrant, index);
  }

  // Risk Analysis functionality - delegated to RiskModule
  async loadRiskAnalyses() {
    return this.riskModule.load();
  }

  renderRiskAnalysisSelector() {
    this.riskModule.renderSelector();
  }

  selectRiskAnalysis(riskId) {
    this.riskModule.select(riskId);
  }

  renderRiskAnalysisView(risk) {
    this.riskModule.renderView(risk);
  }

  openRiskAnalysisModal(id = null) {
    this.riskModule.openModal(id);
  }

  closeRiskAnalysisModal() {
    this.riskModule.closeModal();
  }

  async saveRiskAnalysis(e) {
    return this.riskModule.save(e);
  }

  editSelectedRiskAnalysis() {
    this.riskModule.editSelected();
  }

  async deleteSelectedRiskAnalysis() {
    return this.riskModule.deleteSelected();
  }

  openRiskAnalysisItemModal(quadrant) {
    this.riskModule.openItemModal(quadrant);
  }

  closeRiskAnalysisItemModal() {
    this.riskModule.closeItemModal();
  }

  async saveRiskAnalysisItem(e) {
    return this.riskModule.saveItem(e);
  }

  async removeRiskAnalysisItem(quadrant, index) {
    return this.riskModule.removeItem(quadrant, index);
  }

  // Lean Canvas functionality - delegated to LeanCanvasModule
  async loadLeanCanvases() {
    return this.leanCanvasModule.load();
  }

  renderLeanCanvasSelector() {
    this.leanCanvasModule.renderSelector();
  }

  selectLeanCanvas(canvasId) {
    this.leanCanvasModule.select(canvasId);
  }

  renderLeanCanvasView(canvas) {
    this.leanCanvasModule.renderView(canvas);
  }

  openLeanCanvasModal(id = null) {
    this.leanCanvasModule.openModal(id);
  }

  closeLeanCanvasModal() {
    this.leanCanvasModule.closeModal();
  }

  async saveLeanCanvas(e) {
    return this.leanCanvasModule.save(e);
  }

  editSelectedLeanCanvas() {
    this.leanCanvasModule.editSelected();
  }

  async deleteSelectedLeanCanvas() {
    return this.leanCanvasModule.deleteSelected();
  }

  openLeanCanvasItemModal(section) {
    this.leanCanvasModule.openItemModal(section);
  }

  closeLeanCanvasItemModal() {
    this.leanCanvasModule.closeItemModal();
  }

  async saveLeanCanvasItem(e) {
    return this.leanCanvasModule.saveItem(e);
  }

  async removeLeanCanvasItem(section, index) {
    return this.leanCanvasModule.removeItem(section, index);
  }

  // Business Model Canvas functionality - delegated to BusinessModelModule
  async loadBusinessModelCanvases() {
    return this.businessModelModule.load();
  }

  renderBusinessModelSelector() {
    this.businessModelModule.renderSelector();
  }

  selectBusinessModel(canvasId) {
    this.businessModelModule.select(canvasId);
  }

  renderBusinessModelView(canvas) {
    this.businessModelModule.renderView(canvas);
  }

  openBusinessModelModal(id = null) {
    this.businessModelModule.openModal(id);
  }

  closeBusinessModelModal() {
    this.businessModelModule.closeModal();
  }

  async saveBusinessModel(e) {
    return this.businessModelModule.save(e);
  }

  editSelectedBusinessModel() {
    this.businessModelModule.editSelected();
  }

  async deleteSelectedBusinessModel() {
    return this.businessModelModule.deleteSelected();
  }

  openBusinessModelItemModal(section) {
    this.businessModelModule.openItemModal(section);
  }

  closeBusinessModelItemModal() {
    this.businessModelModule.closeItemModal();
  }

  async saveBusinessModelItem(e) {
    return this.businessModelModule.saveItem(e);
  }

  async removeBusinessModelItem(section, index) {
    return this.businessModelModule.removeItem(section, index);
  }

  // Project Value Board - delegated to ProjectValueModule
  async loadProjectValueBoards() {
    return this.projectValueModule.load();
  }

  renderProjectValueSelector() {
    return this.projectValueModule.renderSelector();
  }

  selectProjectValue(boardId) {
    return this.projectValueModule.select(boardId);
  }

  renderProjectValueView(board) {
    return this.projectValueModule.renderView(board);
  }

  openProjectValueModal(id = null) {
    return this.projectValueModule.openModal(id);
  }

  closeProjectValueModal() {
    return this.projectValueModule.closeModal();
  }

  async saveProjectValue(e) {
    return this.projectValueModule.save(e);
  }

  editSelectedProjectValue() {
    return this.projectValueModule.editSelected();
  }

  async deleteSelectedProjectValue() {
    return this.projectValueModule.deleteSelected();
  }

  openProjectValueItemModal(section) {
    return this.projectValueModule.openItemModal(section);
  }

  closeProjectValueItemModal() {
    return this.projectValueModule.closeItemModal();
  }

  async saveProjectValueItem(e) {
    return this.projectValueModule.saveItem(e);
  }

  async removeProjectValueItem(section, index) {
    return this.projectValueModule.removeItem(section, index);
  }

  // Brief - delegated to BriefModule
  async loadBriefs() {
    return this.briefModule.load();
  }

  renderBriefSelector() {
    return this.briefModule.renderSelector();
  }

  selectBrief(briefId) {
    return this.briefModule.select(briefId);
  }

  renderBriefGrid(brief) {
    return this.briefModule.renderGrid(brief);
  }

  openBriefModal(editId = null) {
    return this.briefModule.openModal(editId);
  }

  closeBriefModal() {
    return this.briefModule.closeModal();
  }

  async saveBrief(e) {
    return this.briefModule.save(e);
  }

  editBrief() {
    return this.briefModule.edit();
  }

  async deleteBrief() {
    return this.briefModule.delete();
  }

  openBriefItemModal(section) {
    return this.briefModule.openItemModal(section);
  }

  closeBriefItemModal() {
    return this.briefModule.closeItemModal();
  }

  async saveBriefItem(e) {
    return this.briefModule.saveItem(e);
  }

  async removeBriefItem(section, index) {
    return this.briefModule.removeItem(section, index);
  }

  // Capacity Planning - delegated to CapacityModule
  async loadCapacityPlans() {
    return this.capacityModule.load();
  }

  renderCapacityPlanSelector() {
    return this.capacityModule.renderSelector();
  }

  selectCapacityPlan(id) {
    return this.capacityModule.select(id);
  }

  switchCapacityTab(tab) {
    return this.capacityModule.switchTab(tab);
  }

  renderTeamMembers() {
    return this.capacityModule.renderTeamMembers();
  }

  getWeekStart(offset = 0) {
    return this.capacityModule.getWeekStart(offset);
  }

  getWeekDates(weekStart) {
    return this.capacityModule.getWeekDates(weekStart);
  }

  changeAllocWeek(delta) {
    return this.capacityModule.changeAllocWeek(delta);
  }

  renderAllocationsGrid() {
    return this.capacityModule.renderAllocationsGrid();
  }

  async renderUtilization() {
    return this.capacityModule.renderUtilization();
  }

  openCapacityPlanModal(editId = null) {
    return this.capacityModule.openPlanModal(editId);
  }

  closeCapacityPlanModal() {
    return this.capacityModule.closePlanModal();
  }

  async saveCapacityPlan(e) {
    return this.capacityModule.savePlan(e);
  }

  editCapacityPlan() {
    return this.capacityModule.editPlan();
  }

  async deleteCapacityPlan() {
    return this.capacityModule.deletePlan();
  }

  openTeamMemberModal(editId = null) {
    return this.capacityModule.openTeamMemberModal(editId);
  }

  closeTeamMemberModal() {
    return this.capacityModule.closeTeamMemberModal();
  }

  async saveTeamMember(e) {
    return this.capacityModule.saveTeamMember(e);
  }

  editTeamMember(id) {
    return this.capacityModule.editTeamMember(id);
  }

  async deleteTeamMember(id) {
    return this.capacityModule.deleteTeamMember(id);
  }

  openAllocationModal(memberId, weekStart) {
    return this.capacityModule.openAllocationModal(memberId, weekStart);
  }

  closeAllocationModal() {
    return this.capacityModule.closeAllocationModal();
  }

  async saveAllocation(e) {
    return this.capacityModule.saveAllocation(e);
  }

  async deleteAllocation() {
    return this.capacityModule.deleteAllocation();
  }

  async openAutoAssignModal() {
    return this.capacityModule.openAutoAssignModal();
  }

  closeAutoAssignModal() {
    return this.capacityModule.closeAutoAssignModal();
  }

  async applyAutoAssign() {
    return this.capacityModule.applyAutoAssign();
  }

  // Time Tracking - delegated to TimeTrackingModule
  async loadTimeTracking() {
    return this.timeTrackingModule.load();
  }

  renderTimeTrackingView() {
    return this.timeTrackingModule.renderView();
  }

  async deleteTimeEntryFromView(taskId, entryId) {
    return this.timeTrackingModule.deleteFromView(taskId, entryId);
  }

  showTimeEntryForm() {
    return this.timeTrackingModule.showForm();
  }

  hideTimeEntryForm() {
    return this.timeTrackingModule.hideForm();
  }

  async saveTimeEntry() {
    return this.timeTrackingModule.save();
  }

  async loadTaskTimeEntries(taskId) {
    return this.timeTrackingModule.loadForTask(taskId);
  }

  renderTaskTimeEntries(entries) {
    return this.timeTrackingModule.renderForTask(entries);
  }

  async deleteTaskTimeEntry(entryId) {
    return this.timeTrackingModule.deleteForTask(entryId);
  }

  // Mobile menu functionality
  toggleMobileMenu() {
    toggleMobileMenu();
  }

  closeMobileMenu() {
    closeMobileMenu();
  }

  // Canvas - delegated to CanvasModule
  async loadCanvas() {
    return this.canvasModule.load();
  }

  renderCanvas() {
    return this.canvasModule.render();
  }

  setupCanvasPanning() {
    return this.canvasModule.setupPanning();
  }

  createStickyNoteElement(stickyNote) {
    return this.canvasModule.createElement(stickyNote);
  }

  makeStickyNoteDraggable(element) {
    return this.canvasModule.makeDraggable(element);
  }

  makeStickyNoteResizable(element) {
    return this.canvasModule.makeResizable(element);
  }

  async updateStickyNoteSize(id, size) {
    return this.canvasModule.updateSize(id, size);
  }

  openStickyNoteModal() {
    // Legacy modal method - redirect to sidenav
    this.stickyNoteSidenavModule.openNew();
  }

  openStickySidenav() {
    this.stickyNoteSidenavModule.openNew();
  }

  closeStickyNoteModal() {
    this.stickyNoteSidenavModule.close();
  }

  async handleStickyNoteSubmit(e) {
    // Form is now handled by sidenav auto-save
    e.preventDefault();
    return this.stickyNoteSidenavModule.save();
  }

  editStickyNote(id) {
    this.stickyNoteSidenavModule.openEdit(id);
  }

  async updateStickyNoteContent(id, content) {
    return this.canvasModule.updateContent(id, content);
  }

  async updateStickyNotePosition(id, position) {
    return this.canvasModule.updatePosition(id, position);
  }

  async deleteStickyNote(id) {
    return this.canvasModule.delete(id);
  }

  updateCanvasZoom(value) {
    return this.canvasModule.updateZoom(value);
  }

  // Mindmap - delegated to MindmapModule
  async loadMindmaps(autoSelect = true) {
    return this.mindmapModule.load(autoSelect);
  }

  renderMindmapSelector() {
    return this.mindmapModule.renderSelector();
  }

  selectMindmap(mindmapId) {
    return this.mindmapModule.select(mindmapId);
  }

  renderMindmap() {
    return this.mindmapModule.render();
  }

  renderTreeLayout(rootNodes, content) {
    return this.mindmapModule.renderTreeLayout(rootNodes, content);
  }

  createNodeElement(node, x, y, container) {
    return this.mindmapModule.createElement(node, x, y, container);
  }

  positionNodeAndChildren(node, x, y, levelSpacing, nodeSpacing, container) {
    return this.mindmapModule.positionNodeAndChildren(node, x, y, levelSpacing, nodeSpacing, container);
  }

  drawConnections(container) {
    return this.mindmapModule.drawConnections(container);
  }

  setupMindmapPanning() {
    return this.mindmapModule.setupPanning();
  }

  editSelectedMindmap() {
    if (this.mindmapModule.selectedMindmap) {
      this.mindmapSidenavModule.openEdit(this.mindmapModule.selectedMindmap.id);
    }
  }

  async deleteSelectedMindmap() {
    return this.mindmapModule.deleteSelected();
  }

  convertNodesToStructure(nodes) {
    return this.mindmapModule.convertNodesToStructure(nodes);
  }

  nodeToString(node, allNodes, level) {
    return this.mindmapModule.nodeToString(node, allNodes, level);
  }

  updateMindmapZoom(value) {
    return this.mindmapModule.updateZoom(value);
  }

  updateMindmapLayout(layout) {
    return this.mindmapModule.updateLayout(layout);
  }

  openMindmapModal() {
    // Legacy modal method - redirect to sidenav
    this.mindmapSidenavModule.openNew();
  }

  openMindmapSidenav() {
    this.mindmapSidenavModule.openNew();
  }

  closeMindmapModal() {
    this.mindmapSidenavModule.close();
  }

  handleMindmapKeyDown(e) {
    return this.mindmapModule.handleKeyDown(e);
  }

  mmGetCurrentLineInfo() {
    return this.mindmapModule.getCurrentLineInfo();
  }

  mmAddRoot() {
    return this.mindmapModule.addRoot();
  }

  mmAddChild() {
    return this.mindmapModule.addChild();
  }

  mmAddSibling() {
    return this.mindmapModule.addSibling();
  }

  mmIndent() {
    return this.mindmapModule.indent();
  }

  mmUnindent() {
    return this.mindmapModule.unindent();
  }

  mmMoveLine(direction) {
    return this.mindmapModule.moveLine(direction);
  }

  mmDeleteLine() {
    return this.mindmapModule.deleteLine();
  }

  updateMindmapPreview() {
    return this.mindmapModule.updatePreview();
  }

  async handleMindmapSubmit(e) {
    return this.mindmapModule.handleSubmit(e);
  }

  parseMindmapStructure(structure) {
    return this.mindmapModule.parseStructure(structure);
  }

  // Import/Export functionality - delegated to ImportExportModule
  toggleImportExportDropdown() {
    return this.importExportModule.toggleDropdown();
  }

  handleImportExportDropdownClick(e) {
    return this.importExportModule.handleDropdownClick(e);
  }

  exportTasksCSV() {
    return this.importExportModule.exportTasksCSV();
  }

  importTasksCSV() {
    return this.importExportModule.importTasksCSV();
  }

  exportPDFReport() {
    return this.importExportModule.exportPDFReport();
  }

  async handleCSVFileSelect(e) {
    return this.importExportModule.handleCSVFileSelect(e);
  }

  readFileAsText(file) {
    return this.importExportModule.readFileAsText(file);
  }

  // C4 Architecture - delegated to C4Module
  async loadC4Components() {
    return this.c4Module.load();
  }

  getDefaultC4Components() {
    return this.c4Module.getDefault();
  }

  renderC4Components() {
    return this.c4Module.render();
  }

  getCurrentLevelComponents() {
    return this.c4Module.getCurrentLevelComponents();
  }

  createC4ComponentElement(component, container) {
    return this.c4Module.createElement(component, container);
  }

  canComponentBeDrilledDown(component) {
    return this.c4Module.canBeDrilledDown(component);
  }

  drillDownC4Component(component) {
    return this.c4Module.drillDown(component);
  }

  getC4NavigationComponent(index) {
    return this.c4Module.getNavigationComponent(index);
  }

  navigateC4Back() {
    return this.c4Module.navigateBack();
  }

  updateC4Breadcrumb() {
    return this.c4Module.updateBreadcrumb();
  }

  navigateToC4Root() {
    return this.c4Module.navigateToRoot();
  }

  navigateToC4Level(index) {
    return this.c4Module.navigateToLevel(index);
  }

  drawC4Connections(components) {
    return this.c4Module.drawConnections(components);
  }

  drawC4Connection(svg, fromComponent, toComponent, label) {
    return this.c4Module.drawConnection(svg, fromComponent, toComponent, label);
  }

  updateC4Zoom(value) {
    return this.c4Module.updateZoom(value);
  }

  makeC4ComponentDraggable(element, component) {
    return this.c4Module.makeDraggable(element, component);
  }

  initializeC4DragHandlers() {
    return this.c4Module.initializeDragHandlers();
  }

  openC4ComponentModal() {
    return this.c4Module.openModal();
  }

  openC4ComponentModalWithLevel(x = 300, y = 200) {
    return this.c4Module.openModalWithLevel(x, y);
  }

  closeC4ComponentModal() {
    return this.c4Module.closeModal();
  }

  handleC4ComponentSubmit(e) {
    return this.c4Module.handleSubmit(e);
  }

  getDefaultTypeForLevel(level) {
    return this.c4Module.getDefaultTypeForLevel(level);
  }

  getC4ConnectionsFromForm() {
    return this.c4Module.getConnectionsFromForm();
  }

  addC4ConnectionInput() {
    return this.c4Module.addConnectionInput();
  }

  setupC4TargetAutocomplete(input) {
    return this.c4Module.setupTargetAutocomplete(input);
  }

  async saveC4Components() {
    return this.c4Module.save();
  }

  deleteC4Component(componentId) {
    return this.c4Module.delete(componentId);
  }

  openC4EditModal(component) {
    return this.c4Module.openEditModal(component);
  }

  generateC4ComponentId() {
    return this.c4Module.generateId();
  }

  validateC4Components() {
    return this.c4Module.validate();
  }

  initializeC4Panning() {
    return this.c4Module.initializePanning();
  }

  updateC4ViewTransform() {
    return this.c4Module.updateViewTransform();
  }

  resetC4View() {
    return this.c4Module.resetView();
  }

  toggleC4ViewMode(mode) {
    return this.c4Module.toggleViewMode(mode);
  }

  renderC4ListView() {
    return this.c4Module.renderListView();
  }

  renderC4ListItems(components, level) {
    return this.c4Module.renderListItems(components, level);
  }

  triggerC4AutoLayout() {
    return this.c4Module.triggerAutoLayout();
  }

  initializeC4ForceLayout(components) {
    return this.c4Module.initializeForceLayout(components);
  }

  applyHierarchicalLayout(components) {
    return this.c4Module.applyHierarchicalLayout(components);
  }

  layoutComponentsInRow(components, y, containerWidth, spacing) {
    return this.c4Module.layoutInRow(components, y, containerWidth, spacing);
  }

  adjustForOverlaps(components) {
    return this.c4Module.adjustForOverlaps(components);
  }

  runC4ForceSimulation() {
    return this.c4Module.runForceSimulation();
  }

  applyC4RepulsionForce(components, alpha) {
    return this.c4Module.applyRepulsionForce(components, alpha);
  }

  applyC4AttractionForce(components, alpha) {
    return this.c4Module.applyAttractionForce(components, alpha);
  }

  applyC4CenteringForce(components, alpha) {
    return this.c4Module.applyCenteringForce(components, alpha);
  }

  updateC4ComponentPositions(components) {
    return this.c4Module.updatePositions(components);
  }

  stopC4ForceLayout() {
    return this.c4Module.stopForceLayout();
  }

  toggleC4Physics() {
    return this.c4Module.togglePhysics();
  }

  // Strategic Levels - delegated to StrategicLevelsModule
  async loadStrategicLevelsBuilders() {
    return this.strategicLevelsModule.load();
  }

  renderStrategicLevelsSelector() {
    return this.strategicLevelsModule.renderSelector();
  }

  selectStrategicBuilder(builderId) {
    return this.strategicLevelsModule.select(builderId);
  }

  renderStrategicLevelsView(builder) {
    return this.strategicLevelsModule.renderView(builder);
  }

  setStrategicViewMode(mode) {
    return this.strategicLevelsModule.setViewMode(mode);
  }

  buildStrategicTree(levels) {
    return this.strategicLevelsModule.buildTree(levels);
  }

  renderStrategicNode(node, allLevels, depth = 0, isLast = true, prefix = "") {
    return this.strategicLevelsModule.renderNode(node, allLevels, depth, isLast, prefix);
  }

  renderStrategicLevelsTree(builder, container) {
    return this.strategicLevelsModule.renderTree(builder, container);
  }

  renderStrategicLevelsPyramid(builder, container) {
    return this.strategicLevelsModule.renderPyramid(builder, container);
  }

  getChildLevelType(parentLevel) {
    return this.strategicLevelsModule.getChildLevelType(parentLevel);
  }

  getParentLevelType(levelType) {
    return this.strategicLevelsModule.getParentLevelType(levelType);
  }

  calculateStrategicLevelProgress(level, allLevels) {
    return this.strategicLevelsModule.calculateProgress(level, allLevels);
  }

  openStrategicLevelsModal(editId = null) {
    return this.strategicLevelsModule.openBuilderModal(editId);
  }

  closeStrategicLevelsModal() {
    return this.strategicLevelsModule.closeBuilderModal();
  }

  async saveStrategicLevelsBuilder(e) {
    return this.strategicLevelsModule.saveBuilder(e);
  }

  editStrategicBuilder() {
    return this.strategicLevelsModule.editBuilder();
  }

  async deleteStrategicBuilder() {
    return this.strategicLevelsModule.deleteBuilder();
  }

  openStrategicLevelModal(levelType, editId = null, parentId = null) {
    return this.strategicLevelsModule.openLevelModal(levelType, editId, parentId);
  }

  closeStrategicLevelModal() {
    return this.strategicLevelsModule.closeLevelModal();
  }

  async saveStrategicLevel(e) {
    return this.strategicLevelsModule.saveLevel(e);
  }

  async deleteStrategicLevel(levelId) {
    return this.strategicLevelsModule.deleteLevel(levelId);
  }

  async openStrategicLinkModal(levelId) {
    return this.strategicLevelsModule.openLinkModal(levelId);
  }

  closeStrategicLinkModal() {
    return this.strategicLevelsModule.closeLinkModal();
  }

  async saveStrategicLinks() {
    return this.strategicLevelsModule.saveLinks();
  }

  // ================== ZETTELKASTEN IDEA LINKING - delegated to IdeasModule ==================

  openIdeaLinkPicker() {
    this.ideasModule.openLinkPicker();
  }

  closeIdeaLinkPicker() {
    this.ideasModule.closeLinkPicker();
  }

  renderIdeaLinkList(filter) {
    this.ideasModule.renderLinkList(filter);
  }

  filterIdeaLinkList(filter) {
    this.ideasModule.filterLinkList(filter);
  }

  saveIdeaLinks() {
    this.ideasModule.saveLinks();
  }

  updateIdeaLinksDisplay() {
    this.ideasModule.updateLinksDisplay();
  }

  removeIdeaLink(linkId) {
    this.ideaSidenavModule.removeLink(linkId);
  }

  // ================== BILLING - delegated to BillingModule ==================

  async loadBillingData() {
    return this.billingModule.load();
  }

  renderBillingSummary() {
    return this.billingModule.renderSummary();
  }

  formatCurrency(amount) {
    return this.billingModule.formatCurrency(amount);
  }

  switchBillingTab(tab) {
    return this.billingModule.switchTab(tab);
  }

  renderCustomersView() {
    return this.billingModule.renderCustomersView();
  }

  openCustomerModal(id = null) {
    return this.billingModule.openCustomerModal(id);
  }

  closeCustomerModal() {
    return this.billingModule.closeCustomerModal();
  }

  async saveCustomer(e) {
    return this.billingModule.saveCustomer(e);
  }

  async deleteCustomer(id) {
    return this.billingModule.deleteCustomer(id);
  }

  renderBillingRatesView() {
    return this.billingModule.renderRatesView();
  }

  openBillingRateModal(id = null) {
    return this.billingModule.openRateModal(id);
  }

  closeBillingRateModal() {
    return this.billingModule.closeRateModal();
  }

  async saveBillingRate(e) {
    return this.billingModule.saveRate(e);
  }

  async deleteBillingRate(id) {
    return this.billingModule.deleteRate(id);
  }

  renderQuotesView() {
    return this.billingModule.renderQuotesView();
  }

  openQuoteModal(id = null) {
    return this.billingModule.openQuoteModal(id);
  }

  closeQuoteModal() {
    return this.billingModule.closeQuoteModal();
  }

  populateCustomerSelect(selectId) {
    return this.billingModule.populateCustomerSelect(selectId);
  }

  addQuoteLineItem() {
    return this.billingModule.addQuoteLineItem();
  }

  renderQuoteLineItems() {
    return this.billingModule.renderQuoteLineItems();
  }

  updateQuoteLineItem(id, field, value) {
    return this.billingModule.updateQuoteLineItem(id, field, value);
  }

  removeQuoteLineItem(id) {
    return this.billingModule.removeQuoteLineItem(id);
  }

  updateQuoteTotals() {
    return this.billingModule.updateQuoteTotals();
  }

  async saveQuote(e) {
    return this.billingModule.saveQuote(e);
  }

  async deleteQuote(id) {
    return this.billingModule.deleteQuote(id);
  }

  async sendQuote(id) {
    return this.billingModule.sendQuote(id);
  }

  async acceptQuote(id) {
    return this.billingModule.acceptQuote(id);
  }

  async convertQuoteToInvoice(id) {
    return this.billingModule.convertQuoteToInvoice(id);
  }

  renderInvoicesView() {
    return this.billingModule.renderInvoicesView();
  }

  openInvoiceModal(id = null) {
    return this.billingModule.openInvoiceModal(id);
  }

  closeInvoiceModal() {
    return this.billingModule.closeInvoiceModal();
  }

  addInvoiceLineItem() {
    return this.billingModule.addInvoiceLineItem();
  }

  renderInvoiceLineItems() {
    return this.billingModule.renderInvoiceLineItems();
  }

  updateInvoiceLineItem(id, field, value) {
    return this.billingModule.updateInvoiceLineItem(id, field, value);
  }

  removeInvoiceLineItem(id) {
    return this.billingModule.removeInvoiceLineItem(id);
  }

  updateInvoiceTotals() {
    return this.billingModule.updateInvoiceTotals();
  }

  async saveInvoice(e) {
    return this.billingModule.saveInvoice(e);
  }

  async deleteInvoice(id) {
    return this.billingModule.deleteInvoice(id);
  }

  async sendInvoice(id) {
    return this.billingModule.sendInvoice(id);
  }

  openPaymentModal(invoiceId) {
    return this.billingModule.openPaymentModal(invoiceId);
  }

  closePaymentModal() {
    return this.billingModule.closePaymentModal();
  }

  async savePayment(e) {
    return this.billingModule.savePayment(e);
  }

  openGenerateInvoiceModal() {
    return this.billingModule.openGenerateInvoiceModal();
  }

  closeGenerateInvoiceModal() {
    return this.billingModule.closeGenerateInvoiceModal();
  }

  renderGenerateInvoiceTasks() {
    return this.billingModule.renderGenerateInvoiceTasks();
  }

  async generateInvoice(e) {
    return this.billingModule.generateInvoice(e);
  }

  // CRM delegate methods
  openCRMCompanyModal(id = null) {
    return this.crmModule.openCompanyModal(id);
  }

  closeCRMCompanyModal() {
    return this.crmModule.closeCompanyModal();
  }

  async saveCRMCompany(e) {
    return this.crmModule.saveCompany(e);
  }

  async deleteCRMCompany(id) {
    return this.crmModule.deleteCompany(id);
  }

  openCRMContactModal(id = null) {
    return this.crmModule.openContactModal(id);
  }

  closeCRMContactModal() {
    return this.crmModule.closeContactModal();
  }

  async saveCRMContact(e) {
    return this.crmModule.saveContact(e);
  }

  async deleteCRMContact(id) {
    return this.crmModule.deleteContact(id);
  }

  openCRMDealModal(id = null) {
    return this.crmModule.openDealModal(id);
  }

  closeCRMDealModal() {
    return this.crmModule.closeDealModal();
  }

  async saveCRMDeal(e) {
    return this.crmModule.saveDeal(e);
  }

  async deleteCRMDeal(id) {
    return this.crmModule.deleteDeal(id);
  }

  async updateCRMDealStage(id, stage) {
    return this.crmModule.updateDealStage(id, stage);
  }

  openCRMInteractionModal(id = null) {
    return this.crmModule.openInteractionModal(id);
  }

  closeCRMInteractionModal() {
    return this.crmModule.closeInteractionModal();
  }

  async saveCRMInteraction(e) {
    return this.crmModule.saveInteraction(e);
  }

  async deleteCRMInteraction(id) {
    return this.crmModule.deleteInteraction(id);
  }

  switchCRMTab(tab) {
    return this.crmModule.switchTab(tab);
  }
}

// Initialize the app when DOM is ready
let taskManager;
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => {
    taskManager = new TaskManager();
    window.taskManager = taskManager;
  });
} else {
  taskManager = new TaskManager();
  window.taskManager = taskManager;
}
