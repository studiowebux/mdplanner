import {
  PRIORITY_CLASSES,
  STATUS_CLASSES,
  TAG_CLASSES,
  DEADLINE_CLASSES,
  SECTION_COLORS
} from './modules/constants.js';

import {
  formatDate,
  formatDateForInput,
  escapeHtml,
  markdownToHtml,
  getPriorityColor,
  getPriorityBadgeClasses,
  getPriorityText
} from './modules/utils.js';

import { showToast } from './modules/ui/toast.js';
import { ThemeManager } from './modules/ui/theme.js';
import { toggleMobileMenu, closeMobileMenu } from './modules/ui/mobile.js';
import {
  TasksAPI,
  ProjectAPI,
  NotesAPI,
  GoalsAPI,
  MilestonesAPI,
  IdeasAPI,
  RetrospectivesAPI,
  SwotAPI,
  RiskAnalysisAPI,
  LeanCanvasAPI,
  BusinessModelAPI,
  ProjectValueAPI,
  BriefAPI,
  CapacityAPI,
  TimeTrackingAPI,
  CanvasAPI,
  MindmapsAPI,
  C4API,
  StrategicLevelsAPI,
  BillingAPI
} from './modules/api.js';
import { SummaryView } from './modules/views/summary.js';
import { ListView } from './modules/views/list.js';
import { BoardView } from './modules/views/board.js';
import { TimelineView } from './modules/views/timeline.js';
import { ConfigView } from './modules/views/config.js';
import { TasksModule } from './modules/features/tasks.js';

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
    this.initPomodoroWorker();

    // Initialize view modules
    this.summaryView = new SummaryView(this);
    this.listView = new ListView(this);
    this.boardView = new BoardView(this);
    this.timelineView = new TimelineView(this);
    this.configView = new ConfigView(this);

    // Initialize feature modules
    this.tasksModule = new TasksModule(this);

    this.init();
  }

  async init() {
    this.initDarkMode();
    this.initFullscreenMode();
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

  async loadProjects() {
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
          this.switchProject(e.target.value);
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
          this.switchProject(e.target.value);
          // Sync desktop selector
          if (selector) selector.value = e.target.value;
        });
      }
    } catch (error) {
      console.error("Error loading projects:", error);
    }
  }

  async switchProject(filename) {
    try {
      const response = await ProjectAPI.switchProject(filename);
      if (response.ok) {
        // Reload all data for new project
        this.tasks = [];
        this.filteredTasks = [];
        this.projectInfo = null;
        this.projectConfig = null;

        await this.loadProjectConfig();
        await this.loadSections();
        await this.loadTasks();

        if (this.currentView === "summary") {
          this.loadProjectInfo();
        } else if (this.currentView === "notes") {
          this.loadNotes();
        } else if (this.currentView === "goals") {
          this.loadGoals();
        }

        this.renderTasks();
      }
    } catch (error) {
      console.error("Error switching project:", error);
    }
  }

  checkTaskHashOnLoad() {
    const hash = window.location.hash;
    if (hash.startsWith("#task=")) {
      const taskId = hash.substring(6); // Remove "#task="
      const task = this.findTaskById(taskId);
      if (task) {
        // Switch to list view for better task visibility
        this.switchView("list");
        this.openTaskModal(task);
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
        document.getElementById("viewSelectorDropdown")?.classList.add("hidden");
      });
    document
      .getElementById("mindmapViewBtn")
      .addEventListener("click", () => {
        this.switchView("mindmap");
        document.getElementById("viewSelectorDropdown")?.classList.add("hidden");
      });
    document
      .getElementById("c4ViewBtn")
      .addEventListener("click", () => {
        this.switchView("c4");
        document.getElementById("viewSelectorDropdown")?.classList.add("hidden");
      });

    // View selector dropdown
    document.getElementById("viewSelectorBtn")?.addEventListener("click", (e) => {
      e.stopPropagation();
      document.getElementById("viewSelectorDropdown")?.classList.toggle("hidden");
    });
    document.addEventListener("click", (e) => {
      const dropdown = document.getElementById("viewSelectorDropdown");
      const btn = document.getElementById("viewSelectorBtn");
      if (dropdown && btn && !dropdown.contains(e.target) && !btn.contains(e.target)) {
        dropdown.classList.add("hidden");
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

    // Dark mode toggle
    document
      .getElementById("darkModeToggle")
      .addEventListener("click", () => this.toggleDarkMode());
    document
      .getElementById("fullscreenToggle")
      .addEventListener("click", () => this.toggleFullscreen());

    // Add task - Desktop and Mobile
    document
      .getElementById("addTaskBtn")
      .addEventListener("click", () => this.openTaskModal());
    document
      .getElementById("addTaskBtnMobile")
      .addEventListener("click", () => {
        this.openTaskModal();
        this.closeMobileMenu();
      });

    // Import/Export operations
    document
      .getElementById("importExportBtn")
      .addEventListener("click", () => this.toggleImportExportDropdown());
    document
      .getElementById("exportTasksBtn")
      .addEventListener("click", () => this.exportTasksCSV());
    document
      .getElementById("importTasksBtn")
      .addEventListener("click", () => this.importTasksCSV());
    document
      .getElementById("exportReportBtn")
      .addEventListener("click", () => this.exportPDFReport());

    // Mobile import/export (optional - may not exist in new layout)
    document
      .getElementById("exportTasksBtnMobile")
      ?.addEventListener("click", () => {
        this.exportTasksCSV();
        this.closeMobileMenu();
      });
    document
      .getElementById("importTasksBtnMobile")
      ?.addEventListener("click", () => {
        this.importTasksCSV();
        this.closeMobileMenu();
      });
    document
      .getElementById("exportReportBtnMobile")
      ?.addEventListener("click", () => {
        this.exportPDFReport();
        this.closeMobileMenu();
      });

    // CSV file input
    document
      .getElementById("csvFileInput")
      .addEventListener("change", (e) => this.handleCSVFileSelect(e));

    // Close dropdown when clicking outside
    document.addEventListener("click", (e) =>
      this.handleImportExportDropdownClick(e),
    );

    // Modal events
    document
      .getElementById("cancelBtn")
      .addEventListener("click", () => this.closeTaskModal());
    document
      .getElementById("taskForm")
      .addEventListener("submit", (e) => this.handleTaskSubmit(e));

    // Project config events
    document
      .getElementById("saveProjectConfig")
      .addEventListener("click", () => this.saveProjectConfig());
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

    // Project links events
    document
      .getElementById("addLinkBtn")
      .addEventListener("click", () => this.toggleAddLinkForm());
    document
      .getElementById("cancelLinkBtn")
      .addEventListener("click", () => this.toggleAddLinkForm());
    document
      .getElementById("saveLinkBtn")
      .addEventListener("click", () => this.addLink());

    // Project status events
    document
      .getElementById("projectStatus")
      .addEventListener("change", (e) => this.updateProjectStatus(e.target.value));
    document
      .getElementById("statusCommentText")
      .addEventListener("blur", () => this.saveStatusComment());

    // List filter/sort events
    document
      .getElementById("filterSection")
      .addEventListener("change", () => this.applyListFilters());
    document
      .getElementById("filterAssignee")
      .addEventListener("change", () => this.applyListFilters());
    document
      .getElementById("filterMilestone")
      .addEventListener("change", () => this.applyListFilters());
    document
      .getElementById("filterStatus")
      .addEventListener("change", () => this.applyListFilters());
    document
      .getElementById("sortTasks")
      .addEventListener("change", () => this.applyListFilters());
    document
      .getElementById("clearFilters")
      .addEventListener("click", () => this.clearListFilters());

    // Pomodoro timer events
    document
      .getElementById("pomodoroBtn")
      .addEventListener("click", (e) => {
        e.stopPropagation();
        document.getElementById("pomodoroDropdown").classList.toggle("hidden");
        this.updateNotificationStatus();
      });
    document
      .getElementById("pomodoroStartBtn")
      .addEventListener("click", () => this.startPomodoro());
    document
      .getElementById("pomodoroStopBtn")
      .addEventListener("click", () => this.stopPomodoro());
    document
      .getElementById("pomodoroFocusBtn")
      .addEventListener("click", () => this.setPomodoroMode("focus"));
    document
      .getElementById("pomodoroShortBtn")
      .addEventListener("click", () => this.setPomodoroMode("short"));
    document
      .getElementById("pomodoroLongBtn")
      .addEventListener("click", () => this.setPomodoroMode("long"));
    document
      .getElementById("pomodoroDebugBtn")
      .addEventListener("click", () => this.setPomodoroMode("debug"));
    document.addEventListener("click", (e) => {
      const dropdown = document.getElementById("pomodoroDropdown");
      const btn = document.getElementById("pomodoroBtn");
      if (!dropdown.contains(e.target) && !btn.contains(e.target)) {
        dropdown.classList.add("hidden");
      }
    });
    // Catch up pomodoro when tab becomes visible again
    document.addEventListener("visibilitychange", () => {
      if (!document.hidden && this.pomodoro.isRunning) {
        this.tickPomodoro();
      }
    });

    // Dependency autocomplete events
    document
      .getElementById("taskBlockedBy")
      .addEventListener("input", (e) => this.handleDependencyInput(e));
    document
      .getElementById("taskBlockedBy")
      .addEventListener("keydown", (e) => this.handleDependencyKeydown(e));
    document.addEventListener("click", (e) =>
      this.handleDependencyDocumentClick(e),
    );

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

    // Assignee management events
    document
      .getElementById("addAssigneeBtn")
      .addEventListener("click", () => this.addAssignee());
    document
      .getElementById("newAssigneeInput")
      .addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          this.addAssignee();
        }
      });

    // Tag management events
    document
      .getElementById("addTagBtn")
      .addEventListener("click", () => this.addTag());
    document.getElementById("newTagInput").addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        this.addTag();
      }
    });

    // Working days select in timeline view
    document
      .getElementById("timelineWorkingDays")
      .addEventListener("change", (e) => {
        this.updateWorkingDays(parseInt(e.target.value));
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

    // Close modal on background click
    document.getElementById("taskModal").addEventListener("click", (e) => {
      if (e.target.id === "taskModal") {
        this.closeTaskModal();
      }
    });

    // Notes events
    document
      .getElementById("addNoteBtn")
      .addEventListener("click", () => this.openNoteModal());
    document
      .getElementById("cancelNoteBtn")
      .addEventListener("click", () => this.closeNoteModal());
    document
      .getElementById("noteForm")
      .addEventListener("submit", (e) => this.handleNoteSubmit(e));
    document
      .getElementById("toggleEditBtn")
      .addEventListener("click", () => this.toggleNoteEditMode());
    document
      .getElementById("deleteNoteBtn")
      .addEventListener("click", () => this.deleteCurrentNote());
    
    // Enhanced Notes Events
    document
      .getElementById("toggleModeBtn")
      .addEventListener("click", () => this.toggleEnhancedMode());
    document
      .getElementById("openMarkdownBtn")
      .addEventListener("click", () => this.openMarkdownFile());
    document
      .getElementById("addParagraphBtn")
      .addEventListener("click", () => this.addParagraph("text"));
    document
      .getElementById("addCodeBlockBtn")
      .addEventListener("click", () => this.addParagraph("code"));
    document
      .getElementById("addCustomSectionBtn")
      .addEventListener("click", () => this.addCustomSection());
    document
      .getElementById("enableMultiSelectBtn")
      .addEventListener("click", () => this.toggleMultiSelect());
    
    // File input event
    document
      .getElementById("markdownFileInput")
      .addEventListener("change", (e) => this.handleMarkdownFileSelect(e));
    
    // Custom section modal events
    document
      .getElementById("cancelCustomSectionBtn")
      .addEventListener("click", () => this.closeCustomSectionModal());
    document
      .getElementById("createCustomSectionBtn")
      .addEventListener("click", () => this.createCustomSection());

    // Auto-save events for note editing
    document
      .getElementById("activeNoteTitle")
      .addEventListener("input", () => this.scheduleAutoSave());
    document
      .getElementById("activeNoteEditor")
      .addEventListener("input", () => this.scheduleAutoSave());

    // Goals events
    document
      .getElementById("addGoalBtn")
      .addEventListener("click", () => this.openGoalModal());
    document
      .getElementById("cancelGoalBtn")
      .addEventListener("click", () => this.closeGoalModal());
    document
      .getElementById("goalForm")
      .addEventListener("submit", (e) => this.handleGoalSubmit(e));

    // Goal filters
    document
      .getElementById("allGoalsFilter")
      .addEventListener("click", () => this.filterGoals("all"));
    document
      .getElementById("enterpriseGoalsFilter")
      .addEventListener("click", () => this.filterGoals("enterprise"));
    document
      .getElementById("projectGoalsFilter")
      .addEventListener("click", () => this.filterGoals("project"));

    // Milestones events
    document
      .getElementById("milestonesViewBtn")
      .addEventListener("click", () => this.switchView("milestones"));
    document
      .getElementById("addMilestoneBtn")
      .addEventListener("click", () => this.openMilestoneModal());
    document
      .getElementById("cancelMilestoneBtn")
      .addEventListener("click", () => this.closeMilestoneModal());
    document
      .getElementById("milestoneForm")
      .addEventListener("submit", (e) => this.saveMilestone(e));

    // Ideas events
    document
      .getElementById("ideasViewBtn")
      .addEventListener("click", () => {
        this.switchView("ideas");
        document.getElementById("viewSelectorDropdown")?.classList.add("hidden");
      });
    document
      .getElementById("addIdeaBtn")
      .addEventListener("click", () => this.openIdeaModal());
    document
      .getElementById("cancelIdeaBtn")
      .addEventListener("click", () => this.closeIdeaModal());
    document
      .getElementById("ideaForm")
      .addEventListener("submit", (e) => this.saveIdea(e));

    // Idea link picker events
    document.getElementById("openIdeaLinkPickerBtn")?.addEventListener("click", () => this.openIdeaLinkPicker());
    document.getElementById("cancelIdeaLinkPickerBtn")?.addEventListener("click", () => this.closeIdeaLinkPicker());
    document.getElementById("saveIdeaLinksBtn")?.addEventListener("click", () => this.saveIdeaLinks());
    document.getElementById("ideaLinkSearch")?.addEventListener("input", (e) => this.filterIdeaLinkList(e.target.value));

    // Billing events
    document.getElementById("billingViewBtn")?.addEventListener("click", () => {
      this.switchView("billing");
      document.getElementById("viewSelectorDropdown")?.classList.add("hidden");
    });
    // Billing tab navigation
    document.querySelectorAll(".billing-tab").forEach(tab => {
      tab.addEventListener("click", (e) => this.switchBillingTab(e.target.dataset.billingTab));
    });
    // Customer events
    document.getElementById("addCustomerBtn")?.addEventListener("click", () => this.openCustomerModal());
    document.getElementById("cancelCustomerBtn")?.addEventListener("click", () => this.closeCustomerModal());
    document.getElementById("customerForm")?.addEventListener("submit", (e) => this.saveCustomer(e));
    // Billing Rate events
    document.getElementById("addBillingRateBtn")?.addEventListener("click", () => this.openBillingRateModal());
    document.getElementById("cancelBillingRateBtn")?.addEventListener("click", () => this.closeBillingRateModal());
    document.getElementById("billingRateForm")?.addEventListener("submit", (e) => this.saveBillingRate(e));
    // Quote events
    document.getElementById("addQuoteBtn")?.addEventListener("click", () => this.openQuoteModal());
    document.getElementById("cancelQuoteBtn")?.addEventListener("click", () => this.closeQuoteModal());
    document.getElementById("quoteForm")?.addEventListener("submit", (e) => this.saveQuote(e));
    document.getElementById("addQuoteLineBtn")?.addEventListener("click", () => this.addQuoteLineItem());
    document.getElementById("quoteTaxRate")?.addEventListener("input", () => this.updateQuoteTotals());
    // Invoice events
    document.getElementById("addInvoiceBtn")?.addEventListener("click", () => this.openInvoiceModal());
    document.getElementById("cancelInvoiceBtn")?.addEventListener("click", () => this.closeInvoiceModal());
    document.getElementById("invoiceForm")?.addEventListener("submit", (e) => this.saveInvoice(e));
    document.getElementById("addInvoiceLineBtn")?.addEventListener("click", () => this.addInvoiceLineItem());
    document.getElementById("invoiceTaxRate")?.addEventListener("input", () => this.updateInvoiceTotals());
    // Generate Invoice events
    document.getElementById("generateInvoiceBtn")?.addEventListener("click", () => this.openGenerateInvoiceModal());
    document.getElementById("cancelGenerateInvoiceBtn")?.addEventListener("click", () => this.closeGenerateInvoiceModal());
    document.getElementById("generateInvoiceForm")?.addEventListener("submit", (e) => this.generateInvoice(e));
    // Payment events
    document.getElementById("cancelPaymentBtn")?.addEventListener("click", () => this.closePaymentModal());
    document.getElementById("paymentForm")?.addEventListener("submit", (e) => this.savePayment(e));

    // Retrospectives events
    document
      .getElementById("retrospectivesViewBtn")
      .addEventListener("click", () => {
        this.switchView("retrospectives");
        document.getElementById("viewSelectorDropdown")?.classList.add("hidden");
      });
    document
      .getElementById("addRetrospectiveBtn")
      .addEventListener("click", () => this.openRetrospectiveModal());
    document
      .getElementById("cancelRetrospectiveBtn")
      .addEventListener("click", () => this.closeRetrospectiveModal());
    document
      .getElementById("retrospectiveForm")
      .addEventListener("submit", (e) => this.saveRetrospective(e));

    // SWOT Analysis events
    document
      .getElementById("swotViewBtn")
      .addEventListener("click", () => {
        this.switchView("swot");
        document.getElementById("viewSelectorDropdown")?.classList.add("hidden");
      });
    document
      .getElementById("addSwotBtn")
      .addEventListener("click", () => this.openSwotModal());
    document
      .getElementById("cancelSwotBtn")
      .addEventListener("click", () => this.closeSwotModal());
    document
      .getElementById("swotForm")
      .addEventListener("submit", (e) => this.saveSwot(e));
    document
      .getElementById("swotSelector")
      .addEventListener("change", (e) => this.selectSwot(e.target.value));
    document
      .getElementById("editSwotBtn")
      .addEventListener("click", () => this.editSelectedSwot());
    document
      .getElementById("deleteSwotBtn")
      .addEventListener("click", () => this.deleteSelectedSwot());
    document
      .getElementById("cancelSwotItemBtn")
      .addEventListener("click", () => this.closeSwotItemModal());
    document
      .getElementById("swotItemForm")
      .addEventListener("submit", (e) => this.saveSwotItem(e));
    document.querySelectorAll(".swot-add-btn").forEach(btn => {
      btn.addEventListener("click", () => this.openSwotItemModal(btn.dataset.quadrant));
    });

    // Risk Analysis events
    document
      .getElementById("riskAnalysisViewBtn")
      .addEventListener("click", () => {
        this.switchView("riskAnalysis");
        document.getElementById("viewSelectorDropdown")?.classList.add("hidden");
      });
    document
      .getElementById("addRiskAnalysisBtn")
      .addEventListener("click", () => this.openRiskAnalysisModal());
    document
      .getElementById("cancelRiskAnalysisBtn")
      .addEventListener("click", () => this.closeRiskAnalysisModal());
    document
      .getElementById("riskAnalysisForm")
      .addEventListener("submit", (e) => this.saveRiskAnalysis(e));
    document
      .getElementById("riskAnalysisSelector")
      .addEventListener("change", (e) => this.selectRiskAnalysis(e.target.value));
    document
      .getElementById("editRiskAnalysisBtn")
      .addEventListener("click", () => this.editSelectedRiskAnalysis());
    document
      .getElementById("deleteRiskAnalysisBtn")
      .addEventListener("click", () => this.deleteSelectedRiskAnalysis());
    document
      .getElementById("cancelRiskAnalysisItemBtn")
      .addEventListener("click", () => this.closeRiskAnalysisItemModal());
    document
      .getElementById("riskAnalysisItemForm")
      .addEventListener("submit", (e) => this.saveRiskAnalysisItem(e));
    document.querySelectorAll(".risk-add-btn").forEach(btn => {
      btn.addEventListener("click", () => this.openRiskAnalysisItemModal(btn.dataset.quadrant));
    });

    // Lean Canvas events
    document
      .getElementById("leanCanvasViewBtn")
      .addEventListener("click", () => {
        this.switchView("leanCanvas");
        document.getElementById("viewSelectorDropdown")?.classList.add("hidden");
      });
    document
      .getElementById("addLeanCanvasBtn")
      .addEventListener("click", () => this.openLeanCanvasModal());
    document
      .getElementById("cancelLeanCanvasBtn")
      .addEventListener("click", () => this.closeLeanCanvasModal());
    document
      .getElementById("leanCanvasForm")
      .addEventListener("submit", (e) => this.saveLeanCanvas(e));
    document
      .getElementById("leanCanvasSelector")
      .addEventListener("change", (e) => this.selectLeanCanvas(e.target.value));
    document
      .getElementById("editLeanCanvasBtn")
      .addEventListener("click", () => this.editSelectedLeanCanvas());
    document
      .getElementById("deleteLeanCanvasBtn")
      .addEventListener("click", () => this.deleteSelectedLeanCanvas());
    document
      .getElementById("cancelLeanCanvasItemBtn")
      .addEventListener("click", () => this.closeLeanCanvasItemModal());
    document
      .getElementById("leanCanvasItemForm")
      .addEventListener("submit", (e) => this.saveLeanCanvasItem(e));
    document.querySelectorAll(".lean-add-btn").forEach(btn => {
      btn.addEventListener("click", () => this.openLeanCanvasItemModal(btn.dataset.section));
    });

    // Business Model Canvas events
    document
      .getElementById("businessModelViewBtn")
      .addEventListener("click", () => {
        this.switchView("businessModel");
        document.getElementById("viewSelectorDropdown")?.classList.add("hidden");
      });
    document
      .getElementById("addBusinessModelBtn")
      .addEventListener("click", () => this.openBusinessModelModal());
    document
      .getElementById("cancelBusinessModelBtn")
      .addEventListener("click", () => this.closeBusinessModelModal());
    document
      .getElementById("businessModelForm")
      .addEventListener("submit", (e) => this.saveBusinessModel(e));
    document
      .getElementById("businessModelSelector")
      .addEventListener("change", (e) => this.selectBusinessModel(e.target.value));
    document
      .getElementById("editBusinessModelBtn")
      .addEventListener("click", () => this.editSelectedBusinessModel());
    document
      .getElementById("deleteBusinessModelBtn")
      .addEventListener("click", () => this.deleteSelectedBusinessModel());
    document
      .getElementById("cancelBusinessModelItemBtn")
      .addEventListener("click", () => this.closeBusinessModelItemModal());
    document
      .getElementById("businessModelItemForm")
      .addEventListener("submit", (e) => this.saveBusinessModelItem(e));
    document.querySelectorAll(".bmc-add-btn").forEach(btn => {
      btn.addEventListener("click", () => this.openBusinessModelItemModal(btn.dataset.section));
    });

    // Project Value Board events
    document
      .getElementById("projectValueViewBtn")
      .addEventListener("click", () => {
        this.switchView("projectValue");
        document.getElementById("viewSelectorDropdown")?.classList.add("hidden");
      });
    document
      .getElementById("addProjectValueBtn")
      .addEventListener("click", () => this.openProjectValueModal());
    document
      .getElementById("cancelProjectValueBtn")
      .addEventListener("click", () => this.closeProjectValueModal());
    document
      .getElementById("projectValueForm")
      .addEventListener("submit", (e) => this.saveProjectValue(e));
    document
      .getElementById("projectValueSelector")
      .addEventListener("change", (e) => this.selectProjectValue(e.target.value));
    document
      .getElementById("editProjectValueBtn")
      .addEventListener("click", () => this.editSelectedProjectValue());
    document
      .getElementById("deleteProjectValueBtn")
      .addEventListener("click", () => this.deleteSelectedProjectValue());
    document
      .getElementById("cancelProjectValueItemBtn")
      .addEventListener("click", () => this.closeProjectValueItemModal());
    document
      .getElementById("projectValueItemForm")
      .addEventListener("submit", (e) => this.saveProjectValueItem(e));
    document.querySelectorAll(".pvb-add-btn").forEach(btn => {
      btn.addEventListener("click", () => this.openProjectValueItemModal(btn.dataset.section));
    });

    // Brief events
    document
      .getElementById("briefViewBtn")
      .addEventListener("click", () => {
        this.switchView("brief");
        document.getElementById("viewSelectorDropdown")?.classList.add("hidden");
      });
    document
      .getElementById("addBriefBtn")
      .addEventListener("click", () => this.openBriefModal());
    document
      .getElementById("cancelBriefBtn")
      .addEventListener("click", () => this.closeBriefModal());
    document
      .getElementById("briefForm")
      .addEventListener("submit", (e) => this.saveBrief(e));
    document
      .getElementById("briefSelector")
      .addEventListener("change", (e) => this.selectBrief(e.target.value));
    document
      .getElementById("editBriefBtn")
      .addEventListener("click", () => this.editBrief());
    document
      .getElementById("deleteBriefBtn")
      .addEventListener("click", () => this.deleteBrief());
    document
      .getElementById("cancelBriefItemBtn")
      .addEventListener("click", () => this.closeBriefItemModal());
    document
      .getElementById("briefItemForm")
      .addEventListener("submit", (e) => this.saveBriefItem(e));
    document.querySelectorAll(".brief-add-btn").forEach(btn => {
      btn.addEventListener("click", () => this.openBriefItemModal(btn.dataset.section));
    });

    // Time Tracking events
    document
      .getElementById("timeTrackingViewBtn")
      .addEventListener("click", () => {
        this.switchView("timeTracking");
        document.getElementById("viewSelectorDropdown")?.classList.add("hidden");
      });
    document
      .getElementById("addTimeEntryBtn")
      .addEventListener("click", () => this.showTimeEntryForm());
    document
      .getElementById("cancelTimeEntryBtn")
      .addEventListener("click", () => this.hideTimeEntryForm());
    document
      .getElementById("saveTimeEntryBtn")
      .addEventListener("click", () => this.saveTimeEntry());

    // Capacity Planning events
    document
      .getElementById("capacityViewBtn")
      ?.addEventListener("click", () => {
        this.switchView("capacity");
        document.getElementById("viewSelectorDropdown")?.classList.add("hidden");
      });
    document
      .getElementById("addCapacityPlanBtn")
      ?.addEventListener("click", () => this.openCapacityPlanModal());
    document
      .getElementById("cancelCapacityPlanBtn")
      ?.addEventListener("click", () => this.closeCapacityPlanModal());
    document
      .getElementById("capacityPlanForm")
      ?.addEventListener("submit", (e) => this.saveCapacityPlan(e));
    document
      .getElementById("capacityPlanSelector")
      ?.addEventListener("change", (e) => this.selectCapacityPlan(e.target.value));
    document
      .getElementById("editCapacityPlanBtn")
      ?.addEventListener("click", () => this.editCapacityPlan());
    document
      .getElementById("deleteCapacityPlanBtn")
      ?.addEventListener("click", () => this.deleteCapacityPlan());
    document
      .getElementById("addTeamMemberBtn")
      ?.addEventListener("click", () => this.openTeamMemberModal());
    document
      .getElementById("cancelTeamMemberBtn")
      ?.addEventListener("click", () => this.closeTeamMemberModal());
    document
      .getElementById("teamMemberForm")
      ?.addEventListener("submit", (e) => this.saveTeamMember(e));
    document
      .getElementById("cancelAllocationBtn")
      ?.addEventListener("click", () => this.closeAllocationModal());
    document
      .getElementById("deleteAllocationBtn")
      ?.addEventListener("click", () => this.deleteAllocation());
    document
      .getElementById("allocationForm")
      ?.addEventListener("submit", (e) => this.saveAllocation(e));
    document
      .getElementById("capacityTeamTab")
      ?.addEventListener("click", () => this.switchCapacityTab("team"));
    document
      .getElementById("capacityAllocTab")
      ?.addEventListener("click", () => this.switchCapacityTab("alloc"));
    document
      .getElementById("capacityUtilTab")
      ?.addEventListener("click", () => this.switchCapacityTab("util"));
    document
      .getElementById("allocPrevWeek")
      ?.addEventListener("click", () => this.changeAllocWeek(-1));
    document
      .getElementById("allocNextWeek")
      ?.addEventListener("click", () => this.changeAllocWeek(1));
    document
      .getElementById("autoAssignBtn")
      ?.addEventListener("click", () => this.openAutoAssignModal());
    document
      .getElementById("cancelAutoAssignBtn")
      ?.addEventListener("click", () => this.closeAutoAssignModal());
    document
      .getElementById("applyAutoAssignBtn")
      ?.addEventListener("click", () => this.applyAutoAssign());

    // Strategic Levels events
    document
      .getElementById("strategicLevelsViewBtn")
      ?.addEventListener("click", () => {
        this.switchView("strategicLevels");
        document.getElementById("viewSelectorDropdown")?.classList.add("hidden");
      });
    document
      .getElementById("addStrategicLevelsBtn")
      ?.addEventListener("click", () => this.openStrategicLevelsModal());
    document
      .getElementById("cancelStrategicLevelsBtn")
      ?.addEventListener("click", () => this.closeStrategicLevelsModal());
    document
      .getElementById("strategicLevelsForm")
      ?.addEventListener("submit", (e) => this.saveStrategicLevelsBuilder(e));
    document
      .getElementById("strategicLevelsSelector")
      ?.addEventListener("change", (e) => this.selectStrategicBuilder(e.target.value));
    document
      .getElementById("editStrategicLevelsBtn")
      ?.addEventListener("click", () => this.editStrategicBuilder());
    document
      .getElementById("deleteStrategicLevelsBtn")
      ?.addEventListener("click", () => this.deleteStrategicBuilder());
    document
      .getElementById("cancelStrategicLevelBtn")
      ?.addEventListener("click", () => this.closeStrategicLevelModal());
    document
      .getElementById("strategicLevelForm")
      ?.addEventListener("submit", (e) => this.saveStrategicLevel(e));
    document
      .getElementById("cancelStrategicLinkBtn")
      ?.addEventListener("click", () => this.closeStrategicLinkModal());
    document
      .getElementById("saveStrategicLinkBtn")
      ?.addEventListener("click", () => this.saveStrategicLinks());

    // Canvas events
    document
      .getElementById("addStickyNoteBtn")
      .addEventListener("click", () => this.openStickyNoteModal());
    document
      .getElementById("cancelStickyNoteBtn")
      .addEventListener("click", () => this.closeStickyNoteModal());
    document
      .getElementById("stickyNoteForm")
      .addEventListener("submit", (e) => this.handleStickyNoteSubmit(e));
    document
      .getElementById("canvasZoom")
      .addEventListener("input", (e) => this.updateCanvasZoom(e.target.value));

    // Mindmap events
    document
      .getElementById("addMindmapBtn")
      .addEventListener("click", () => this.openMindmapModal());
    document
      .getElementById("cancelMindmapBtn")
      .addEventListener("click", () => this.closeMindmapModal());
    document
      .getElementById("mindmapForm")
      .addEventListener("submit", (e) => this.handleMindmapSubmit(e));
    document
      .getElementById("mindmapSelector")
      .addEventListener("change", (e) => this.selectMindmap(e.target.value));
    document
      .getElementById("mindmapStructure")
      .addEventListener("keydown", (e) => this.handleMindmapKeyDown(e));
    document
      .getElementById("mindmapStructure")
      .addEventListener("input", () => this.updateMindmapPreview());

    // Mindmap toolbar buttons
    document
      .getElementById("mmAddRootBtn")
      .addEventListener("click", () => this.mmAddRoot());
    document
      .getElementById("mmAddChildBtn")
      .addEventListener("click", () => this.mmAddChild());
    document
      .getElementById("mmAddSiblingBtn")
      .addEventListener("click", () => this.mmAddSibling());
    document
      .getElementById("mmIndentBtn")
      .addEventListener("click", () => this.mmIndent());
    document
      .getElementById("mmUnindentBtn")
      .addEventListener("click", () => this.mmUnindent());
    document
      .getElementById("mmMoveUpBtn")
      .addEventListener("click", () => this.mmMoveLine(-1));
    document
      .getElementById("mmMoveDownBtn")
      .addEventListener("click", () => this.mmMoveLine(1));
    document
      .getElementById("mmDeleteLineBtn")
      .addEventListener("click", () => this.mmDeleteLine());

    document
      .getElementById("editMindmapBtn")
      .addEventListener("click", () => this.editSelectedMindmap());
    document
      .getElementById("deleteMindmapBtn")
      .addEventListener("click", () => this.deleteSelectedMindmap());
    document
      .getElementById("mindmapZoom")
      .addEventListener("input", (e) => this.updateMindmapZoom(e.target.value));

    // C4 Architecture events
    document
      .getElementById("addC4ComponentBtn")
      .addEventListener("click", () => this.openC4ComponentModal());
    document
      .getElementById("cancelC4ComponentBtn")
      .addEventListener("click", () => this.closeC4ComponentModal());
    document
      .getElementById("c4ComponentForm")
      .addEventListener("submit", (e) => this.handleC4ComponentSubmit(e));
    document
      .getElementById("c4Zoom")
      .addEventListener("input", (e) => this.updateC4Zoom(e.target.value));
    document
      .getElementById("c4BackBtn")
      .addEventListener("click", () => this.navigateC4Back());
    document
      .getElementById("addC4ConnectionBtn")
      .addEventListener("click", () => this.addC4ConnectionInput());
    document
      .getElementById("c4ResetViewBtn")
      .addEventListener("click", () => this.resetC4View());
    
    document
      .getElementById("c4AutoLayoutBtn")
      .addEventListener("click", () => this.triggerC4AutoLayout());
    document
      .getElementById("c4PhysicsToggle")
      .addEventListener("change", (e) => {
        this.c4PhysicsEnabled = e.target.checked;
        if (this.c4PhysicsEnabled) {
          const currentComponents = this.getCurrentLevelComponents();
          this.initializeC4ForceLayout(currentComponents);
        } else {
          this.stopC4ForceLayout();
        }
      });
    document
      .getElementById("c4ViewMode")
      .addEventListener("change", (e) => this.toggleC4ViewMode(e.target.value));
    document
      .getElementById("mindmapLayout")
      .addEventListener("change", (e) =>
        this.updateMindmapLayout(e.target.value),
      );

    // Color picker events for sticky note modal
    document.addEventListener("click", (e) => {
      if (e.target.classList.contains("color-option")) {
        document
          .querySelectorAll(".color-option")
          .forEach((opt) => opt.classList.remove("selected"));
        e.target.classList.add("selected");
        this.selectedStickyNoteColor = e.target.dataset.color;
      }
    });

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

    document
      .getElementById("stickyNoteModal")
      .addEventListener("click", (e) => {
        if (e.target.id === "stickyNoteModal") {
          this.closeStickyNoteModal();
        }
      });

    document.getElementById("mindmapModal").addEventListener("click", (e) => {
      if (e.target.id === "mindmapModal") {
        this.closeMindmapModal();
      }
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

    // Setup drag and drop for board view
    this.setupDragAndDrop();
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
      retrospectives: "Retrospectives", swot: "SWOT Analysis", riskAnalysis: "Risk Analysis", leanCanvas: "Lean Canvas", businessModel: "Business Model", brief: "Brief", timeTracking: "Time Tracking", capacity: "Capacity", strategicLevels: "Strategic Levels", config: "Settings"
    };
    const label = document.getElementById("currentViewLabel");
    if (label) label.textContent = viewLabels[view] || view;

    // Close dropdown
    document.getElementById("viewSelectorDropdown")?.classList.add("hidden");

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

    // Disable multi-select mode when switching views
    if (this.multiSelectMode) {
      this.toggleMultiSelect();
    }

    this.resizableEvents.forEach((elem) => elem.disconnect());
    this.notesLoaded = false;

    // Reset all desktop nav buttons in dropdown
    const desktopNavBtns = ["summaryViewBtn", "listViewBtn", "boardViewBtn", "timelineViewBtn", "notesViewBtn", "goalsViewBtn", "milestonesViewBtn", "ideasViewBtn", "canvasViewBtn", "mindmapViewBtn", "c4ViewBtn", "retrospectivesViewBtn", "swotViewBtn", "riskAnalysisViewBtn", "leanCanvasViewBtn", "businessModelViewBtn", "projectValueViewBtn", "briefViewBtn", "timeTrackingViewBtn", "capacityViewBtn", "strategicLevelsViewBtn", "billingViewBtn"];
    desktopNavBtns.forEach((id) => {
      const btn = document.getElementById(id);
      if (btn) {
        btn.classList.remove("text-gray-900", "dark:text-white", "bg-gray-100", "dark:bg-gray-700");
        btn.classList.add("text-gray-600", "dark:text-gray-300");
      }
    });

    // Reset mobile buttons
    const mobileBtnIds = ["summaryViewBtnMobile", "listViewBtnMobile", "boardViewBtnMobile", "timelineViewBtnMobile", "notesViewBtnMobile", "goalsViewBtnMobile", "milestonesViewBtnMobile", "canvasViewBtnMobile", "mindmapViewBtnMobile", "c4ViewBtnMobile", "ideasViewBtnMobile", "retrospectivesViewBtnMobile", "swotViewBtnMobile", "riskAnalysisViewBtnMobile", "leanCanvasViewBtnMobile", "businessModelViewBtnMobile", "projectValueViewBtnMobile", "briefViewBtnMobile", "timeTrackingViewBtnMobile", "capacityViewBtnMobile", "strategicLevelsViewBtnMobile", "billingViewBtnMobile", "configViewBtnMobile"];
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
      this.loadProjectValueBoards();
    } else if (view === "brief") {
      this.activateViewButton("brief");
      document.getElementById("briefView").classList.remove("hidden");
      this.loadBriefs();
    } else if (view === "timeTracking") {
      this.activateViewButton("timeTracking");
      document.getElementById("timeTrackingView").classList.remove("hidden");
      this.loadTimeTracking();
    } else if (view === "capacity") {
      this.activateViewButton("capacity");
      document.getElementById("capacityView").classList.remove("hidden");
      this.loadCapacityPlans();
    } else if (view === "strategicLevels") {
      this.activateViewButton("strategicLevels");
      document.getElementById("strategicLevelsView").classList.remove("hidden");
      this.loadStrategicLevelsBuilders();
    } else if (view === "billing") {
      this.activateViewButton("billing");
      document.getElementById("billingView").classList.remove("hidden");
      this.loadBillingData();
    } else if (view === "canvas") {
      this.activateViewButton("canvas");
      document.getElementById("canvasView").classList.remove("hidden");
      await this.loadCanvas();
      this.notesLoaded = true;
    } else if (view === "mindmap") {
      this.activateViewButton("mindmap");
      document.getElementById("mindmapView").classList.remove("hidden");
      this.loadMindmaps();
    } else if (view === "c4") {
      this.activateViewButton("c4");
      document.getElementById("c4View").classList.remove("hidden");
      this.loadC4Components();
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

  // Pomodoro Timer with Web Worker for background execution
  initPomodoroWorker() {
    const workerCode = `
      let endTime = null;
      let interval = null;

      self.onmessage = function(e) {
        if (e.data.command === 'start') {
          endTime = e.data.endTime;
          if (interval) clearInterval(interval);
          interval = setInterval(() => {
            const remaining = Math.max(0, Math.ceil((endTime - Date.now()) / 1000));
            self.postMessage({ type: 'tick', remaining });
            if (remaining <= 0) {
              clearInterval(interval);
              self.postMessage({ type: 'complete' });
            }
          }, 1000);
        } else if (e.data.command === 'stop') {
          if (interval) clearInterval(interval);
          endTime = null;
        }
      };
    `;

    try {
      const blob = new Blob([workerCode], { type: "application/javascript" });
      this.pomodoro.worker = new Worker(URL.createObjectURL(blob));

      this.pomodoro.worker.onmessage = (e) => {
        if (e.data.type === "tick") {
          this.pomodoro.timeLeft = e.data.remaining;
          this.updatePomodoroDisplay();
        } else if (e.data.type === "complete") {
          this.pomodoroComplete();
        }
      };
    } catch (err) {
      console.warn("Web Worker not supported, falling back to setInterval");
      this.pomodoro.worker = null;
    }
  }

  updateNotificationStatus() {
    const statusEl = document.getElementById("pomodoroNotifStatus");
    if (!statusEl) return;

    if (!("Notification" in window)) {
      statusEl.innerHTML = '<span class="text-gray-400">Notifications not supported</span>';
    } else if (Notification.permission === "granted") {
      statusEl.innerHTML = '<span class="text-green-600 dark:text-green-400">Notifications enabled</span>';
    } else if (Notification.permission === "denied") {
      statusEl.innerHTML = '<span class="text-red-600 dark:text-red-400">Notifications blocked - enable in browser settings</span>';
    } else {
      statusEl.innerHTML = '<button id="enableNotifBtn" class="text-gray-900 dark:text-gray-100 hover:underline">Enable notifications</button>';
      document.getElementById("enableNotifBtn")?.addEventListener("click", () => {
        Notification.requestPermission().then(() => this.updateNotificationStatus());
      });
    }
  }

  startPomodoro() {
    if (this.pomodoro.isRunning) return;

    // Clean up any leftover state from previous run
    this.stopPomodoroSound();

    // Request notification permission on first start
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission().then(() => this.updateNotificationStatus());
    }

    this.pomodoro.isRunning = true;
    this.pomodoro.endTime = Date.now() + this.pomodoro.timeLeft * 1000;

    document.getElementById("pomodoroStartBtn").classList.add("hidden");
    document.getElementById("pomodoroStopBtn").classList.remove("hidden");
    document.getElementById("pomodoroDisplay").classList.remove("hidden");

    if (this.pomodoro.worker) {
      this.pomodoro.worker.postMessage({ command: "start", endTime: this.pomodoro.endTime });
    } else {
      this.pomodoro.interval = setInterval(() => this.tickPomodoro(), 1000);
    }
    this.tickPomodoro();
  }

  tickPomodoro() {
    if (!this.pomodoro.isRunning || !this.pomodoro.endTime) return;

    const remaining = Math.max(0, Math.ceil((this.pomodoro.endTime - Date.now()) / 1000));
    this.pomodoro.timeLeft = remaining;
    this.updatePomodoroDisplay();

    if (remaining <= 0) {
      this.pomodoroComplete();
    }
  }

  stopPomodoro() {
    // Stop the timer
    this.pomodoro.isRunning = false;
    this.pomodoro.endTime = null;

    if (this.pomodoro.worker) {
      this.pomodoro.worker.postMessage({ command: "stop" });
    } else {
      clearInterval(this.pomodoro.interval);
    }

    // Stop any alarm
    this.stopPomodoroSound();
    try {
      if (this.pomodoroNotification) {
        this.pomodoroNotification.close();
        this.pomodoroNotification = null;
      }
    } catch (e) {}

    // Reset timer
    this.pomodoro.timeLeft = this.pomodoro.duration;
    this.updatePomodoroDisplay();

    // Update UI
    document.getElementById("pomodoroStartBtn").classList.remove("hidden");
    document.getElementById("pomodoroStopBtn").classList.add("hidden");
    document.getElementById("pomodoroDisplay").classList.add("hidden");
  }

  setPomodoroMode(mode) {
    this.stopPomodoro();
    this.pomodoro.mode = mode;

    const durations = { focus: 25 * 60, short: 5 * 60, long: 15 * 60, debug: 5 };
    const labels = { focus: "Focus Time", short: "Short Break", long: "Long Break", debug: "Debug (5s)" };

    this.pomodoro.duration = durations[mode];
    this.pomodoro.timeLeft = durations[mode];

    document.getElementById("pomodoroLabel").textContent = labels[mode];
    document.getElementById("pomodoroDisplay").classList.add("hidden");

    // Update button styles
    ["Focus", "Short", "Long", "Debug"].forEach((m) => {
      const btn = document.getElementById(`pomodoro${m}Btn`);
      if (!btn) return;
      if (m.toLowerCase() === mode) {
        btn.className = "px-3 py-1 rounded text-xs font-medium bg-gray-900 text-white dark:bg-gray-600 dark:text-white";
      } else {
        btn.className = "px-3 py-1 rounded text-xs font-medium bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300";
      }
    });

    this.updatePomodoroDisplay();
  }

  updatePomodoroDisplay() {
    const minutes = Math.floor(this.pomodoro.timeLeft / 60);
    const seconds = this.pomodoro.timeLeft % 60;
    const display = `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;

    document.getElementById("pomodoroTimer").textContent = display;
    document.getElementById("pomodoroDisplay").textContent = display;
  }

  pomodoroComplete() {
    // Stop the worker/interval but keep UI showing Stop button
    this.pomodoro.isRunning = false;
    this.pomodoro.endTime = null;

    if (this.pomodoro.worker) {
      this.pomodoro.worker.postMessage({ command: "stop" });
    } else {
      clearInterval(this.pomodoro.interval);
    }

    let title, body;
    if (this.pomodoro.mode === "focus" || this.pomodoro.mode === "debug") {
      if (this.pomodoro.mode === "focus") {
        this.pomodoro.count++;
        document.getElementById("pomodoroCount").textContent = this.pomodoro.count;
      }
      title = "Pomodoro Complete!";
      body = "Great work! Time for a break.";
      this.showToast("Pomodoro complete! Take a break.");
    } else {
      title = "Break Over!";
      body = "Ready for another focus session?";
      this.showToast("Break over! Ready for another focus session?");
    }

    // Play alarm sound if enabled
    if (document.getElementById("pomodoroSoundToggle")?.checked) {
      this.playPomodoroSound();
    }

    // Show browser notification
    this.showPomodoroNotification(title, body);
  }

  showPomodoroNotification(title, body) {
    this.pomodoroNotification = null;

    if ("Notification" in window && Notification.permission === "granted") {
      try {
        this.pomodoroNotification = new Notification("MD Planner - " + title, {
          body: body + "\nClick to open app and stop alarm.",
          icon: "/favicon.ico",
          tag: "pomodoro-" + Date.now(),
          requireInteraction: true,
          silent: false,
        });

        this.pomodoroNotification.onclick = () => {
          window.focus();
          this.stopPomodoro();
        };

        this.pomodoroNotification.onclose = () => {
          this.stopPomodoro();
        };
      } catch (e) {
        console.warn("Failed to show notification:", e);
      }
    }
  }

  stopPomodoroSound() {
    if (this.pomodoroAlarmInterval) {
      clearInterval(this.pomodoroAlarmInterval);
      this.pomodoroAlarmInterval = null;
    }
    try {
      if (this.pomodoroAudioContext && this.pomodoroAudioContext.state !== "closed") {
        this.pomodoroAudioContext.close();
      }
    } catch (e) {
      // Already closed
    }
    this.pomodoroAudioContext = null;
  }

  playPomodoroSound() {
    try {
      this.pomodoroAudioContext = new (window.AudioContext || window.webkitAudioContext)();
      this.pomodoroAlarmInterval = null;

      const playAlarmPattern = () => {
        const ctx = this.pomodoroAudioContext;
        if (!ctx || ctx.state === "closed") return;

        // Alarm pattern: high-low-high beeps
        const frequencies = [880, 660, 880, 660, 880];
        const startTime = ctx.currentTime;

        frequencies.forEach((freq, i) => {
          const oscillator = ctx.createOscillator();
          const gainNode = ctx.createGain();

          oscillator.connect(gainNode);
          gainNode.connect(ctx.destination);

          oscillator.frequency.value = freq;
          oscillator.type = "square";
          gainNode.gain.value = 0.3;

          oscillator.start(startTime + i * 0.15);
          oscillator.stop(startTime + i * 0.15 + 0.12);
        });
      };

      // Play immediately and repeat every 2 seconds
      playAlarmPattern();
      this.pomodoroAlarmInterval = setInterval(playAlarmPattern, 2000);

    } catch (e) {
      console.warn("Audio not supported", e);
    }
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

  setupDragAndDrop() {
    // Add drag event listeners to board columns and list drop zones
    document.addEventListener("dragover", (e) => {
      if (
        e.target.hasAttribute("data-section") ||
        e.target.closest("[data-section]")
      ) {
        this.boardView.handleDragOver(e);
      }
    });

    document.addEventListener("drop", (e) => {
      if (
        e.target.hasAttribute("data-section") ||
        e.target.closest("[data-section]")
      ) {
        this.handleDrop(e);
      }
    });

    document.addEventListener("dragenter", (e) => {
      if (
        e.target.hasAttribute("data-section") ||
        e.target.closest("[data-section]")
      ) {
        this.boardView.handleDragEnter(e);
      }
    });

    document.addEventListener("dragleave", (e) => {
      if (
        e.target.hasAttribute("data-section") ||
        e.target.closest("[data-section]")
      ) {
        this.boardView.handleDragLeave(e);
      }
    });

    // Add drag start/end listeners to task cards and list items
    document.addEventListener("dragstart", (e) => {
      if (
        e.target.classList.contains("task-card") ||
        e.target.classList.contains("task-list-item")
      ) {
        e.target.classList.add("dragging");
        e.dataTransfer.setData("text/plain", e.target.dataset.taskId);
      }
    });

    document.addEventListener("dragend", (e) => {
      if (
        e.target.classList.contains("task-card") ||
        e.target.classList.contains("task-list-item")
      ) {
        e.target.classList.remove("dragging");
        // Remove drag-over class from all elements
        document
          .querySelectorAll(".drag-over")
          .forEach((el) => el.classList.remove("drag-over"));
      }
    });
  }

  async handleDrop(e) {
    e.preventDefault();
    const taskId = e.dataTransfer.getData("text/plain");
    const target = e.target.hasAttribute("data-section")
      ? e.target
      : e.target.closest("[data-section]");
    const newSection = target ? target.dataset.section : null;

    if (taskId && newSection) {
      target.classList.remove("drag-over");
      await this.moveTask(taskId, newSection);
    }
  }

  async moveTask(taskId, newSection) {
    try {
      const response = await TasksAPI.move(taskId, { section: newSection });
      if (response.ok) {
        await this.loadTasks();
      } else {
        console.error("Failed to move task");
      }
    } catch (error) {
      console.error("Error moving task:", error);
    }
  }

  async toggleTask(taskId) {
    const task = this.findTaskById(taskId);
    if (task) {
      // Optimistic update - update local state immediately
      const newCompleted = !task.completed;
      task.completed = newCompleted;

      // Update UI immediately without full re-render
      this.updateTaskInView(taskId, task);

      try {
        const response = await TasksAPI.update(taskId, { completed: newCompleted });
        if (!response.ok) {
          // Revert on failure
          task.completed = !newCompleted;
          this.updateTaskInView(taskId, task);
          console.error("Failed to toggle task");
        }
      } catch (error) {
        // Revert on error
        task.completed = !newCompleted;
        this.updateTaskInView(taskId, task);
        console.error("Error toggling task:", error);
      }
    }
  }

  updateTaskInView(taskId, task) {
    // Update checkbox state
    const checkboxes = document.querySelectorAll(`input[onchange*="toggleTask('${taskId}')"]`);
    checkboxes.forEach(cb => {
      cb.checked = task.completed;
    });

    // Update task card styling (board view uses h4, list view uses different structure)
    const card = document.querySelector(`[data-task-id="${taskId}"]`);
    if (card) {
      // Board view - h4 title
      const h4Title = card.querySelector('h4');
      if (h4Title) {
        if (task.completed) {
          h4Title.classList.add('line-through');
          h4Title.classList.remove('text-gray-900', 'dark:text-gray-100');
          h4Title.classList.add('text-gray-500', 'dark:text-gray-400');
        } else {
          h4Title.classList.remove('line-through', 'text-gray-500', 'dark:text-gray-400');
          h4Title.classList.add('text-gray-900', 'dark:text-gray-100');
        }
      }

      // List view - task-title span
      const titleSpan = card.querySelector('.task-title');
      if (titleSpan) {
        if (task.completed) {
          titleSpan.classList.add('line-through', 'text-gray-400', 'dark:text-gray-500');
          titleSpan.classList.remove('text-gray-900', 'dark:text-gray-100');
        } else {
          titleSpan.classList.remove('line-through', 'text-gray-400', 'dark:text-gray-500');
          titleSpan.classList.add('text-gray-900', 'dark:text-gray-100');
        }
      }
    }
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
    const modals = [
      "taskModal",
      "noteModal",
      "goalModal",
      "milestoneModal",
      "stickyNoteModal",
      "mindmapModal",
      "c4ComponentModal",
      "customSectionModal",
      "descriptionModal",
      "ideaModal",
      "swotModal",
      "swotItemModal"
    ];
    modals.forEach(id => {
      const modal = document.getElementById(id);
      if (modal && !modal.classList.contains("hidden")) {
        modal.classList.add("hidden");
        modal.classList.remove("flex");
      }
    });
    // Clear any modal state
    this.editingTask = null;
    this.parentTaskId = null;
    if (window.location.hash.startsWith("#task=")) {
      history.replaceState(null, "", window.location.pathname + window.location.search);
    }
  }

  async handleTaskSubmit(e) {
    return this.tasksModule.handleSubmit(e);
  }

  async editTask(taskId) {
    return this.tasksModule.edit(taskId);
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

  getPriorityColor(priority) {
    return getPriorityColor(priority);
  }

  getPriorityBadgeClasses(priority) {
    return getPriorityBadgeClasses(priority);
  }

  getPriorityText(priority) {
    return getPriorityText(priority);
  }

  formatDate(dateString) {
    return formatDate(dateString);
  }

  formatDateForInput(dateString) {
    return formatDateForInput(dateString);
  }

  toggleDarkMode() {
    ThemeManager.toggleDarkMode();
  }

  toggleFullscreen() {
    ThemeManager.toggleFullscreen();
  }

  applyFullscreenMode() {
    ThemeManager.applyFullscreenMode();
  }

  bindEscapeKey() {
    ThemeManager.bindEscapeKey();
  }

  unbindEscapeKey() {
    ThemeManager.unbindEscapeKey();
  }

  initDarkMode() {
    ThemeManager.initDarkMode();
  }

  initFullscreenMode() {
    ThemeManager.initFullscreenMode();
  }

  markdownToHtml(markdown) {
    return markdownToHtml(markdown);
  }

  async populateFormOptions(currentTaskId = null) {
    return this.tasksModule.populateFormOptions(currentTaskId);
  }

  getSelectedTags() {
    return this.tasksModule.getSelectedTags();
  }

  handleDependencyInput(e) {
    const input = e.target;
    const dropdown = document.getElementById("dependencyDropdown");
    const searchTerm = input.value.toLowerCase();

    if (searchTerm.length === 0) {
      dropdown.classList.add("hidden");
      return;
    }

    // Get all available tasks (excluding current task and already selected)
    const allTasks = [];
    const collectTasks = (tasks) => {
      for (const task of tasks) {
        if (
          task.id !== this.editingTask?.id &&
          !this.selectedDependencies.includes(task.id)
        ) {
          allTasks.push(task);
        }
        if (task.children && task.children.length > 0) {
          collectTasks(task.children);
        }
      }
    };
    collectTasks(this.tasks);

    // Filter tasks based on search term
    const filteredTasks = allTasks.filter(
      (task) =>
        task.title.toLowerCase().includes(searchTerm) ||
        task.id.toLowerCase().includes(searchTerm),
    );

    // Populate dropdown
    dropdown.innerHTML = "";
    if (filteredTasks.length > 0) {
      filteredTasks.forEach((task) => {
        const option = document.createElement("div");
        option.className =
          "px-3 py-2 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600 border-b border-gray-100 dark:border-gray-600 last:border-b-0";
        option.innerHTML = `
                    <div class="font-medium text-gray-900 dark:text-gray-100">${task.title}</div>
                    <div class="text-xs text-gray-500 dark:text-gray-400">${task.id} - ${task.section}</div>
                `;
        option.addEventListener("click", () => {
          this.addDependency(task.id);
          input.value = "";
          dropdown.classList.add("hidden");
        });
        dropdown.appendChild(option);
      });
      dropdown.classList.remove("hidden");
    } else {
      dropdown.classList.add("hidden");
    }
  }

  handleDependencyKeydown(e) {
    const dropdown = document.getElementById("dependencyDropdown");
    if (e.key === "Escape") {
      dropdown.classList.add("hidden");
      e.target.value = "";
    }
  }

  handleDependencyDocumentClick(e) {
    const dropdown = document.getElementById("dependencyDropdown");
    const input = document.getElementById("taskBlockedBy");
    if (!dropdown.contains(e.target) && e.target !== input) {
      dropdown.classList.add("hidden");
    }
  }

  addDependency(taskId) {
    if (!this.selectedDependencies.includes(taskId)) {
      this.selectedDependencies.push(taskId);
      this.updateSelectedDependencies();
    }
  }

  removeDependency(taskId) {
    this.selectedDependencies = this.selectedDependencies.filter(
      (id) => id !== taskId,
    );
    this.updateSelectedDependencies();
  }

  updateSelectedDependencies() {
    const container = document.getElementById("selectedDependencies");
    container.innerHTML = "";

    this.selectedDependencies.forEach((taskId) => {
      const task = this.findTaskById(taskId);
      const chip = document.createElement("div");
      chip.className =
        "inline-flex items-center px-2 py-1 rounded-full text-xs border border-gray-300 bg-gray-100 dark:border-gray-600 dark:bg-gray-700 text-gray-800 dark:text-gray-200";
      chip.innerHTML = `
                <span>${task ? task.title : taskId}</span>
                <button type="button" class="ml-1 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200" onclick="taskManager.removeDependency('${taskId}')">
                    <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                    </svg>
                </button>
            `;
      container.appendChild(chip);
    });
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

  handleSearch(query) {
    return this.tasksModule.handleSearch(query);
  }

  filterTasksRecursive(tasks) {
    return this.tasksModule.filterRecursive(tasks);
  }

  matchesSearch(task) {
    return this.tasksModule.matchesSearch(task);
  }

  getTasksToRender() {
    return this.tasksModule.getToRender();
  }

  // Notes functionality
  async loadNotes() {
    try {
      const projectInfo = await ProjectAPI.getInfo();
      this.notes = projectInfo.notes || [];
      this.renderNotesView();
    } catch (error) {
      console.error("Error loading notes:", error);
      this.notes = [];
      this.renderNotesView();
    }
  }

  renderNotesView() {
    const tabNav = document.getElementById("notesTabNav");
    const emptyState = document.getElementById("emptyNotesState");
    const activeContent = document.getElementById("activeNoteContent");

    if (this.notes.length === 0) {
      tabNav.innerHTML = "";
      emptyState.classList.remove("hidden");
      activeContent.classList.add("hidden");
      return;
    }

    emptyState.classList.add("hidden");

    // Render tabs using linear indexing for stable IDs
    tabNav.innerHTML = this.notes
      .map(
        (note, index) => `
            <button class="py-2 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
              (this.activeNote === null && index === 0) ||
              this.activeNote === index
                ? "border-gray-900 text-gray-900 dark:border-gray-100 dark:text-gray-100"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300"
            }" onclick="taskManager.selectNote(${index})">
                ${note.title}
            </button>
        `,
      )
      .join("");

    // Show first note if none selected
    if (this.activeNote === null && this.notes.length > 0) {
      this.activeNote = 0;
    }

    this.renderActiveNote();
  }

  renderActiveNote() {
    const activeContent = document.getElementById("activeNoteContent");
    const activeNote = this.notes[this.activeNote];

    if (!activeNote) {
      activeContent.classList.add("hidden");
      return;
    }

    activeContent.classList.remove("hidden");
    document.getElementById("activeNoteTitle").value = activeNote.title;

    // Display note metadata
    const formatDate = (isoString) => {
      if (!isoString) return "";
      const date = new Date(isoString);
      return date.toLocaleDateString() + " " + date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    };
    document.getElementById("noteCreatedAt").textContent = activeNote.createdAt
      ? `Created: ${formatDate(activeNote.createdAt)}`
      : "";
    document.getElementById("noteUpdatedAt").textContent = activeNote.updatedAt
      ? `Updated: ${formatDate(activeNote.updatedAt)}`
      : "";
    document.getElementById("noteRevision").textContent = activeNote.revision
      ? `Rev: ${activeNote.revision}`
      : "";

    // Check if we should use enhanced mode
    const isEnhanced = this.enhancedMode && activeNote.mode === 'enhanced';

    // Update toggle button state
    const btn = document.getElementById('toggleModeBtn');
    const btnText = document.getElementById('toggleModeText');
    if (btn && btnText) {
      if (isEnhanced) {
        btn.classList.add('bg-purple-200', 'dark:bg-purple-800');
        btn.classList.remove('bg-purple-100', 'dark:bg-purple-900');
        btn.title = 'Switch to Simple Mode';
        btnText.textContent = 'Simple';
      } else {
        btn.classList.remove('bg-purple-200', 'dark:bg-purple-800');
        btn.classList.add('bg-purple-100', 'dark:bg-purple-900');
        btn.title = 'Switch to Enhanced Mode';
        btnText.textContent = 'Enhanced';
      }
    }

    // Show/hide appropriate editors
    const enhancedEditor = document.getElementById('enhancedNoteEditor');
    const simpleEditor = document.getElementById('activeNoteBodyContainer');
    
    if (isEnhanced) {
      enhancedEditor.classList.remove('hidden');
      simpleEditor.classList.add('hidden');
      this.renderParagraphs();
      this.renderCustomSections();
    } else {
      enhancedEditor.classList.add('hidden');
      simpleEditor.classList.remove('hidden');
      document.getElementById("activeNoteEditor").value = activeNote.content;
      this.updateNoteDisplay();
    }
  }

  renderParagraphs() {
    const currentNote = this.notes[this.activeNote];
    if (!currentNote || !currentNote.paragraphs) return;

    const container = document.getElementById('paragraphsContainer');
    container.innerHTML = '';

    const sortedParagraphs = [...currentNote.paragraphs].sort((a, b) => a.order - b.order);

    sortedParagraphs.forEach(paragraph => {
      const paragraphElement = this.createParagraphElement(paragraph);
      container.appendChild(paragraphElement);
    });

    this.initDragAndDrop();
  }

  createParagraphElement(paragraph) {
    const div = document.createElement('div');
    div.className = `paragraph-section ${this.selectedParagraphs.includes(paragraph.id) ? 'selected' : ''}`;
    div.setAttribute('data-paragraph-id', paragraph.id);
    
    const isEditing = !this.previewMode;
    const isCodeBlock = paragraph.type === 'code';

    div.innerHTML = `
      <div class="paragraph-handle" style="position: absolute; left: 8px; top: 50%; transform: translateY(-50%); cursor: grab; color: #9ca3af; font-size: 14px; padding: 4px; background: #f9fafb; border-radius: 3px;" draggable="true" onmousedown="this.parentElement.draggable=true" onmouseup="this.parentElement.draggable=false">
        ⋮⋮
      </div>
      <div class="paragraph-controls flex flex-wrap items-center gap-2 mb-2">
        ${isCodeBlock ? `
          <div class="flex items-center gap-2">
            <span class="text-xs text-gray-600 dark:text-gray-400">Language:</span>
            <select class="language-selector text-xs border rounded px-2 py-1 min-w-24" 
                    onchange="taskManager.updateParagraphLanguage('${paragraph.id}', this.value)"
                    onmousedown="event.stopPropagation()" 
                    onclick="event.stopPropagation()">
              <option value="javascript" ${paragraph.language === 'javascript' ? 'selected' : ''}>JavaScript</option>
              <option value="python" ${paragraph.language === 'python' ? 'selected' : ''}>Python</option>
              <option value="typescript" ${paragraph.language === 'typescript' ? 'selected' : ''}>TypeScript</option>
              <option value="html" ${paragraph.language === 'html' ? 'selected' : ''}>HTML</option>
              <option value="css" ${paragraph.language === 'css' ? 'selected' : ''}>CSS</option>
              <option value="sql" ${paragraph.language === 'sql' ? 'selected' : ''}>SQL</option>
              <option value="bash" ${paragraph.language === 'bash' ? 'selected' : ''}>Bash</option>
              <option value="json" ${paragraph.language === 'json' ? 'selected' : ''}>JSON</option>
              <option value="markdown" ${paragraph.language === 'markdown' ? 'selected' : ''}>Markdown</option>
              <option value="text" ${paragraph.language === 'text' ? 'selected' : ''}>Plain Text</option>
            </select>
          </div>
        ` : ''}
        <div class="flex gap-2">
          <button onclick="taskManager.duplicateParagraph('${paragraph.id}')" 
                  class="px-2 py-1 text-xs bg-gray-900 text-white rounded hover:bg-gray-700 dark:bg-gray-600 dark:text-white dark:hover:bg-gray-500" title="Duplicate">Copy</button>
          <button onclick="taskManager.toggleParagraphType('${paragraph.id}')" 
                  class="px-2 py-1 text-xs bg-gray-500 text-white rounded hover:bg-gray-600" title="Toggle Type">${isCodeBlock ? 'Text' : 'Code'}</button>
          <button onclick="taskManager.deleteParagraph('${paragraph.id}')" 
                  class="px-2 py-1 text-xs bg-red-500 text-white rounded hover:bg-red-600" title="Delete">Delete</button>
        </div>
      </div>
      <div class="paragraph-content mt-2" style="margin-left: 40px;">
        ${this.renderParagraphContent(paragraph, isEditing)}
      </div>
    `;

    // Add click handler for multi-select
    if (this.multiSelectMode) {
      div.addEventListener('click', (e) => {
        // Only if clicking outside the content area
        if (!e.target.closest('.paragraph-content')) {
          e.preventDefault();
          this.toggleParagraphSelection(paragraph.id);
        }
      });
    }

    // Add drag event listeners only to the drag handle
    const dragHandle = div.querySelector('.paragraph-handle');
    
    dragHandle.addEventListener('dragstart', (e) => {
      e.dataTransfer.setData('text/plain', paragraph.id);
      div.classList.add('dragging');
      console.log('Drag started:', paragraph.id);
    });

    dragHandle.addEventListener('dragend', (e) => {
      div.classList.remove('dragging');
      div.draggable = false;
      console.log('Drag ended');
    });

    // Only make draggable when drag handle is clicked
    dragHandle.addEventListener('mousedown', () => {
      div.draggable = true;
    });
    
    dragHandle.addEventListener('mouseup', () => {
      div.draggable = false;
    });

    return div;
  }

  renderParagraphContent(paragraph, isEditing) {
    const isCodeBlock = paragraph.type === 'code';
    
    // Always in editing mode for enhanced editor
    const elementType = isCodeBlock ? 'textarea' : 'div';
    const attrs = isCodeBlock 
      ? `rows="10" class="w-full p-3 code-block border-0 resize-none focus:outline-none text-gray-900 dark:text-gray-100 bg-gray-50 dark:bg-gray-800"` 
      : `contenteditable="true" class="w-full p-3 border-0 focus:outline-none min-h-[100px] text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-700"`;
    
    return `<${elementType} ${attrs} 
              onblur="taskManager.handleParagraphBlur(event, '${paragraph.id}', this.${isCodeBlock ? 'value' : 'innerText'})"
              onkeydown="taskManager.handleParagraphKeyDown(event, '${paragraph.id}')">${paragraph.content}</${elementType}>`;
  }

  updateNoteDisplay() {
    const activeNote = this.notes[this.activeNote];
    if (!activeNote) return;

    // Parse content to extract custom sections if they exist
    const parsed = this.parseContentAndCustomSections(activeNote.content);
    
    let htmlContent = '';
    
    // Only render paragraph content (not custom section content which is already in paragraphs)
    if (parsed.paragraphs && parsed.paragraphs.length > 0) {
      htmlContent = this.markdownToHtml(parsed.paragraphs.map(p => 
        p.type === 'code' ? `\`\`\`${p.language || 'text'}\n${p.content}\n\`\`\`` : p.content
      ).join('\n\n'));
    }

    // Add custom sections as interactive preview components from metadata (not from content)
    if (parsed.customSections && parsed.customSections.length > 0) {
      parsed.customSections.forEach(section => {
        htmlContent += this.renderCustomSectionPreview(section);
      });
    }

    // If content is empty or just whitespace, add a fallback
    if (!htmlContent.trim()) {
      htmlContent =
        '<p class="text-gray-500 dark:text-gray-400 italic">No content</p>';
    }

    document.getElementById("activeNoteBody").innerHTML = htmlContent;
  }

  renderCustomSectionPreview(section) {
    let sectionHtml = `<div class="mt-6 border border-gray-200 dark:border-gray-700 rounded-lg p-4" data-section-preview-id="${section.id}">
      <h2 class="text-xl font-bold text-gray-900 dark:text-gray-100 mb-4">${section.title}</h2>`;
    
    if (section.type === 'tabs') {
      const tabs = section.config.tabs || [];
      if (tabs.length > 0) {
        // Tab navigation
        sectionHtml += '<div class="border-b border-gray-200 dark:border-gray-700 mb-4"><nav class="flex space-x-8">';
        tabs.forEach((tab, index) => {
          const isActive = index === 0;
          sectionHtml += `
            <button class="py-2 px-1 border-b-2 font-medium text-sm ${
              isActive 
                ? 'border-gray-900 text-gray-900 dark:border-gray-100 dark:text-gray-100' 
                : 'border-transparent text-gray-500'
            }" onclick="taskManager.switchPreviewTab('${section.id}', '${tab.id}')">
              ${tab.title}
            </button>`;
        });
        sectionHtml += '</nav></div>';
        
        // Tab content
        tabs.forEach((tab, index) => {
          const isActive = index === 0;
          sectionHtml += `<div class="tab-preview-content ${isActive ? '' : 'hidden'}" data-preview-tab-id="${tab.id}">`;
          tab.content.forEach(item => {
            if (item.type === 'code') {
              sectionHtml += `<pre class="bg-gray-100 dark:bg-gray-800 p-3 rounded mb-2 overflow-x-auto"><code class="text-sm text-gray-900 dark:text-gray-100">${this.escapeHtml(item.content)}</code></pre>`;
            } else {
              sectionHtml += `<div class="mb-2">${this.markdownToHtml(item.content)}</div>`;
            }
          });
          sectionHtml += '</div>';
        });
      }
    } else if (section.type === 'timeline') {
      section.config.timeline?.forEach(item => {
        const statusClass = item.status === 'success' ? 'text-green-600 dark:text-green-400' 
          : item.status === 'failed' ? 'text-red-600 dark:text-red-400' 
          : 'text-yellow-600 dark:text-yellow-400';
        sectionHtml += `
          <div class="mb-4 p-3 border-l-4 border-gray-500 bg-gray-50 dark:bg-gray-800">
            <h3 class="font-semibold ${statusClass}">${item.title} (${item.status})</h3>
            ${item.date ? `<p class="text-sm text-gray-600 dark:text-gray-400">Date: ${item.date}</p>` : ''}
            <div class="mt-2">`;
        item.content?.forEach(contentItem => {
          if (contentItem.type === 'code') {
            sectionHtml += `<pre class="bg-gray-100 dark:bg-gray-800 p-3 rounded mb-2 overflow-x-auto"><code class="text-sm text-gray-900 dark:text-gray-100">${this.escapeHtml(contentItem.content)}</code></pre>`;
          } else {
            sectionHtml += `<div class="mb-2">${this.markdownToHtml(contentItem.content)}</div>`;
          }
        });
        sectionHtml += '</div></div>';
      });
    } else if (section.type === 'split-view') {
      sectionHtml += '<div class="grid grid-cols-1 md:grid-cols-2 gap-4">';
      section.config.splitView?.columns?.forEach((column, index) => {
        sectionHtml += `<div class="border border-gray-200 dark:border-gray-700 rounded p-3">
          <h4 class="font-medium mb-2 text-gray-900 dark:text-gray-100">Column ${index + 1}</h4>`;
        column.forEach(item => {
          if (item.type === 'code') {
            sectionHtml += `<pre class="bg-gray-100 dark:bg-gray-800 p-3 rounded mb-2 overflow-x-auto"><code class="text-sm">${this.escapeHtml(item.content)}</code></pre>`;
          } else {
            sectionHtml += `<div class="mb-2">${this.markdownToHtml(item.content)}</div>`;
          }
        });
        sectionHtml += '</div>';
      });
      sectionHtml += '</div>';
    }
    
    sectionHtml += '</div>';
    return sectionHtml;
  }

  switchPreviewTab(sectionId, tabId) {
    // Find the section container
    const sectionElement = document.querySelector(`[data-section-preview-id="${sectionId}"]`);
    if (!sectionElement) return;
    
    // Hide all tab contents in this section only
    sectionElement.querySelectorAll('[data-preview-tab-id]').forEach(content => {
      content.classList.add('hidden');
    });
    
    // Show the selected tab content
    const activeContent = sectionElement.querySelector(`[data-preview-tab-id="${tabId}"]`);
    if (activeContent) {
      activeContent.classList.remove('hidden');
    }
    
    // Update tab button states in this section only
    sectionElement.querySelectorAll('button[onclick*="switchPreviewTab"]').forEach(btn => {
      btn.classList.remove('border-gray-900', 'text-gray-900', 'dark:border-gray-100', 'dark:text-gray-100');
      btn.classList.add('border-transparent', 'text-gray-500');
    });
    
    const activeBtn = sectionElement.querySelector(`[onclick*="${tabId}"]`);
    if (activeBtn) {
      activeBtn.classList.add('border-gray-900', 'text-gray-900', 'dark:border-gray-100', 'dark:text-gray-100');
      activeBtn.classList.remove('border-transparent', 'text-gray-500');
    }
  }

  escapeHtml(text) {
    return escapeHtml(text);
  }

  toggleNoteEditMode() {
    this.noteEditMode = !this.noteEditMode;
    const editor = document.getElementById("activeNoteEditor");
    const display = document.getElementById("activeNoteBody");
    const titleInput = document.getElementById("activeNoteTitle");

    if (this.noteEditMode) {
      // Switch to edit mode
      editor.classList.remove("hidden");
      display.classList.add("hidden");
      titleInput.removeAttribute("readonly");
      titleInput.classList.add(
        "border-b",
        "border-gray-300",
        "dark:border-gray-600",
      );
      editor.focus();
    } else {
      // Switch to view mode
      editor.classList.add("hidden");
      display.classList.remove("hidden");
      titleInput.setAttribute("readonly", "true");
      titleInput.classList.remove(
        "border-b",
        "border-gray-300",
        "dark:border-gray-600",
      );
      this.updateNoteDisplay();
    }
  }

  scheduleAutoSave() {
    // Clear existing timeout
    if (this.autoSaveTimeout) {
      clearTimeout(this.autoSaveTimeout);
    }

    // Schedule auto-save after 1 second of inactivity
    this.autoSaveTimeout = setTimeout(() => {
      this.autoSaveNote();
    }, 1000);
  }

  async autoSaveNote() {
    if (this.activeNote === null) return;

    const activeNote = this.notes[this.activeNote];
    const title = document.getElementById("activeNoteTitle").value;
    
    // For enhanced mode, get content from the synced content field
    let content = activeNote.content;
    
    // For simple mode, get content from the editor
    if (!this.enhancedMode || activeNote.mode !== 'enhanced') {
      const editorElement = document.getElementById("activeNoteEditor");
      if (editorElement) {
        content = editorElement.value;
        // Update the local content immediately for simple mode
        activeNote.content = content;
      }
    }

    try {
      // Show saving indicator
      const indicator = document.getElementById("saveIndicator");
      indicator.classList.remove("hidden");

      // Prepare the data to save - include all enhanced mode data
      const saveData = {
        title: title,
        content: content,
        mode: activeNote.mode,
        paragraphs: activeNote.paragraphs,
        customSections: activeNote.customSections
      };

      const response = await NotesAPI.update(activeNote.id, saveData);
      if (response.ok) {
        // Update local data
        this.notes[this.activeNote].title = title;

        // Update tab title if it changed
        this.renderNotesView();
      }

      // Hide indicator after a short delay
      setTimeout(() => {
        indicator.classList.add("hidden");
      }, 1000);
    } catch (error) {
      console.error("Error auto-saving note:", error);
    }
  }

  selectNote(noteIndex) {
    this.activeNote = noteIndex;
    // Sync enhancedMode with the selected note's mode
    const note = this.notes[noteIndex];
    if (note) {
      this.enhancedMode = note.mode === 'enhanced';
    }
    this.renderNotesView();
  }

  openNoteModal() {
    this.editingNote = null;
    document.getElementById("noteModalTitle").textContent = "Add Note";
    document.getElementById("noteTitle").value = "";
    document.getElementById("noteContent").value = "";
    document.getElementById("noteEnhancedMode").checked = false;
    document.getElementById("noteModal").classList.remove("hidden");
    document.getElementById("noteModal").classList.add("flex");
  }

  closeNoteModal() {
    document.getElementById("noteModal").classList.add("hidden");
    document.getElementById("noteModal").classList.remove("flex");
  }

  async handleNoteSubmit(e) {
    e.preventDefault();

    const title = document.getElementById("noteTitle").value;
    const content = document.getElementById("noteContent").value;
    const enhancedMode = document.getElementById("noteEnhancedMode").checked;

    try {
      let response;
      if (this.editingNote !== null) {
        // Update existing note using backend ID
        const note = this.notes[this.editingNote];
        response = await NotesAPI.update(note.id, { title, content });
      } else {
        // Create new note
        const noteData = { title, content };
        if (enhancedMode) {
          noteData.mode = "enhanced";
          noteData.paragraphs = content ? [{ id: `p-${Date.now()}`, type: "text", content }] : [];
        }
        response = await NotesAPI.create(noteData);
      }

      if (!response.ok) {
        console.error("Failed to save note:", await response.text());
        return;
      }

      this.closeNoteModal();
      await this.loadNotes();

      // If enhanced mode was selected, select the new note and enable enhanced mode
      if (enhancedMode && this.editingNote === null) {
        const newNoteIndex = this.notes.length - 1;
        this.activeNote = newNoteIndex;
        this.enhancedMode = true;
        this.renderNotesView();
      }
    } catch (error) {
      console.error("Error saving note:", error);
    }
  }

  async deleteCurrentNote() {
    if (this.activeNote === null) return;

    if (!confirm("Are you sure you want to delete this note?")) return;

    try {
      const note = this.notes[this.activeNote];
      await NotesAPI.delete(note.id);
      this.activeNote = null;
      await this.loadNotes();
    } catch (error) {
      console.error("Error deleting note:", error);
    }
  }

  // Enhanced Notes Functionality
  toggleEnhancedMode() {
    const currentNote = this.notes[this.activeNote];
    if (!currentNote) return;

    // Toggle enhanced mode
    this.enhancedMode = !this.enhancedMode;
    
    if (this.enhancedMode) {
      currentNote.mode = "enhanced";
      // Convert content to paragraphs and parse custom sections if not already done
      if (!currentNote.paragraphs || currentNote.paragraphs.length === 0) {
        const parsed = this.parseContentAndCustomSections(currentNote.content);
        currentNote.paragraphs = parsed.paragraphs;
        currentNote.customSections = parsed.customSections;
      }
    } else {
      currentNote.mode = "simple";
    }

    // Update button visual state and text
    const btn = document.getElementById('toggleModeBtn');
    const btnText = document.getElementById('toggleModeText');
    if (this.enhancedMode) {
      btn.classList.add('bg-purple-200', 'dark:bg-purple-800');
      btn.classList.remove('bg-purple-100', 'dark:bg-purple-900');
      btn.title = 'Switch to Simple Mode';
      btnText.textContent = 'Simple';
    } else {
      btn.classList.remove('bg-purple-200', 'dark:bg-purple-800');
      btn.classList.add('bg-purple-100', 'dark:bg-purple-900');
      btn.title = 'Switch to Enhanced Mode';
      btnText.textContent = 'Enhanced';
    }

    console.log('Enhanced mode:', this.enhancedMode, 'Note mode:', currentNote.mode);
    this.renderActiveNote();
    // Remove auto-save here since mode switching shouldn't trigger saves
  }


  parseContentAndCustomSections(content) {
    if (!content) return { paragraphs: [], customSections: [] };
    
    const customSections = [];
    let cleanContent = content;
    
    // Extract custom sections from markdown
    const sectionRegex = /<!-- Custom Section: (.+?) -->\n<!-- section-id: (.+?), type: (.+?) -->\n([\s\S]*?)<!-- End Custom Section -->/g;
    let match;
    
    while ((match = sectionRegex.exec(content)) !== null) {
      const [fullMatch, title, sectionId, type, sectionContent] = match;
      
      const section = {
        id: sectionId,
        title: title,
        type: type,
        order: customSections.length,
        config: this.parseCustomSectionContent(type, sectionContent)
      };
      
      customSections.push(section);
      
      // Remove this section from the clean content
      cleanContent = cleanContent.replace(fullMatch, '');
    }
    
    const paragraphs = this.convertContentToParagraphs(cleanContent);
    return { paragraphs, customSections };
  }

  parseCustomSectionContent(type, content) {
    if (type === 'tabs') {
      const tabs = [];
      const tabRegex = /### Tab: (.+?)\n<!-- tab-id: (.+?) -->\n([\s\S]*?)(?=### Tab:|$)/g;
      let match;
      
      while ((match = tabRegex.exec(content)) !== null) {
        const [, title, tabId, tabContent] = match;
        tabs.push({
          id: tabId,
          title: title,
          content: this.parseContentBlocks(tabContent.trim())
        });
      }
      
      return { tabs };
    } else if (type === 'timeline') {
      const timeline = [];
      const itemRegex = /## (.+?) \((.+?)\)\n<!-- item-id: (.+?), status: (.+?)(?:, date: (.+?))? -->\n([\s\S]*?)(?=## |$)/g;
      let match;
      
      while ((match = itemRegex.exec(content)) !== null) {
        const [, title, status, itemId, , date, itemContent] = match;
        timeline.push({
          id: itemId,
          title: title,
          status: status,
          date: date || '',
          content: this.parseContentBlocks(itemContent.trim())
        });
      }
      
      return { timeline };
    } else if (type === 'split-view') {
      const columns = [];
      const columnRegex = /### Column (\d+)\n<!-- column-index: (\d+) -->\n([\s\S]*?)(?=### Column|$)/g;
      let match;
      
      while ((match = columnRegex.exec(content)) !== null) {
        const [, , columnIndex, columnContent] = match;
        const index = parseInt(columnIndex);
        columns[index] = this.parseContentBlocks(columnContent.trim());
      }
      
      return { splitView: { columns } };
    }
    
    return {};
  }

  parseContentBlocks(content) {
    if (!content) return [];
    
    const blocks = [];
    const parts = content.split(/\n\n+/);
    
    for (const part of parts) {
      const trimmed = part.trim();
      if (!trimmed) continue;
      
      // Check if it's a code block
      const codeMatch = trimmed.match(/^```(\w+)?\n([\s\S]*?)\n```$/);
      if (codeMatch) {
        blocks.push({
          id: this.generateParagraphId(),
          type: 'code',
          language: codeMatch[1] || 'text',
          content: codeMatch[2]
        });
      } else {
        blocks.push({
          id: this.generateParagraphId(),
          type: 'text',
          content: trimmed
        });
      }
    }
    
    return blocks;
  }

  convertContentToParagraphs(content) {
    if (!content) return [];
    
    const paragraphs = [];
    const lines = content.split('\n');
    let currentParagraph = '';
    let order = 0;
    let inCodeBlock = false;
    let codeLanguage = '';

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      // Skip custom section headers (## and ###) as they're part of custom sections
      if (line.trim().startsWith('## ') || line.trim().startsWith('### ')) {
        // End current paragraph if any
        if (currentParagraph.trim()) {
          paragraphs.push({
            id: this.generateParagraphId(),
            type: 'text',
            content: currentParagraph.trim(),
            order: order++
          });
          currentParagraph = '';
        }
        continue;
      }
      
      // Check for code block markers
      if (line.trim().startsWith('```')) {
        if (inCodeBlock) {
          // End of code block
          if (currentParagraph.trim()) {
            paragraphs.push({
              id: this.generateParagraphId(),
              type: 'code',
              content: currentParagraph.trim(),
              language: codeLanguage,
              order: order++
            });
          }
          currentParagraph = '';
          inCodeBlock = false;
          codeLanguage = '';
        } else {
          // Start of code block
          if (currentParagraph.trim()) {
            paragraphs.push({
              id: this.generateParagraphId(),
              type: 'text',
              content: currentParagraph.trim(),
              order: order++
            });
          }
          inCodeBlock = true;
          codeLanguage = line.replace('```', '').trim();
          currentParagraph = '';
        }
        continue;
      }

      if (inCodeBlock) {
        currentParagraph += (currentParagraph ? '\n' : '') + line;
      } else if (line.trim() === '') {
        // Empty line - end current paragraph
        if (currentParagraph.trim()) {
          paragraphs.push({
            id: this.generateParagraphId(),
            type: 'text',
            content: currentParagraph.trim(),
            order: order++
          });
          currentParagraph = '';
        }
      } else {
        currentParagraph += (currentParagraph ? '\n' : '') + line;
      }
    }

    // Add remaining content
    if (currentParagraph.trim()) {
      paragraphs.push({
        id: this.generateParagraphId(),
        type: inCodeBlock ? 'code' : 'text',
        content: currentParagraph.trim(),
        language: inCodeBlock ? codeLanguage : undefined,
        order: order++
      });
    }

    return paragraphs.length > 0 ? paragraphs : [{
      id: this.generateParagraphId(),
      type: 'text',
      content: '',
      order: 0
    }];
  }

  generateParagraphId() {
    return 'para_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  addParagraph(type = 'text') {
    const currentNote = this.notes[this.activeNote];
    if (!currentNote) return;

    if (!currentNote.paragraphs) {
      currentNote.paragraphs = [];
    }

    const newParagraph = {
      id: this.generateParagraphId(),
      type: type,
      content: '',
      language: type === 'code' ? 'javascript' : undefined,
      order: currentNote.paragraphs.length
    };

    currentNote.paragraphs.push(newParagraph);
    this.syncParagraphsToContent();
    this.renderActiveNote();
    this.autoSaveNote().then(() => {
      this.showAutoSaveIndicator();
    });
    
    // Focus on the new paragraph
    setTimeout(() => {
      const paragraphElement = document.querySelector(`[data-paragraph-id="${newParagraph.id}"] textarea, [data-paragraph-id="${newParagraph.id}"] [contenteditable]`);
      if (paragraphElement) {
        paragraphElement.focus();
      }
    }, 100);
  }

  openMarkdownFile() {
    document.getElementById('markdownFileInput').click();
  }

  async handleMarkdownFileSelect(event) {
    const file = event.target.files[0];
    if (!file) return;

    try {
      const content = await file.text();
      const title = file.name.replace(/\.(md|markdown)$/i, '');
      
      // Create new note with the markdown content
      const parsed = this.parseContentAndCustomSections(content);
      const newNote = {
        title: title,
        content: content,
        mode: 'enhanced',
        paragraphs: parsed.paragraphs,
        customSections: parsed.customSections
      };

      // Add the note
      const response = await NotesAPI.create(newNote);
      if (response.ok) {
        await this.loadNotes();
        // Select the new note
        this.activeNote = this.notes.length - 1;
        this.enhancedMode = true;
        this.renderNotesView();
        this.showAutoSaveIndicator();
      }
    } catch (error) {
      console.error('Error importing markdown file:', error);
      alert('Error importing markdown file');
    }

    // Clear the input
    event.target.value = '';
  }

  toggleMultiSelect() {
    this.multiSelectMode = !this.multiSelectMode;
    const btn = document.getElementById('enableMultiSelectBtn');
    btn.textContent = this.multiSelectMode ? 'Exit Multi-Select' : 'Multi-Select';
    btn.className = this.multiSelectMode 
      ? 'bg-red-600 text-white px-3 py-1 rounded text-sm hover:bg-red-700'
      : 'bg-orange-600 text-white px-3 py-1 rounded text-sm hover:bg-orange-700';
    
    if (!this.multiSelectMode) {
      this.selectedParagraphs = [];
      this.hideMultiSelectActions();
    } else {
      this.showMultiSelectActions();
    }
    this.renderActiveNote();
  }

  showMultiSelectActions() {
    const container = document.getElementById('paragraphsContainer');
    let actionBar = document.getElementById('multiSelectActions');
    
    if (!actionBar) {
      actionBar = document.createElement('div');
      actionBar.id = 'multiSelectActions';
      actionBar.className = 'fixed bottom-4 left-1/2 transform -translate-x-1/2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg p-3 flex space-x-2 z-50';
      actionBar.innerHTML = `
        <button onclick="taskManager.deleteSelectedParagraphs()" class="bg-red-600 text-white px-3 py-1 rounded text-sm hover:bg-red-700">Delete Selected</button>
        <button onclick="taskManager.duplicateSelectedParagraphs()" class="bg-gray-900 text-white px-3 py-1 rounded text-sm hover:bg-gray-700 dark:bg-gray-600 dark:text-white dark:hover:bg-gray-500">Duplicate Selected</button>
        <button onclick="taskManager.moveSelectedParagraphs('up')" class="bg-gray-600 text-white px-3 py-1 rounded text-sm hover:bg-gray-700">Move Up</button>
        <button onclick="taskManager.moveSelectedParagraphs('down')" class="bg-gray-600 text-white px-3 py-1 rounded text-sm hover:bg-gray-700">Move Down</button>
      `;
      document.body.appendChild(actionBar);
    }
    actionBar.style.display = 'flex';
  }

  hideMultiSelectActions() {
    const actionBar = document.getElementById('multiSelectActions');
    if (actionBar) {
      actionBar.style.display = 'none';
    }
  }

  deleteSelectedParagraphs() {
    if (this.selectedParagraphs.length === 0) return;
    if (!confirm(`Delete ${this.selectedParagraphs.length} selected paragraph(s)?`)) return;

    const currentNote = this.notes[this.activeNote];
    if (!currentNote || !currentNote.paragraphs) return;

    // Remove selected paragraphs
    currentNote.paragraphs = currentNote.paragraphs.filter(p => !this.selectedParagraphs.includes(p.id));
    
    // Reorder remaining paragraphs
    currentNote.paragraphs.forEach((p, index) => p.order = index);
    
    // Clear selection
    this.selectedParagraphs = [];
    
    // Sync content and save
    this.syncParagraphsToContent();
    this.renderActiveNote();
    
    // Force save and show indicator
    this.autoSaveNote().then(() => {
      this.showAutoSaveIndicator();
    });
  }

  duplicateSelectedParagraphs() {
    if (this.selectedParagraphs.length === 0) return;

    const currentNote = this.notes[this.activeNote];
    if (!currentNote || !currentNote.paragraphs) return;

    const selectedParagraphs = currentNote.paragraphs.filter(p => this.selectedParagraphs.includes(p.id));
    const newParagraphs = selectedParagraphs.map(p => ({
      ...p,
      id: this.generateParagraphId(),
      order: p.order + 0.1
    }));

    currentNote.paragraphs.push(...newParagraphs);
    currentNote.paragraphs.sort((a, b) => a.order - b.order);
    currentNote.paragraphs.forEach((p, index) => p.order = index);
    
    this.selectedParagraphs = [];
    
    // Sync content and save
    this.syncParagraphsToContent();
    this.renderActiveNote();
    
    // Force save and show indicator
    this.autoSaveNote().then(() => {
      this.showAutoSaveIndicator();
    });
  }

  moveSelectedParagraphs(direction) {
    if (this.selectedParagraphs.length === 0) return;

    const currentNote = this.notes[this.activeNote];
    if (!currentNote || !currentNote.paragraphs) return;

    const sortedParagraphs = [...currentNote.paragraphs].sort((a, b) => a.order - b.order);
    const selectedIndices = this.selectedParagraphs.map(id => 
      sortedParagraphs.findIndex(p => p.id === id)
    ).sort((a, b) => a - b);

    let moved = false;
    if (direction === 'up' && selectedIndices[0] > 0) {
      selectedIndices.forEach(index => {
        [sortedParagraphs[index], sortedParagraphs[index - 1]] = [sortedParagraphs[index - 1], sortedParagraphs[index]];
      });
      moved = true;
    } else if (direction === 'down' && selectedIndices[selectedIndices.length - 1] < sortedParagraphs.length - 1) {
      selectedIndices.reverse().forEach(index => {
        [sortedParagraphs[index], sortedParagraphs[index + 1]] = [sortedParagraphs[index + 1], sortedParagraphs[index]];
      });
      moved = true;
    }

    if (moved) {
      sortedParagraphs.forEach((p, index) => p.order = index);
      
      // Sync content and save
      this.syncParagraphsToContent();
      this.renderActiveNote();
      
      // Force save and show indicator
      this.autoSaveNote().then(() => {
        this.showAutoSaveIndicator();
      });
    }
  }

  showAutoSaveIndicator() {
    const indicator = document.getElementById('autoSaveIndicator');
    indicator.classList.add('show');
    setTimeout(() => {
      indicator.classList.remove('show');
    }, 2000);
  }

  addCustomSection() {
    this.openCustomSectionModal();
  }

  openCustomSectionModal() {
    document.getElementById('customSectionTitle').value = '';
    document.getElementById('customSectionType').value = 'tabs';
    document.getElementById('customSectionModal').classList.remove('hidden');
    document.getElementById('customSectionModal').classList.add('flex');
  }

  closeCustomSectionModal() {
    document.getElementById('customSectionModal').classList.add('hidden');
    document.getElementById('customSectionModal').classList.remove('flex');
  }

  createCustomSection() {
    const type = document.getElementById('customSectionType').value;
    const title = document.getElementById('customSectionTitle').value.trim();
    
    if (!title) {
      alert('Please enter a section title');
      return;
    }

    const currentNote = this.notes[this.activeNote];
    if (!currentNote) return;

    if (!currentNote.customSections) {
      currentNote.customSections = [];
    }

    const newSection = {
      id: this.generateSectionId(),
      type: type,
      title: title,
      order: currentNote.customSections.length,
      config: this.getInitialSectionConfig(type)
    };

    currentNote.customSections.push(newSection);
    this.closeCustomSectionModal();
    this.renderActiveNote();
    this.autoSaveNote().then(() => {
      this.showAutoSaveIndicator();
    });
  }

  generateSectionId() {
    return 'section_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  getInitialSectionConfig(type) {
    switch (type) {
      case 'tabs':
        return {
          tabs: [
            { id: this.generateTabId(), title: 'Tab 1', content: [] },
            { id: this.generateTabId(), title: 'Tab 2', content: [] }
          ]
        };
      case 'timeline':
        return {
          timeline: [
            { 
              id: this.generateTimelineId(), 
              title: 'Initial Step', 
              status: 'pending', 
              date: new Date().toISOString().split('T')[0],
              content: []
            }
          ]
        };
      case 'split-view':
        return {
          splitView: {
            columns: [[], []]
          }
        };
      default:
        return {};
    }
  }

  generateTabId() {
    return 'tab_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  generateTimelineId() {
    return 'timeline_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  renderCustomSections() {
    const currentNote = this.notes[this.activeNote];
    if (!currentNote || !currentNote.customSections) return;

    const container = document.getElementById('customSectionsContainer');
    container.innerHTML = '';

    const sortedSections = [...currentNote.customSections].sort((a, b) => a.order - b.order);

    sortedSections.forEach(section => {
      const sectionElement = this.createCustomSectionElement(section);
      container.appendChild(sectionElement);
    });
  }

  createCustomSectionElement(section) {
    const div = document.createElement('div');
    div.className = 'custom-section';
    div.setAttribute('data-section-id', section.id);

    const headerHtml = `
      <div class="flex justify-between items-center mb-4">
        <h3 class="text-lg font-semibold text-gray-900 dark:text-gray-100">${section.title}</h3>
        <div class="flex space-x-2">
          <button onclick="taskManager.deleteCustomSection('${section.id}')" 
                  class="px-2 py-1 text-xs bg-red-500 text-white rounded hover:bg-red-600">Delete</button>
        </div>
      </div>
    `;

    let contentHtml = '';
    switch (section.type) {
      case 'tabs':
        contentHtml = this.renderTabsSection(section);
        break;
      case 'timeline':
        contentHtml = this.renderTimelineSection(section);
        break;
      case 'split-view':
        contentHtml = this.renderSplitViewSection(section);
        break;
    }

    div.innerHTML = headerHtml + contentHtml;
    return div;
  }

  renderTabsSection(section) {
    const tabs = section.config.tabs || [];
    // Use stored active tab or default to first tab
    const storedActiveTab = this.activeTabState[section.id];
    const activeTabId = storedActiveTab && tabs.find(t => t.id === storedActiveTab) 
      ? storedActiveTab 
      : (tabs.length > 0 ? tabs[0].id : null);
    
    // Store the active tab
    if (activeTabId) {
      this.activeTabState[section.id] = activeTabId;
    }

    let tabNavHtml = '<div class="border-b border-gray-200 dark:border-gray-700 mb-4"><nav class="flex space-x-8">';
    tabs.forEach((tab, index) => {
      const isActive = tab.id === activeTabId;
      tabNavHtml += `
        <button onclick="taskManager.switchTab('${section.id}', '${tab.id}')" 
                class="py-2 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
                  isActive 
                    ? 'border-gray-900 text-gray-900 dark:border-gray-100 dark:text-gray-100' 
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                }" 
                data-tab-id="${tab.id}">
          ${tab.title}
        </button>
      `;
    });
    tabNavHtml += `
      <button onclick="taskManager.addTab('${section.id}')" 
              class="py-2 px-1 text-sm text-gray-700 hover:text-gray-900 dark:text-gray-300 dark:hover:text-gray-100">
        + Add Tab
      </button>
    </nav></div>`;

    let tabContentHtml = '<div class="tab-contents">';
    tabs.forEach((tab, index) => {
      const isActive = tab.id === activeTabId;
      tabContentHtml += `
        <div class="tab-content ${isActive ? 'active' : ''}" data-tab-id="${tab.id}">
          <div class="mb-2">
            <input type="text" value="${tab.title}" 
                   onblur="taskManager.updateTabTitle('${section.id}', '${tab.id}', this.value)"
                   class="text-sm font-medium border-0 bg-transparent focus:outline-none focus:ring-1 focus:ring-gray-500 rounded px-2 py-1">
          </div>
          <div class="space-y-2">
            <button onclick="taskManager.addContentToTab('${section.id}', '${tab.id}', 'text')" 
                    class="mr-2 px-3 py-1 text-xs bg-gray-900 text-white rounded hover:bg-gray-700 dark:bg-gray-600 dark:text-white dark:hover:bg-gray-500">+ Text</button>
            <button onclick="taskManager.addContentToTab('${section.id}', '${tab.id}', 'code')" 
                    class="mr-2 px-3 py-1 text-xs bg-gray-500 text-white rounded hover:bg-gray-600">+ Code</button>
            <button onclick="taskManager.deleteTab('${section.id}', '${tab.id}')" 
                    class="px-3 py-1 text-xs bg-red-500 text-white rounded hover:bg-red-600">Delete Tab</button>
          </div>
          <div class="mt-4 space-y-2" id="tab-content-${tab.id}">
            ${this.renderTabContent(tab.content)}
          </div>
        </div>
      `;
    });
    tabContentHtml += '</div>';

    return tabNavHtml + tabContentHtml;
  }

  renderTimelineSection(section) {
    const timeline = section.config.timeline || [];
    
    let html = `
      <div class="mb-4">
        <button onclick="taskManager.addTimelineItem('${section.id}')" 
                class="px-3 py-1 text-sm bg-green-500 text-white rounded hover:bg-green-600">+ Add Step</button>
      </div>
      <div class="space-y-4">
    `;

    timeline.forEach(item => {
      const statusColor = {
        'success': 'border-green-500 text-green-700',
        'failed': 'border-red-500 text-red-700',
        'pending': 'border-yellow-500 text-yellow-700'
      }[item.status] || 'border-gray-500 text-gray-700';

      html += `
        <div class="timeline-item ${item.status}">
          <div class="flex items-center justify-between mb-2">
            <input type="text" value="${item.title}" 
                   onblur="taskManager.updateTimelineItemTitle('${section.id}', '${item.id}', this.value)"
                   class="font-medium text-sm border-0 bg-transparent focus:outline-none focus:ring-1 focus:ring-gray-500 rounded px-2 py-1 text-gray-900 dark:text-gray-100">
            <div class="flex items-center space-x-2">
              <input type="date" value="${item.date}" 
                     onchange="taskManager.updateTimelineItemDate('${section.id}', '${item.id}', this.value)"
                     class="text-xs border rounded px-2 py-1 border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100">
              <select onchange="taskManager.updateTimelineItemStatus('${section.id}', '${item.id}', this.value)" 
                      class="text-xs border rounded px-2 py-1 border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 ${statusColor}">
                <option value="pending" ${item.status === 'pending' ? 'selected' : ''}>Pending</option>
                <option value="success" ${item.status === 'success' ? 'selected' : ''}>Success</option>
                <option value="failed" ${item.status === 'failed' ? 'selected' : ''}>Failed</option>
              </select>
              <button onclick="taskManager.deleteTimelineItem('${section.id}', '${item.id}')" 
                      class="px-2 py-1 text-xs bg-red-500 text-white rounded hover:bg-red-600">Delete</button>
            </div>
          </div>
          <div class="space-y-2">
            <button onclick="taskManager.addContentToTimeline('${section.id}', '${item.id}', 'text')" 
                    class="mr-2 px-3 py-1 text-xs bg-gray-900 text-white rounded hover:bg-gray-700 dark:bg-gray-600 dark:text-white dark:hover:bg-gray-500">+ Text</button>
            <button onclick="taskManager.addContentToTimeline('${section.id}', '${item.id}', 'code')" 
                    class="px-3 py-1 text-xs bg-gray-500 text-white rounded hover:bg-gray-600">+ Code</button>
          </div>
          <div class="mt-2 space-y-2" id="timeline-content-${item.id}">
            ${this.renderTabContent(item.content)}
          </div>
        </div>
      `;
    });

    html += '</div>';
    return html;
  }

  renderSplitViewSection(section) {
    const columns = section.config.splitView?.columns || [[], []];
    
    let html = `
      <div class="mb-4 flex space-x-2">
        <button onclick="taskManager.addColumnToSplitView('${section.id}')" 
                class="px-3 py-1 text-sm bg-purple-500 text-white rounded hover:bg-purple-600">+ Add Column</button>
        <span class="text-sm text-gray-600 dark:text-gray-400">${columns.length} columns</span>
      </div>
      <div class="flex space-x-4">
    `;

    columns.forEach((column, columnIndex) => {
      html += `
        <div class="split-view-column flex-1">
          <div class="flex justify-between items-center mb-2">
            <h4 class="text-sm font-medium text-gray-700 dark:text-gray-300">Column ${columnIndex + 1}</h4>
            <button onclick="taskManager.removeColumnFromSplitView('${section.id}', ${columnIndex})" 
                    class="px-2 py-1 text-xs bg-red-500 text-white rounded hover:bg-red-600">Remove</button>
          </div>
          <div class="space-y-2 mb-4">
            <button onclick="taskManager.addContentToSplitView('${section.id}', ${columnIndex}, 'text')" 
                    class="mr-2 px-3 py-1 text-xs bg-gray-900 text-white rounded hover:bg-gray-700 dark:bg-gray-600 dark:text-white dark:hover:bg-gray-500">+ Text</button>
            <button onclick="taskManager.addContentToSplitView('${section.id}', ${columnIndex}, 'code')" 
                    class="px-3 py-1 text-xs bg-gray-500 text-white rounded hover:bg-gray-600">+ Code</button>
          </div>
          <div class="space-y-2" id="split-column-${section.id}-${columnIndex}">
            ${this.renderTabContent(column)}
          </div>
        </div>
      `;
    });

    html += '</div>';
    return html;
  }

  renderTabContent(content) {
    if (!content || content.length === 0) {
      return '<p class="text-sm text-gray-500 dark:text-gray-400 italic">No content yet</p>';
    }

    return content.map(item => {
      const isCodeBlock = item.type === 'code';
      if (isCodeBlock) {
        return `
          <div class="relative border border-gray-200 dark:border-gray-600 rounded mb-2">
            <textarea rows="8" 
                      class="w-full p-3 code-block border-0 resize-none focus:outline-none text-sm text-gray-900 dark:text-gray-100 bg-gray-50 dark:bg-gray-800"
                      onblur="taskManager.updateCustomContent('${item.id}', this.value)"
                      placeholder="Enter your code here...">${item.content}</textarea>
            <button onclick="taskManager.deleteTabContent('${item.id}')" 
                    class="absolute top-2 right-2 px-1 py-1 text-xs bg-red-500 text-white rounded hover:bg-red-600">×</button>
          </div>
        `;
      } else {
        return `
          <div class="relative border border-gray-200 dark:border-gray-600 rounded mb-2">
            <textarea rows="8" 
                      class="w-full p-3 border-0 resize-none focus:outline-none text-sm text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-700"
                      onblur="taskManager.updateCustomContent('${item.id}', this.value)"
                      placeholder="Enter your text here...">${item.content}</textarea>
            <button onclick="taskManager.deleteTabContent('${item.id}')" 
                    class="absolute top-2 right-2 px-1 py-1 text-xs bg-red-500 text-white rounded hover:bg-red-600">×</button>
          </div>
        `;
      }
    }).join('');
  }

  handleParagraphBlur(event, paragraphId, content) {
    // Check if the blur is happening because we're clicking on a control element
    const relatedTarget = event.relatedTarget;
    if (relatedTarget && (
      relatedTarget.classList.contains('language-selector') ||
      relatedTarget.closest('.paragraph-controls') ||
      relatedTarget.onclick && relatedTarget.onclick.toString().includes('deleteTabContent')
    )) {
      // Don't process blur if we're interacting with controls
      return;
    }
    
    // Use a small delay to allow for control interactions
    setTimeout(() => {
      this.updateParagraphContent(paragraphId, content);
    }, 100);
  }

  updateParagraphContent(paragraphId, content) {
    const currentNote = this.notes[this.activeNote];
    if (!currentNote || !currentNote.paragraphs) return;

    const paragraph = currentNote.paragraphs.find(p => p.id === paragraphId);
    if (paragraph && paragraph.content !== content) {
      paragraph.content = content;
      // Also update the main content field for backward compatibility
      this.syncParagraphsToContent();
      this.autoSaveNote().then(() => {
        this.showAutoSaveIndicator();
      });
    }
  }

  syncParagraphsToContent() {
    const currentNote = this.notes[this.activeNote];
    if (!currentNote) return;

    let content = '';
    
    // Add paragraphs content
    if (currentNote.paragraphs && currentNote.paragraphs.length > 0) {
      const sortedParagraphs = [...currentNote.paragraphs].sort((a, b) => a.order - b.order);
      
      sortedParagraphs.forEach(paragraph => {
        if (paragraph.type === 'code') {
          content += `\`\`\`${paragraph.language || 'text'}\n${paragraph.content}\n\`\`\`\n\n`;
        } else {
          content += `${paragraph.content}\n\n`;
        }
      });
    }
    
    // Add custom sections as markdown with HTML comment metadata
    if (currentNote.customSections && currentNote.customSections.length > 0) {
      const sortedSections = [...currentNote.customSections].sort((a, b) => a.order - b.order);
      
      sortedSections.forEach(section => {
        content += this.renderCustomSectionAsMarkdown(section);
      });
    }
    
    currentNote.content = content.trim();
  }

  renderCustomSectionAsMarkdown(section) {
    let markdown = `\n<!-- Custom Section: ${section.title} -->\n`;
    markdown += `<!-- section-id: ${section.id}, type: ${section.type} -->\n\n`;
    
    if (section.type === 'tabs') {
      section.config.tabs?.forEach(tab => {
        markdown += `### Tab: ${tab.title}\n`;
        markdown += `<!-- tab-id: ${tab.id} -->\n\n`;
        
        tab.content?.forEach(item => {
          if (item.type === 'code') {
            markdown += `\`\`\`${item.language || 'text'}\n${item.content}\n\`\`\`\n\n`;
          } else {
            markdown += `${item.content}\n\n`;
          }
        });
      });
    } else if (section.type === 'timeline') {
      section.config.timeline?.forEach(item => {
        markdown += `## ${item.title} (${item.status})\n`;
        markdown += `<!-- item-id: ${item.id}, status: ${item.status}`;
        if (item.date) markdown += `, date: ${item.date}`;
        markdown += ` -->\n\n`;
        
        item.content?.forEach(contentItem => {
          if (contentItem.type === 'code') {
            markdown += `\`\`\`${contentItem.language || 'text'}\n${contentItem.content}\n\`\`\`\n\n`;
          } else {
            markdown += `${contentItem.content}\n\n`;
          }
        });
      });
    } else if (section.type === 'split-view') {
      section.config.splitView?.columns?.forEach((column, index) => {
        markdown += `### Column ${index + 1}\n`;
        markdown += `<!-- column-index: ${index} -->\n\n`;
        
        column.forEach(item => {
          if (item.type === 'code') {
            markdown += `\`\`\`${item.language || 'text'}\n${item.content}\n\`\`\`\n\n`;
          } else {
            markdown += `${item.content}\n\n`;
          }
        });
      });
    }
    
    markdown += `<!-- End Custom Section -->\n\n`;
    return markdown;
  }

  updateParagraphLanguage(paragraphId, language) {
    const currentNote = this.notes[this.activeNote];
    if (!currentNote || !currentNote.paragraphs) return;

    const paragraph = currentNote.paragraphs.find(p => p.id === paragraphId);
    if (paragraph && paragraph.language !== language) {
      paragraph.language = language;
      this.syncParagraphsToContent();
      this.autoSaveNote().then(() => {
        this.showAutoSaveIndicator();
      });
      
      // Update the display to show the new language in the selector
      this.renderActiveNote();
    }
  }

  duplicateParagraph(paragraphId) {
    const currentNote = this.notes[this.activeNote];
    if (!currentNote || !currentNote.paragraphs) return;

    const originalParagraph = currentNote.paragraphs.find(p => p.id === paragraphId);
    if (!originalParagraph) return;

    const newParagraph = {
      ...originalParagraph,
      id: this.generateParagraphId(),
      order: originalParagraph.order + 0.5
    };

    currentNote.paragraphs.push(newParagraph);
    currentNote.paragraphs.sort((a, b) => a.order - b.order);
    currentNote.paragraphs.forEach((p, index) => p.order = index);
    
    // Sync content and save
    this.syncParagraphsToContent();
    this.renderActiveNote();
    this.autoSaveNote().then(() => {
      this.showAutoSaveIndicator();
    });
  }

  toggleParagraphType(paragraphId) {
    const currentNote = this.notes[this.activeNote];
    if (!currentNote || !currentNote.paragraphs) return;

    const paragraph = currentNote.paragraphs.find(p => p.id === paragraphId);
    if (!paragraph) return;

    paragraph.type = paragraph.type === 'code' ? 'text' : 'code';
    if (paragraph.type === 'code' && !paragraph.language) {
      paragraph.language = 'javascript';
    }

    this.syncParagraphsToContent();
    this.renderActiveNote();
    this.autoSaveNote().then(() => {
      this.showAutoSaveIndicator();
    });
  }

  deleteParagraph(paragraphId) {
    const currentNote = this.notes[this.activeNote];
    if (!currentNote || !currentNote.paragraphs) return;

    if (!confirm('Delete this paragraph?')) return;

    currentNote.paragraphs = currentNote.paragraphs.filter(p => p.id !== paragraphId);
    currentNote.paragraphs.forEach((p, index) => p.order = index);
    
    // Sync content and save
    this.syncParagraphsToContent();
    this.renderActiveNote();
    this.autoSaveNote().then(() => {
      this.showAutoSaveIndicator();
    });
  }

  toggleParagraphSelection(paragraphId) {
    const index = this.selectedParagraphs.indexOf(paragraphId);
    if (index > -1) {
      this.selectedParagraphs.splice(index, 1);
    } else {
      this.selectedParagraphs.push(paragraphId);
    }
    this.renderActiveNote();
  }

  handleParagraphKeyDown(event, paragraphId) {
    // Handle Tab key for indentation
    if (event.key === 'Tab') {
      event.preventDefault();
      const target = event.target;
      const start = target.selectionStart;
      const end = target.selectionEnd;
      
      if (event.shiftKey) {
        // Remove tab (shift+tab)
        const beforeCursor = target.value.substring(0, start);
        const afterCursor = target.value.substring(end);
        if (beforeCursor.endsWith('  ')) {
          target.value = beforeCursor.slice(0, -2) + afterCursor;
          target.selectionStart = target.selectionEnd = start - 2;
        } else if (beforeCursor.endsWith('\t')) {
          target.value = beforeCursor.slice(0, -1) + afterCursor;
          target.selectionStart = target.selectionEnd = start - 1;
        }
      } else {
        // Add tab
        target.value = target.value.substring(0, start) + '  ' + target.value.substring(end);
        target.selectionStart = target.selectionEnd = start + 2;
      }
      
      this.updateParagraphContent(paragraphId, target.value);
    }
  }

  initDragAndDrop() {
    // File drop zone functionality
    const dropZone = document.getElementById('fileDropZone');
    if (!dropZone) return;

    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
      dropZone.addEventListener(eventName, this.preventDefaults, false);
    });

    ['dragenter', 'dragover'].forEach(eventName => {
      dropZone.addEventListener(eventName, () => {
        dropZone.classList.remove('hidden');
        dropZone.classList.add('drop-zone-active');
      }, false);
    });

    ['dragleave', 'drop'].forEach(eventName => {
      dropZone.addEventListener(eventName, () => {
        dropZone.classList.add('hidden');
        dropZone.classList.remove('drop-zone-active');
      }, false);
    });

    dropZone.addEventListener('drop', (e) => {
      this.handleFileDrop(e);
    }, false);

    // Paragraph drag and drop
    this.initParagraphDragAndDrop();
  }

  initParagraphDragAndDrop() {
    const container = document.getElementById('paragraphsContainer');
    if (!container) return;

    container.addEventListener('dragover', (e) => {
      e.preventDefault();
      const afterElement = this.getDragAfterElement(container, e.clientY);
      const draggedElement = container.querySelector('.dragging');
      
      if (draggedElement) {
        if (afterElement == null) {
          container.appendChild(draggedElement);
        } else {
          container.insertBefore(draggedElement, afterElement);
        }
      }
    });

    container.addEventListener('drop', (e) => {
      e.preventDefault();
      console.log('Drop event triggered');
      this.updateParagraphOrder();
    });

    container.addEventListener('dragenter', (e) => {
      e.preventDefault();
    });
  }

  getDragAfterElement(container, y) {
    const draggableElements = [...container.querySelectorAll('.paragraph-section:not(.dragging)')];
    
    return draggableElements.reduce((closest, child) => {
      const box = child.getBoundingClientRect();
      const offset = y - box.top - box.height / 2;
      
      if (offset < 0 && offset > closest.offset) {
        return { offset: offset, element: child };
      } else {
        return closest;
      }
    }, { offset: Number.NEGATIVE_INFINITY }).element;
  }

  updateParagraphOrder() {
    const container = document.getElementById('paragraphsContainer');
    const paragraphElements = container.querySelectorAll('.paragraph-section');
    const currentNote = this.notes[this.activeNote];
    
    if (!currentNote || !currentNote.paragraphs) return;

    let orderChanged = false;
    paragraphElements.forEach((element, index) => {
      const paragraphId = element.getAttribute('data-paragraph-id');
      const paragraph = currentNote.paragraphs.find(p => p.id === paragraphId);
      if (paragraph && paragraph.order !== index) {
        paragraph.order = index;
        orderChanged = true;
      }
    });

    if (orderChanged) {
      this.syncParagraphsToContent();
      this.autoSaveNote().then(() => {
        this.showAutoSaveIndicator();
      });
    }
  }

  async handleFileDrop(e) {
    const files = [...e.dataTransfer.files];
    
    for (const file of files) {
      if (file.type.startsWith('image/')) {
        await this.addImageToNote(file);
      } else if (file.type === 'text/plain' || file.name.endsWith('.md') || file.name.endsWith('.txt')) {
        await this.addTextFileToNote(file);
      } else {
        // Add as attachment reference
        await this.addFileReference(file);
      }
    }
  }

  async addImageToNote(file) {
    // Convert image to base64 or handle file upload
    const reader = new FileReader();
    reader.onload = (e) => {
      const imageMarkdown = `![${file.name}](${e.target.result})`;
      this.addParagraph('text');
      const currentNote = this.notes[this.activeNote];
      const lastParagraph = currentNote.paragraphs[currentNote.paragraphs.length - 1];
      lastParagraph.content = imageMarkdown;
      this.syncParagraphsToContent();
      this.renderActiveNote();
      this.autoSaveNote().then(() => {
        this.showAutoSaveIndicator();
      });
    };
    reader.readAsDataURL(file);
  }

  async addTextFileToNote(file) {
    const content = await file.text();
    const isMarkdown = file.name.endsWith('.md');
    
    if (isMarkdown) {
      const parsed = this.parseContentAndCustomSections(content);
      const currentNote = this.notes[this.activeNote];
      currentNote.paragraphs.push(...parsed.paragraphs.map(p => ({...p, order: currentNote.paragraphs.length + p.order})));
      
      // Add custom sections if any
      if (parsed.customSections && parsed.customSections.length > 0) {
        if (!currentNote.customSections) currentNote.customSections = [];
        currentNote.customSections.push(...parsed.customSections.map(s => ({
          ...s, 
          order: currentNote.customSections.length + s.order
        })));
      }
    } else {
      this.addParagraph('text');
      const currentNote = this.notes[this.activeNote];
      const lastParagraph = currentNote.paragraphs[currentNote.paragraphs.length - 1];
      lastParagraph.content = content;
    }
    
    this.syncParagraphsToContent();
    this.renderActiveNote();
    this.autoSaveNote().then(() => {
      this.showAutoSaveIndicator();
    });
  }

  async addFileReference(file) {
    const fileRef = `[Attachment: ${file.name}](attachment:${file.name})`;
    this.addParagraph('text');
    const currentNote = this.notes[this.activeNote];
    const lastParagraph = currentNote.paragraphs[currentNote.paragraphs.length - 1];
    lastParagraph.content = fileRef;
    this.syncParagraphsToContent();
    this.renderActiveNote();
    this.autoSaveNote().then(() => {
      this.showAutoSaveIndicator();
    });
  }

  preventDefaults(e) {
    e.preventDefault();
    e.stopPropagation();
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

  escapeHtml(text) {
    return escapeHtml(text);
  }

  // Custom Section Management Functions
  deleteCustomSection(sectionId) {
    if (!confirm('Delete this custom section?')) return;

    const currentNote = this.notes[this.activeNote];
    if (!currentNote || !currentNote.customSections) return;

    currentNote.customSections = currentNote.customSections.filter(s => s.id !== sectionId);
    
    // Clear any active tab state for this section
    if (this.activeTabState[sectionId]) {
      delete this.activeTabState[sectionId];
    }
    
    this.syncParagraphsToContent();
    this.renderActiveNote();
    this.autoSaveNote().then(() => {
      this.showAutoSaveIndicator();
    });
  }

  // Tab Functions
  switchTab(sectionId, tabId) {
    const section = document.querySelector(`[data-section-id="${sectionId}"]`);
    if (!section) return;

    // Store the active tab state
    this.activeTabState[sectionId] = tabId;

    // Update tab navigation
    section.querySelectorAll('[data-tab-id]').forEach(btn => {
      btn.classList.remove('border-gray-900', 'text-gray-900', 'dark:border-gray-100', 'dark:text-gray-100');
      btn.classList.add('border-transparent', 'text-gray-500', 'hover:text-gray-700', 'hover:border-gray-300', 'dark:text-gray-400', 'dark:hover:text-gray-300');
    });
    
    const activeTab = section.querySelector(`button[data-tab-id="${tabId}"]`);
    if (activeTab) {
      activeTab.classList.add('border-gray-900', 'text-gray-900', 'dark:border-gray-100', 'dark:text-gray-100');
      activeTab.classList.remove('border-transparent', 'text-gray-500', 'hover:text-gray-700', 'hover:border-gray-300', 'dark:text-gray-400', 'dark:hover:text-gray-300');
    }

    // Update tab content
    section.querySelectorAll('.tab-content').forEach(content => {
      content.classList.remove('active');
    });
    
    const activeContent = section.querySelector(`.tab-content[data-tab-id="${tabId}"]`);
    if (activeContent) {
      activeContent.classList.add('active');
    }
  }

  addTab(sectionId) {
    const currentNote = this.notes[this.activeNote];
    if (!currentNote || !currentNote.customSections) return;

    const section = currentNote.customSections.find(s => s.id === sectionId);
    if (!section || section.type !== 'tabs') return;

    const newTab = {
      id: this.generateTabId(),
      title: `Tab ${section.config.tabs.length + 1}`,
      content: []
    };

    section.config.tabs.push(newTab);
    this.syncParagraphsToContent();
    this.renderActiveNote();
    this.autoSaveNote().then(() => {
      this.showAutoSaveIndicator();
    });
  }

  updateTabTitle(sectionId, tabId, title) {
    const currentNote = this.notes[this.activeNote];
    if (!currentNote || !currentNote.customSections) return;

    const section = currentNote.customSections.find(s => s.id === sectionId);
    if (!section || section.type !== 'tabs') return;

    const tab = section.config.tabs.find(t => t.id === tabId);
    if (tab) {
      tab.title = title;
      this.syncParagraphsToContent();
      this.autoSaveNote().then(() => {
        this.showAutoSaveIndicator();
      });
    }
  }

  deleteTab(sectionId, tabId) {
    if (!confirm('Delete this entire tab and all its content?')) return;

    const currentNote = this.notes[this.activeNote];
    if (!currentNote || !currentNote.customSections) return;

    const section = currentNote.customSections.find(s => s.id === sectionId);
    if (!section || section.type !== 'tabs') return;

    // Remove the tab
    section.config.tabs = section.config.tabs.filter(t => t.id !== tabId);
    
    // Clear active tab state if we deleted the active tab
    if (this.activeTabState[sectionId] === tabId) {
      delete this.activeTabState[sectionId];
    }

    this.syncParagraphsToContent();
    this.renderActiveNote();
    this.autoSaveNote().then(() => {
      this.showAutoSaveIndicator();
    });
  }

  addContentToTab(sectionId, tabId, type) {
    const currentNote = this.notes[this.activeNote];
    if (!currentNote || !currentNote.customSections) return;

    const section = currentNote.customSections.find(s => s.id === sectionId);
    if (!section || section.type !== 'tabs') return;

    const tab = section.config.tabs.find(t => t.id === tabId);
    if (!tab) return;

    const newContent = {
      id: this.generateParagraphId(),
      type: type,
      content: type === 'code' ? '// Enter your code here' : 'Enter your text here',
      language: type === 'code' ? 'javascript' : undefined
    };

    tab.content.push(newContent);
    this.syncParagraphsToContent();
    this.renderActiveNote();
    this.autoSaveNote().then(() => {
      this.showAutoSaveIndicator();
    });
  }

  // Timeline Functions
  addTimelineItem(sectionId) {
    const currentNote = this.notes[this.activeNote];
    if (!currentNote || !currentNote.customSections) return;

    const section = currentNote.customSections.find(s => s.id === sectionId);
    if (!section || section.type !== 'timeline') return;

    const newItem = {
      id: this.generateTimelineId(),
      title: 'New Step',
      status: 'pending',
      date: new Date().toISOString().split('T')[0],
      content: []
    };

    section.config.timeline.push(newItem);
    this.syncParagraphsToContent();
    this.renderActiveNote();
    this.autoSaveNote().then(() => {
      this.showAutoSaveIndicator();
    });
  }

  updateTimelineItemTitle(sectionId, itemId, title) {
    const currentNote = this.notes[this.activeNote];
    if (!currentNote || !currentNote.customSections) return;

    const section = currentNote.customSections.find(s => s.id === sectionId);
    if (!section || section.type !== 'timeline') return;

    const item = section.config.timeline.find(i => i.id === itemId);
    if (item) {
      item.title = title;
      this.syncParagraphsToContent();
      this.autoSaveNote().then(() => {
        this.showAutoSaveIndicator();
      });
    }
  }

  updateTimelineItemDate(sectionId, itemId, date) {
    const currentNote = this.notes[this.activeNote];
    if (!currentNote || !currentNote.customSections) return;

    const section = currentNote.customSections.find(s => s.id === sectionId);
    if (!section || section.type !== 'timeline') return;

    const item = section.config.timeline.find(i => i.id === itemId);
    if (item) {
      item.date = date;
      this.syncParagraphsToContent();
      this.autoSaveNote().then(() => {
        this.showAutoSaveIndicator();
      });
    }
  }

  updateTimelineItemStatus(sectionId, itemId, status) {
    const currentNote = this.notes[this.activeNote];
    if (!currentNote || !currentNote.customSections) return;

    const section = currentNote.customSections.find(s => s.id === sectionId);
    if (!section || section.type !== 'timeline') return;

    const item = section.config.timeline.find(i => i.id === itemId);
    if (item) {
      item.status = status;
      this.syncParagraphsToContent();
      this.renderActiveNote();
      this.autoSaveNote().then(() => {
        this.showAutoSaveIndicator();
      });
    }
  }

  deleteTimelineItem(sectionId, itemId) {
    if (!confirm('Delete this timeline item?')) return;

    const currentNote = this.notes[this.activeNote];
    if (!currentNote || !currentNote.customSections) return;

    const section = currentNote.customSections.find(s => s.id === sectionId);
    if (!section || section.type !== 'timeline') return;

    section.config.timeline = section.config.timeline.filter(i => i.id !== itemId);
    this.syncParagraphsToContent();
    this.renderActiveNote();
    this.autoSaveNote().then(() => {
      this.showAutoSaveIndicator();
    });
  }

  addContentToTimeline(sectionId, itemId, type) {
    const currentNote = this.notes[this.activeNote];
    if (!currentNote || !currentNote.customSections) return;

    const section = currentNote.customSections.find(s => s.id === sectionId);
    if (!section || section.type !== 'timeline') return;

    const item = section.config.timeline.find(i => i.id === itemId);
    if (!item) return;

    const newContent = {
      id: this.generateParagraphId(),
      type: type,
      content: type === 'code' ? '// Enter your code here' : 'Enter your text here',
      language: type === 'code' ? 'javascript' : undefined
    };

    item.content.push(newContent);
    this.syncParagraphsToContent();
    this.renderActiveNote();
    this.autoSaveNote().then(() => {
      this.showAutoSaveIndicator();
    });
  }

  // Split View Functions
  addColumnToSplitView(sectionId) {
    const currentNote = this.notes[this.activeNote];
    if (!currentNote || !currentNote.customSections) return;

    const section = currentNote.customSections.find(s => s.id === sectionId);
    if (!section || section.type !== 'split-view') return;

    section.config.splitView.columns.push([]);
    this.syncParagraphsToContent();
    this.renderActiveNote();
    this.autoSaveNote().then(() => {
      this.showAutoSaveIndicator();
    });
  }

  removeColumnFromSplitView(sectionId, columnIndex) {
    if (!confirm('Remove this column and all its content?')) return;

    const currentNote = this.notes[this.activeNote];
    if (!currentNote || !currentNote.customSections) return;

    const section = currentNote.customSections.find(s => s.id === sectionId);
    if (!section || section.type !== 'split-view') return;

    section.config.splitView.columns.splice(columnIndex, 1);
    this.syncParagraphsToContent();
    this.renderActiveNote();
    this.autoSaveNote().then(() => {
      this.showAutoSaveIndicator();
    });
  }

  addContentToSplitView(sectionId, columnIndex, type) {
    const currentNote = this.notes[this.activeNote];
    if (!currentNote || !currentNote.customSections) return;

    const section = currentNote.customSections.find(s => s.id === sectionId);
    if (!section || section.type !== 'split-view') return;

    if (!section.config.splitView.columns[columnIndex]) return;

    const newContent = {
      id: this.generateParagraphId(),
      type: type,
      content: type === 'code' ? '// Enter your code here' : 'Enter your text here',
      language: type === 'code' ? 'javascript' : undefined
    };

    section.config.splitView.columns[columnIndex].push(newContent);
    this.syncParagraphsToContent();
    this.renderActiveNote();
    this.autoSaveNote().then(() => {
      this.showAutoSaveIndicator();
    });
  }

  // General content update
  updateCustomContent(contentId, content) {
    const currentNote = this.notes[this.activeNote];
    if (!currentNote || !currentNote.customSections) return;

    let found = false;
    let oldContent = null;
    
    // Find and update content in any section
    currentNote.customSections.forEach(section => {
      if (section.type === 'tabs') {
        section.config.tabs.forEach(tab => {
          const item = tab.content.find(c => c.id === contentId);
          if (item) {
            oldContent = item.content;
            item.content = content;
            found = true;
          }
        });
      } else if (section.type === 'timeline') {
        section.config.timeline.forEach(item => {
          const contentItem = item.content.find(c => c.id === contentId);
          if (contentItem) {
            oldContent = contentItem.content;
            contentItem.content = content;
            found = true;
          }
        });
      } else if (section.type === 'split-view') {
        section.config.splitView.columns.forEach(column => {
          const item = column.find(c => c.id === contentId);
          if (item) {
            oldContent = item.content;
            item.content = content;
            found = true;
          }
        });
      }
    });

    // Only save if content actually changed
    if (found && oldContent !== content) {
      this.syncParagraphsToContent();
      this.autoSaveNote().then(() => {
        this.showAutoSaveIndicator();
      });
    }
  }

  // General content deletion
  deleteTabContent(contentId) {
    if (!confirm('Delete this content?')) return;

    const currentNote = this.notes[this.activeNote];
    if (!currentNote || !currentNote.customSections) return;

    // Find and remove content from any section
    let found = false;
    currentNote.customSections.forEach(section => {
      if (section.type === 'tabs') {
        section.config.tabs.forEach(tab => {
          const originalLength = tab.content.length;
          tab.content = tab.content.filter(c => c.id !== contentId);
          if (tab.content.length < originalLength) found = true;
        });
      } else if (section.type === 'timeline') {
        section.config.timeline.forEach(item => {
          const originalLength = item.content.length;
          item.content = item.content.filter(c => c.id !== contentId);
          if (item.content.length < originalLength) found = true;
        });
      } else if (section.type === 'split-view') {
        section.config.splitView.columns.forEach(column => {
          const index = column.findIndex(c => c.id === contentId);
          if (index > -1) {
            column.splice(index, 1);
            found = true;
          }
        });
      }
    });

    if (found) {
      this.syncParagraphsToContent();
      this.renderActiveNote();
      this.autoSaveNote().then(() => {
        this.showAutoSaveIndicator();
      });
    }
  }

  // Goals functionality
  async loadGoals() {
    try {
      const projectInfo = await ProjectAPI.getInfo();
      this.goals = projectInfo.goals || [];
      this.renderGoalsView();
    } catch (error) {
      console.error("Error loading goals:", error);
      this.goals = [];
      this.renderGoalsView();
    }
  }

  renderGoalsView() {
    const container = document.getElementById("goalsContainer");
    const emptyState = document.getElementById("emptyGoalsState");

    const filteredGoals = this.getFilteredGoals();

    if (filteredGoals.length === 0) {
      emptyState.classList.remove("hidden");
      container.innerHTML = "";
      return;
    }

    emptyState.classList.add("hidden");

    container.innerHTML = filteredGoals
      .map(
        (goal, index) => `
            <div class="bg-white dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600 p-6">
                <div class="flex justify-between items-start mb-4">
                    <div class="flex-1">
                        <div class="flex items-center gap-3 mb-2">
                            <h3 class="text-lg font-semibold text-gray-900 dark:text-gray-100">${goal.title}</h3>
                            <span class="px-2 py-1 text-xs font-medium rounded-full ${this.getTypeStyle(goal.type)}">
                                ${goal.type}
                            </span>
                            <span class="px-2 py-1 text-xs font-medium rounded-full ${this.getStatusStyle(goal.status)}">
                                ${goal.status}
                            </span>
                        </div>
                        <p class="text-sm text-gray-600 dark:text-gray-400 mb-3">${goal.description}</p>
                        <div class="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                            <div>
                                <span class="font-medium text-gray-700 dark:text-gray-300">KPI:</span>
                                <span class="text-gray-600 dark:text-gray-400">${goal.kpi}</span>
                            </div>
                            <div>
                                <span class="font-medium text-gray-700 dark:text-gray-300">Start:</span>
                                <span class="text-gray-600 dark:text-gray-400">${goal.startDate}</span>
                            </div>
                            <div>
                                <span class="font-medium text-gray-700 dark:text-gray-300">End:</span>
                                <span class="text-gray-600 dark:text-gray-400">${goal.endDate}</span>
                            </div>
                        </div>
                    </div>
                    <div class="flex space-x-2 ml-4">
                        <button onclick="taskManager.editGoal(${this.goals.indexOf(goal)})" class="text-gray-700 hover:text-gray-900 dark:text-gray-300 dark:hover:text-gray-100">
                            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                        </button>
                        <button onclick="taskManager.deleteGoal(${this.goals.indexOf(goal)})" class="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300">
                            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                        </button>
                    </div>
                </div>
            </div>
        `,
      )
      .join("");
  }

  getFilteredGoals() {
    if (this.currentGoalFilter === "all") {
      return this.goals;
    }
    return this.goals.filter((goal) => goal.type === this.currentGoalFilter);
  }

  getTypeStyle(type) {
    return type === "enterprise"
      ? "bg-gray-800 text-white dark:bg-gray-200 dark:text-gray-900"
      : "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200 border border-gray-200 dark:border-gray-600";
  }

  getStatusStyle(status) {
    const styles = {
      planning: "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200",
      "on-track":
        "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
      "at-risk":
        "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
      late: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
      success:
        "bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200",
      failed: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
    };
    return styles[status] || styles["planning"];
  }

  filterGoals(type) {
    console.log("filterGoals called with type:", type);
    this.currentGoalFilter = type;

    // Update filter button styles
    const filters = [
      "allGoalsFilter",
      "enterpriseGoalsFilter",
      "projectGoalsFilter",
    ];
    filters.forEach((filterId) => {
      const btn = document.getElementById(filterId);
      if (
        (filterId === "allGoalsFilter" && type === "all") ||
        (filterId === "enterpriseGoalsFilter" && type === "enterprise") ||
        (filterId === "projectGoalsFilter" && type === "project")
      ) {
        btn.className =
          "px-3 py-1 rounded-md text-sm font-medium bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 border border-gray-200 dark:border-gray-600";
      } else {
        btn.className =
          "px-3 py-1 rounded-md text-sm font-medium text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100";
      }
    });

    console.log("About to render goals with filter:", this.currentGoalFilter);
    this.renderGoalsView();
  }

  openGoalModal() {
    this.editingGoal = null;
    document.getElementById("goalModalTitle").textContent = "Add Goal";
    document.getElementById("goalTitle").value = "";
    document.getElementById("goalType").value = "project";
    document.getElementById("goalStatus").value = "planning";
    document.getElementById("goalKpi").value = "";
    document.getElementById("goalStartDate").value = "";
    document.getElementById("goalEndDate").value = "";
    document.getElementById("goalDescription").value = "";
    document.getElementById("goalModal").classList.remove("hidden");
    document.getElementById("goalModal").classList.add("flex");
  }

  closeGoalModal() {
    document.getElementById("goalModal").classList.add("hidden");
    document.getElementById("goalModal").classList.remove("flex");
  }

  async handleGoalSubmit(e) {
    e.preventDefault();

    const goalData = {
      title: document.getElementById("goalTitle").value,
      type: document.getElementById("goalType").value,
      status: document.getElementById("goalStatus").value,
      kpi: document.getElementById("goalKpi").value,
      startDate: document.getElementById("goalStartDate").value,
      endDate: document.getElementById("goalEndDate").value,
      description: document.getElementById("goalDescription").value,
    };

    try {
      if (this.editingGoal !== null) {
        // Update existing goal using backend ID
        const goal = this.goals[this.editingGoal];
        await GoalsAPI.update(goal.id, goalData);
      } else {
        // Create new goal
        await GoalsAPI.create(goalData);
      }

      this.closeGoalModal();
      await this.loadGoals();
      // Force re-render with current filter
      this.renderGoalsView();
    } catch (error) {
      console.error("Error saving goal:", error);
    }
  }

  editGoal(goalIndex) {
    const goal = this.goals[goalIndex];
    if (!goal) return;

    this.editingGoal = goalIndex;
    document.getElementById("goalModalTitle").textContent = "Edit Goal";
    document.getElementById("goalTitle").value = goal.title;
    document.getElementById("goalType").value = goal.type;
    document.getElementById("goalStatus").value = goal.status;
    document.getElementById("goalKpi").value = goal.kpi;
    document.getElementById("goalStartDate").value = goal.startDate;
    document.getElementById("goalEndDate").value = goal.endDate;
    document.getElementById("goalDescription").value = goal.description;
    document.getElementById("goalModal").classList.remove("hidden");
    document.getElementById("goalModal").classList.add("flex");
  }

  async deleteGoal(goalIndex) {
    if (!confirm("Are you sure you want to delete this goal?")) return;

    try {
      const goal = this.goals[goalIndex];
      await GoalsAPI.delete(goal.id);
      await this.loadGoals();
    } catch (error) {
      console.error("Error deleting goal:", error);
    }
  }

  // Milestones functionality
  async loadMilestones() {
    try {
      this.milestones = await MilestonesAPI.fetchAll();
      this.renderMilestonesView();
    } catch (error) {
      console.error("Error loading milestones:", error);
    }
  }

  renderMilestonesView() {
    const container = document.getElementById("milestonesContainer");
    const emptyState = document.getElementById("emptyMilestonesState");

    if (!this.milestones || this.milestones.length === 0) {
      emptyState.classList.remove("hidden");
      container.innerHTML = "";
      return;
    }

    emptyState.classList.add("hidden");
    container.innerHTML = this.milestones.map(m => `
      <div class="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 border border-gray-200 dark:border-gray-600">
        <div class="flex justify-between items-start mb-2">
          <h3 class="font-medium text-gray-900 dark:text-gray-100">${m.name}</h3>
          <span class="px-2 py-1 text-xs rounded ${m.status === 'completed' ? 'bg-gray-900 text-white dark:bg-gray-600 dark:text-white' : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200 border border-gray-200 dark:border-gray-600'}">${m.status}</span>
        </div>
        ${m.target ? `<p class="text-sm text-gray-500 dark:text-gray-400 mb-2">Target: ${new Date(m.target).toLocaleDateString()}</p>` : ''}
        <div class="mb-2">
          <div class="flex justify-between text-xs text-gray-500 dark:text-gray-400 mb-1">
            <span>${m.completedCount}/${m.taskCount} tasks</span>
            <span>${m.progress}%</span>
          </div>
          <div class="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-2">
            <div class="bg-gray-900 dark:bg-gray-100 h-2 rounded-full" style="width: ${m.progress}%"></div>
          </div>
        </div>
        ${m.description ? `<p class="text-sm text-gray-600 dark:text-gray-300 mt-2">${m.description}</p>` : ''}
        <div class="flex justify-end space-x-2 mt-3">
          <button onclick="taskManager.openMilestoneModal('${m.id}')" class="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100">Edit</button>
          <button onclick="taskManager.deleteMilestone('${m.id}')" class="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200">Delete</button>
        </div>
      </div>
    `).join("");
  }

  openMilestoneModal(id = null) {
    this.editingMilestoneId = id;
    const modal = document.getElementById("milestoneModal");
    const title = document.getElementById("milestoneModalTitle");
    const form = document.getElementById("milestoneForm");

    form.reset();
    title.textContent = id ? "Edit Milestone" : "Add Milestone";

    if (id && this.milestones) {
      const m = this.milestones.find(x => x.id === id);
      if (m) {
        document.getElementById("milestoneName").value = m.name;
        document.getElementById("milestoneTarget").value = m.target || "";
        document.getElementById("milestoneStatus").value = m.status;
        document.getElementById("milestoneDescription").value = m.description || "";
      }
    }

    modal.classList.remove("hidden");
    modal.classList.add("flex");
  }

  closeMilestoneModal() {
    const modal = document.getElementById("milestoneModal");
    modal.classList.add("hidden");
    modal.classList.remove("flex");
    this.editingMilestoneId = null;
  }

  async saveMilestone(e) {
    e.preventDefault();
    const data = {
      name: document.getElementById("milestoneName").value,
      target: document.getElementById("milestoneTarget").value || null,
      status: document.getElementById("milestoneStatus").value,
      description: document.getElementById("milestoneDescription").value || null,
    };

    try {
      if (this.editingMilestoneId) {
        await MilestonesAPI.update(this.editingMilestoneId, data);
      } else {
        await MilestonesAPI.create(data);
      }
      this.closeMilestoneModal();
      await this.loadMilestones();
    } catch (error) {
      console.error("Error saving milestone:", error);
    }
  }

  async deleteMilestone(id) {
    if (!confirm("Delete this milestone?")) return;
    try {
      await MilestonesAPI.delete(id);
      await this.loadMilestones();
    } catch (error) {
      console.error("Error deleting milestone:", error);
    }
  }

  // Ideas functionality
  async loadIdeas() {
    try {
      this.ideas = await IdeasAPI.fetchAll();
      this.renderIdeasView();
    } catch (error) {
      console.error("Error loading ideas:", error);
    }
  }

  renderIdeasView() {
    const container = document.getElementById("ideasContainer");
    const emptyState = document.getElementById("emptyIdeasState");

    if (!this.ideas || this.ideas.length === 0) {
      emptyState.classList.remove("hidden");
      container.innerHTML = "";
      return;
    }

    emptyState.classList.add("hidden");
    const statusColors = {
      new: "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200 border border-gray-200 dark:border-gray-600",
      considering: "bg-gray-200 text-gray-800 dark:bg-gray-600 dark:text-gray-200",
      planned: "bg-gray-900 text-white dark:bg-gray-600 dark:text-white",
      rejected: "bg-gray-400 text-gray-800 dark:bg-gray-500 dark:text-gray-200",
    };

    container.innerHTML = this.ideas.map(idea => {
      const linkedIdeas = (idea.links || []).map(id => this.ideas.find(i => i.id === id)).filter(Boolean);
      const backlinkedIdeas = (idea.backlinks || []).map(id => this.ideas.find(i => i.id === id)).filter(Boolean);
      return `
      <div class="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 border border-gray-200 dark:border-gray-600">
        <div class="flex justify-between items-start mb-2">
          <h3 class="font-medium text-gray-900 dark:text-gray-100">${idea.title}</h3>
          <span class="px-2 py-1 text-xs rounded ${statusColors[idea.status] || statusColors.new}">${idea.status}</span>
        </div>
        ${idea.category ? `<span class="inline-block px-2 py-0.5 text-xs bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300 rounded mb-2">${idea.category}</span>` : ""}
        <p class="text-xs text-gray-500 dark:text-gray-400 mb-2">Created: ${idea.created}</p>
        ${idea.description ? `<p class="text-sm text-gray-600 dark:text-gray-300 mb-2">${idea.description}</p>` : ""}
        ${linkedIdeas.length > 0 ? `
          <div class="mb-2">
            <span class="text-xs text-gray-500 dark:text-gray-400">Links:</span>
            <div class="flex flex-wrap gap-1 mt-1">
              ${linkedIdeas.map(li => `<span class="inline-block px-2 py-0.5 text-xs bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded cursor-pointer hover:bg-blue-200 dark:hover:bg-blue-800" onclick="taskManager.openIdeaModal('${li.id}')">${li.title}</span>`).join("")}
            </div>
          </div>
        ` : ""}
        ${backlinkedIdeas.length > 0 ? `
          <div class="mb-2">
            <span class="text-xs text-gray-500 dark:text-gray-400">Backlinks:</span>
            <div class="flex flex-wrap gap-1 mt-1">
              ${backlinkedIdeas.map(bi => `<span class="inline-block px-2 py-0.5 text-xs bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300 rounded cursor-pointer hover:bg-purple-200 dark:hover:bg-purple-800" onclick="taskManager.openIdeaModal('${bi.id}')">${bi.title}</span>`).join("")}
            </div>
          </div>
        ` : ""}
        <div class="flex justify-end space-x-2 mt-3">
          <button onclick="taskManager.openIdeaModal('${idea.id}')" class="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100">Edit</button>
          <button onclick="taskManager.deleteIdea('${idea.id}')" class="text-sm text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-200">Delete</button>
        </div>
      </div>
    `;}).join("");
  }

  openIdeaModal(id = null) {
    this.editingIdeaId = id;
    const modal = document.getElementById("ideaModal");
    const title = document.getElementById("ideaModalTitle");
    const form = document.getElementById("ideaForm");
    const linksSection = document.getElementById("ideaLinksSection");

    form.reset();
    title.textContent = id ? "Edit Idea" : "Add Idea";
    this.tempIdeaLinks = [];

    if (id && this.ideas) {
      const idea = this.ideas.find(i => i.id === id);
      if (idea) {
        document.getElementById("ideaTitle").value = idea.title;
        document.getElementById("ideaStatus").value = idea.status;
        document.getElementById("ideaCategory").value = idea.category || "";
        document.getElementById("ideaDescription").value = idea.description || "";
        this.tempIdeaLinks = [...(idea.links || [])];
        linksSection?.classList.remove("hidden");
        this.updateIdeaLinksDisplay();
      }
    } else {
      linksSection?.classList.add("hidden");
    }

    modal.classList.remove("hidden");
    modal.classList.add("flex");
  }

  closeIdeaModal() {
    const modal = document.getElementById("ideaModal");
    modal.classList.add("hidden");
    modal.classList.remove("flex");
    this.editingIdeaId = null;
  }

  async saveIdea(e) {
    e.preventDefault();
    const data = {
      title: document.getElementById("ideaTitle").value,
      status: document.getElementById("ideaStatus").value,
      category: document.getElementById("ideaCategory").value || null,
      description: document.getElementById("ideaDescription").value || null,
      links: this.tempIdeaLinks && this.tempIdeaLinks.length > 0 ? this.tempIdeaLinks : null,
    };

    try {
      if (this.editingIdeaId) {
        await IdeasAPI.update(this.editingIdeaId, data);
      } else {
        await IdeasAPI.create(data);
      }
      this.closeIdeaModal();
      await this.loadIdeas();
    } catch (error) {
      console.error("Error saving idea:", error);
    }
  }

  async deleteIdea(id) {
    if (!confirm("Delete this idea?")) return;
    try {
      await IdeasAPI.delete(id);
      await this.loadIdeas();
    } catch (error) {
      console.error("Error deleting idea:", error);
    }
  }

  // Retrospectives functionality
  async loadRetrospectives() {
    try {
      this.retrospectives = await RetrospectivesAPI.fetchAll();
      this.renderRetrospectivesView();
    } catch (error) {
      console.error("Error loading retrospectives:", error);
    }
  }

  renderRetrospectivesView() {
    const container = document.getElementById("retrospectivesContainer");
    const emptyState = document.getElementById("emptyRetrospectivesState");

    if (!this.retrospectives || this.retrospectives.length === 0) {
      emptyState?.classList.remove("hidden");
      container.innerHTML = "";
      return;
    }

    emptyState?.classList.add("hidden");
    container.innerHTML = this.retrospectives.map(retro => {
      const statusColor = retro.status === "open" ? "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200 border border-gray-200 dark:border-gray-600" : "bg-gray-900 text-white dark:bg-gray-600 dark:text-white";
      return `
      <div class="bg-white dark:bg-gray-700 rounded-lg shadow-sm border border-gray-200 dark:border-gray-600 overflow-hidden">
        <div class="px-4 py-3 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-600 flex justify-between items-center">
          <div>
            <h3 class="font-medium text-gray-900 dark:text-gray-100">${retro.title}</h3>
            <p class="text-xs text-gray-500 dark:text-gray-400">${retro.date}</p>
          </div>
          <div class="flex items-center gap-2">
            <span class="px-2 py-1 text-xs rounded-full ${statusColor}">${retro.status}</span>
            <button onclick="taskManager.openRetrospectiveModal('${retro.id}')" class="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100">Edit</button>
          </div>
        </div>
        <div class="p-4 space-y-3">
          <div>
            <h4 class="text-sm font-medium text-gray-900 dark:text-gray-100 mb-1">Continue</h4>
            <ul class="text-sm text-gray-600 dark:text-gray-300 space-y-1">
              ${retro.continue.length > 0 ? retro.continue.map(item => `<li class="flex items-start"><span class="text-gray-900 dark:text-gray-100 mr-2">+</span>${item}</li>`).join("") : '<li class="text-gray-400 italic">No items</li>'}
            </ul>
          </div>
          <div>
            <h4 class="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Stop</h4>
            <ul class="text-sm text-gray-600 dark:text-gray-300 space-y-1">
              ${retro.stop.length > 0 ? retro.stop.map(item => `<li class="flex items-start"><span class="text-gray-500 mr-2">-</span>${item}</li>`).join("") : '<li class="text-gray-400 italic">No items</li>'}
            </ul>
          </div>
          <div>
            <h4 class="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">Start</h4>
            <ul class="text-sm text-gray-600 dark:text-gray-300 space-y-1">
              ${retro.start.length > 0 ? retro.start.map(item => `<li class="flex items-start"><span class="text-gray-400 mr-2">*</span>${item}</li>`).join("") : '<li class="text-gray-400 italic">No items</li>'}
            </ul>
          </div>
        </div>
        <div class="px-4 py-3 bg-gray-50 dark:bg-gray-800 border-t border-gray-200 dark:border-gray-600 flex justify-end">
          <button onclick="taskManager.deleteRetrospective('${retro.id}')" class="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200">Delete</button>
        </div>
      </div>
    `}).join("");
  }

  openRetrospectiveModal(id = null) {
    this.editingRetrospectiveId = id;
    const modal = document.getElementById("retrospectiveModal");
    const title = document.getElementById("retrospectiveModalTitle");
    const form = document.getElementById("retrospectiveForm");

    form.reset();
    document.getElementById("retrospectiveDate").value = new Date().toISOString().split("T")[0];

    if (id) {
      title.textContent = "Edit Retrospective";
      const retro = this.retrospectives.find(r => r.id === id);
      if (retro) {
        document.getElementById("retrospectiveTitle").value = retro.title;
        document.getElementById("retrospectiveDate").value = retro.date;
        document.getElementById("retrospectiveStatus").value = retro.status;
        document.getElementById("retrospectiveContinue").value = retro.continue.join("\n");
        document.getElementById("retrospectiveStop").value = retro.stop.join("\n");
        document.getElementById("retrospectiveStart").value = retro.start.join("\n");
      }
    } else {
      title.textContent = "Add Retrospective";
    }

    modal.classList.remove("hidden");
    modal.classList.add("flex");
  }

  closeRetrospectiveModal() {
    const modal = document.getElementById("retrospectiveModal");
    modal.classList.add("hidden");
    modal.classList.remove("flex");
    this.editingRetrospectiveId = null;
  }

  async saveRetrospective(e) {
    e.preventDefault();
    const parseItems = (text) => text.split("\n").map(s => s.trim()).filter(s => s);
    const data = {
      title: document.getElementById("retrospectiveTitle").value,
      date: document.getElementById("retrospectiveDate").value,
      status: document.getElementById("retrospectiveStatus").value,
      continue: parseItems(document.getElementById("retrospectiveContinue").value),
      stop: parseItems(document.getElementById("retrospectiveStop").value),
      start: parseItems(document.getElementById("retrospectiveStart").value),
    };

    try {
      if (this.editingRetrospectiveId) {
        await RetrospectivesAPI.update(this.editingRetrospectiveId, data);
      } else {
        await RetrospectivesAPI.create(data);
      }
      this.closeRetrospectiveModal();
      await this.loadRetrospectives();
    } catch (error) {
      console.error("Error saving retrospective:", error);
    }
  }

  async deleteRetrospective(id) {
    if (!confirm("Delete this retrospective?")) return;
    try {
      await RetrospectivesAPI.delete(id);
      await this.loadRetrospectives();
    } catch (error) {
      console.error("Error deleting retrospective:", error);
    }
  }

  // SWOT Analysis functionality
  async loadSwotAnalyses() {
    try {
      this.swotAnalyses = await SwotAPI.fetchAll();
      this.renderSwotSelector();
      if (this.swotAnalyses.length > 0 && !this.selectedSwotId) {
        this.selectSwot(this.swotAnalyses[0].id);
      } else if (this.selectedSwotId) {
        this.selectSwot(this.selectedSwotId);
      } else {
        this.renderSwotView(null);
      }
    } catch (error) {
      console.error("Error loading SWOT analyses:", error);
    }
  }

  renderSwotSelector() {
    const selector = document.getElementById("swotSelector");
    selector.innerHTML = '<option value="">Select Analysis</option>';
    this.swotAnalyses.forEach(swot => {
      const option = document.createElement("option");
      option.value = swot.id;
      option.textContent = `${swot.title} (${swot.date})`;
      selector.appendChild(option);
    });
  }

  selectSwot(swotId) {
    this.selectedSwotId = swotId;
    const selector = document.getElementById("swotSelector");
    selector.value = swotId || "";

    const swot = this.swotAnalyses.find(s => s.id === swotId);
    this.renderSwotView(swot);

    const editBtn = document.getElementById("editSwotBtn");
    const deleteBtn = document.getElementById("deleteSwotBtn");
    if (swot) {
      editBtn.classList.remove("hidden");
      deleteBtn.classList.remove("hidden");
    } else {
      editBtn.classList.add("hidden");
      deleteBtn.classList.add("hidden");
    }
  }

  renderSwotView(swot) {
    const emptyState = document.getElementById("emptySwotState");
    const grid = document.getElementById("swotGrid");

    if (!swot) {
      emptyState.classList.remove("hidden");
      grid.classList.add("hidden");
      return;
    }

    emptyState.classList.add("hidden");
    grid.classList.remove("hidden");

    const renderItems = (items, quadrant) => {
      if (!items || items.length === 0) {
        return '<li class="text-gray-400 dark:text-gray-500 italic">No items yet</li>';
      }
      return items.map((item, idx) => `
        <li class="flex justify-between items-start group">
          <span>${this.escapeHtml(item)}</span>
          <button onclick="taskManager.removeSwotItem('${quadrant}', ${idx})" class="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500 ml-2">x</button>
        </li>
      `).join("");
    };

    document.getElementById("swotStrengths").innerHTML = renderItems(swot.strengths, "strengths");
    document.getElementById("swotWeaknesses").innerHTML = renderItems(swot.weaknesses, "weaknesses");
    document.getElementById("swotOpportunities").innerHTML = renderItems(swot.opportunities, "opportunities");
    document.getElementById("swotThreats").innerHTML = renderItems(swot.threats, "threats");
  }

  openSwotModal(id = null) {
    this.editingSwotId = id;
    const modal = document.getElementById("swotModal");
    const title = document.getElementById("swotModalTitle");
    const form = document.getElementById("swotForm");

    form.reset();
    document.getElementById("swotDate").value = new Date().toISOString().split("T")[0];

    if (id) {
      title.textContent = "Edit SWOT Analysis";
      const swot = this.swotAnalyses.find(s => s.id === id);
      if (swot) {
        document.getElementById("swotTitle").value = swot.title;
        document.getElementById("swotDate").value = swot.date;
      }
    } else {
      title.textContent = "New SWOT Analysis";
    }

    modal.classList.remove("hidden");
    modal.classList.add("flex");
  }

  closeSwotModal() {
    const modal = document.getElementById("swotModal");
    modal.classList.add("hidden");
    modal.classList.remove("flex");
    this.editingSwotId = null;
  }

  async saveSwot(e) {
    e.preventDefault();
    const data = {
      title: document.getElementById("swotTitle").value,
      date: document.getElementById("swotDate").value,
    };

    try {
      if (this.editingSwotId) {
        await SwotAPI.update(this.editingSwotId, data);
      } else {
        const response = await SwotAPI.create(data);
        const result = await response.json();
        this.selectedSwotId = result.id;
      }
      this.closeSwotModal();
      await this.loadSwotAnalyses();
    } catch (error) {
      console.error("Error saving SWOT:", error);
    }
  }

  editSelectedSwot() {
    if (this.selectedSwotId) {
      this.openSwotModal(this.selectedSwotId);
    }
  }

  async deleteSelectedSwot() {
    if (!this.selectedSwotId) return;
    if (!confirm("Delete this SWOT analysis?")) return;
    try {
      await SwotAPI.delete(this.selectedSwotId);
      this.selectedSwotId = null;
      await this.loadSwotAnalyses();
    } catch (error) {
      console.error("Error deleting SWOT:", error);
    }
  }

  openSwotItemModal(quadrant) {
    this.swotItemQuadrant = quadrant;
    const modal = document.getElementById("swotItemModal");
    const title = document.getElementById("swotItemModalTitle");
    const quadrantNames = { strengths: "Strength", weaknesses: "Weakness", opportunities: "Opportunity", threats: "Threat" };
    title.textContent = `Add ${quadrantNames[quadrant]}`;
    document.getElementById("swotItemText").value = "";
    modal.classList.remove("hidden");
    modal.classList.add("flex");
    document.getElementById("swotItemText").focus();
  }

  closeSwotItemModal() {
    const modal = document.getElementById("swotItemModal");
    modal.classList.add("hidden");
    modal.classList.remove("flex");
    this.swotItemQuadrant = null;
  }

  async saveSwotItem(e) {
    e.preventDefault();
    if (!this.selectedSwotId || !this.swotItemQuadrant) return;

    const text = document.getElementById("swotItemText").value.trim();
    if (!text) return;

    const swot = this.swotAnalyses.find(s => s.id === this.selectedSwotId);
    if (!swot) return;

    swot[this.swotItemQuadrant].push(text);

    try {
      await SwotAPI.update(this.selectedSwotId, swot);
      this.closeSwotItemModal();
      this.renderSwotView(swot);
    } catch (error) {
      console.error("Error saving SWOT item:", error);
    }
  }

  async removeSwotItem(quadrant, index) {
    if (!this.selectedSwotId) return;
    const swot = this.swotAnalyses.find(s => s.id === this.selectedSwotId);
    if (!swot) return;

    swot[quadrant].splice(index, 1);

    try {
      await SwotAPI.update(this.selectedSwotId, swot);
      this.renderSwotView(swot);
    } catch (error) {
      console.error("Error removing SWOT item:", error);
    }
  }

  // Risk Analysis functionality
  async loadRiskAnalyses() {
    try {
      this.riskAnalyses = await RiskAnalysisAPI.fetchAll();
      this.renderRiskAnalysisSelector();
      if (this.riskAnalyses.length > 0 && !this.selectedRiskId) {
        this.selectRiskAnalysis(this.riskAnalyses[0].id);
      } else if (this.selectedRiskId) {
        this.selectRiskAnalysis(this.selectedRiskId);
      } else {
        this.renderRiskAnalysisView(null);
      }
    } catch (error) {
      console.error("Error loading risk analyses:", error);
    }
  }

  renderRiskAnalysisSelector() {
    const selector = document.getElementById("riskAnalysisSelector");
    selector.innerHTML = '<option value="">Select Analysis</option>';
    this.riskAnalyses.forEach(risk => {
      const option = document.createElement("option");
      option.value = risk.id;
      option.textContent = `${risk.title} (${risk.date})`;
      selector.appendChild(option);
    });
  }

  selectRiskAnalysis(riskId) {
    this.selectedRiskId = riskId;
    const selector = document.getElementById("riskAnalysisSelector");
    selector.value = riskId || "";

    const risk = this.riskAnalyses.find(r => r.id === riskId);
    this.renderRiskAnalysisView(risk);

    const editBtn = document.getElementById("editRiskAnalysisBtn");
    const deleteBtn = document.getElementById("deleteRiskAnalysisBtn");
    if (risk) {
      editBtn.classList.remove("hidden");
      deleteBtn.classList.remove("hidden");
    } else {
      editBtn.classList.add("hidden");
      deleteBtn.classList.add("hidden");
    }
  }

  renderRiskAnalysisView(risk) {
    const emptyState = document.getElementById("emptyRiskAnalysisState");
    const grid = document.getElementById("riskAnalysisGrid");

    if (!risk) {
      emptyState.classList.remove("hidden");
      grid.classList.add("hidden");
      return;
    }

    emptyState.classList.add("hidden");
    grid.classList.remove("hidden");

    const quadrants = [
      { id: "highImpactHighProb", el: "riskHighImpactHighProb" },
      { id: "highImpactLowProb", el: "riskHighImpactLowProb" },
      { id: "lowImpactHighProb", el: "riskLowImpactHighProb" },
      { id: "lowImpactLowProb", el: "riskLowImpactLowProb" },
    ];

    quadrants.forEach(({ id, el }) => {
      const ul = document.getElementById(el);
      ul.innerHTML = (risk[id] || []).map((item, idx) => `
        <li class="flex justify-between items-start group">
          <span>${item}</span>
          <button onclick="app.removeRiskAnalysisItem('${id}', ${idx})" class="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500 ml-2">
            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
          </button>
        </li>
      `).join("");
    });
  }

  openRiskAnalysisModal(id = null) {
    this.editingRiskId = id;
    const modal = document.getElementById("riskAnalysisModal");
    const title = document.getElementById("riskAnalysisModalTitle");
    document.getElementById("riskAnalysisTitle").value = "";
    document.getElementById("riskAnalysisDate").value = new Date().toISOString().split("T")[0];

    if (id) {
      title.textContent = "Edit Risk Analysis";
      const risk = this.riskAnalyses.find(r => r.id === id);
      if (risk) {
        document.getElementById("riskAnalysisTitle").value = risk.title;
        document.getElementById("riskAnalysisDate").value = risk.date;
      }
    } else {
      title.textContent = "New Risk Analysis";
    }

    modal.classList.remove("hidden");
    modal.classList.add("flex");
    document.getElementById("riskAnalysisTitle").focus();
  }

  closeRiskAnalysisModal() {
    const modal = document.getElementById("riskAnalysisModal");
    modal.classList.add("hidden");
    modal.classList.remove("flex");
    this.editingRiskId = null;
  }

  async saveRiskAnalysis(e) {
    e.preventDefault();
    const title = document.getElementById("riskAnalysisTitle").value.trim();
    const date = document.getElementById("riskAnalysisDate").value;

    if (!title) return;

    try {
      if (this.editingRiskId) {
        const risk = this.riskAnalyses.find(r => r.id === this.editingRiskId);
        await RiskAnalysisAPI.update(this.editingRiskId, { ...risk, title, date });
      } else {
        await RiskAnalysisAPI.create({ title, date });
      }
      this.closeRiskAnalysisModal();
      await this.loadRiskAnalyses();
    } catch (error) {
      console.error("Error saving risk analysis:", error);
    }
  }

  editSelectedRiskAnalysis() {
    if (this.selectedRiskId) {
      this.openRiskAnalysisModal(this.selectedRiskId);
    }
  }

  async deleteSelectedRiskAnalysis() {
    if (!this.selectedRiskId) return;
    if (!confirm("Delete this risk analysis?")) return;
    try {
      await RiskAnalysisAPI.delete(this.selectedRiskId);
      this.selectedRiskId = null;
      await this.loadRiskAnalyses();
    } catch (error) {
      console.error("Error deleting risk analysis:", error);
    }
  }

  openRiskAnalysisItemModal(quadrant) {
    this.riskItemQuadrant = quadrant;
    const modal = document.getElementById("riskAnalysisItemModal");
    const title = document.getElementById("riskAnalysisItemModalTitle");
    const quadrantNames = {
      highImpactHighProb: "High Impact / High Probability",
      highImpactLowProb: "High Impact / Low Probability",
      lowImpactHighProb: "Low Impact / High Probability",
      lowImpactLowProb: "Low Impact / Low Probability"
    };
    title.textContent = `Add Risk: ${quadrantNames[quadrant]}`;
    document.getElementById("riskAnalysisItemText").value = "";
    modal.classList.remove("hidden");
    modal.classList.add("flex");
    document.getElementById("riskAnalysisItemText").focus();
  }

  closeRiskAnalysisItemModal() {
    const modal = document.getElementById("riskAnalysisItemModal");
    modal.classList.add("hidden");
    modal.classList.remove("flex");
    this.riskItemQuadrant = null;
  }

  async saveRiskAnalysisItem(e) {
    e.preventDefault();
    if (!this.selectedRiskId || !this.riskItemQuadrant) return;

    const text = document.getElementById("riskAnalysisItemText").value.trim();
    if (!text) return;

    const risk = this.riskAnalyses.find(r => r.id === this.selectedRiskId);
    if (!risk) return;

    risk[this.riskItemQuadrant].push(text);

    try {
      await RiskAnalysisAPI.update(this.selectedRiskId, risk);
      this.closeRiskAnalysisItemModal();
      this.renderRiskAnalysisView(risk);
    } catch (error) {
      console.error("Error saving risk item:", error);
    }
  }

  async removeRiskAnalysisItem(quadrant, index) {
    if (!this.selectedRiskId) return;
    const risk = this.riskAnalyses.find(r => r.id === this.selectedRiskId);
    if (!risk) return;

    risk[quadrant].splice(index, 1);

    try {
      await RiskAnalysisAPI.update(this.selectedRiskId, risk);
      this.renderRiskAnalysisView(risk);
    } catch (error) {
      console.error("Error removing risk item:", error);
    }
  }

  // Lean Canvas functionality
  async loadLeanCanvases() {
    try {
      this.leanCanvases = await LeanCanvasAPI.fetchAll();
      this.renderLeanCanvasSelector();
      if (this.leanCanvases.length > 0 && !this.selectedLeanCanvasId) {
        this.selectLeanCanvas(this.leanCanvases[0].id);
      } else if (this.selectedLeanCanvasId) {
        this.selectLeanCanvas(this.selectedLeanCanvasId);
      } else {
        this.renderLeanCanvasView(null);
      }
    } catch (error) {
      console.error("Error loading lean canvases:", error);
    }
  }

  renderLeanCanvasSelector() {
    const selector = document.getElementById("leanCanvasSelector");
    selector.innerHTML = '<option value="">Select Canvas</option>';
    this.leanCanvases.forEach(canvas => {
      const option = document.createElement("option");
      option.value = canvas.id;
      option.textContent = `${canvas.title} (${canvas.date})`;
      selector.appendChild(option);
    });
  }

  selectLeanCanvas(canvasId) {
    this.selectedLeanCanvasId = canvasId;
    const selector = document.getElementById("leanCanvasSelector");
    selector.value = canvasId || "";

    const canvas = this.leanCanvases.find(c => c.id === canvasId);
    this.renderLeanCanvasView(canvas);

    const editBtn = document.getElementById("editLeanCanvasBtn");
    const deleteBtn = document.getElementById("deleteLeanCanvasBtn");
    if (canvas) {
      editBtn.classList.remove("hidden");
      deleteBtn.classList.remove("hidden");
    } else {
      editBtn.classList.add("hidden");
      deleteBtn.classList.add("hidden");
    }
  }

  renderLeanCanvasView(canvas) {
    const emptyState = document.getElementById("emptyLeanCanvasState");
    const grid = document.getElementById("leanCanvasGrid");

    if (!canvas) {
      emptyState.classList.remove("hidden");
      grid.classList.add("hidden");
      return;
    }

    emptyState.classList.add("hidden");
    grid.classList.remove("hidden");

    const sections = [
      { key: "problem", el: "leanProblem" },
      { key: "solution", el: "leanSolution" },
      { key: "uniqueValueProp", el: "leanUniqueValueProp" },
      { key: "unfairAdvantage", el: "leanUnfairAdvantage" },
      { key: "customerSegments", el: "leanCustomerSegments" },
      { key: "existingAlternatives", el: "leanExistingAlternatives" },
      { key: "keyMetrics", el: "leanKeyMetrics" },
      { key: "highLevelConcept", el: "leanHighLevelConcept" },
      { key: "channels", el: "leanChannels" },
      { key: "earlyAdopters", el: "leanEarlyAdopters" },
      { key: "costStructure", el: "leanCostStructure" },
      { key: "revenueStreams", el: "leanRevenueStreams" },
    ];

    sections.forEach(({ key, el }) => {
      const ul = document.getElementById(el);
      ul.innerHTML = (canvas[key] || []).map((item, idx) => `
        <li class="flex justify-between items-start group">
          <span class="break-words flex-1">${item}</span>
          <button onclick="app.removeLeanCanvasItem('${key}', ${idx})" class="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500 ml-1 flex-shrink-0">
            <svg class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
          </button>
        </li>
      `).join("");
    });
  }

  openLeanCanvasModal(id = null) {
    this.editingLeanCanvasId = id;
    const modal = document.getElementById("leanCanvasModal");
    const title = document.getElementById("leanCanvasModalTitle");
    document.getElementById("leanCanvasTitle").value = "";
    document.getElementById("leanCanvasDate").value = new Date().toISOString().split("T")[0];

    if (id) {
      title.textContent = "Edit Lean Canvas";
      const canvas = this.leanCanvases.find(c => c.id === id);
      if (canvas) {
        document.getElementById("leanCanvasTitle").value = canvas.title;
        document.getElementById("leanCanvasDate").value = canvas.date;
      }
    } else {
      title.textContent = "New Lean Canvas";
    }

    modal.classList.remove("hidden");
    modal.classList.add("flex");
    document.getElementById("leanCanvasTitle").focus();
  }

  closeLeanCanvasModal() {
    const modal = document.getElementById("leanCanvasModal");
    modal.classList.add("hidden");
    modal.classList.remove("flex");
    this.editingLeanCanvasId = null;
  }

  async saveLeanCanvas(e) {
    e.preventDefault();
    const title = document.getElementById("leanCanvasTitle").value.trim();
    const date = document.getElementById("leanCanvasDate").value;

    if (!title) return;

    try {
      if (this.editingLeanCanvasId) {
        const canvas = this.leanCanvases.find(c => c.id === this.editingLeanCanvasId);
        await LeanCanvasAPI.update(this.editingLeanCanvasId, { ...canvas, title, date });
      } else {
        await LeanCanvasAPI.create({ title, date });
      }
      this.closeLeanCanvasModal();
      await this.loadLeanCanvases();
    } catch (error) {
      console.error("Error saving lean canvas:", error);
    }
  }

  editSelectedLeanCanvas() {
    if (this.selectedLeanCanvasId) {
      this.openLeanCanvasModal(this.selectedLeanCanvasId);
    }
  }

  async deleteSelectedLeanCanvas() {
    if (!this.selectedLeanCanvasId) return;
    if (!confirm("Delete this Lean Canvas?")) return;
    try {
      await LeanCanvasAPI.delete(this.selectedLeanCanvasId);
      this.selectedLeanCanvasId = null;
      await this.loadLeanCanvases();
    } catch (error) {
      console.error("Error deleting lean canvas:", error);
    }
  }

  openLeanCanvasItemModal(section) {
    this.leanCanvasSection = section;
    const modal = document.getElementById("leanCanvasItemModal");
    const title = document.getElementById("leanCanvasItemModalTitle");
    const sectionNames = {
      problem: "Problem",
      solution: "Solution",
      uniqueValueProp: "Unique Value Proposition",
      unfairAdvantage: "Unfair Advantage",
      customerSegments: "Customer Segments",
      existingAlternatives: "Existing Alternatives",
      keyMetrics: "Key Metrics",
      highLevelConcept: "High-Level Concept",
      channels: "Channels",
      earlyAdopters: "Early Adopters",
      costStructure: "Cost Structure",
      revenueStreams: "Revenue Streams"
    };
    title.textContent = `Add ${sectionNames[section]}`;
    document.getElementById("leanCanvasItemText").value = "";
    modal.classList.remove("hidden");
    modal.classList.add("flex");
    document.getElementById("leanCanvasItemText").focus();
  }

  closeLeanCanvasItemModal() {
    const modal = document.getElementById("leanCanvasItemModal");
    modal.classList.add("hidden");
    modal.classList.remove("flex");
    this.leanCanvasSection = null;
  }

  async saveLeanCanvasItem(e) {
    e.preventDefault();
    if (!this.selectedLeanCanvasId || !this.leanCanvasSection) return;

    const text = document.getElementById("leanCanvasItemText").value.trim();
    if (!text) return;

    const canvas = this.leanCanvases.find(c => c.id === this.selectedLeanCanvasId);
    if (!canvas) return;

    canvas[this.leanCanvasSection].push(text);

    try {
      await LeanCanvasAPI.update(this.selectedLeanCanvasId, canvas);
      this.closeLeanCanvasItemModal();
      this.renderLeanCanvasView(canvas);
    } catch (error) {
      console.error("Error saving lean canvas item:", error);
    }
  }

  async removeLeanCanvasItem(section, index) {
    if (!this.selectedLeanCanvasId) return;
    const canvas = this.leanCanvases.find(c => c.id === this.selectedLeanCanvasId);
    if (!canvas) return;

    canvas[section].splice(index, 1);

    try {
      await LeanCanvasAPI.update(this.selectedLeanCanvasId, canvas);
      this.renderLeanCanvasView(canvas);
    } catch (error) {
      console.error("Error removing lean canvas item:", error);
    }
  }

  // Business Model Canvas functionality
  async loadBusinessModelCanvases() {
    try {
      this.businessModelCanvases = await BusinessModelAPI.fetchAll();
      this.renderBusinessModelSelector();
      if (this.businessModelCanvases.length > 0 && !this.selectedBusinessModelId) {
        this.selectBusinessModel(this.businessModelCanvases[0].id);
      } else if (this.selectedBusinessModelId) {
        this.selectBusinessModel(this.selectedBusinessModelId);
      } else {
        this.renderBusinessModelView(null);
      }
    } catch (error) {
      console.error("Error loading business model canvases:", error);
    }
  }

  renderBusinessModelSelector() {
    const selector = document.getElementById("businessModelSelector");
    selector.innerHTML = '<option value="">Select Canvas</option>';
    this.businessModelCanvases.forEach(canvas => {
      const option = document.createElement("option");
      option.value = canvas.id;
      option.textContent = `${canvas.title} (${canvas.date})`;
      selector.appendChild(option);
    });
  }

  selectBusinessModel(canvasId) {
    this.selectedBusinessModelId = canvasId;
    const selector = document.getElementById("businessModelSelector");
    selector.value = canvasId || "";

    const canvas = this.businessModelCanvases.find(c => c.id === canvasId);
    this.renderBusinessModelView(canvas);

    const editBtn = document.getElementById("editBusinessModelBtn");
    const deleteBtn = document.getElementById("deleteBusinessModelBtn");
    if (canvas) {
      editBtn.classList.remove("hidden");
      deleteBtn.classList.remove("hidden");
    } else {
      editBtn.classList.add("hidden");
      deleteBtn.classList.add("hidden");
    }
  }

  renderBusinessModelView(canvas) {
    const emptyState = document.getElementById("emptyBusinessModelState");
    const grid = document.getElementById("businessModelGrid");

    if (!canvas) {
      emptyState.classList.remove("hidden");
      grid.classList.add("hidden");
      return;
    }

    emptyState.classList.add("hidden");
    grid.classList.remove("hidden");

    const sections = [
      { key: "keyPartners", el: "bmcKeyPartners" },
      { key: "keyActivities", el: "bmcKeyActivities" },
      { key: "keyResources", el: "bmcKeyResources" },
      { key: "valueProposition", el: "bmcValueProposition" },
      { key: "customerRelationships", el: "bmcCustomerRelationships" },
      { key: "channels", el: "bmcChannels" },
      { key: "customerSegments", el: "bmcCustomerSegments" },
      { key: "costStructure", el: "bmcCostStructure" },
      { key: "revenueStreams", el: "bmcRevenueStreams" },
    ];

    sections.forEach(({ key, el }) => {
      const ul = document.getElementById(el);
      ul.innerHTML = (canvas[key] || []).map((item, idx) => `
        <li class="flex justify-between items-start group">
          <span class="break-words flex-1">${item}</span>
          <button onclick="app.removeBusinessModelItem('${key}', ${idx})" class="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500 ml-1 flex-shrink-0">
            <svg class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
          </button>
        </li>
      `).join("");
    });
  }

  openBusinessModelModal(id = null) {
    this.editingBusinessModelId = id;
    const modal = document.getElementById("businessModelModal");
    const title = document.getElementById("businessModelModalTitle");
    document.getElementById("businessModelTitle").value = "";
    document.getElementById("businessModelDate").value = new Date().toISOString().split("T")[0];

    if (id) {
      title.textContent = "Edit Business Model Canvas";
      const canvas = this.businessModelCanvases.find(c => c.id === id);
      if (canvas) {
        document.getElementById("businessModelTitle").value = canvas.title;
        document.getElementById("businessModelDate").value = canvas.date;
      }
    } else {
      title.textContent = "New Business Model Canvas";
    }

    modal.classList.remove("hidden");
    modal.classList.add("flex");
    document.getElementById("businessModelTitle").focus();
  }

  closeBusinessModelModal() {
    const modal = document.getElementById("businessModelModal");
    modal.classList.add("hidden");
    modal.classList.remove("flex");
    this.editingBusinessModelId = null;
  }

  async saveBusinessModel(e) {
    e.preventDefault();
    const title = document.getElementById("businessModelTitle").value.trim();
    const date = document.getElementById("businessModelDate").value;

    if (!title) return;

    try {
      if (this.editingBusinessModelId) {
        const canvas = this.businessModelCanvases.find(c => c.id === this.editingBusinessModelId);
        await BusinessModelAPI.update(this.editingBusinessModelId, { ...canvas, title, date });
      } else {
        await BusinessModelAPI.create({ title, date });
      }
      this.closeBusinessModelModal();
      await this.loadBusinessModelCanvases();
    } catch (error) {
      console.error("Error saving business model canvas:", error);
    }
  }

  editSelectedBusinessModel() {
    if (this.selectedBusinessModelId) {
      this.openBusinessModelModal(this.selectedBusinessModelId);
    }
  }

  async deleteSelectedBusinessModel() {
    if (!this.selectedBusinessModelId) return;
    if (!confirm("Delete this Business Model Canvas?")) return;
    try {
      await BusinessModelAPI.delete(this.selectedBusinessModelId);
      this.selectedBusinessModelId = null;
      await this.loadBusinessModelCanvases();
    } catch (error) {
      console.error("Error deleting business model canvas:", error);
    }
  }

  openBusinessModelItemModal(section) {
    this.businessModelSection = section;
    const modal = document.getElementById("businessModelItemModal");
    const title = document.getElementById("businessModelItemModalTitle");
    const sectionNames = {
      keyPartners: "Key Partners",
      keyActivities: "Key Activities",
      keyResources: "Key Resources",
      valueProposition: "Value Proposition",
      customerRelationships: "Customer Relationships",
      channels: "Channels",
      customerSegments: "Customer Segments",
      costStructure: "Cost Structure",
      revenueStreams: "Revenue Streams"
    };
    title.textContent = `Add ${sectionNames[section]}`;
    document.getElementById("businessModelItemText").value = "";
    modal.classList.remove("hidden");
    modal.classList.add("flex");
    document.getElementById("businessModelItemText").focus();
  }

  closeBusinessModelItemModal() {
    const modal = document.getElementById("businessModelItemModal");
    modal.classList.add("hidden");
    modal.classList.remove("flex");
    this.businessModelSection = null;
  }

  async saveBusinessModelItem(e) {
    e.preventDefault();
    if (!this.selectedBusinessModelId || !this.businessModelSection) return;

    const text = document.getElementById("businessModelItemText").value.trim();
    if (!text) return;

    const canvas = this.businessModelCanvases.find(c => c.id === this.selectedBusinessModelId);
    if (!canvas) return;

    canvas[this.businessModelSection].push(text);

    try {
      await BusinessModelAPI.update(this.selectedBusinessModelId, canvas);
      this.closeBusinessModelItemModal();
      this.renderBusinessModelView(canvas);
    } catch (error) {
      console.error("Error saving business model item:", error);
    }
  }

  async removeBusinessModelItem(section, index) {
    if (!this.selectedBusinessModelId) return;
    const canvas = this.businessModelCanvases.find(c => c.id === this.selectedBusinessModelId);
    if (!canvas) return;

    canvas[section].splice(index, 1);

    try {
      await BusinessModelAPI.update(this.selectedBusinessModelId, canvas);
      this.renderBusinessModelView(canvas);
    } catch (error) {
      console.error("Error removing business model item:", error);
    }
  }

  // Project Value Board functionality
  async loadProjectValueBoards() {
    try {
      this.projectValueBoards = await ProjectValueAPI.fetchAll();
      this.renderProjectValueSelector();
      if (this.projectValueBoards.length > 0 && !this.selectedProjectValueId) {
        this.selectProjectValue(this.projectValueBoards[0].id);
      } else if (this.selectedProjectValueId) {
        this.selectProjectValue(this.selectedProjectValueId);
      } else {
        this.renderProjectValueView(null);
      }
    } catch (error) {
      console.error("Error loading project value boards:", error);
    }
  }

  renderProjectValueSelector() {
    const selector = document.getElementById("projectValueSelector");
    selector.innerHTML = '<option value="">Select Board</option>';
    this.projectValueBoards.forEach(board => {
      const option = document.createElement("option");
      option.value = board.id;
      option.textContent = `${board.title} (${board.date})`;
      selector.appendChild(option);
    });
  }

  selectProjectValue(boardId) {
    this.selectedProjectValueId = boardId;
    const selector = document.getElementById("projectValueSelector");
    selector.value = boardId || "";

    const board = this.projectValueBoards.find(b => b.id === boardId);
    this.renderProjectValueView(board);

    const editBtn = document.getElementById("editProjectValueBtn");
    const deleteBtn = document.getElementById("deleteProjectValueBtn");
    if (board) {
      editBtn.classList.remove("hidden");
      deleteBtn.classList.remove("hidden");
    } else {
      editBtn.classList.add("hidden");
      deleteBtn.classList.add("hidden");
    }
  }

  renderProjectValueView(board) {
    const emptyState = document.getElementById("emptyProjectValueState");
    const grid = document.getElementById("projectValueGrid");

    if (!board) {
      emptyState.classList.remove("hidden");
      grid.classList.add("hidden");
      return;
    }

    emptyState.classList.add("hidden");
    grid.classList.remove("hidden");

    const sections = [
      { key: "customerSegments", el: "pvbCustomerSegments" },
      { key: "problem", el: "pvbProblem" },
      { key: "solution", el: "pvbSolution" },
      { key: "benefit", el: "pvbBenefit" },
    ];

    sections.forEach(({ key, el }) => {
      const ul = document.getElementById(el);
      ul.innerHTML = (board[key] || []).map((item, idx) => `
        <li class="flex justify-between items-start group">
          <span class="break-words flex-1">${item}</span>
          <button onclick="app.removeProjectValueItem('${key}', ${idx})" class="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500 ml-1 flex-shrink-0">
            <svg class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
          </button>
        </li>
      `).join("");
    });
  }

  openProjectValueModal(id = null) {
    this.editingProjectValueId = id;
    const modal = document.getElementById("projectValueModal");
    const title = document.getElementById("projectValueModalTitle");
    document.getElementById("projectValueTitle").value = "";
    document.getElementById("projectValueDate").value = new Date().toISOString().split("T")[0];

    if (id) {
      title.textContent = "Edit Project Value Board";
      const board = this.projectValueBoards.find(b => b.id === id);
      if (board) {
        document.getElementById("projectValueTitle").value = board.title;
        document.getElementById("projectValueDate").value = board.date;
      }
    } else {
      title.textContent = "New Project Value Board";
    }

    modal.classList.remove("hidden");
    modal.classList.add("flex");
    document.getElementById("projectValueTitle").focus();
  }

  closeProjectValueModal() {
    const modal = document.getElementById("projectValueModal");
    modal.classList.add("hidden");
    modal.classList.remove("flex");
    this.editingProjectValueId = null;
  }

  async saveProjectValue(e) {
    e.preventDefault();
    const title = document.getElementById("projectValueTitle").value.trim();
    const date = document.getElementById("projectValueDate").value;

    if (!title) return;

    try {
      if (this.editingProjectValueId) {
        const board = this.projectValueBoards.find(b => b.id === this.editingProjectValueId);
        await ProjectValueAPI.update(this.editingProjectValueId, { ...board, title, date });
      } else {
        await ProjectValueAPI.create({ title, date });
      }
      this.closeProjectValueModal();
      await this.loadProjectValueBoards();
    } catch (error) {
      console.error("Error saving project value board:", error);
    }
  }

  editSelectedProjectValue() {
    if (this.selectedProjectValueId) {
      this.openProjectValueModal(this.selectedProjectValueId);
    }
  }

  async deleteSelectedProjectValue() {
    if (!this.selectedProjectValueId) return;
    if (!confirm("Delete this Project Value Board?")) return;
    try {
      await ProjectValueAPI.delete(this.selectedProjectValueId);
      this.selectedProjectValueId = null;
      await this.loadProjectValueBoards();
    } catch (error) {
      console.error("Error deleting project value board:", error);
    }
  }

  openProjectValueItemModal(section) {
    this.projectValueSection = section;
    const modal = document.getElementById("projectValueItemModal");
    const title = document.getElementById("projectValueItemModalTitle");
    const sectionNames = {
      customerSegments: "Customer Segments",
      problem: "Problem",
      solution: "Solution",
      benefit: "Benefit"
    };
    title.textContent = `Add ${sectionNames[section]}`;
    document.getElementById("projectValueItemText").value = "";
    modal.classList.remove("hidden");
    modal.classList.add("flex");
    document.getElementById("projectValueItemText").focus();
  }

  closeProjectValueItemModal() {
    const modal = document.getElementById("projectValueItemModal");
    modal.classList.add("hidden");
    modal.classList.remove("flex");
    this.projectValueSection = null;
  }

  async saveProjectValueItem(e) {
    e.preventDefault();
    if (!this.selectedProjectValueId || !this.projectValueSection) return;

    const text = document.getElementById("projectValueItemText").value.trim();
    if (!text) return;

    const board = this.projectValueBoards.find(b => b.id === this.selectedProjectValueId);
    if (!board) return;

    board[this.projectValueSection].push(text);

    try {
      await ProjectValueAPI.update(this.selectedProjectValueId, board);
      this.closeProjectValueItemModal();
      this.renderProjectValueView(board);
    } catch (error) {
      console.error("Error saving project value item:", error);
    }
  }

  async removeProjectValueItem(section, index) {
    if (!this.selectedProjectValueId) return;
    const board = this.projectValueBoards.find(b => b.id === this.selectedProjectValueId);
    if (!board) return;

    board[section].splice(index, 1);

    try {
      await ProjectValueAPI.update(this.selectedProjectValueId, board);
      this.renderProjectValueView(board);
    } catch (error) {
      console.error("Error removing project value item:", error);
    }
  }

  // Brief functionality
  async loadBriefs() {
    try {
      this.briefs = await BriefAPI.fetchAll();
      this.renderBriefSelector();
      if (this.briefs.length > 0 && !this.selectedBriefId) {
        this.selectBrief(this.briefs[0].id);
      } else if (this.selectedBriefId) {
        this.selectBrief(this.selectedBriefId);
      }
    } catch (error) {
      console.error("Error loading briefs:", error);
    }
  }

  renderBriefSelector() {
    const selector = document.getElementById("briefSelector");
    if (!selector) return;
    selector.innerHTML = '<option value="">Select Brief</option>';
    this.briefs.forEach(brief => {
      const option = document.createElement("option");
      option.value = brief.id;
      option.textContent = `${brief.title} (${brief.date})`;
      if (brief.id === this.selectedBriefId) option.selected = true;
      selector.appendChild(option);
    });
  }

  selectBrief(briefId) {
    this.selectedBriefId = briefId;
    const selector = document.getElementById("briefSelector");
    if (selector) selector.value = briefId || "";

    const brief = this.briefs.find(b => b.id === briefId);
    const editBtn = document.getElementById("editBriefBtn");
    const deleteBtn = document.getElementById("deleteBriefBtn");

    if (brief) {
      editBtn?.classList.remove("hidden");
      deleteBtn?.classList.remove("hidden");
      this.renderBriefGrid(brief);
    } else {
      editBtn?.classList.add("hidden");
      deleteBtn?.classList.add("hidden");
      document.getElementById("briefGrid")?.classList.add("hidden");
      document.getElementById("emptyBriefState")?.classList.remove("hidden");
    }
  }

  renderBriefGrid(brief) {
    const grid = document.getElementById("briefGrid");
    const emptyState = document.getElementById("emptyBriefState");

    if (!brief) {
      grid?.classList.add("hidden");
      emptyState?.classList.remove("hidden");
      return;
    }

    grid?.classList.remove("hidden");
    emptyState?.classList.add("hidden");

    const sectionMapping = {
      summary: "briefSummary",
      mission: "briefMission",
      responsible: "briefResponsible",
      accountable: "briefAccountable",
      consulted: "briefConsulted",
      informed: "briefInformed",
      highLevelBudget: "briefBudget",
      highLevelTimeline: "briefTimeline",
      culture: "briefCulture",
      changeCapacity: "briefChangeCapacity",
      guidingPrinciples: "briefGuidingPrinciples",
    };

    for (const [key, elementId] of Object.entries(sectionMapping)) {
      const ul = document.getElementById(elementId);
      if (!ul) continue;
      ul.innerHTML = "";
      const items = brief[key] || [];
      items.forEach((item, idx) => {
        const li = document.createElement("li");
        li.className = "group flex items-start gap-2 py-1";
        li.innerHTML = `
          <span class="flex-1 text-sm text-gray-700 dark:text-gray-300">${this.escapeHtml(item)}</span>
          <button onclick="app.removeBriefItem('${key}', ${idx})" class="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500 ml-1 flex-shrink-0">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
          </button>
        `;
        ul.appendChild(li);
      });
    }
  }

  openBriefModal(editId = null) {
    this.editingBriefId = editId;
    const modal = document.getElementById("briefModal");
    const title = document.getElementById("briefModalTitle");
    const titleInput = document.getElementById("briefTitle");
    const dateInput = document.getElementById("briefDate");

    if (editId) {
      const brief = this.briefs.find(b => b.id === editId);
      if (brief) {
        title.textContent = "Edit Brief";
        titleInput.value = brief.title;
        dateInput.value = brief.date;
      }
    } else {
      title.textContent = "New Brief";
      titleInput.value = "";
      dateInput.value = new Date().toISOString().split("T")[0];
    }
    modal?.classList.remove("hidden");
    modal?.classList.add("flex");
  }

  closeBriefModal() {
    const modal = document.getElementById("briefModal");
    modal?.classList.add("hidden");
    modal?.classList.remove("flex");
    this.editingBriefId = null;
  }

  async saveBrief(e) {
    e.preventDefault();
    const title = document.getElementById("briefTitle").value.trim();
    const date = document.getElementById("briefDate").value;

    if (!title) return;

    try {
      if (this.editingBriefId) {
        const brief = this.briefs.find(b => b.id === this.editingBriefId);
        if (brief) {
          brief.title = title;
          brief.date = date;
          await BriefAPI.update(this.editingBriefId, brief);
        }
      } else {
        const response = await BriefAPI.create({ title, date });
        const newBrief = await response.json();
        this.selectedBriefId = newBrief.id;
      }
      this.closeBriefModal();
      await this.loadBriefs();
    } catch (error) {
      console.error("Error saving brief:", error);
    }
  }

  editBrief() {
    if (this.selectedBriefId) {
      this.openBriefModal(this.selectedBriefId);
    }
  }

  async deleteBrief() {
    if (!this.selectedBriefId) return;
    if (!confirm("Are you sure you want to delete this brief?")) return;
    try {
      await BriefAPI.delete(this.selectedBriefId);
      this.selectedBriefId = null;
      await this.loadBriefs();
    } catch (error) {
      console.error("Error deleting brief:", error);
    }
  }

  openBriefItemModal(section) {
    this.briefSection = section;
    const modal = document.getElementById("briefItemModal");
    const sectionTitle = document.getElementById("briefItemSectionTitle");
    const input = document.getElementById("briefItemText");

    const sectionNames = {
      summary: "Summary",
      mission: "Mission",
      responsible: "Responsible",
      accountable: "Accountable",
      consulted: "Consulted",
      informed: "Informed",
      highLevelBudget: "High Level Budget",
      highLevelTimeline: "High Level Timeline",
      culture: "Culture",
      changeCapacity: "Change Capacity",
      guidingPrinciples: "Guiding Principles",
    };

    sectionTitle.textContent = sectionNames[section] || section;
    input.value = "";
    modal?.classList.remove("hidden");
    input.focus();
  }

  closeBriefItemModal() {
    document.getElementById("briefItemModal")?.classList.add("hidden");
    this.briefSection = null;
  }

  async saveBriefItem(e) {
    e.preventDefault();
    if (!this.selectedBriefId || !this.briefSection) return;

    const text = document.getElementById("briefItemText").value.trim();
    if (!text) return;

    const brief = this.briefs.find(b => b.id === this.selectedBriefId);
    if (!brief) return;

    brief[this.briefSection].push(text);

    try {
      await BriefAPI.update(this.selectedBriefId, brief);
      this.closeBriefItemModal();
      this.renderBriefGrid(brief);
    } catch (error) {
      console.error("Error saving brief item:", error);
    }
  }

  async removeBriefItem(section, index) {
    if (!this.selectedBriefId) return;
    const brief = this.briefs.find(b => b.id === this.selectedBriefId);
    if (!brief) return;

    brief[section].splice(index, 1);

    try {
      await BriefAPI.update(this.selectedBriefId, brief);
      this.renderBriefGrid(brief);
    } catch (error) {
      console.error("Error removing brief item:", error);
    }
  }

  // Capacity Planning functionality
  async loadCapacityPlans() {
    try {
      this.capacityPlans = await CapacityAPI.fetchAll();
      this.renderCapacityPlanSelector();
      if (this.capacityPlans.length > 0 && !this.selectedCapacityPlanId) {
        this.selectCapacityPlan(this.capacityPlans[0].id);
      } else if (this.selectedCapacityPlanId) {
        this.selectCapacityPlan(this.selectedCapacityPlanId);
      }
    } catch (error) {
      console.error("Error loading capacity plans:", error);
    }
  }

  renderCapacityPlanSelector() {
    const selector = document.getElementById("capacityPlanSelector");
    if (!selector) return;
    selector.innerHTML = '<option value="">Select Plan</option>';
    for (const plan of this.capacityPlans) {
      const option = document.createElement("option");
      option.value = plan.id;
      option.textContent = plan.title;
      if (plan.id === this.selectedCapacityPlanId) option.selected = true;
      selector.appendChild(option);
    }
  }

  selectCapacityPlan(id) {
    this.selectedCapacityPlanId = id;
    const plan = this.capacityPlans.find(p => p.id === id);
    const emptyState = document.getElementById("emptyCapacityState");
    const teamContent = document.getElementById("capacityTeamContent");
    const allocContent = document.getElementById("capacityAllocContent");
    const utilContent = document.getElementById("capacityUtilContent");
    const editBtn = document.getElementById("editCapacityPlanBtn");
    const deleteBtn = document.getElementById("deleteCapacityPlanBtn");

    if (!plan) {
      emptyState?.classList.remove("hidden");
      teamContent?.classList.add("hidden");
      allocContent?.classList.add("hidden");
      utilContent?.classList.add("hidden");
      editBtn?.classList.add("hidden");
      deleteBtn?.classList.add("hidden");
      return;
    }

    emptyState?.classList.add("hidden");
    editBtn?.classList.remove("hidden");
    deleteBtn?.classList.remove("hidden");
    this.switchCapacityTab(this.capacityTab);
  }

  switchCapacityTab(tab) {
    this.capacityTab = tab;
    const teamTab = document.getElementById("capacityTeamTab");
    const allocTab = document.getElementById("capacityAllocTab");
    const utilTab = document.getElementById("capacityUtilTab");
    const teamContent = document.getElementById("capacityTeamContent");
    const allocContent = document.getElementById("capacityAllocContent");
    const utilContent = document.getElementById("capacityUtilContent");

    [teamTab, allocTab, utilTab].forEach(t => {
      t?.classList.remove("border-gray-900", "dark:border-gray-100", "text-gray-900", "dark:text-gray-100");
      t?.classList.add("border-transparent", "text-gray-500", "dark:text-gray-400");
    });
    [teamContent, allocContent, utilContent].forEach(c => c?.classList.add("hidden"));

    if (tab === "team") {
      teamTab?.classList.add("border-gray-900", "dark:border-gray-100", "text-gray-900", "dark:text-gray-100");
      teamTab?.classList.remove("border-transparent", "text-gray-500", "dark:text-gray-400");
      teamContent?.classList.remove("hidden");
      this.renderTeamMembers();
    } else if (tab === "alloc") {
      allocTab?.classList.add("border-gray-900", "dark:border-gray-100", "text-gray-900", "dark:text-gray-100");
      allocTab?.classList.remove("border-transparent", "text-gray-500", "dark:text-gray-400");
      allocContent?.classList.remove("hidden");
      this.renderAllocationsGrid();
    } else if (tab === "util") {
      utilTab?.classList.add("border-gray-900", "dark:border-gray-100", "text-gray-900", "dark:text-gray-100");
      utilTab?.classList.remove("border-transparent", "text-gray-500", "dark:text-gray-400");
      utilContent?.classList.remove("hidden");
      this.renderUtilization();
    }
  }

  renderTeamMembers() {
    const plan = this.capacityPlans.find(p => p.id === this.selectedCapacityPlanId);
    const grid = document.getElementById("teamMembersGrid");
    if (!grid || !plan) return;

    if (plan.teamMembers.length === 0) {
      grid.innerHTML = '<div class="col-span-full text-center py-8 text-gray-500 dark:text-gray-400">No team members yet. Click "+ Add Member" to add one.</div>';
      return;
    }

    grid.innerHTML = plan.teamMembers.map(member => `
      <div class="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4 border border-gray-200 dark:border-gray-600">
        <div class="flex justify-between items-start mb-2">
          <div>
            <h4 class="font-medium text-gray-900 dark:text-gray-100">${this.escapeHtml(member.name)}</h4>
            ${member.role ? `<p class="text-sm text-gray-500 dark:text-gray-400">${this.escapeHtml(member.role)}</p>` : ''}
          </div>
          <div class="flex gap-1">
            <button onclick="taskManager.editTeamMember('${member.id}')" class="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 text-sm">Edit</button>
            <button onclick="taskManager.deleteTeamMember('${member.id}')" class="text-red-400 hover:text-red-600 text-sm">Del</button>
          </div>
        </div>
        <div class="text-sm text-gray-600 dark:text-gray-400 space-y-1">
          <div>${member.hoursPerDay}h/day</div>
          <div>${member.workingDays.join(", ")}</div>
          <div class="text-xs text-gray-500 dark:text-gray-500">${member.hoursPerDay * member.workingDays.length}h/week capacity</div>
        </div>
      </div>
    `).join("");
  }

  getWeekStart(offset = 0) {
    const now = new Date();
    const monday = new Date(now);
    monday.setDate(monday.getDate() - monday.getDay() + 1 + (offset * 7));
    return monday.toISOString().split("T")[0];
  }

  getWeekDates(weekStart) {
    const start = new Date(weekStart);
    const end = new Date(start);
    end.setDate(end.getDate() + 6);
    const format = (d) => `${d.getMonth() + 1}/${d.getDate()}`;
    return `${format(start)} - ${format(end)}`;
  }

  changeAllocWeek(delta) {
    this.allocWeekOffset += delta;
    this.renderAllocationsGrid();
  }

  renderAllocationsGrid() {
    const plan = this.capacityPlans.find(p => p.id === this.selectedCapacityPlanId);
    const header = document.getElementById("allocationsHeader");
    const body = document.getElementById("allocationsBody");
    const weekRange = document.getElementById("allocWeekRange");
    if (!header || !body || !plan) return;

    // Generate 4 weeks of columns
    const weeks = [];
    for (let i = 0; i < 4; i++) {
      weeks.push(this.getWeekStart(this.allocWeekOffset + i));
    }

    const currentWeek = this.getWeekStart(this.allocWeekOffset);
    weekRange.textContent = this.getWeekDates(currentWeek);

    header.innerHTML = `
      <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Member</th>
      ${weeks.map(w => `<th class="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">${this.getWeekDates(w)}</th>`).join("")}
    `;

    if (plan.teamMembers.length === 0) {
      body.innerHTML = '<tr><td colspan="5" class="px-4 py-8 text-center text-gray-500 dark:text-gray-400">No team members. Add members in the Team tab first.</td></tr>';
      return;
    }

    body.innerHTML = plan.teamMembers.map(member => {
      const weeklyCapacity = member.hoursPerDay * member.workingDays.length;
      return `
        <tr>
          <td class="px-4 py-3 whitespace-nowrap">
            <div class="text-sm font-medium text-gray-900 dark:text-gray-100">${this.escapeHtml(member.name)}</div>
            <div class="text-xs text-gray-500 dark:text-gray-400">${weeklyCapacity}h/week</div>
          </td>
          ${weeks.map(week => {
            const allocs = plan.allocations.filter(a => a.memberId === member.id && a.weekStart === week);
            const totalHours = allocs.reduce((sum, a) => sum + a.allocatedHours, 0);
            const utilPct = weeklyCapacity > 0 ? (totalHours / weeklyCapacity) * 100 : 0;
            let bgClass = "bg-green-100 dark:bg-green-900/30 border-green-300 dark:border-green-700";
            if (utilPct >= 100) bgClass = "bg-red-100 dark:bg-red-900/30 border-red-300 dark:border-red-700";
            else if (utilPct >= 80) bgClass = "bg-yellow-100 dark:bg-yellow-900/30 border-yellow-300 dark:border-yellow-700";

            return `
              <td class="px-4 py-3 text-center">
                <button onclick="taskManager.openAllocationModal('${member.id}', '${week}')"
                  class="inline-block min-w-[60px] px-3 py-2 rounded border ${bgClass} text-sm font-medium text-gray-700 dark:text-gray-300 hover:opacity-80">
                  ${totalHours}h
                </button>
              </td>
            `;
          }).join("")}
        </tr>
      `;
    }).join("");
  }

  async renderUtilization() {
    const plan = this.capacityPlans.find(p => p.id === this.selectedCapacityPlanId);
    const container = document.getElementById("utilizationBars");
    if (!container || !plan) return;

    try {
      const utilization = await CapacityAPI.getUtilization(plan.id);

      if (utilization.length === 0) {
        container.innerHTML = '<div class="text-center py-8 text-gray-500 dark:text-gray-400">No team members to show utilization.</div>';
        return;
      }

      container.innerHTML = utilization.map(u => {
        const maxHours = Math.max(u.weeklyCapacity * 4, u.totalAllocated, u.actualHours);
        const capacityPct = maxHours > 0 ? (u.weeklyCapacity * 4 / maxHours) * 100 : 0;
        const allocPct = maxHours > 0 ? (u.totalAllocated / maxHours) * 100 : 0;
        const actualPct = maxHours > 0 ? (u.actualHours / maxHours) * 100 : 0;

        return `
          <div class="space-y-2">
            <div class="flex justify-between items-center">
              <span class="text-sm font-medium text-gray-700 dark:text-gray-300">${this.escapeHtml(u.memberName)}</span>
              <span class="text-sm text-gray-500 dark:text-gray-400">${u.utilizationPercent}% utilization</span>
            </div>
            <div class="relative h-6 bg-gray-200 dark:bg-gray-700 rounded overflow-hidden">
              <div class="absolute inset-y-0 left-0 bg-gray-400 dark:bg-gray-500 opacity-30" style="width: ${capacityPct}%"></div>
              <div class="absolute inset-y-0 left-0 bg-blue-500 dark:bg-blue-600" style="width: ${allocPct}%"></div>
              <div class="absolute inset-y-0 left-0 bg-green-500 dark:bg-green-600" style="width: ${actualPct}%"></div>
            </div>
            <div class="flex gap-4 text-xs text-gray-500 dark:text-gray-400">
              <span>Available: ${u.weeklyCapacity * 4}h (4 weeks)</span>
              <span class="text-blue-600 dark:text-blue-400">Allocated: ${u.totalAllocated}h</span>
              <span class="text-green-600 dark:text-green-400">Actual: ${u.actualHours}h</span>
            </div>
          </div>
        `;
      }).join("");
    } catch (error) {
      console.error("Error loading utilization:", error);
      container.innerHTML = '<div class="text-center py-8 text-red-500">Error loading utilization data.</div>';
    }
  }

  openCapacityPlanModal(editId = null) {
    this.editingCapacityPlanId = editId;
    const modal = document.getElementById("capacityPlanModal");
    const title = document.getElementById("capacityPlanModalTitle");
    const titleInput = document.getElementById("capacityPlanTitle");
    const dateInput = document.getElementById("capacityPlanDate");
    const budgetInput = document.getElementById("capacityPlanBudget");

    if (editId) {
      const plan = this.capacityPlans.find(p => p.id === editId);
      if (plan) {
        title.textContent = "Edit Capacity Plan";
        titleInput.value = plan.title;
        dateInput.value = plan.date;
        budgetInput.value = plan.budgetHours || "";
      }
    } else {
      title.textContent = "New Capacity Plan";
      titleInput.value = "";
      dateInput.value = new Date().toISOString().split("T")[0];
      budgetInput.value = "";
    }
    modal?.classList.remove("hidden");
    modal?.classList.add("flex");
  }

  closeCapacityPlanModal() {
    const modal = document.getElementById("capacityPlanModal");
    modal?.classList.add("hidden");
    modal?.classList.remove("flex");
    this.editingCapacityPlanId = null;
  }

  async saveCapacityPlan(e) {
    e.preventDefault();
    const title = document.getElementById("capacityPlanTitle").value;
    const date = document.getElementById("capacityPlanDate").value;
    const budget = document.getElementById("capacityPlanBudget").value;

    const data = { title, date, budgetHours: budget ? parseInt(budget) : undefined };

    try {
      if (this.editingCapacityPlanId) {
        await CapacityAPI.update(this.editingCapacityPlanId, data);
      } else {
        const response = await CapacityAPI.create(data);
        const newPlan = await response.json();
        this.selectedCapacityPlanId = newPlan.id;
      }
      this.closeCapacityPlanModal();
      await this.loadCapacityPlans();
    } catch (error) {
      console.error("Error saving capacity plan:", error);
    }
  }

  editCapacityPlan() {
    if (this.selectedCapacityPlanId) {
      this.openCapacityPlanModal(this.selectedCapacityPlanId);
    }
  }

  async deleteCapacityPlan() {
    if (!this.selectedCapacityPlanId) return;
    if (!confirm("Are you sure you want to delete this capacity plan?")) return;
    try {
      await CapacityAPI.delete(this.selectedCapacityPlanId);
      this.selectedCapacityPlanId = null;
      await this.loadCapacityPlans();
    } catch (error) {
      console.error("Error deleting capacity plan:", error);
    }
  }

  openTeamMemberModal(editId = null) {
    this.editingTeamMemberId = editId;
    const modal = document.getElementById("teamMemberModal");
    const title = document.getElementById("teamMemberModalTitle");
    const nameInput = document.getElementById("teamMemberName");
    const roleInput = document.getElementById("teamMemberRole");
    const hoursInput = document.getElementById("teamMemberHours");

    const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
    days.forEach(day => {
      document.getElementById(`work${day}`).checked = false;
    });

    if (editId) {
      const plan = this.capacityPlans.find(p => p.id === this.selectedCapacityPlanId);
      const member = plan?.teamMembers.find(m => m.id === editId);
      if (member) {
        title.textContent = "Edit Team Member";
        nameInput.value = member.name;
        roleInput.value = member.role || "";
        hoursInput.value = member.hoursPerDay;
        member.workingDays.forEach(day => {
          const checkbox = document.getElementById(`work${day}`);
          if (checkbox) checkbox.checked = true;
        });
      }
    } else {
      title.textContent = "Add Team Member";
      nameInput.value = "";
      roleInput.value = "";
      hoursInput.value = 8;
      ["Mon", "Tue", "Wed", "Thu", "Fri"].forEach(day => {
        document.getElementById(`work${day}`).checked = true;
      });
    }
    modal?.classList.remove("hidden");
    modal?.classList.add("flex");
  }

  closeTeamMemberModal() {
    const modal = document.getElementById("teamMemberModal");
    modal?.classList.add("hidden");
    modal?.classList.remove("flex");
    this.editingTeamMemberId = null;
  }

  async saveTeamMember(e) {
    e.preventDefault();
    const name = document.getElementById("teamMemberName").value;
    const role = document.getElementById("teamMemberRole").value;
    const hoursPerDay = parseInt(document.getElementById("teamMemberHours").value) || 8;

    const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
    const workingDays = days.filter(day => document.getElementById(`work${day}`)?.checked);

    const data = { name, role: role || undefined, hoursPerDay, workingDays };

    try {
      if (this.editingTeamMemberId) {
        await CapacityAPI.updateMember(this.selectedCapacityPlanId, this.editingTeamMemberId, data);
      } else {
        await CapacityAPI.createMember(this.selectedCapacityPlanId, data);
      }
      this.closeTeamMemberModal();
      await this.loadCapacityPlans();
      this.renderTeamMembers();
    } catch (error) {
      console.error("Error saving team member:", error);
    }
  }

  editTeamMember(id) {
    this.openTeamMemberModal(id);
  }

  async deleteTeamMember(id) {
    if (!confirm("Delete this team member? Their allocations will also be removed.")) return;
    try {
      await CapacityAPI.deleteMember(this.selectedCapacityPlanId, id);
      await this.loadCapacityPlans();
      this.renderTeamMembers();
    } catch (error) {
      console.error("Error deleting team member:", error);
    }
  }

  openAllocationModal(memberId, weekStart) {
    this.editingAllocationMemberId = memberId;
    this.editingAllocationWeek = weekStart;

    const plan = this.capacityPlans.find(p => p.id === this.selectedCapacityPlanId);
    const member = plan?.teamMembers.find(m => m.id === memberId);
    const allocs = plan?.allocations.filter(a => a.memberId === memberId && a.weekStart === weekStart) || [];

    const modal = document.getElementById("allocationModal");
    const title = document.getElementById("allocationModalTitle");
    const hoursInput = document.getElementById("allocationHours");
    const typeSelect = document.getElementById("allocationTargetType");
    const targetInput = document.getElementById("allocationTargetId");
    const notesInput = document.getElementById("allocationNotes");
    const deleteBtn = document.getElementById("deleteAllocationBtn");

    title.textContent = `Allocation: ${member?.name || "Member"} - ${this.getWeekDates(weekStart)}`;

    if (allocs.length > 0) {
      // Edit first allocation (simplified - could be improved to handle multiple)
      const alloc = allocs[0];
      this.editingAllocationId = alloc.id;
      hoursInput.value = allocs.reduce((sum, a) => sum + a.allocatedHours, 0);
      typeSelect.value = alloc.targetType;
      targetInput.value = alloc.targetId || "";
      notesInput.value = alloc.notes || "";
      deleteBtn?.classList.remove("hidden");
    } else {
      this.editingAllocationId = null;
      hoursInput.value = "";
      typeSelect.value = "project";
      targetInput.value = "";
      notesInput.value = "";
      deleteBtn?.classList.add("hidden");
    }

    modal?.classList.remove("hidden");
    modal?.classList.add("flex");
  }

  closeAllocationModal() {
    const modal = document.getElementById("allocationModal");
    modal?.classList.add("hidden");
    modal?.classList.remove("flex");
    this.editingAllocationId = null;
    this.editingAllocationMemberId = null;
    this.editingAllocationWeek = null;
  }

  async saveAllocation(e) {
    e.preventDefault();
    const hours = parseInt(document.getElementById("allocationHours").value) || 0;
    const targetType = document.getElementById("allocationTargetType").value;
    const targetId = document.getElementById("allocationTargetId").value;
    const notes = document.getElementById("allocationNotes").value;

    const data = {
      memberId: this.editingAllocationMemberId,
      weekStart: this.editingAllocationWeek,
      allocatedHours: hours,
      targetType,
      targetId: targetId || undefined,
      notes: notes || undefined,
    };

    try {
      if (this.editingAllocationId) {
        // Delete existing and create new (simplified approach)
        await CapacityAPI.deleteAllocation(this.selectedCapacityPlanId, this.editingAllocationId);
      }
      if (hours > 0) {
        await CapacityAPI.createAllocation(this.selectedCapacityPlanId, data);
      }
      this.closeAllocationModal();
      await this.loadCapacityPlans();
      this.renderAllocationsGrid();
    } catch (error) {
      console.error("Error saving allocation:", error);
    }
  }

  async deleteAllocation() {
    if (!this.editingAllocationId) return;
    try {
      await CapacityAPI.deleteAllocation(this.selectedCapacityPlanId, this.editingAllocationId);
      this.closeAllocationModal();
      await this.loadCapacityPlans();
      this.renderAllocationsGrid();
    } catch (error) {
      console.error("Error deleting allocation:", error);
    }
  }

  async openAutoAssignModal() {
    const plan = this.capacityPlans.find(p => p.id === this.selectedCapacityPlanId);
    if (!plan) return;

    const modal = document.getElementById("autoAssignModal");
    const list = document.getElementById("autoAssignList");
    const empty = document.getElementById("autoAssignEmpty");

    try {
      this.autoAssignSuggestions = await CapacityAPI.suggestAssignments(plan.id);

      if (this.autoAssignSuggestions.length === 0) {
        empty?.classList.remove("hidden");
        list?.classList.add("hidden");
      } else {
        empty?.classList.add("hidden");
        list?.classList.remove("hidden");
        list.innerHTML = this.autoAssignSuggestions.map((s, i) => `
          <label class="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-200 dark:border-gray-600 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700">
            <input type="checkbox" checked data-index="${i}" class="auto-assign-checkbox rounded">
            <div class="flex-1">
              <div class="text-sm font-medium text-gray-900 dark:text-gray-100">${this.escapeHtml(s.taskTitle)}</div>
              <div class="text-xs text-gray-500 dark:text-gray-400">
                Assign to <span class="font-medium">${this.escapeHtml(s.memberName)}</span> for ${s.hours}h
              </div>
            </div>
          </label>
        `).join("");
      }

      modal?.classList.remove("hidden");
      modal?.classList.add("flex");
    } catch (error) {
      console.error("Error loading suggestions:", error);
    }
  }

  closeAutoAssignModal() {
    const modal = document.getElementById("autoAssignModal");
    modal?.classList.add("hidden");
    modal?.classList.remove("flex");
    this.autoAssignSuggestions = [];
  }

  async applyAutoAssign() {
    const checkboxes = document.querySelectorAll(".auto-assign-checkbox:checked");
    const selectedSuggestions = Array.from(checkboxes).map(cb => {
      const index = parseInt(cb.dataset.index);
      return this.autoAssignSuggestions[index];
    });

    if (selectedSuggestions.length === 0) {
      this.closeAutoAssignModal();
      return;
    }

    try {
      await CapacityAPI.applyAssignments(this.selectedCapacityPlanId, { suggestions: selectedSuggestions });
      this.closeAutoAssignModal();
      await this.loadCapacityPlans();
      this.renderAllocationsGrid();
    } catch (error) {
      console.error("Error applying assignments:", error);
    }
  }

  // Time Tracking functionality
  async loadTimeTracking() {
    try {
      this.timeEntries = await TimeTrackingAPI.fetchAll();
      this.renderTimeTrackingView();
    } catch (error) {
      console.error("Error loading time entries:", error);
    }
  }

  renderTimeTrackingView() {
    const container = document.getElementById("timeTrackingContainer");
    const emptyState = document.getElementById("emptyTimeTrackingState");

    const allEntries = [];
    const taskIds = Object.keys(this.timeEntries || {});

    for (const taskId of taskIds) {
      const entries = this.timeEntries[taskId] || [];
      for (const entry of entries) {
        allEntries.push({ ...entry, taskId });
      }
    }

    if (allEntries.length === 0) {
      emptyState?.classList.remove("hidden");
      container.innerHTML = "";
      document.getElementById("globalTotalHours").textContent = "0";
      document.getElementById("weeklyHours").textContent = "0h";
      document.getElementById("monthlyHours").textContent = "0h";
      document.getElementById("hoursByPerson").textContent = "No data";
      return;
    }

    emptyState?.classList.add("hidden");

    // Calculate totals
    const totalHours = allEntries.reduce((sum, e) => sum + e.hours, 0);
    document.getElementById("globalTotalHours").textContent = totalHours.toFixed(1);

    // Weekly hours
    const now = new Date();
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - now.getDay());
    weekStart.setHours(0, 0, 0, 0);
    const weeklyTotal = allEntries
      .filter(e => new Date(e.date) >= weekStart)
      .reduce((sum, e) => sum + e.hours, 0);
    document.getElementById("weeklyHours").textContent = weeklyTotal.toFixed(1) + "h";

    // Monthly hours
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthlyTotal = allEntries
      .filter(e => new Date(e.date) >= monthStart)
      .reduce((sum, e) => sum + e.hours, 0);
    document.getElementById("monthlyHours").textContent = monthlyTotal.toFixed(1) + "h";

    // Hours by person
    const byPerson = {};
    for (const entry of allEntries) {
      const person = entry.person || "Unassigned";
      byPerson[person] = (byPerson[person] || 0) + entry.hours;
    }
    const personList = Object.entries(byPerson)
      .map(([name, hours]) => `${name}: ${hours.toFixed(1)}h`)
      .join(", ");
    document.getElementById("hoursByPerson").textContent = personList || "No data";

    // Group entries by task
    const groupedByTask = {};
    for (const entry of allEntries) {
      if (!groupedByTask[entry.taskId]) {
        groupedByTask[entry.taskId] = [];
      }
      groupedByTask[entry.taskId].push(entry);
    }

    // Find task names
    const taskMap = {};
    const findTask = (tasks, id) => {
      for (const task of tasks) {
        if (task.id === id) return task;
        if (task.children) {
          const found = findTask(task.children, id);
          if (found) return found;
        }
      }
      return null;
    };
    for (const taskId of Object.keys(groupedByTask)) {
      const task = findTask(this.tasks, taskId);
      taskMap[taskId] = task?.title || taskId;
    }

    container.innerHTML = Object.entries(groupedByTask).map(([taskId, entries]) => {
      const taskTotal = entries.reduce((sum, e) => sum + e.hours, 0);
      return `
      <div class="bg-white dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600 overflow-hidden">
        <div class="px-4 py-3 bg-gray-50 dark:bg-gray-800 flex justify-between items-center">
          <span class="font-medium text-gray-900 dark:text-gray-100">${taskMap[taskId]}</span>
          <span class="text-sm text-gray-600 dark:text-gray-400">${taskTotal.toFixed(1)}h total</span>
        </div>
        <div class="divide-y divide-gray-100 dark:divide-gray-600">
          ${entries.map(e => `
            <div class="px-4 py-2 flex justify-between items-center text-sm">
              <div>
                <span class="text-gray-900 dark:text-gray-100">${e.date}</span>
                <span class="text-gray-500 dark:text-gray-400 ml-2">${e.hours}h</span>
                ${e.person ? `<span class="text-gray-400 dark:text-gray-500 ml-2">by ${e.person}</span>` : ""}
              </div>
              <div class="flex items-center gap-2">
                ${e.description ? `<span class="text-gray-500 dark:text-gray-400">${e.description}</span>` : ""}
                <button onclick="taskManager.deleteTimeEntryFromView('${taskId}', '${e.id}')" class="text-red-500 hover:text-red-700 text-xs">Delete</button>
              </div>
            </div>
          `).join("")}
        </div>
      </div>
    `}).join("");
  }

  async deleteTimeEntryFromView(taskId, entryId) {
    if (!confirm("Delete this time entry?")) return;
    try {
      await TimeTrackingAPI.delete(taskId, entryId);
      await this.loadTimeTracking();
    } catch (error) {
      console.error("Error deleting time entry:", error);
    }
  }

  showTimeEntryForm() {
    document.getElementById("addTimeEntryForm").classList.remove("hidden");
    document.getElementById("timeEntryDate").value = new Date().toISOString().split("T")[0];
    document.getElementById("timeEntryHours").value = "";
    document.getElementById("timeEntryPerson").value = "";
    document.getElementById("timeEntryDescription").value = "";
  }

  hideTimeEntryForm() {
    document.getElementById("addTimeEntryForm").classList.add("hidden");
  }

  async saveTimeEntry() {
    if (!this.editingTask?.id) return;

    const date = document.getElementById("timeEntryDate").value;
    const hours = parseFloat(document.getElementById("timeEntryHours").value);
    const person = document.getElementById("timeEntryPerson").value.trim();
    const description = document.getElementById("timeEntryDescription").value.trim();

    if (!date || !hours || hours <= 0) {
      alert("Please enter a valid date and hours");
      return;
    }

    try {
      await TimeTrackingAPI.create(this.editingTask.id, { date, hours, person, description });
      this.hideTimeEntryForm();
      await this.loadTaskTimeEntries(this.editingTask.id);
    } catch (error) {
      console.error("Error saving time entry:", error);
    }
  }

  async loadTaskTimeEntries(taskId) {
    try {
      const entries = await TimeTrackingAPI.fetchForTask(taskId);
      this.renderTaskTimeEntries(entries);
    } catch (error) {
      console.error("Error loading task time entries:", error);
    }
  }

  renderTaskTimeEntries(entries) {
    const container = document.getElementById("timeEntriesList");
    const totalDisplay = document.getElementById("totalHoursValue");

    if (!entries || entries.length === 0) {
      container.innerHTML = '<div class="text-sm text-gray-500 dark:text-gray-400">No time entries yet</div>';
      totalDisplay.textContent = "0";
      return;
    }

    const total = entries.reduce((sum, e) => sum + e.hours, 0);
    totalDisplay.textContent = total.toFixed(1);

    container.innerHTML = entries.map(e => `
      <div class="flex justify-between items-center text-sm bg-gray-50 dark:bg-gray-700 rounded px-2 py-1">
        <div>
          <span>${e.date}</span>
          <span class="font-medium ml-2">${e.hours}h</span>
          ${e.person ? `<span class="text-gray-500 ml-2">by ${e.person}</span>` : ""}
        </div>
        <div class="flex items-center gap-2">
          ${e.description ? `<span class="text-gray-400 truncate max-w-32">${e.description}</span>` : ""}
          <button type="button" onclick="taskManager.deleteTaskTimeEntry('${e.id}')" class="text-red-500 hover:text-red-700">x</button>
        </div>
      </div>
    `).join("");
  }

  async deleteTaskTimeEntry(entryId) {
    if (!this.editingTask?.id) return;
    try {
      await TimeTrackingAPI.delete(this.editingTask.id, entryId);
      await this.loadTaskTimeEntries(this.editingTask.id);
    } catch (error) {
      console.error("Error deleting time entry:", error);
    }
  }

  // Mobile menu functionality
  toggleMobileMenu() {
    toggleMobileMenu();
  }

  closeMobileMenu() {
    closeMobileMenu();
  }

  // Canvas functionality
  async loadCanvas() {
    try {
      this.stickyNotes = await CanvasAPI.fetchAll();
      this.renderCanvas();
    } catch (error) {
      console.error("Error loading canvas:", error);
    }
  }

  renderCanvas() {
    const canvasContent = document.getElementById("canvasContent");
    canvasContent.innerHTML = "";

    this.stickyNotes.forEach((stickyNote) => {
      const stickyNoteElement = this.createStickyNoteElement({
        ...stickyNote,
        content: stickyNote.content.replaceAll(/\n/g, "<br>"),
      });
      canvasContent.appendChild(stickyNoteElement);
    });

    // Setup canvas panning if not already done
    this.setupCanvasPanning();
  }

  setupCanvasPanning() {
    const viewport = document.getElementById("canvasViewport");
    if (!viewport || viewport.hasAttribute("data-panning-setup")) return;

    viewport.setAttribute("data-panning-setup", "true");
    viewport.style.cursor = "grab";
    viewport.title = "Click and drag to pan the canvas";

    let isDragging = false;
    let startX,
      startY,
      startTranslateX = 0,
      startTranslateY = 0;

    viewport.addEventListener("mousedown", (e) => {
      // Only allow panning on the viewport itself or canvasContent, not on sticky notes
      if (e.target === viewport || e.target.id === "canvasContent") {
        isDragging = true;
        startX = e.clientX;
        startY = e.clientY;
        viewport.style.cursor = "grabbing";
      }
    });

    document.addEventListener("mousemove", (e) => {
      if (isDragging) {
        const deltaX = e.clientX - startX;
        const deltaY = e.clientY - startY;
        const newTranslateX = startTranslateX + deltaX;
        const newTranslateY = startTranslateY + deltaY;

        // Update canvasOffset for consistency
        this.canvasOffset.x = newTranslateX;
        this.canvasOffset.y = newTranslateY;

        viewport.style.transform = `translate(${newTranslateX}px, ${newTranslateY}px) scale(${this.canvasZoom})`;
      }
    });

    document.addEventListener("mouseup", () => {
      if (isDragging) {
        isDragging = false;
        viewport.style.cursor = "grab";
        const transform = viewport.style.transform;
        const match = transform.match(/translate\(([^,]+),\s*([^)]+)\)/);
        if (match) {
          startTranslateX = parseFloat(match[1]);
          startTranslateY = parseFloat(match[2]);
          this.canvasOffset.x = startTranslateX;
          this.canvasOffset.y = startTranslateY;
        }
      }
    });
  }

  createStickyNoteElement(stickyNote) {
    const element = document.createElement("div");
    element.className = `sticky-note ${stickyNote.color}`;
    element.style.left = `${stickyNote.position.x}px`;
    element.style.top = `${stickyNote.position.y}px`;
    element.dataset.id = stickyNote.id;

    if (stickyNote.size) {
      element.style.width = `${stickyNote.size.width}px`;
      element.style.height = `${stickyNote.size.height}px`;
    }

    element.setAttribute("data-sticky-note-id", stickyNote.id);
    element.innerHTML = `
            <div class="sticky-note-controls">
                <button onclick="taskManager.editStickyNote('${stickyNote.id}')" title="Edit">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path></svg>
                </button>
                <button onclick="taskManager.deleteStickyNote('${stickyNote.id}')" title="Delete">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                </button>
            </div>
            <div contenteditable="true" onblur="taskManager.updateStickyNoteContent('${stickyNote.id}', this.innerText)">${stickyNote.content}</div>
        `;

    this.makeStickyNoteDraggable(element);
    this.makeStickyNoteResizable(element);
    return element;
  }

  makeStickyNoteDraggable(element) {
    let isDragging = false;
    let startX, startY, startLeft, startTop;

    element.addEventListener("mousedown", (e) => {
      if (e.target.contentEditable === "true") return;
      isDragging = true;
      element.classList.add("dragging");
      startX = e.clientX;
      startY = e.clientY;
      startLeft = parseInt(element.style.left);
      startTop = parseInt(element.style.top);
    });

    document.addEventListener("mousemove", (e) => {
      if (!isDragging) return;
      const newLeft = startLeft + (e.clientX - startX);
      const newTop = startTop + (e.clientY - startY);
      element.style.left = `${newLeft}px`;
      element.style.top = `${newTop}px`;
    });

    document.addEventListener("mouseup", () => {
      if (isDragging) {
        isDragging = false;
        element.classList.remove("dragging");
        this.updateStickyNotePosition(element.dataset.id, {
          x: parseInt(element.style.left),
          y: parseInt(element.style.top),
        });
      }
    });
  }

  makeStickyNoteResizable(element) {
    // Use ResizeObserver to detect size changes
    if (!window.ResizeObserver) return; // Fallback for older browsers

    // Track if this is the initial setup to avoid triggering on initial render
    let isInitialSetup = true;

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        // Skip the first resize event which is triggered during initial setup
        if (isInitialSetup) {
          isInitialSetup = false;
          continue;
        }

        const { inlineSize: width, blockSize: height } =
          entry.borderBoxSize.at(0);
        // Debounce the save operation to avoid too many API calls
        clearTimeout(element.resizeTimeout);
        element.resizeTimeout = setTimeout(() => {
          this.updateStickyNoteSize(element.dataset.id, { width, height });
        }, 500);
      }
    });

    resizeObserver.observe(element, { box: "border-box" });

    // Store the observer so it can be disconnected if needed
    element.resizeObserver = resizeObserver;
    this.resizableEvents.push(resizeObserver); // to cleanup and avoid reseting size with undefined values.
  }

  async updateStickyNoteSize(id, size) {
    try {
      if (this.notesLoaded === false) {
        return;
      }

      await CanvasAPI.update(id, { size });
    } catch (error) {
      console.error("Error updating sticky note size:", error);
    }
  }

  openStickyNoteModal() {
    document.getElementById("stickyNoteModal").classList.remove("hidden");
    document.getElementById("stickyNoteModal").classList.add("flex");
    document.getElementById("stickyNoteContent").value = "";
    this.selectedStickyNoteColor = "yellow";
    document
      .querySelectorAll(".color-option")
      .forEach((opt) => opt.classList.remove("selected"));
    document.querySelector('[data-color="yellow"]').classList.add("selected");
  }

  closeStickyNoteModal() {
    document.getElementById("stickyNoteModal").classList.add("hidden");
    document.getElementById("stickyNoteModal").classList.remove("flex");
  }

  async handleStickyNoteSubmit(e) {
    e.preventDefault();
    const content = document.getElementById("stickyNoteContent").value.trim();

    console.log("Creating sticky note with content:", content);
    console.log("Selected color:", this.selectedStickyNoteColor);

    if (!content.trim()) {
      alert("Please enter some content for the sticky note");
      return;
    }

    try {
      const postData = {
        content: content.trim(),
        color: this.selectedStickyNoteColor || "yellow",
        position: {
          x: 100 + Math.random() * 200,
          y: 100 + Math.random() * 200,
        },
      };

      console.log("Sending POST request with data:", postData);

      const response = await CanvasAPI.create(postData);

      console.log("Response status:", response.status);

      if (response.ok) {
        const result = await response.json();
        console.log("Sticky note created successfully:", result);
        this.closeStickyNoteModal();
        this.loadCanvas();
      } else {
        const error = await response.text();
        console.error("Failed to create sticky note:", error);
        alert("Failed to create sticky note: " + error);
      }
    } catch (error) {
      console.error("Error creating sticky note:", error);
      alert("Error creating sticky note: " + error.message);
    }
  }

  editStickyNote(id) {
    // Find the sticky note element and focus on its content area
    const element = document.querySelector(
      `[data-sticky-note-id="${id}"] div[contenteditable]`,
    );
    if (element) {
      element.focus();
      // Select all text for easy editing
      const range = document.createRange();
      range.selectNodeContents(element);
      const selection = window.getSelection();
      selection.removeAllRanges();
      selection.addRange(range);
    }
  }

  async updateStickyNoteContent(id, content) {
    try {
      await CanvasAPI.update(id, { content: content.trim() });
    } catch (error) {
      console.error("Error updating sticky note:", error);
    }
  }

  async updateStickyNotePosition(id, position) {
    try {
      await CanvasAPI.update(id, { position });
    } catch (error) {
      console.error("Error updating sticky note position:", error);
    }
  }

  async deleteStickyNote(id) {
    if (confirm("Delete this sticky note?")) {
      try {
        await CanvasAPI.delete(id);
        this.loadCanvas();
      } catch (error) {
        console.error("Error deleting sticky note:", error);
      }
    }
  }

  updateCanvasZoom(value) {
    this.canvasZoom = parseFloat(value);
    const viewport = document.getElementById("canvasViewport");
    viewport.style.transform = `translate(${this.canvasOffset.x}px, ${this.canvasOffset.y}px) scale(${this.canvasZoom})`;
    document.getElementById("zoomLevel").textContent =
      `${Math.round(this.canvasZoom * 100)}%`;
  }

  // Mindmap functionality
  async loadMindmaps(autoSelect = true) {
    try {
      this.mindmaps = await MindmapsAPI.fetchAll();
      this.renderMindmapSelector();
      if (this.mindmaps.length > 0 && autoSelect) {
        this.selectMindmap(this.mindmaps[0].id);
      } else if (this.mindmaps.length === 0) {
        // No mindmaps available, clear everything
        this.selectedMindmap = null;
        const content = document.getElementById("mindmapContent");
        const emptyState = document.getElementById("mindmapEmptyState");
        const editBtn = document.getElementById("editMindmapBtn");
        const deleteBtn = document.getElementById("deleteMindmapBtn");

        if (content) content.innerHTML = "";
        if (emptyState) emptyState.style.display = "flex";
        if (editBtn) editBtn.style.display = "none";
        if (deleteBtn) deleteBtn.style.display = "none";
      }
    } catch (error) {
      console.error("Error loading mindmaps:", error);
    }
  }

  renderMindmapSelector() {
    const selector = document.getElementById("mindmapSelector");
    selector.innerHTML = '<option value="">Select Mindmap</option>';

    this.mindmaps.forEach((mindmap) => {
      const option = document.createElement("option");
      option.value = mindmap.id;
      option.textContent = mindmap.title;
      selector.appendChild(option);
    });
  }

  selectMindmap(mindmapId) {
    // Update the selector value first
    const selector = document.getElementById("mindmapSelector");
    if (selector) {
      selector.value = mindmapId;
    }

    if (!mindmapId || mindmapId === "") {
      // No mindmap selected - clear everything
      this.selectedMindmap = null;
      const content = document.getElementById("mindmapContent");
      const emptyState = document.getElementById("mindmapEmptyState");
      const editBtn = document.getElementById("editMindmapBtn");
      const deleteBtn = document.getElementById("deleteMindmapBtn");

      if (content) content.innerHTML = "";
      if (emptyState) emptyState.style.display = "flex";
      if (editBtn) editBtn.style.display = "none";
      if (deleteBtn) deleteBtn.style.display = "none";
      return;
    }

    this.selectedMindmap = this.mindmaps.find((m) => m.id === mindmapId);

    if (this.selectedMindmap) {
      console.log("Selected mindmap:", this.selectedMindmap.title); // Debug
      this.renderMindmap();
      // Show edit and delete buttons
      const editBtn = document.getElementById("editMindmapBtn");
      const deleteBtn = document.getElementById("deleteMindmapBtn");
      if (editBtn && deleteBtn) {
        editBtn.style.display = "block";
        deleteBtn.style.display = "block";
        console.log("Buttons shown"); // Debug
      } else {
        console.log("Buttons not found!"); // Debug
      }
    } else {
      console.log("No mindmap found for ID:", mindmapId); // Debug
      // Mindmap not found
      const content = document.getElementById("mindmapContent");
      const emptyState = document.getElementById("mindmapEmptyState");
      const editBtn = document.getElementById("editMindmapBtn");
      const deleteBtn = document.getElementById("deleteMindmapBtn");

      if (content) content.innerHTML = "";
      if (emptyState) emptyState.style.display = "flex";
      if (editBtn) editBtn.style.display = "none";
      if (deleteBtn) deleteBtn.style.display = "none";
    }
  }

  renderMindmap() {
    const content = document.getElementById("mindmapContent");
    const emptyState = document.getElementById("mindmapEmptyState");

    if (!content) {
      console.error("mindmapContent element not found");
      return;
    }

    if (!this.selectedMindmap || this.selectedMindmap.nodes.length === 0) {
      if (emptyState) {
        emptyState.style.display = "flex";
      }
      return;
    }

    if (emptyState) {
      emptyState.style.display = "none";
    }
    content.innerHTML = "";

    // Make the mindmap draggable
    this.setupMindmapPanning();

    // Find root nodes (level 0)
    const rootNodes = this.selectedMindmap.nodes.filter(
      (node) => node.level === 0,
    );

    if (rootNodes.length === 0) {
      emptyState.style.display = "flex";
      return;
    }

    // Use tree layout
    this.renderTreeLayout(rootNodes, content);

    // Draw connections between nodes
    this.drawConnections(content);
  }

  renderTreeLayout(rootNodes, content) {
    const isVertical = this.currentLayout === "vertical";
    const levelSpacing = 150;
    const nodeSpacing = 120;

    if (isVertical) {
      // Top to bottom layout
      const startX = 400;
      const startY = 100;
      rootNodes.forEach((rootNode, rootIndex) => {
        const rootX = startX + rootIndex * 300;
        this.positionNodeAndChildren(
          rootNode,
          rootX,
          startY,
          levelSpacing,
          nodeSpacing,
          content,
        );
      });
    } else {
      // Left to right layout (default)
      const startX = 100;
      const startY = 250;
      rootNodes.forEach((rootNode, rootIndex) => {
        const rootY = startY + rootIndex * 300;
        this.positionNodeAndChildren(
          rootNode,
          startX,
          rootY,
          levelSpacing,
          nodeSpacing,
          content,
        );
      });
    }
  }

  createNodeElement(node, x, y, container) {
    const element = document.createElement("div");
    element.className = `mindmap-node level-${node.level}`;
    element.textContent = node.text;
    element.dataset.nodeId = node.id;

    if (node.level === 0) {
      element.classList.add("root");
    }

    element.style.left = `${x}px`;
    element.style.top = `${y}px`;
    container.appendChild(element);
  }

  positionNodeAndChildren(node, x, y, levelSpacing, nodeSpacing, container) {
    const isVertical = this.currentLayout === "vertical";

    // Create and position the node element
    const element = document.createElement("div");
    element.className = `mindmap-node level-${node.level}`;
    element.textContent = node.text;
    element.dataset.nodeId = node.id;

    if (node.level === 0) {
      element.classList.add("root");
    }

    element.style.left = `${x}px`;
    element.style.top = `${y}px`;
    container.appendChild(element);

    // Store position for drawing connections
    node.x = x;
    node.y = y;

    // Position children
    const children = this.selectedMindmap.nodes.filter(
      (n) => n.parent === node.id,
    );
    if (children.length > 0) {
      if (isVertical) {
        // Top to bottom: children spread horizontally, move down
        const childStartX = x - ((children.length - 1) * nodeSpacing) / 2;
        children.forEach((child, index) => {
          const childX = childStartX + index * nodeSpacing;
          const childY = y + levelSpacing;
          this.positionNodeAndChildren(
            child,
            childX,
            childY,
            levelSpacing,
            nodeSpacing,
            container,
          );
        });
      } else {
        // Left to right: children spread vertically, move right
        const childStartY = y - ((children.length - 1) * nodeSpacing) / 2;
        children.forEach((child, index) => {
          const childX = x + levelSpacing;
          const childY = childStartY + index * nodeSpacing;
          this.positionNodeAndChildren(
            child,
            childX,
            childY,
            levelSpacing,
            nodeSpacing,
            container,
          );
        });
      }
    }
  }

  drawConnections(container) {
    const isVertical = this.currentLayout === "vertical";

    // Draw lines between connected nodes
    this.selectedMindmap.nodes.forEach((node) => {
      if (node.parent) {
        const parent = this.selectedMindmap.nodes.find(
          (n) => n.id === node.parent,
        );
        if (parent && parent.x !== undefined && node.x !== undefined) {
          const line = document.createElement("div");
          line.className = "mindmap-connection";

          let x1, y1, x2, y2;

          if (isVertical) {
            // Vertical layout: connect from bottom-center of parent to top-center of child
            x1 = parent.x + 60; // Center of parent node (assuming ~120px width)
            y1 = parent.y + 40; // Bottom of parent node
            x2 = node.x + 60;   // Center of child node
            y2 = node.y;        // Top of child node
          } else {
            // Horizontal layout: connect from right of parent to left of child
            x1 = parent.x + 80; // Right side of parent node
            y1 = parent.y + 20; // Center height of parent
            x2 = node.x;        // Left side of child node
            y2 = node.y + 20;   // Center height of child
          }

          const length = Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
          const angle = (Math.atan2(y2 - y1, x2 - x1) * 180) / Math.PI;

          line.style.width = `${length}px`;
          line.style.height = "2px";
          line.style.left = `${x1}px`;
          line.style.top = `${y1}px`;
          line.style.transform = `rotate(${angle}deg)`;
          line.style.transformOrigin = "0 50%";
          line.style.backgroundColor = "#6b7280";
          line.style.zIndex = "1";

          container.appendChild(line);
        }
      }
    });
  }

  setupMindmapPanning() {
    const viewport = document.getElementById("mindmapViewport");
    let isDragging = false;
    let startX,
      startY,
      startTranslateX = 0,
      startTranslateY = 0;

    viewport.addEventListener("mousedown", (e) => {
      if (e.target === viewport || e.target.id === "mindmapContent") {
        isDragging = true;
        startX = e.clientX;
        startY = e.clientY;
        viewport.style.cursor = "grabbing";
      }
    });

    document.addEventListener("mousemove", (e) => {
      if (isDragging) {
        const deltaX = e.clientX - startX;
        const deltaY = e.clientY - startY;
        const newTranslateX = startTranslateX + deltaX;
        const newTranslateY = startTranslateY + deltaY;

        viewport.style.transform = `translate(${newTranslateX}px, ${newTranslateY}px) scale(${this.mindmapZoom})`;
      }
    });

    document.addEventListener("mouseup", () => {
      if (isDragging) {
        isDragging = false;
        viewport.style.cursor = "grab";
        const transform = viewport.style.transform;
        const match = transform.match(/translate\(([^,]+),\s*([^)]+)\)/);
        if (match) {
          startTranslateX = parseFloat(match[1]);
          startTranslateY = parseFloat(match[2]);
        }
      }
    });
  }

  editSelectedMindmap() {
    if (!this.selectedMindmap) return;

    // Pre-fill the modal with existing data
    document.getElementById("mindmapModalTitle").textContent = "Edit Mindmap";
    document.getElementById("mindmapTitle").value = this.selectedMindmap.title;

    // Convert nodes back to bullet-point structure
    const structure = this.convertNodesToStructure(this.selectedMindmap.nodes);
    document.getElementById("mindmapStructure").value = structure;

    // Mark as editing
    this.editingMindmap = this.selectedMindmap;

    // Open modal
    this.openMindmapModal();
  }

  async deleteSelectedMindmap() {
    if (!this.selectedMindmap) return;

    if (confirm(`Delete mindmap "${this.selectedMindmap.title}"?`)) {
      try {
        await MindmapsAPI.delete(this.selectedMindmap.id);
        this.selectedMindmap = null;
        this.loadMindmaps(false); // Don't auto-select after deletion
        document.getElementById("mindmapSelector").value = "";
        document.getElementById("editMindmapBtn").style.display = "none";
        document.getElementById("deleteMindmapBtn").style.display = "none";
      } catch (error) {
        console.error("Error deleting mindmap:", error);
      }
    }
  }

  convertNodesToStructure(nodes) {
    // Convert nodes back to indented bullet points
    const rootNodes = nodes.filter((node) => node.level === 0);
    let structure = "";

    rootNodes.forEach((rootNode) => {
      structure += this.nodeToString(rootNode, nodes, 0);
    });

    return structure.trim();
  }

  nodeToString(node, allNodes, level) {
    const indent = "  ".repeat(level);
    let result = `${indent}- ${node.text}\n`;

    // Add children
    const children = allNodes.filter((n) => n.parent === node.id);
    children.forEach((child) => {
      result += this.nodeToString(child, allNodes, level + 1);
    });

    return result;
  }

  updateMindmapZoom(value) {
    this.mindmapZoom = parseFloat(value);
    const viewport = document.getElementById("mindmapViewport");
    viewport.style.transform = `translate(${this.mindmapOffset.x}px, ${this.mindmapOffset.y}px) scale(${this.mindmapZoom})`;
    document.getElementById("mindmapZoomLevel").textContent =
      `${Math.round(this.mindmapZoom * 100)}%`;
  }

  updateMindmapLayout(layout) {
    this.currentLayout = layout;
    console.log("Layout changed to:", layout); // Debug
    if (this.selectedMindmap) {
      this.renderMindmap();
    }
  }

  openMindmapModal() {
    document.getElementById("mindmapModal").classList.remove("hidden");
    document.getElementById("mindmapModal").classList.add("flex");

    if (!this.editingMindmap) {
      document.getElementById("mindmapModalTitle").textContent = "Add Mindmap";
      document.getElementById("mindmapTitle").value = "";
      document.getElementById("mindmapStructure").value = "";
    }
    // Update preview after modal opens
    setTimeout(() => this.updateMindmapPreview(), 0);
  }

  closeMindmapModal() {
    document.getElementById("mindmapModal").classList.add("hidden");
    document.getElementById("mindmapModal").classList.remove("flex");
    this.editingMindmap = null;
    document.getElementById("mindmapModalTitle").textContent = "Add Mindmap";
  }

  handleMindmapKeyDown(e) {
    const textarea = e.target;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const value = textarea.value;

    if (e.key === 'Tab') {
      e.preventDefault();

      if (e.shiftKey) {
        // Shift+Tab: Remove indentation
        const lines = value.split('\n');
        const startLine = value.substring(0, start).split('\n').length - 1;
        const endLine = value.substring(0, end).split('\n').length - 1;

        let newValue = '';
        let cursorOffset = 0;

        for (let i = 0; i < lines.length; i++) {
          if (i >= startLine && i <= endLine) {
            // Remove 2 spaces from the beginning if they exist
            if (lines[i].startsWith('  ')) {
              lines[i] = lines[i].substring(2);
              if (i === startLine) cursorOffset = -2;
            }
          }
          newValue += lines[i] + (i < lines.length - 1 ? '\n' : '');
        }

        textarea.value = newValue;
        textarea.selectionStart = Math.max(0, start + cursorOffset);
        textarea.selectionEnd = Math.max(0, end + cursorOffset);
      } else {
        // Tab: Add indentation
        if (start === end) {
          // No selection, just add 2 spaces at cursor
          const newValue = value.substring(0, start) + '  ' + value.substring(end);
          textarea.value = newValue;
          textarea.selectionStart = textarea.selectionEnd = start + 2;
        } else {
          // Selection exists, indent all selected lines
          const lines = value.split('\n');
          const startLine = value.substring(0, start).split('\n').length - 1;
          const endLine = value.substring(0, end).split('\n').length - 1;

          let newValue = '';
          let cursorOffset = 0;

          for (let i = 0; i < lines.length; i++) {
            if (i >= startLine && i <= endLine) {
              lines[i] = '  ' + lines[i];
              if (i === startLine) cursorOffset = 2;
            }
            newValue += lines[i] + (i < lines.length - 1 ? '\n' : '');
          }

          textarea.value = newValue;
          textarea.selectionStart = start + cursorOffset;
          textarea.selectionEnd = end + (cursorOffset * (endLine - startLine + 1));
        }
      }
      this.updateMindmapPreview();
    } else if (e.key === 'Enter' && !e.shiftKey) {
      // Enter: Add new sibling at same indentation level
      e.preventDefault();
      const lines = value.split('\n');
      const currentLineIndex = value.substring(0, start).split('\n').length - 1;
      const currentLine = lines[currentLineIndex];
      const indent = currentLine.match(/^(\s*)/)[1];
      const newLine = indent + '- ';

      // Insert after current line
      const lineEnd = value.indexOf('\n', start);
      const insertPos = lineEnd === -1 ? value.length : lineEnd;
      const newValue = value.substring(0, insertPos) + '\n' + newLine + value.substring(insertPos);
      textarea.value = newValue;
      textarea.selectionStart = textarea.selectionEnd = insertPos + 1 + newLine.length;
      this.updateMindmapPreview();
    } else if (e.altKey && (e.key === 'ArrowUp' || e.key === 'ArrowDown')) {
      // Alt+Up/Down: Move line up/down
      e.preventDefault();
      this.mmMoveLine(e.key === 'ArrowUp' ? -1 : 1);
    }
  }

  // Mindmap toolbar methods
  mmGetCurrentLineInfo() {
    const textarea = document.getElementById('mindmapStructure');
    const value = textarea.value;
    const start = textarea.selectionStart;
    const lines = value.split('\n');
    const lineIndex = value.substring(0, start).split('\n').length - 1;
    const currentLine = lines[lineIndex];
    const indent = currentLine.match(/^(\s*)/)?.[1] || '';
    return { textarea, value, start, lines, lineIndex, currentLine, indent };
  }

  mmAddRoot() {
    const textarea = document.getElementById('mindmapStructure');
    const value = textarea.value;
    const newLine = '- New Node';
    const newValue = value ? value + '\n' + newLine : newLine;
    textarea.value = newValue;
    textarea.focus();
    textarea.selectionStart = newValue.length - 8;
    textarea.selectionEnd = newValue.length;
    this.updateMindmapPreview();
  }

  mmAddChild() {
    const { textarea, value, lines, lineIndex, indent } = this.mmGetCurrentLineInfo();
    if (lines.length === 0 || !lines[lineIndex].trim()) {
      this.mmAddRoot();
      return;
    }
    const newIndent = indent + '  ';
    const newLine = newIndent + '- New Child';
    const lineEnd = value.split('\n').slice(0, lineIndex + 1).join('\n').length;
    const newValue = value.substring(0, lineEnd) + '\n' + newLine + value.substring(lineEnd);
    textarea.value = newValue;
    textarea.focus();
    const cursorStart = lineEnd + 1 + newIndent.length + 2;
    textarea.selectionStart = cursorStart;
    textarea.selectionEnd = cursorStart + 9;
    this.updateMindmapPreview();
  }

  mmAddSibling() {
    const { textarea, value, lines, lineIndex, indent } = this.mmGetCurrentLineInfo();
    if (lines.length === 0 || !lines[lineIndex].trim()) {
      this.mmAddRoot();
      return;
    }
    const newLine = indent + '- New Sibling';
    const lineEnd = value.split('\n').slice(0, lineIndex + 1).join('\n').length;
    const newValue = value.substring(0, lineEnd) + '\n' + newLine + value.substring(lineEnd);
    textarea.value = newValue;
    textarea.focus();
    const cursorStart = lineEnd + 1 + indent.length + 2;
    textarea.selectionStart = cursorStart;
    textarea.selectionEnd = cursorStart + 11;
    this.updateMindmapPreview();
  }

  mmIndent() {
    const { textarea, value, start, end, lines, lineIndex } = this.mmGetCurrentLineInfo();
    if (lines[lineIndex].startsWith('  ') || lines[lineIndex].trim().startsWith('-')) {
      lines[lineIndex] = '  ' + lines[lineIndex];
      textarea.value = lines.join('\n');
      textarea.selectionStart = start + 2;
      textarea.selectionEnd = (textarea.selectionEnd || start) + 2;
      this.updateMindmapPreview();
    }
    textarea.focus();
  }

  mmUnindent() {
    const { textarea, value, start, lines, lineIndex } = this.mmGetCurrentLineInfo();
    if (lines[lineIndex].startsWith('  ')) {
      lines[lineIndex] = lines[lineIndex].substring(2);
      textarea.value = lines.join('\n');
      textarea.selectionStart = Math.max(0, start - 2);
      textarea.selectionEnd = Math.max(0, (textarea.selectionEnd || start) - 2);
      this.updateMindmapPreview();
    }
    textarea.focus();
  }

  mmMoveLine(direction) {
    const { textarea, lines, lineIndex } = this.mmGetCurrentLineInfo();
    const targetIndex = lineIndex + direction;
    if (targetIndex < 0 || targetIndex >= lines.length) return;

    // Swap lines
    const temp = lines[lineIndex];
    lines[lineIndex] = lines[targetIndex];
    lines[targetIndex] = temp;

    // Calculate new cursor position
    const beforeLines = lines.slice(0, targetIndex);
    const newStart = beforeLines.join('\n').length + (beforeLines.length > 0 ? 1 : 0);

    textarea.value = lines.join('\n');
    textarea.focus();
    textarea.selectionStart = newStart;
    textarea.selectionEnd = newStart + lines[targetIndex].length;
    this.updateMindmapPreview();
  }

  mmDeleteLine() {
    const { textarea, lines, lineIndex } = this.mmGetCurrentLineInfo();
    if (lines.length === 0) return;

    lines.splice(lineIndex, 1);
    const newValue = lines.join('\n');
    textarea.value = newValue;

    // Position cursor at start of next line (or previous if deleted last)
    const newLineIndex = Math.min(lineIndex, lines.length - 1);
    if (newLineIndex >= 0) {
      const beforeLines = lines.slice(0, newLineIndex);
      const newStart = beforeLines.join('\n').length + (beforeLines.length > 0 ? 1 : 0);
      textarea.selectionStart = textarea.selectionEnd = newStart;
    }
    textarea.focus();
    this.updateMindmapPreview();
  }

  updateMindmapPreview() {
    const structure = document.getElementById('mindmapStructure').value;
    const preview = document.getElementById('mindmapPreview');

    if (!structure.trim()) {
      preview.innerHTML = '<div class="text-gray-400 dark:text-gray-500 italic">Enter structure to see preview</div>';
      return;
    }

    const nodes = this.parseMindmapStructure(structure);
    if (nodes.length === 0) {
      preview.innerHTML = '<div class="text-gray-400 dark:text-gray-500 italic">Enter structure to see preview</div>';
      return;
    }

    // Build tree HTML
    const buildTree = (parentId = undefined, level = 0) => {
      const children = nodes.filter(n => n.parent === parentId);
      if (children.length === 0) return '';

      let html = '<ul class="pl-3 border-l border-gray-300 dark:border-gray-600">';
      for (const node of children) {
        html += `<li class="py-0.5"><span class="text-gray-800 dark:text-gray-200">${this.escapeHtml(node.text)}</span>`;
        html += buildTree(node.id, level + 1);
        html += '</li>';
      }
      html += '</ul>';
      return html;
    };

    // Find root nodes (no parent)
    const roots = nodes.filter(n => !n.parent);
    let html = '<div class="space-y-1">';
    for (const root of roots) {
      html += `<div class="font-medium text-gray-900 dark:text-gray-100">${this.escapeHtml(root.text)}</div>`;
      html += buildTree(root.id, 1);
    }
    html += '</div>';

    preview.innerHTML = html;
  }

  async handleMindmapSubmit(e) {
    e.preventDefault();
    const title = document.getElementById("mindmapTitle").value;
    const structure = document.getElementById("mindmapStructure").value;

    // Parse the structure into nodes
    const nodes = this.parseMindmapStructure(structure);

    try {
      let response;
      if (this.editingMindmap) {
        // Update existing mindmap
        response = await MindmapsAPI.update(this.editingMindmap.id, { title, nodes });
      } else {
        // Create new mindmap
        response = await MindmapsAPI.create({ title, nodes });
      }

      if (response.ok) {
        const editingId = this.editingMindmap?.id;
        let newId = null;

        // Get the new mindmap ID from response if creating
        if (!this.editingMindmap) {
          const result = await response.json();
          newId = result.id;
        }

        this.closeMindmapModal();
        await this.loadMindmaps();

        // Select the mindmap (either edited or newly created)
        const selectId = editingId || newId;
        if (selectId) {
          document.getElementById("mindmapSelector").value = selectId;
          this.selectMindmap(selectId);
        }
      }
    } catch (error) {
      console.error("Error saving mindmap:", error);
    }
  }

  parseMindmapStructure(structure) {
    const lines = structure.split("\n").filter((line) => line.trim());
    const nodes = [];

    lines.forEach((line, index) => {
      const trimmed = line.trim();
      if (trimmed.startsWith("- ")) {
        const level = (line.length - line.trimStart().length) / 2;
        const text = trimmed.substring(2);

        const node = {
          id: `node_${index + 1}`,
          text,
          level,
          children: [],
        };

        // Find parent based on level
        if (level > 0) {
          for (let i = nodes.length - 1; i >= 0; i--) {
            if (nodes[i].level === level - 1) {
              node.parent = nodes[i].id;
              nodes[i].children.push(node);
              break;
            }
          }
        }

        nodes.push(node);
      }
    });

    return nodes;
  }

  // Import/Export functionality
  toggleImportExportDropdown() {
    const dropdown = document.getElementById("importExportDropdown");
    dropdown.classList.toggle("hidden");
  }

  handleImportExportDropdownClick(e) {
    const dropdown = document.getElementById("importExportDropdown");
    const button = document.getElementById("importExportBtn");

    if (!button.contains(e.target) && !dropdown.contains(e.target)) {
      dropdown.classList.add("hidden");
    }
  }

  exportTasksCSV() {
    // Create a temporary link to download the CSV
    const link = document.createElement("a");
    link.href = "/api/export/csv/tasks";
    link.download = "tasks.csv";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    // Close dropdown
    document.getElementById("importExportDropdown").classList.add("hidden");
  }

  importTasksCSV() {
    // Trigger the hidden file input
    document.getElementById("csvFileInput").click();

    // Close dropdown
    document.getElementById("importExportDropdown").classList.add("hidden");
  }

  exportPDFReport() {
    // Open the PDF report in a new window for printing/saving
    window.open("/api/export/pdf/report?auto-print=true", "_blank");

    // Close dropdown
    document.getElementById("importExportDropdown").classList.add("hidden");
  }

  async handleCSVFileSelect(e) {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.name.endsWith(".csv")) {
      alert("Please select a CSV file.");
      return;
    }

    try {
      const csvContent = await this.readFileAsText(file);
      console.log("CSV content to import:", csvContent);

      const response = await fetch("/api/import/csv/tasks", {
        method: "POST",
        headers: {
          "Content-Type": "text/plain",
        },
        body: csvContent,
      });

      console.log("Import response status:", response.status);

      if (response.ok) {
        const result = await response.json();
        console.log("Import result:", result);
        alert(`Successfully imported ${result.imported} task(s).`);

        // Reload tasks to show imported ones
        console.log("Reloading tasks...");
        await this.loadTasks();
        console.log("Tasks after reload:", this.tasks);

        // Also reload project info and sections to ensure everything is fresh
        await this.loadProjectInfo();
        await this.loadSections();

        // Refresh the current view to show imported tasks
        console.log("Refreshing current view:", this.currentView);
        this.renderTasks();
      } else {
        const error = await response.json();
        console.error("Import error:", error);

        // Show a more user-friendly error message
        alert(`Import failed: ${error.error || "Unknown error"}`);
      }
    } catch (error) {
      console.error("Error importing CSV:", error);
      alert("Error importing CSV file. Please check the file format.");
    }

    // Clear the file input
    e.target.value = "";
  }

  readFileAsText(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target.result);
      reader.onerror = (e) => reject(e);
      reader.readAsText(file);
    });
  }

  // C4 Architecture Methods
  async loadC4Components() {
    try {
      const data = await C4API.fetchAll();
      this.c4Components = data.components || [];
    } catch (error) {
      console.error('Failed to load C4 components:', error);
      this.c4Components = this.getDefaultC4Components();
    }
    // Validate and clean up orphaned references, then save if changes were made
    this.validateC4Components();
    this.saveC4Components();
    this.renderC4Components();
    
    // Ensure reset button is properly bound
    setTimeout(() => {
      const resetBtn = document.getElementById('c4ResetViewBtn');
      if (resetBtn && !resetBtn.hasAttribute('data-listener-bound')) {
        resetBtn.addEventListener('click', () => this.resetC4View());
        resetBtn.setAttribute('data-listener-bound', 'true');
      }
    }, 100);
  }

  getDefaultC4Components() {
    return [
      {
        id: '1',
        name: 'Web Application',
        level: 'context',
        type: 'System',
        technology: 'React, Node.js',
        description: 'Main web application for task management',
        position: { x: 300, y: 200 },
        connections: [],
        children: ['2', '3', '4']
      },
      {
        id: '2',
        name: 'Frontend',
        level: 'container',
        type: 'Container',
        technology: 'React',
        description: 'User interface layer',
        position: { x: 200, y: 100 },
        connections: [{ target: 'Backend API', label: 'API calls' }],
        parent: '1',
        children: []
      },
      {
        id: '3',
        name: 'Backend API',
        level: 'container',
        type: 'Container',
        technology: 'Node.js, Deno',
        description: 'REST API for data management',
        position: { x: 400, y: 100 },
        connections: [{ target: 'Database', label: 'reads/writes' }],
        parent: '1',
        children: []
      },
      {
        id: '4',
        name: 'Database',
        level: 'container',
        type: 'Container',
        technology: 'File System',
        description: 'Data storage layer',
        position: { x: 300, y: 300 },
        connections: [],
        parent: '1',
        children: []
      }
    ];
  }

  renderC4Components() {
    const container = document.getElementById('c4ComponentsContainer');
    const emptyState = document.getElementById('c4EmptyState');
    const svg = document.getElementById('c4Connections');

    // Always clear SVG connections first
    if (svg) {
      const isDark = document.documentElement.classList.contains('dark');
      const arrowColor = isDark ? '#9ca3af' : '#6b7280';
      svg.innerHTML = `
        <defs>
          <marker id="arrowhead" markerWidth="10" markerHeight="7"
                  refX="10" refY="3.5" orient="auto">
            <polygon points="0 0, 10 3.5, 0 7" fill="${arrowColor}" />
          </marker>
        </defs>
      `;
    }

    // Filter components by current navigation level
    const currentComponents = this.getCurrentLevelComponents();

    if (!this.c4Components || this.c4Components.length === 0 || currentComponents.length === 0) {
      emptyState.classList.remove('hidden');
      container.classList.add('hidden');

      // Clean up old event listeners
      container.querySelectorAll('[data-c4-id]').forEach(el => {
        if (el._c4Cleanup) el._c4Cleanup();
      });
      container.innerHTML = '';

      // Make empty state clickable to add first component
      emptyState.style.cursor = 'pointer';
      emptyState.onclick = () => this.openC4ComponentModalWithLevel();

      this.updateC4Breadcrumb();
      return;
    }

    emptyState.classList.add('hidden');
    container.classList.remove('hidden');

    // Clean up old event listeners before clearing container
    container.querySelectorAll('[data-c4-id]').forEach(el => {
      if (el._c4Cleanup) el._c4Cleanup();
    });
    container.innerHTML = '';

    // Make container clickable for adding components
    container.onclick = (e) => {
      if (e.target === container) {
        const rect = container.getBoundingClientRect();
        const x = (e.clientX - rect.left) / this.c4Zoom - this.c4Offset.x;
        const y = (e.clientY - rect.top) / this.c4Zoom - this.c4Offset.y;
        this.openC4ComponentModalWithLevel(x, y);
      }
    };

    // Render components
    currentComponents.forEach(component => {
      this.createC4ComponentElement(component, container);
    });

    // Update breadcrumb
    this.updateC4Breadcrumb();

    // Draw connections after layout settles
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        this.drawC4Connections(currentComponents);
      });
    });

    // Initialize panning and drag handlers if not already done
    if (!this.c4PanningInitialized) {
      this.initializeC4Panning();
      this.initializeC4DragHandlers();
      this.c4PanningInitialized = true;
    }

    // Only initialize force layout if physics is enabled
    if (this.c4PhysicsEnabled) {
      setTimeout(() => this.initializeC4ForceLayout(currentComponents), 200);
    }
  }

  getCurrentLevelComponents() {
    if (this.c4NavigationStack.length === 0) {
      return this.c4Components.filter(comp => !comp.parent);
    } else {
      const currentParentId = this.c4NavigationStack[this.c4NavigationStack.length - 1];
      return this.c4Components.filter(comp => comp.parent === currentParentId);
    }
  }

  createC4ComponentElement(component, container) {
    const element = document.createElement('div');
    element.className = `c4-component ${component.level}`;
    element.style.left = `${component.position.x}px`;
    element.style.top = `${component.position.y}px`;
    element.setAttribute('data-c4-id', component.id);

    const canDrillDown = this.canComponentBeDrilledDown(component);

    element.innerHTML = `
      <div class="c4-component-controls" style="position: absolute; top: 4px; right: 4px; display: none; gap: 2px; z-index: 10;">
        <button class="c4-edit-btn" title="Edit" style="background: rgba(0,0,0,0.6); border: none; color: white; width: 20px; height: 20px; border-radius: 3px; cursor: pointer; font-size: 10px;">E</button>
        <button class="c4-delete-btn" title="Delete" style="background: rgba(0,0,0,0.6); border: none; color: white; width: 20px; height: 20px; border-radius: 3px; cursor: pointer; font-size: 10px;">X</button>
      </div>
      <div class="c4-component-type">${component.type}</div>
      <div class="c4-component-title">${component.name}</div>
      ${component.technology ? `<div class="c4-component-description">${component.technology}</div>` : ''}
      <div class="c4-component-description">${component.description}</div>
      ${canDrillDown ? '<div class="c4-component-drilldown">></div>' : ''}
    `;

    // Show/hide controls on hover
    element.addEventListener('mouseenter', () => {
      element.querySelector('.c4-component-controls').style.display = 'flex';
    });
    element.addEventListener('mouseleave', () => {
      element.querySelector('.c4-component-controls').style.display = 'none';
    });

    // Edit button handler
    element.querySelector('.c4-edit-btn').addEventListener('click', (e) => {
      e.stopPropagation();
      this.openC4EditModal(component);
    });

    // Delete button handler
    element.querySelector('.c4-delete-btn').addEventListener('click', (e) => {
      e.stopPropagation();
      if (confirm(`Delete "${component.name}"? This will also remove any children and connections.`)) {
        this.deleteC4Component(component.id);
      }
    });

    // Add drag functionality (includes click handling)
    this.makeC4ComponentDraggable(element, component);

    container.appendChild(element);
  }

  canComponentBeDrilledDown(component) {
    // Can drill down if component has children OR if it's not at the deepest level
    const levels = ['context', 'container', 'component', 'code'];
    const currentIndex = levels.indexOf(component.level);
    return (component.children && component.children.length > 0) || currentIndex < levels.length - 1;
  }

  drillDownC4Component(component) {
    this.stopC4ForceLayout();
    this.c4NavigationStack.push(component.id);
    document.getElementById('c4BackBtn').classList.remove('hidden');
    this.renderC4Components();
    document.getElementById('c4Container').style.cursor = 'grab';
  }

  // Helper to get component from navigation stack by index
  getC4NavigationComponent(index) {
    const id = this.c4NavigationStack[index];
    return this.c4Components.find(c => c.id === id);
  }

  navigateC4Back() {
    if (this.c4NavigationStack.length > 0) {
      // Stop any ongoing physics simulation
      this.stopC4ForceLayout();
      
      this.c4NavigationStack.pop();
      if (this.c4NavigationStack.length === 0) {
        document.getElementById('c4BackBtn').classList.add('hidden');
      }
      this.renderC4Components();
      
      // Reset cursor for the container
      document.getElementById('c4Container').style.cursor = 'grab';
    }
  }

  updateC4Breadcrumb() {
    const breadcrumb = document.getElementById('c4Breadcrumb');
    let html = `<span class="c4-breadcrumb-item" onclick="taskManager.navigateToC4Root()">Root</span>`;

    this.c4NavigationStack.forEach((componentId, index) => {
      const component = this.c4Components.find(c => c.id === componentId);
      if (component) {
        html += `<span class="c4-breadcrumb-separator">/</span>`;
        html += `<span class="c4-breadcrumb-item" onclick="taskManager.navigateToC4Level(${index})">${component.name}</span>`;
      }
    });

    breadcrumb.innerHTML = html;
  }

  navigateToC4Root() {
    this.stopC4ForceLayout();
    this.c4NavigationStack = [];
    document.getElementById('c4BackBtn').classList.add('hidden');
    this.renderC4Components();
    document.getElementById('c4Container').style.cursor = 'grab';
  }

  navigateToC4Level(index) {
    this.stopC4ForceLayout();
    this.c4NavigationStack = this.c4NavigationStack.slice(0, index + 1);
    if (this.c4NavigationStack.length === 0) {
      document.getElementById('c4BackBtn').classList.add('hidden');
    }
    this.renderC4Components();
    document.getElementById('c4Container').style.cursor = 'grab';
  }

  drawC4Connections(components) {
    const svg = document.getElementById('c4Connections');
    const isDark = document.documentElement.classList.contains('dark');
    const arrowColor = isDark ? '#9ca3af' : '#6b7280';
    svg.innerHTML = `
      <defs>
        <marker id="arrowhead" markerWidth="10" markerHeight="7"
                refX="10" refY="3.5" orient="auto">
          <polygon points="0 0, 10 3.5, 0 7" fill="${arrowColor}" />
        </marker>
      </defs>
    `;

    components.forEach(component => {
      component.connections?.forEach(connection => {
        // Find target by name or id
        const targetComponent = components.find(c => 
          c.id === connection.target || c.name === connection.target
        );
        if (targetComponent) {
          this.drawC4Connection(svg, component, targetComponent, connection.label);
        }
      });
    });
  }

  drawC4Connection(svg, fromComponent, toComponent, label) {
    // Component dimensions
    const componentWidth = 160;
    const componentHeight = 100;
    
    // Component centers
    const fromCenterX = fromComponent.position.x + componentWidth / 2;
    const fromCenterY = fromComponent.position.y + componentHeight / 2;
    const toCenterX = toComponent.position.x + componentWidth / 2;
    const toCenterY = toComponent.position.y + componentHeight / 2;
    
    // Calculate edge points
    const dx = toCenterX - fromCenterX;
    const dy = toCenterY - fromCenterY;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    if (distance === 0) return; // Avoid division by zero
    
    // Normalize direction vector
    const dirX = dx / distance;
    const dirY = dy / distance;
    
    // Calculate edge points (subtract half component size from each end)
    const fromX = fromCenterX + dirX * (componentWidth / 2);
    const fromY = fromCenterY + dirY * (componentHeight / 2);
    const toX = toCenterX - dirX * (componentWidth / 2);
    const toY = toCenterY - dirY * (componentHeight / 2);

    // Draw line
    const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    line.setAttribute('x1', fromX);
    line.setAttribute('y1', fromY);
    line.setAttribute('x2', toX);
    line.setAttribute('y2', toY);
    line.setAttribute('class', 'c4-connection');
    svg.appendChild(line);

    // Draw label with perpendicular offset for better readability
    if (label) {
      const midX = (fromX + toX) / 2;
      const midY = (fromY + toY) / 2;
      // Calculate perpendicular offset based on line angle
      const angle = Math.atan2(toY - fromY, toX - fromX);
      const offsetX = Math.sin(angle) * 12;
      const offsetY = -Math.cos(angle) * 12;

      const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      text.setAttribute('x', midX + offsetX);
      text.setAttribute('y', midY + offsetY);
      text.setAttribute('class', 'c4-connection-label');
      text.textContent = label;
      svg.appendChild(text);
    }
  }

  updateC4Zoom(value) {
    this.c4Zoom = parseFloat(value);
    document.getElementById('c4ZoomLevel').textContent = `${Math.round(this.c4Zoom * 100)}%`;
    this.updateC4ViewTransform();
  }

  makeC4ComponentDraggable(element, component) {
    let dragStarted = false;
    let startX, startY, initialX, initialY;
    const dragThreshold = 5;

    const onMouseDown = (e) => {
      // Ignore clicks on control buttons
      if (e.target.classList.contains('c4-component-drilldown') ||
          e.target.classList.contains('c4-edit-btn') ||
          e.target.classList.contains('c4-delete-btn')) return;

      // Set this component as the active drag target
      this._c4ActiveDrag = {
        element,
        component,
        startX: e.clientX,
        startY: e.clientY,
        initialX: component.position.x,
        initialY: component.position.y,
        dragStarted: false
      };

      // Stop physics immediately when starting to interact
      this.stopC4ForceLayout();

      e.preventDefault();
      e.stopPropagation();
    };

    element.addEventListener('mousedown', onMouseDown);

    // Store cleanup function on element
    element._c4Cleanup = () => {
      element.removeEventListener('mousedown', onMouseDown);
    };
  }

  // Initialize global C4 drag handlers (call once)
  initializeC4DragHandlers() {
    if (this._c4DragHandlersInitialized) return;
    this._c4DragHandlersInitialized = true;

    document.addEventListener('mousemove', (e) => {
      if (!this._c4ActiveDrag) return;

      const drag = this._c4ActiveDrag;
      const deltaX = (e.clientX - drag.startX) / this.c4Zoom;
      const deltaY = (e.clientY - drag.startY) / this.c4Zoom;
      const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

      if (!drag.dragStarted && distance > 5) {
        drag.dragStarted = true;
        drag.element.style.cursor = 'grabbing';
        drag.element.classList.add('dragging');
        // Disable transition during drag so box and arrow move together
        drag.element.style.transition = 'none';
      }

      if (drag.dragStarted) {
        drag.component.position.x = drag.initialX + deltaX;
        drag.component.position.y = drag.initialY + deltaY;
        drag.element.style.left = `${drag.component.position.x}px`;
        drag.element.style.top = `${drag.component.position.y}px`;
        // Use requestAnimationFrame to sync connection drawing with visual update
        if (this._c4ConnectionFrame) {
          cancelAnimationFrame(this._c4ConnectionFrame);
        }
        this._c4ConnectionFrame = requestAnimationFrame(() => {
          this.drawC4Connections(this.getCurrentLevelComponents());
        });
      }
    });

    document.addEventListener('mouseup', (e) => {
      if (!this._c4ActiveDrag) return;

      const drag = this._c4ActiveDrag;
      const wasDragging = drag.dragStarted;
      const component = drag.component;

      // Clean up drag state
      drag.element.style.cursor = 'pointer';
      drag.element.classList.remove('dragging');
      // Restore transition after drag
      drag.element.style.transition = '';
      this._c4ActiveDrag = null;

      // If we didn't drag, it's a click - trigger drill down
      if (!wasDragging && this.canComponentBeDrilledDown(component)) {
        e.stopPropagation();
        this.drillDownC4Component(component);
        return;
      }

      if (wasDragging) {
        this.saveC4Components();
        this.drawC4Connections(this.getCurrentLevelComponents());
      }
    });
  }

  // C4 Modal Methods
  openC4ComponentModal() {
    this.editingC4Component = null;
    document.getElementById('c4ComponentModalTitle').textContent = 'Add C4 Component';
    document.getElementById('c4ComponentForm').reset();
    document.getElementById('c4ComponentLevel').value = this.currentC4Level;
    document.getElementById('c4ComponentType').value = this.getDefaultTypeForLevel(this.currentC4Level);

    // Clear connections form
    document.getElementById('c4ConnectionsForm').innerHTML = '';

    // Auto-update type when level changes (only bind once)
    const levelSelect = document.getElementById('c4ComponentLevel');
    if (!levelSelect.hasAttribute('data-change-bound')) {
      levelSelect.addEventListener('change', (e) => {
        document.getElementById('c4ComponentType').value = this.getDefaultTypeForLevel(e.target.value);
      });
      levelSelect.setAttribute('data-change-bound', 'true');
    }
    document.getElementById('c4ComponentModal').classList.remove('hidden');
    document.getElementById('c4ComponentModal').classList.add('flex');

    // Setup autocomplete for existing target inputs
    setTimeout(() => {
      document.querySelectorAll('.c4-target-input').forEach(input => {
        if (!input.hasAttribute('data-autocomplete-setup')) {
          this.setupC4TargetAutocomplete(input);
          input.setAttribute('data-autocomplete-setup', 'true');
        }
      });
    }, 0);
  }

  openC4ComponentModalWithLevel(x = 300, y = 200) {
    this.editingC4Component = null;
    document.getElementById('c4ComponentModalTitle').textContent = 'Add C4 Component';
    document.getElementById('c4ComponentForm').reset();
    
    // Determine the correct level based on current context
    const levels = ['context', 'container', 'component', 'code'];
    let targetLevel = this.currentC4Level;
    
    if (this.c4NavigationStack.length > 0) {
      // If we're drilled down, add components at the next level down from the current parent
      const currentParentId = this.c4NavigationStack[this.c4NavigationStack.length - 1];
      const currentParent = this.c4Components.find(c => c.id === currentParentId);
      if (currentParent) {
        const currentIndex = levels.indexOf(currentParent.level);
        if (currentIndex < levels.length - 1) {
          targetLevel = levels[currentIndex + 1];
        } else {
          // If already at the deepest level, stay at code level
          targetLevel = 'code';
        }
      }
    }
    
    document.getElementById('c4ComponentLevel').value = targetLevel;
    document.getElementById('c4ComponentType').value = this.getDefaultTypeForLevel(targetLevel);
    document.getElementById('c4ComponentX').value = Math.round(x);
    document.getElementById('c4ComponentY').value = Math.round(y);
    document.getElementById('c4ComponentModal').classList.remove('hidden');
    document.getElementById('c4ComponentModal').classList.add('flex');
    
    // Setup autocomplete for existing target inputs
    setTimeout(() => {
      document.querySelectorAll('.c4-target-input').forEach(input => {
        if (!input.hasAttribute('data-autocomplete-setup')) {
          this.setupC4TargetAutocomplete(input);
          input.setAttribute('data-autocomplete-setup', 'true');
        }
      });
    }, 0);
  }

  closeC4ComponentModal() {
    document.getElementById('c4ComponentModal').classList.add('hidden');
    document.getElementById('c4ComponentModal').classList.remove('flex');
  }

  handleC4ComponentSubmit(e) {
    e.preventDefault();

    const component = {
      id: this.editingC4Component?.id || this.generateC4ComponentId(),
      name: document.getElementById('c4ComponentName').value,
      level: document.getElementById('c4ComponentLevel').value,
      type: document.getElementById('c4ComponentType').value,
      technology: document.getElementById('c4ComponentTechnology').value,
      description: document.getElementById('c4ComponentDescription').value,
      position: {
        x: parseInt(document.getElementById('c4ComponentX').value),
        y: parseInt(document.getElementById('c4ComponentY').value)
      },
      connections: this.getC4ConnectionsFromForm(),
      children: this.editingC4Component?.children || []
    };

    if (this.editingC4Component) {
      const index = this.c4Components.findIndex(c => c.id === this.editingC4Component.id);
      if (index !== -1) {
        // Preserve parent reference when editing
        component.parent = this.c4Components[index].parent;
        this.c4Components[index] = component;
      }
    } else {
      // Set parent if we're in a drill-down view (navigation stack now stores IDs directly)
      if (this.c4NavigationStack.length > 0) {
        component.parent = this.c4NavigationStack[this.c4NavigationStack.length - 1];
        // Add to parent's children
        const parent = this.c4Components.find(c => c.id === component.parent);
        if (parent) {
          if (!parent.children) {
            parent.children = [];
          }
          if (!parent.children.includes(component.id)) {
            parent.children.push(component.id);
          }
        }
      }

      this.c4Components.push(component);
    }

    this.closeC4ComponentModal();
    this.renderC4Components();
    this.saveC4Components();
  }

  getDefaultTypeForLevel(level) {
    switch (level) {
      case 'context':
        return 'System';
      case 'container':
        return 'Container';
      case 'component':
        return 'Component';
      case 'code':
        return 'Class';
      default:
        return 'System';
    }
  }

  getC4ConnectionsFromForm() {
    const connections = [];
    const connectionRows = document.querySelectorAll('#c4ConnectionsForm .flex');
    
    connectionRows.forEach(row => {
      const targetInput = row.querySelector('.c4-target-input');
      const labelInput = row.querySelector('input[placeholder="Relationship label"]');
      const target = targetInput ? targetInput.value : '';
      const label = labelInput ? labelInput.value : '';
      if (target && label) {
        connections.push({ target, label });
      }
    });
    
    return connections;
  }

  addC4ConnectionInput() {
    const container = document.getElementById('c4ConnectionsForm');
    const div = document.createElement('div');
    div.className = 'flex space-x-2';
    div.innerHTML = `
      <div class="flex-1 relative">
        <input type="text" placeholder="Target component name" class="c4-target-input w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-md px-3 py-2 text-sm" autocomplete="off">
        <div class="c4-target-dropdown hidden absolute top-full left-0 right-0 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-b-md max-h-32 overflow-y-auto z-50"></div>
      </div>
      <input type="text" placeholder="Relationship label" class="flex-1 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-md px-3 py-2 text-sm">
      <button type="button" class="px-2 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 text-sm" onclick="this.parentElement.remove()">×</button>
    `;
    container.appendChild(div);
    
    // Add autocomplete functionality to the new input
    this.setupC4TargetAutocomplete(div.querySelector('.c4-target-input'));
  }

  setupC4TargetAutocomplete(input) {
    const dropdown = input.nextElementSibling;
    
    input.addEventListener('input', (e) => {
      const value = e.target.value.toLowerCase();
      // Show all components regardless of level for better connectivity
      const matches = this.c4Components.filter(comp =>
        comp.name.toLowerCase().includes(value) && value.length > 0
      );

      if (matches.length > 0 && value.length > 0) {
        dropdown.innerHTML = matches.map(comp =>
          `<div class="c4-target-dropdown-item" data-id="${comp.id}" data-name="${comp.name}">${comp.name} <span style="opacity:0.6;font-size:10px">(${comp.level})</span></div>`
        ).join('');
        dropdown.classList.remove('hidden');
      } else {
        dropdown.classList.add('hidden');
      }
    });
    
    input.addEventListener('blur', () => {
      // Delay hiding to allow clicking on dropdown items
      setTimeout(() => dropdown.classList.add('hidden'), 150);
    });
    
    dropdown.addEventListener('click', (e) => {
      const item = e.target.closest('.c4-target-dropdown-item');
      if (item) {
        // Store the ID as the value for reliable connection lookup
        input.value = item.dataset.id;
        input.setAttribute('data-display-name', item.dataset.name);
        dropdown.classList.add('hidden');
        input.focus();
      }
    });
  }

  async saveC4Components() {
    try {
      await C4API.save({ components: this.c4Components });
    } catch (error) {
      console.error('Failed to save C4 components:', error);
    }
  }

  deleteC4Component(componentId) {
    // Recursively collect all children to delete
    const idsToDelete = new Set();
    const collectChildren = (id) => {
      idsToDelete.add(id);
      const comp = this.c4Components.find(c => c.id === id);
      if (comp && comp.children) {
        comp.children.forEach(childId => collectChildren(childId));
      }
    };
    collectChildren(componentId);

    // Remove the component from its parent's children array
    const component = this.c4Components.find(c => c.id === componentId);
    if (component && component.parent) {
      const parent = this.c4Components.find(c => c.id === component.parent);
      if (parent && parent.children) {
        parent.children = parent.children.filter(id => id !== componentId);
      }
    }

    // Remove connections pointing to deleted components
    this.c4Components.forEach(comp => {
      if (comp.connections) {
        comp.connections = comp.connections.filter(conn =>
          !idsToDelete.has(conn.target) && !idsToDelete.has(conn.target)
        );
      }
    });

    // Remove all collected components
    this.c4Components = this.c4Components.filter(c => !idsToDelete.has(c.id));

    this.saveC4Components();
    this.renderC4Components();
  }

  openC4EditModal(component) {
    this.editingC4Component = component;
    document.getElementById('c4ComponentModalTitle').textContent = 'Edit C4 Component';

    // Populate form fields
    document.getElementById('c4ComponentName').value = component.name;
    document.getElementById('c4ComponentLevel').value = component.level;
    document.getElementById('c4ComponentType').value = component.type;
    document.getElementById('c4ComponentTechnology').value = component.technology || '';
    document.getElementById('c4ComponentDescription').value = component.description || '';
    document.getElementById('c4ComponentX').value = component.position.x;
    document.getElementById('c4ComponentY').value = component.position.y;

    // Populate connections
    const connectionsContainer = document.getElementById('c4ConnectionsForm');
    connectionsContainer.innerHTML = '';

    if (component.connections && component.connections.length > 0) {
      component.connections.forEach(conn => {
        const div = document.createElement('div');
        div.className = 'flex space-x-2';
        div.innerHTML = `
          <div class="flex-1 relative">
            <input type="text" placeholder="Target component name" class="c4-target-input w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-md px-3 py-2 text-sm" autocomplete="off" value="${conn.target}">
            <div class="c4-target-dropdown hidden absolute top-full left-0 right-0 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-b-md max-h-32 overflow-y-auto z-50"></div>
          </div>
          <input type="text" placeholder="Relationship label" class="flex-1 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-md px-3 py-2 text-sm" value="${conn.label}">
          <button type="button" class="px-2 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 text-sm" onclick="this.parentElement.remove()">X</button>
        `;
        connectionsContainer.appendChild(div);
        this.setupC4TargetAutocomplete(div.querySelector('.c4-target-input'));
      });
    }

    document.getElementById('c4ComponentModal').classList.remove('hidden');
    document.getElementById('c4ComponentModal').classList.add('flex');
  }

  generateC4ComponentId() {
    // Find the maximum ID number in existing components
    let maxId = 0;
    this.c4Components.forEach(comp => {
      const match = comp.id.match(/c4_component_(\d+)/);
      if (match) {
        const num = parseInt(match[1], 10);
        if (num > maxId) {
          maxId = num;
        }
      }
    });
    return `c4_component_${maxId + 1}`;
  }

  validateC4Components() {
    // Remove duplicate IDs - keep only the first occurrence
    const seenIds = new Set();
    this.c4Components = this.c4Components.filter(comp => {
      if (seenIds.has(comp.id)) {
        console.warn(`Removing duplicate C4 component with ID: ${comp.id}`);
        return false;
      }
      seenIds.add(comp.id);
      return true;
    });

    // Remove invalid child references
    this.c4Components.forEach(comp => {
      if (comp.children) {
        comp.children = comp.children.filter(childId =>
          this.c4Components.some(c => c.id === childId)
        );
      }
      // Remove connections to non-existent components
      if (comp.connections) {
        comp.connections = comp.connections.filter(conn =>
          this.c4Components.some(c => c.id === conn.target || c.name === conn.target)
        );
      }
      // Validate parent reference
      if (comp.parent && !this.c4Components.some(c => c.id === comp.parent)) {
        console.warn(`Removing invalid parent reference ${comp.parent} from ${comp.id}`);
        delete comp.parent;
      }
    });

    // Auto-position components that are at 0,0 to prevent stacking
    let offsetX = 100;
    let offsetY = 100;
    this.c4Components.forEach(comp => {
      if (comp.position.x === 0 && comp.position.y === 0) {
        comp.position.x = offsetX;
        comp.position.y = offsetY;
        offsetX += 200;
        if (offsetX > 800) {
          offsetX = 100;
          offsetY += 150;
        }
      }
    });
  }

  initializeC4Panning() {
    const viewport = document.getElementById('c4Viewport');
    const content = document.getElementById('c4Content');
    const container = document.getElementById('c4Container');
    
    let isPanning = false;
    let startX, startY, initialOffsetX, initialOffsetY;

    container.addEventListener('mousedown', (e) => {
      // Only pan if clicking on the container itself or viewport, not on components
      if (e.target === container || e.target === viewport || e.target === content || e.target.id === 'c4Connections') {
        isPanning = true;
        startX = e.clientX;
        startY = e.clientY;
        initialOffsetX = this.c4Offset.x;
        initialOffsetY = this.c4Offset.y;
        
        container.style.cursor = 'grabbing';
        e.preventDefault();
      }
    });

    document.addEventListener('mousemove', (e) => {
      if (!isPanning) return;
      
      const deltaX = (e.clientX - startX) / this.c4Zoom;
      const deltaY = (e.clientY - startY) / this.c4Zoom;
      
      this.c4Offset.x = initialOffsetX + deltaX;
      this.c4Offset.y = initialOffsetY + deltaY;
      
      this.updateC4ViewTransform();
    });

    document.addEventListener('mouseup', () => {
      if (isPanning) {
        isPanning = false;
        container.style.cursor = 'grab';
      }
    });

    // Wheel zoom
    container.addEventListener('wheel', (e) => {
      e.preventDefault();
      const rect = container.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;
      
      const oldZoom = this.c4Zoom;
      const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
      this.c4Zoom = Math.max(0.25, Math.min(3, this.c4Zoom * zoomFactor));
      
      // Adjust offset to zoom towards mouse position
      const zoomChange = this.c4Zoom / oldZoom;
      this.c4Offset.x = (this.c4Offset.x + mouseX / oldZoom) * zoomChange - mouseX / this.c4Zoom;
      this.c4Offset.y = (this.c4Offset.y + mouseY / oldZoom) * zoomChange - mouseY / this.c4Zoom;
      
      document.getElementById('c4ZoomLevel').textContent = `${Math.round(this.c4Zoom * 100)}%`;
      document.getElementById('c4Zoom').value = this.c4Zoom;
      this.updateC4ViewTransform();
    });
  }

  updateC4ViewTransform() {
    const content = document.getElementById('c4Content');
    content.style.transform = `translate(${this.c4Offset.x}px, ${this.c4Offset.y}px) scale(${this.c4Zoom})`;
  }

  resetC4View() {
    this.c4Zoom = 1;
    this.c4Offset = { x: 0, y: 0 };
    document.getElementById('c4ZoomLevel').textContent = '100%';
    document.getElementById('c4Zoom').value = 1;
    this.updateC4ViewTransform();
  }

  toggleC4ViewMode(mode) {
    const diagramContainer = document.getElementById('c4Container');
    const listContainer = document.getElementById('c4ListView');
    const diagramControls = document.getElementById('c4DiagramControls');
    const diagramOptions = document.getElementById('c4DiagramOptions');

    if (mode === 'list') {
      diagramContainer.classList.add('hidden');
      listContainer.classList.remove('hidden');
      diagramControls.classList.add('hidden');
      diagramOptions.classList.add('hidden');
      this.renderC4ListView();
    } else {
      diagramContainer.classList.remove('hidden');
      listContainer.classList.add('hidden');
      diagramControls.classList.remove('hidden');
      diagramOptions.classList.remove('hidden');
    }
  }

  renderC4ListView() {
    const container = document.getElementById('c4ListContent');

    if (!this.c4Components || this.c4Components.length === 0) {
      container.innerHTML = `
        <div class="text-center py-8 text-gray-500 dark:text-gray-400">
          <p>No C4 components yet. Add components to see them here.</p>
        </div>
      `;
      return;
    }

    // Build hierarchical structure
    const rootComponents = this.c4Components.filter(c => !c.parent);
    container.innerHTML = this.renderC4ListItems(rootComponents, 0);

    // Add click handlers for expand/collapse
    container.querySelectorAll('.c4-list-toggle').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const item = btn.closest('.c4-list-item');
        const children = item.querySelector('.c4-list-children');
        const icon = btn.querySelector('svg');
        if (children) {
          children.classList.toggle('hidden');
          icon.classList.toggle('rotate-90');
        }
      });
    });

    // Add click handlers for edit
    container.querySelectorAll('.c4-list-edit').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const componentId = btn.dataset.componentId;
        const component = this.c4Components.find(c => c.id === componentId);
        if (component) {
          this.openC4EditModal(component);
        }
      });
    });

    // Add click handlers for delete
    container.querySelectorAll('.c4-list-delete').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const componentId = btn.dataset.componentId;
        const component = this.c4Components.find(c => c.id === componentId);
        if (component && confirm(`Delete "${component.name}"?`)) {
          this.deleteC4Component(componentId);
          this.renderC4ListView();
        }
      });
    });
  }

  renderC4ListItems(components, level) {
    if (!components || components.length === 0) return '';

    const levelColors = {
      context: 'border-l-gray-800 dark:border-l-gray-200',
      container: 'border-l-gray-600 dark:border-l-gray-400',
      component: 'border-l-gray-400 dark:border-l-gray-500',
      code: 'border-l-gray-300 dark:border-l-gray-600'
    };

    const levelBadgeColors = {
      context: 'bg-gray-800 text-white dark:bg-gray-200 dark:text-gray-800',
      container: 'bg-gray-600 text-white dark:bg-gray-400 dark:text-gray-800',
      component: 'bg-gray-400 text-white dark:bg-gray-500 dark:text-gray-100',
      code: 'bg-gray-200 text-gray-800 dark:bg-gray-600 dark:text-gray-200'
    };

    return components.map(component => {
      const children = this.c4Components.filter(c => c.parent === component.id);
      const hasChildren = children.length > 0;
      const borderColor = levelColors[component.level] || levelColors.context;
      const badgeColor = levelBadgeColors[component.level] || levelBadgeColors.context;

      return `
        <div class="c4-list-item border-l-4 ${borderColor} mb-2" style="margin-left: ${level * 20}px;">
          <div class="flex items-center gap-2 p-3 bg-white dark:bg-gray-800 rounded-r-lg hover:bg-gray-50 dark:hover:bg-gray-700">
            ${hasChildren ? `
              <button class="c4-list-toggle p-1 hover:bg-gray-200 dark:hover:bg-gray-600 rounded">
                <svg class="w-4 h-4 text-gray-500 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path>
                </svg>
              </button>
            ` : '<div class="w-6"></div>'}
            <div class="flex-1 min-w-0">
              <div class="flex items-center gap-2">
                <span class="font-medium text-gray-900 dark:text-gray-100">${component.name}</span>
                <span class="px-2 py-0.5 text-xs rounded ${badgeColor}">${component.level}</span>
                <span class="text-xs text-gray-500 dark:text-gray-400">${component.type}</span>
              </div>
              ${component.description ? `<p class="text-sm text-gray-600 dark:text-gray-400 truncate">${component.description}</p>` : ''}
              ${component.connections && component.connections.length > 0 ? `
                <div class="text-xs text-gray-400 dark:text-gray-500 mt-1">
                  Connects to: ${component.connections.map(c => c.target).join(', ')}
                </div>
              ` : ''}
            </div>
            <div class="flex items-center gap-1">
              <button class="c4-list-edit p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 rounded" data-component-id="${component.id}" title="Edit">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path>
                </svg>
              </button>
              <button class="c4-list-delete p-1.5 text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-gray-200 dark:hover:bg-gray-600 rounded" data-component-id="${component.id}" title="Delete">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                </svg>
              </button>
            </div>
          </div>
          ${hasChildren ? `<div class="c4-list-children">${this.renderC4ListItems(children, level + 1)}</div>` : ''}
        </div>
      `;
    }).join('');
  }

  triggerC4AutoLayout() {
    const currentComponents = this.getCurrentLevelComponents();
    if (currentComponents.length > 0) {
      this.applyHierarchicalLayout(currentComponents);
      this.updateC4ComponentPositions(currentComponents);
      this.drawC4Connections(currentComponents);
      this.saveC4Components();
    }
  }

  // Force-directed layout implementation
  initializeC4ForceLayout(components) {
    if (!this.c4PhysicsEnabled || components.length === 0) return;
    
    // Stop any existing simulation
    this.stopC4ForceLayout();
    
    // Use hierarchical layout first, then fine-tune with forces
    this.applyHierarchicalLayout(components);
    
    // Initialize physics properties for each component
    components.forEach(component => {
      if (!component.physics) {
        component.physics = {
          vx: 0, // velocity x
          vy: 0, // velocity y
          fx: null, // fixed x (null means not fixed)
          fy: null  // fixed y (null means not fixed)
        };
      }
    });
    
    this.c4ForceSimulation = {
      components: components,
      alpha: 0.15, // Lower initial energy after hierarchical layout
      alphaMin: 0.001, // Much lower minimum to stop completely
      alphaDecay: 0.1, // Faster decay to settle very quickly
      velocityDecay: 0.9, // Very high damping for rigid behavior
      velocityThreshold: 0.05 // Stop movement below this velocity
    };
    
    this.runC4ForceSimulation();
  }

  applyHierarchicalLayout(components) {
    const levelSpacing = 350; // Increased vertical spacing between levels
    const nodeSpacing = 300; // Increased horizontal spacing between nodes at same level
    const containerWidth = 1200; // Increased available width for layout
    
    // Group components by level and parent
    const componentsByLevel = {
      context: [],
      container: [],
      component: [],
      code: []
    };
    
    const componentsByParent = new Map();
    
    components.forEach(comp => {
      // Group by level
      if (componentsByLevel[comp.level]) {
        componentsByLevel[comp.level].push(comp);
      }
      
      // Group by parent
      if (comp.parent) {
        if (!componentsByParent.has(comp.parent)) {
          componentsByParent.set(comp.parent, []);
        }
        componentsByParent.get(comp.parent).push(comp);
      }
    });
    
    // Layout root level components (context level or components without parents)
    const rootComponents = components.filter(c => !c.parent);
    this.layoutComponentsInRow(rootComponents, 100, containerWidth, nodeSpacing);
    
    // Layout each level hierarchically
    const levels = ['context', 'container', 'component', 'code'];
    levels.forEach((level, levelIndex) => {
      const levelComponents = componentsByLevel[level];
      if (!levelComponents || levelComponents.length === 0) return;
      
      // For each component at this level, layout its children below it
      levelComponents.forEach(parent => {
        const children = componentsByParent.get(parent.id) || [];
        if (children.length > 0) {
          const parentY = parent.position.y + levelSpacing;
          const startX = parent.position.x - (children.length - 1) * nodeSpacing / 2;
          
          children.forEach((child, index) => {
            child.position.x = startX + index * nodeSpacing;
            child.position.y = parentY;
          });
        }
      });
    });
    
    // Apply final adjustments to prevent overlaps
    this.adjustForOverlaps(components);
  }
  
  layoutComponentsInRow(components, y, containerWidth, spacing) {
    if (components.length === 0) return;
    
    const totalWidth = (components.length - 1) * spacing;
    const startX = (containerWidth - totalWidth) / 2;
    
    components.forEach((comp, index) => {
      comp.position.x = startX + index * spacing;
      comp.position.y = y;
    });
  }
  
  adjustForOverlaps(components) {
    const componentWidth = 160;
    const componentHeight = 100;
    const minGap = 50; // Increased minimum gap
    
    // Sort by y position to process top to bottom
    const sortedComponents = [...components].sort((a, b) => a.position.y - b.position.y);
    
    sortedComponents.forEach((comp1, i) => {
      sortedComponents.slice(i + 1).forEach(comp2 => {
        const dx = Math.abs(comp1.position.x - comp2.position.x);
        const dy = Math.abs(comp1.position.y - comp2.position.y);
        
        const minDx = componentWidth + minGap;
        const minDy = componentHeight + minGap;
        
        // Check for overlap
        if (dx < minDx && dy < minDy) {
          // Move comp2 to resolve overlap
          if (dx < dy) {
            // Move horizontally
            const direction = comp2.position.x > comp1.position.x ? 1 : -1;
            comp2.position.x = comp1.position.x + direction * minDx;
          } else {
            // Move vertically
            comp2.position.y = comp1.position.y + minDy;
          }
        }
      });
    });
  }
  
  runC4ForceSimulation() {
    if (!this.c4ForceSimulation || this.c4ForceSimulation.alpha < this.c4ForceSimulation.alphaMin) {
      return;
    }
    
    const sim = this.c4ForceSimulation;
    const components = sim.components;
    
    // Apply forces
    this.applyC4RepulsionForce(components, sim.alpha);
    this.applyC4AttractionForce(components, sim.alpha);
    this.applyC4CenteringForce(components, sim.alpha);
    
    // Update positions based on velocities
    components.forEach(component => {
      if (component.physics.fx == null) {
        component.physics.vx *= sim.velocityDecay;
        
        // Stop movement if velocity is below threshold
        if (Math.abs(component.physics.vx) < sim.velocityThreshold) {
          component.physics.vx = 0;
        } else {
          component.position.x += component.physics.vx;
        }
      } else {
        component.position.x = component.physics.fx;
        component.physics.vx = 0;
      }
      
      if (component.physics.fy == null) {
        component.physics.vy *= sim.velocityDecay;
        
        // Stop movement if velocity is below threshold
        if (Math.abs(component.physics.vy) < sim.velocityThreshold) {
          component.physics.vy = 0;
        } else {
          component.position.y += component.physics.vy;
        }
      } else {
        component.position.y = component.physics.fy;
        component.physics.vy = 0;
      }
    });
    
    // Update visual positions
    this.updateC4ComponentPositions(components);
    
    // Decrease alpha for cooling
    sim.alpha += (sim.alphaMin - sim.alpha) * sim.alphaDecay;
    
    // Continue simulation
    this.c4AnimationFrame = requestAnimationFrame(() => this.runC4ForceSimulation());
  }
  
  applyC4RepulsionForce(components, alpha) {
    const strength = -800; // Stronger repulsion for better spacing
    const minDistance = 180; // Minimum distance between components
    
    for (let i = 0; i < components.length; i++) {
      for (let j = i + 1; j < components.length; j++) {
        const a = components[i];
        const b = components[j];
        
        let dx = a.position.x - b.position.x;
        let dy = a.position.y - b.position.y;
        let distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance === 0) {
          dx = Math.random() - 0.5;
          dy = Math.random() - 0.5;
          distance = 1;
        }
        
        // Only apply repulsion if components are too close
        if (distance < minDistance) {
          const force = strength * alpha / (distance * distance); // Quadratic falloff for stronger close-range repulsion
          const fx = (dx / distance) * force;
          const fy = (dy / distance) * force;
          
          a.physics.vx += fx;
          a.physics.vy += fy;
          b.physics.vx -= fx;
          b.physics.vy -= fy;
        }
      }
    }
  }
  
  applyC4AttractionForce(components, alpha) {
    const strength = 0.3; // Weaker attraction
    const idealDistance = 200; // Ideal distance between connected components
    const maxDistance = 400; // Only attract if farther than this
    
    components.forEach(component => {
      component.connections?.forEach(connection => {
        const target = components.find(c => 
          c.id === connection.target || c.name === connection.target
        );
        
        if (target) {
          let dx = target.position.x - component.position.x;
          let dy = target.position.y - component.position.y;
          let dist = Math.sqrt(dx * dx + dy * dy);
          
          // Only attract if they're too far apart
          if (dist > maxDistance) {
            const force = strength * alpha * (dist - idealDistance) / dist;
            const fx = dx * force * 0.5; // Reduce force
            const fy = dy * force * 0.5;
            
            component.physics.vx += fx;
            component.physics.vy += fy;
            target.physics.vx -= fx;
            target.physics.vy -= fy;
          }
        }
      });
    });
  }
  
  applyC4CenteringForce(components, alpha) {
    const strength = 0.02; // Much weaker centering force
    const centerX = 400;
    const centerY = 300;
    
    components.forEach(component => {
      const fx = (centerX - component.position.x) * strength * alpha;
      const fy = (centerY - component.position.y) * strength * alpha;
      
      component.physics.vx += fx;
      component.physics.vy += fy;
    });
  }
  
  updateC4ComponentPositions(components) {
    components.forEach(component => {
      const element = document.querySelector(`[data-c4-id="${component.id}"]`);
      if (element) {
        element.style.left = `${component.position.x}px`;
        element.style.top = `${component.position.y}px`;
      }
    });
    
    // Redraw connections
    this.drawC4Connections(components);
  }
  
  stopC4ForceLayout() {
    if (this.c4AnimationFrame) {
      cancelAnimationFrame(this.c4AnimationFrame);
      this.c4AnimationFrame = null;
    }
    this.c4ForceSimulation = null;
  }
  
  toggleC4Physics() {
    this.c4PhysicsEnabled = !this.c4PhysicsEnabled;

    if (this.c4PhysicsEnabled) {
      const currentComponents = this.getCurrentLevelComponents();
      this.initializeC4ForceLayout(currentComponents);
    } else {
      this.stopC4ForceLayout();
    }
  }

  // Strategic Levels Builder functionality
  async loadStrategicLevelsBuilders() {
    try {
      this.strategicLevelsBuilders = await StrategicLevelsAPI.fetchAll();
      this.renderStrategicLevelsSelector();
      if (this.strategicLevelsBuilders.length > 0 && !this.selectedStrategicBuilderId) {
        this.selectStrategicBuilder(this.strategicLevelsBuilders[0].id);
      } else if (this.selectedStrategicBuilderId) {
        this.selectStrategicBuilder(this.selectedStrategicBuilderId);
      } else {
        this.renderStrategicLevelsView(null);
      }
    } catch (error) {
      console.error("Error loading strategic levels builders:", error);
    }
  }

  renderStrategicLevelsSelector() {
    const selector = document.getElementById("strategicLevelsSelector");
    if (!selector) return;
    selector.innerHTML = '<option value="">Select Strategy</option>';
    this.strategicLevelsBuilders.forEach(builder => {
      const option = document.createElement("option");
      option.value = builder.id;
      option.textContent = builder.title;
      if (builder.id === this.selectedStrategicBuilderId) option.selected = true;
      selector.appendChild(option);
    });
  }

  selectStrategicBuilder(builderId) {
    this.selectedStrategicBuilderId = builderId;
    const selector = document.getElementById("strategicLevelsSelector");
    if (selector) selector.value = builderId;
    const builder = this.strategicLevelsBuilders.find(b => b.id === builderId);
    this.renderStrategicLevelsView(builder);

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

  renderStrategicLevelsView(builder) {
    const emptyState = document.getElementById("emptyStrategicLevelsState");
    const treeContainer = document.getElementById("strategicLevelsTree");

    if (!builder) {
      emptyState?.classList.remove("hidden");
      treeContainer?.classList.add("hidden");
      return;
    }

    emptyState?.classList.add("hidden");
    treeContainer?.classList.remove("hidden");

    if (this.strategicViewMode === "pyramid") {
      this.renderStrategicLevelsPyramid(builder, treeContainer);
    } else {
      this.renderStrategicLevelsTree(builder, treeContainer);
    }
  }

  setStrategicViewMode(mode) {
    this.strategicViewMode = mode;
    const builder = this.strategicLevelsBuilders.find(b => b.id === this.selectedStrategicBuilderId);
    this.renderStrategicLevelsView(builder);

    document.querySelectorAll(".strategic-view-toggle").forEach(btn => {
      btn.classList.remove("bg-gray-200", "dark:bg-gray-600");
      if (btn.dataset.mode === mode) {
        btn.classList.add("bg-gray-200", "dark:bg-gray-600");
      }
    });
  }

  buildStrategicTree(levels) {
    const levelOrder = ["vision", "mission", "goals", "objectives", "strategies", "tactics"];
    const roots = [];
    const nodeMap = new Map();

    levels.forEach(level => {
      nodeMap.set(level.id, { ...level, children: [] });
    });

    levels.forEach(level => {
      const node = nodeMap.get(level.id);
      if (level.parentId && nodeMap.has(level.parentId)) {
        nodeMap.get(level.parentId).children.push(node);
      } else {
        roots.push(node);
      }
    });

    roots.sort((a, b) => levelOrder.indexOf(a.level) - levelOrder.indexOf(b.level));
    const sortChildren = (node) => {
      node.children.sort((a, b) => (a.order || 0) - (b.order || 0));
      node.children.forEach(sortChildren);
    };
    roots.forEach(sortChildren);

    return roots;
  }

  renderStrategicNode(node, allLevels, depth = 0, isLast = true, prefix = "") {
    const levelLabels = {
      vision: "Vision", mission: "Mission", goals: "Goal",
      objectives: "Objective", strategies: "Strategy", tactics: "Tactic"
    };
    const levelColors = {
      vision: "border-l-purple-500", mission: "border-l-blue-500", goals: "border-l-green-500",
      objectives: "border-l-yellow-500", strategies: "border-l-orange-500", tactics: "border-l-red-500"
    };

    const progress = this.calculateStrategicLevelProgress(node, allLevels);
    const childLevelType = this.getChildLevelType(node.level);
    const linkedCount = (node.linkedTasks?.length || 0) + (node.linkedMilestones?.length || 0);
    const hasChildren = node.children && node.children.length > 0;

    let html = `
      <div class="strategic-tree-node" style="margin-left: ${depth * 24}px;">
        ${depth > 0 ? `<div class="strategic-tree-connector">${isLast ? "\u2514" : "\u251C"}\u2500</div>` : ""}
        <div class="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3 border-l-4 ${levelColors[node.level]} border border-gray-200 dark:border-gray-600 mb-2">
          <div class="flex items-start justify-between">
            <div class="flex-1">
              <div class="flex items-center gap-2 flex-wrap">
                <span class="text-xs px-1.5 py-0.5 rounded bg-gray-200 dark:bg-gray-600 text-gray-600 dark:text-gray-300">${levelLabels[node.level]}</span>
                <span class="font-medium text-gray-900 dark:text-gray-100">${this.escapeHtml(node.title)}</span>
                <span class="text-xs text-gray-500 dark:text-gray-400">(${Math.round(progress)}%)</span>
              </div>
              ${node.description ? `<p class="text-sm text-gray-600 dark:text-gray-400 mt-1">${this.escapeHtml(node.description)}</p>` : ""}
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
              ${childLevelType ? `
              <button onclick="taskManager.openStrategicLevelModal('${childLevelType}', null, '${node.id}')"
                      class="text-xs text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 px-2 py-1 rounded hover:bg-gray-200 dark:hover:bg-gray-600">+ ${levelLabels[childLevelType]}</button>
              ` : ""}
            </div>
          </div>
        </div>
      </div>
    `;

    if (hasChildren) {
      node.children.forEach((child, idx) => {
        const childIsLast = idx === node.children.length - 1;
        html += this.renderStrategicNode(child, allLevels, depth + 1, childIsLast, prefix);
      });
    }

    return html;
  }

  renderStrategicLevelsTree(builder, container) {
    const hasVision = builder.levels.some(l => l.level === "vision");
    let html = "";

    if (!hasVision) {
      html += `
        <div class="flex justify-center py-4">
          <button onclick="taskManager.openStrategicLevelModal('vision')"
                  class="btn-primary py-2 px-4 rounded-lg">+ Add Vision</button>
        </div>
      `;
    }

    const tree = this.buildStrategicTree(builder.levels);
    tree.forEach((root, idx) => {
      html += this.renderStrategicNode(root, builder.levels, 0, idx === tree.length - 1);
    });

    container.innerHTML = html;
  }

  renderStrategicLevelsPyramid(builder, container) {
    const levelOrder = ["vision", "mission", "goals", "objectives", "strategies", "tactics"];
    const levelLabels = {
      vision: "Vision", mission: "Mission", goals: "Goals",
      objectives: "Objectives", strategies: "Strategies", tactics: "Tactics"
    };
    const pyramidWidths = {
      vision: "max-w-sm", mission: "max-w-md", goals: "max-w-lg",
      objectives: "max-w-xl", strategies: "max-w-2xl", tactics: "max-w-3xl"
    };

    const hasVision = builder.levels.some(l => l.level === "vision");
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
        .filter(l => l.level === levelType)
        .sort((a, b) => (a.order || 0) - (b.order || 0));

      if (levelsOfType.length === 0) continue;

      html += `
        <div class="pyramid-row ${pyramidWidths[levelType]} mx-auto mb-3">
          <div class="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2 text-center">${levelLabels[levelType]}</div>
          <div class="flex flex-wrap justify-center gap-2">
      `;

      for (const level of levelsOfType) {
        const progress = this.calculateStrategicLevelProgress(level, builder.levels);
        const childLevelType = this.getChildLevelType(levelType);

        html += `
          <div class="pyramid-card bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3 border border-gray-200 dark:border-gray-600 flex-1 min-w-[140px] max-w-[200px]">
            <div class="text-center">
              <div class="font-medium text-gray-900 dark:text-gray-100 text-sm truncate" title="${this.escapeHtml(level.title)}">${this.escapeHtml(level.title)}</div>
              <div class="text-xs text-gray-500 dark:text-gray-400 mt-1">${Math.round(progress)}%</div>
              <div class="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-1 mt-2">
                <div class="bg-gray-900 dark:bg-gray-100 h-1 rounded-full" style="width: ${progress}%"></div>
              </div>
              <div class="flex justify-center gap-1 mt-2">
                <button onclick="taskManager.openStrategicLevelModal('${levelType}', '${level.id}')"
                        class="text-xs text-gray-500 hover:text-gray-700 dark:hover:text-gray-300">Edit</button>
                <button onclick="taskManager.openStrategicLinkModal('${level.id}')"
                        class="text-xs text-gray-500 hover:text-gray-700 dark:hover:text-gray-300">Link</button>
                ${childLevelType ? `
                <button onclick="taskManager.openStrategicLevelModal('${childLevelType}', null, '${level.id}')"
                        class="text-xs text-gray-500 hover:text-gray-700 dark:hover:text-gray-300">+</button>
                ` : ""}
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

    html += '</div>';
    container.innerHTML = html;
  }

  getChildLevelType(parentLevel) {
    const levelOrder = ["vision", "mission", "goals", "objectives", "strategies", "tactics"];
    const idx = levelOrder.indexOf(parentLevel);
    return idx < levelOrder.length - 1 ? levelOrder[idx + 1] : null;
  }

  calculateStrategicLevelProgress(level, allLevels) {
    const linkedTasks = (level.linkedTasks || [])
      .map(id => this.findTaskInArray(this.tasks, id))
      .filter(Boolean);
    const linkedMilestones = (level.linkedMilestones || [])
      .map(id => this.milestones?.find(m => m.id === id))
      .filter(Boolean);

    let directProgress = 0;
    let directCount = linkedTasks.length + linkedMilestones.length;

    if (directCount > 0) {
      const tasksDone = linkedTasks.filter(t => t.completed).length;
      const milestonesDone = linkedMilestones.filter(m => m.status === "closed").length;
      directProgress = (tasksDone + milestonesDone) / directCount;
    }

    // Get children progress (rollup)
    const children = allLevels.filter(l => l.parentId === level.id);
    if (children.length === 0) return directProgress * 100;

    const childrenProgress = children.map(c => this.calculateStrategicLevelProgress(c, allLevels));
    const avgChildProgress = childrenProgress.reduce((a, b) => a + b, 0) / children.length;

    // Combine direct + children (weighted if both exist)
    if (directCount > 0 && children.length > 0) {
      return (directProgress * 100 * 0.3 + avgChildProgress * 0.7);
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

  openStrategicLevelsModal(editId = null) {
    const modal = document.getElementById("strategicLevelsModal");
    const title = document.getElementById("strategicLevelsModalTitle");
    document.getElementById("strategicLevelsTitle").value = "";
    document.getElementById("strategicLevelsDate").value = new Date().toISOString().split("T")[0];

    if (editId) {
      this.editingStrategicBuilderId = editId;
      const builder = this.strategicLevelsBuilders.find(b => b.id === editId);
      if (builder) {
        document.getElementById("strategicLevelsTitle").value = builder.title;
        document.getElementById("strategicLevelsDate").value = builder.date;
      }
      title.textContent = "Edit Strategy";
    } else {
      this.editingStrategicBuilderId = null;
      title.textContent = "New Strategy";
    }

    modal?.classList.remove("hidden");
    modal?.classList.add("flex");
    document.getElementById("strategicLevelsTitle").focus();
  }

  closeStrategicLevelsModal() {
    const modal = document.getElementById("strategicLevelsModal");
    modal?.classList.add("hidden");
    modal?.classList.remove("flex");
    this.editingStrategicBuilderId = null;
  }

  async saveStrategicLevelsBuilder(e) {
    e.preventDefault();
    const titleEl = document.getElementById("strategicLevelsTitle");
    const dateEl = document.getElementById("strategicLevelsDate");
    const title = titleEl.value.trim();
    const date = dateEl.value;

    if (!title) return;

    try {
      if (this.editingStrategicBuilderId) {
        await StrategicLevelsAPI.update(this.editingStrategicBuilderId, { title, date });
      } else {
        const response = await StrategicLevelsAPI.create({ title, date });
        const newBuilder = await response.json();
        this.selectedStrategicBuilderId = newBuilder.id;
      }
      this.closeStrategicLevelsModal();
      await this.loadStrategicLevelsBuilders();
    } catch (error) {
      console.error("Error saving strategic levels builder:", error);
    }
  }

  editStrategicBuilder() {
    if (!this.selectedStrategicBuilderId) return;
    this.openStrategicLevelsModal(this.selectedStrategicBuilderId);
  }

  async deleteStrategicBuilder() {
    if (!this.selectedStrategicBuilderId) return;
    if (!confirm("Are you sure you want to delete this strategy?")) return;

    try {
      await StrategicLevelsAPI.delete(this.selectedStrategicBuilderId);
      this.selectedStrategicBuilderId = null;
      await this.loadStrategicLevelsBuilders();
    } catch (error) {
      console.error("Error deleting strategic builder:", error);
    }
  }

  openStrategicLevelModal(levelType, editId = null, parentId = null) {
    const modal = document.getElementById("strategicLevelModal");
    const title = document.getElementById("strategicLevelModalTitle");
    const typeSelect = document.getElementById("strategicLevelType");
    const parentGroup = document.getElementById("strategicLevelParentGroup");
    const parentSelect = document.getElementById("strategicLevelParent");

    document.getElementById("strategicLevelTitle").value = "";
    document.getElementById("strategicLevelDescription").value = "";
    typeSelect.value = levelType;

    this.strategicLevelParentId = parentId;
    this.strategicLevelType = levelType;

    // Populate parent options
    const builder = this.strategicLevelsBuilders.find(b => b.id === this.selectedStrategicBuilderId);
    parentSelect.innerHTML = '<option value="">None (Root)</option>';

    if (builder) {
      const parentLevelType = this.getParentLevelType(levelType);
      if (parentLevelType) {
        const potentialParents = builder.levels.filter(l => l.level === parentLevelType);
        potentialParents.forEach(p => {
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
      this.editingStrategicLevelId = editId;
      const level = builder?.levels.find(l => l.id === editId);
      if (level) {
        document.getElementById("strategicLevelTitle").value = level.title;
        document.getElementById("strategicLevelDescription").value = level.description || "";
        typeSelect.value = level.level;
        parentSelect.value = level.parentId || "";
      }
      title.textContent = "Edit Level";
    } else {
      this.editingStrategicLevelId = null;
      title.textContent = "Add Level";
    }

    modal?.classList.remove("hidden");
    modal?.classList.add("flex");
    document.getElementById("strategicLevelTitle").focus();
  }

  getParentLevelType(levelType) {
    const levelOrder = ["vision", "mission", "goals", "objectives", "strategies", "tactics"];
    const idx = levelOrder.indexOf(levelType);
    return idx > 0 ? levelOrder[idx - 1] : null;
  }

  closeStrategicLevelModal() {
    const modal = document.getElementById("strategicLevelModal");
    modal?.classList.add("hidden");
    modal?.classList.remove("flex");
    this.editingStrategicLevelId = null;
    this.strategicLevelParentId = null;
    this.strategicLevelType = null;
  }

  async saveStrategicLevel(e) {
    e.preventDefault();
    if (!this.selectedStrategicBuilderId) return;

    const title = document.getElementById("strategicLevelTitle").value.trim();
    const description = document.getElementById("strategicLevelDescription").value.trim();
    const level = document.getElementById("strategicLevelType").value;
    const parentId = document.getElementById("strategicLevelParent").value || undefined;

    if (!title) return;

    try {
      if (this.editingStrategicLevelId) {
        await StrategicLevelsAPI.updateLevel(this.selectedStrategicBuilderId, this.editingStrategicLevelId, { title, description, level, parentId });
      } else {
        await StrategicLevelsAPI.createLevel(this.selectedStrategicBuilderId, { title, description, level, parentId });
      }
      this.closeStrategicLevelModal();
      await this.loadStrategicLevelsBuilders();
    } catch (error) {
      console.error("Error saving strategic level:", error);
    }
  }

  async deleteStrategicLevel(levelId) {
    if (!this.selectedStrategicBuilderId || !levelId) return;

    const builder = this.strategicLevelsBuilders.find(b => b.id === this.selectedStrategicBuilderId);
    if (!builder) return;

    const children = builder.levels.filter(l => l.parentId === levelId);
    if (children.length > 0) {
      const childNames = children.map(c => c.title).join(", ");
      if (!confirm(`This level has ${children.length} child level(s): ${childNames}.\n\nDeleting will also remove all children. Continue?`)) {
        return;
      }
    } else {
      if (!confirm("Are you sure you want to delete this level?")) return;
    }

    try {
      await StrategicLevelsAPI.deleteLevel(this.selectedStrategicBuilderId, levelId);
      await this.loadStrategicLevelsBuilders();
    } catch (error) {
      console.error("Error deleting strategic level:", error);
    }
  }

  async openStrategicLinkModal(levelId) {
    this.linkingStrategicLevelId = levelId;
    const modal = document.getElementById("strategicLinkModal");
    const tasksContainer = document.getElementById("strategicLinkTasks");
    const milestonesContainer = document.getElementById("strategicLinkMilestones");

    const builder = this.strategicLevelsBuilders.find(b => b.id === this.selectedStrategicBuilderId);
    const level = builder?.levels.find(l => l.id === levelId);

    // Render task checkboxes
    const allTasks = this.flattenTasks(this.tasks);
    tasksContainer.innerHTML = allTasks.length > 0 ? allTasks.map(task => `
      <label class="flex items-center gap-2 p-1 hover:bg-gray-50 dark:hover:bg-gray-700 rounded cursor-pointer">
        <input type="checkbox" class="strategic-link-task rounded" value="${task.id}"
               ${level?.linkedTasks?.includes(task.id) ? "checked" : ""}>
        <span class="text-sm text-gray-700 dark:text-gray-300 ${task.completed ? "line-through" : ""}">${this.escapeHtml(task.title)}</span>
      </label>
    `).join("") : '<p class="text-sm text-gray-500 dark:text-gray-400 p-2">No tasks available</p>';

    // Render milestone checkboxes
    try {
      const milestones = await MilestonesAPI.fetchAll();
      milestonesContainer.innerHTML = milestones.length > 0 ? milestones.map(m => `
        <label class="flex items-center gap-2 p-1 hover:bg-gray-50 dark:hover:bg-gray-700 rounded cursor-pointer">
          <input type="checkbox" class="strategic-link-milestone rounded" value="${m.id}"
                 ${level?.linkedMilestones?.includes(m.id) ? "checked" : ""}>
          <span class="text-sm text-gray-700 dark:text-gray-300">${this.escapeHtml(m.name)}</span>
        </label>
      `).join("") : '<p class="text-sm text-gray-500 dark:text-gray-400 p-2">No milestones available</p>';
    } catch (error) {
      milestonesContainer.innerHTML = '<p class="text-sm text-gray-500 dark:text-gray-400 p-2">Error loading milestones</p>';
    }

    modal?.classList.remove("hidden");
    modal?.classList.add("flex");
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

  closeStrategicLinkModal() {
    const modal = document.getElementById("strategicLinkModal");
    modal?.classList.add("hidden");
    modal?.classList.remove("flex");
    this.linkingStrategicLevelId = null;
  }

  async saveStrategicLinks() {
    if (!this.selectedStrategicBuilderId || !this.linkingStrategicLevelId) return;

    const linkedTasks = Array.from(document.querySelectorAll(".strategic-link-task:checked"))
      .map(cb => cb.value);
    const linkedMilestones = Array.from(document.querySelectorAll(".strategic-link-milestone:checked"))
      .map(cb => cb.value);

    try {
      await StrategicLevelsAPI.updateLevel(this.selectedStrategicBuilderId, this.linkingStrategicLevelId, { linkedTasks, linkedMilestones });
      this.closeStrategicLinkModal();
      await this.loadStrategicLevelsBuilders();
    } catch (error) {
      console.error("Error saving strategic links:", error);
    }
  }

  // ================== ZETTELKASTEN IDEA LINKING ==================

  openIdeaLinkPicker() {
    if (!this.editingIdeaId) return;
    const modal = document.getElementById("ideaLinkPickerModal");
    this.tempIdeaLinks = [...(this.ideas.find(i => i.id === this.editingIdeaId)?.links || [])];
    this.renderIdeaLinkList("");
    modal.classList.remove("hidden");
    modal.classList.add("flex");
  }

  closeIdeaLinkPicker() {
    const modal = document.getElementById("ideaLinkPickerModal");
    modal.classList.add("hidden");
    modal.classList.remove("flex");
    document.getElementById("ideaLinkSearch").value = "";
  }

  renderIdeaLinkList(filter) {
    const container = document.getElementById("ideaLinkList");
    const currentId = this.editingIdeaId;
    const filtered = this.ideas.filter(i =>
      i.id !== currentId &&
      (filter === "" || i.title.toLowerCase().includes(filter.toLowerCase()))
    );

    if (filtered.length === 0) {
      container.innerHTML = '<p class="text-gray-500 dark:text-gray-400 text-sm text-center">No other ideas found</p>';
      return;
    }

    container.innerHTML = filtered.map(idea => `
      <label class="flex items-center p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded cursor-pointer">
        <input type="checkbox" class="idea-link-checkbox h-4 w-4 text-gray-900 border-gray-300 rounded"
          value="${idea.id}" ${this.tempIdeaLinks.includes(idea.id) ? "checked" : ""}>
        <span class="ml-3 text-sm text-gray-700 dark:text-gray-300">${idea.title}</span>
        <span class="ml-2 text-xs px-2 py-0.5 bg-gray-200 dark:bg-gray-600 rounded">${idea.status}</span>
      </label>
    `).join("");

    container.querySelectorAll(".idea-link-checkbox").forEach(cb => {
      cb.addEventListener("change", (e) => {
        if (e.target.checked) {
          if (!this.tempIdeaLinks.includes(e.target.value)) {
            this.tempIdeaLinks.push(e.target.value);
          }
        } else {
          this.tempIdeaLinks = this.tempIdeaLinks.filter(id => id !== e.target.value);
        }
      });
    });
  }

  filterIdeaLinkList(filter) {
    this.renderIdeaLinkList(filter);
  }

  saveIdeaLinks() {
    this.closeIdeaLinkPicker();
    this.updateIdeaLinksDisplay();
  }

  updateIdeaLinksDisplay() {
    const container = document.getElementById("ideaLinksDisplay");
    if (!container) return;

    if (!this.tempIdeaLinks || this.tempIdeaLinks.length === 0) {
      container.innerHTML = '<span class="text-gray-400 text-sm">No linked ideas</span>';
      return;
    }

    container.innerHTML = this.tempIdeaLinks.map(linkId => {
      const linkedIdea = this.ideas.find(i => i.id === linkId);
      return linkedIdea ? `
        <span class="inline-flex items-center px-2 py-1 bg-gray-200 dark:bg-gray-600 rounded text-sm">
          ${linkedIdea.title}
          <button type="button" onclick="taskManager.removeIdeaLink('${linkId}')" class="ml-1 text-gray-500 hover:text-gray-700">&times;</button>
        </span>
      ` : "";
    }).join("");
  }

  removeIdeaLink(linkId) {
    this.tempIdeaLinks = this.tempIdeaLinks.filter(id => id !== linkId);
    this.updateIdeaLinksDisplay();
  }

  // Override openIdeaModal to handle links
  openIdeaModalWithLinks(id = null) {
    this.editingIdeaId = id;
    const modal = document.getElementById("ideaModal");
    const title = document.getElementById("ideaModalTitle");
    const form = document.getElementById("ideaForm");
    const linksSection = document.getElementById("ideaLinksSection");

    form.reset();
    title.textContent = id ? "Edit Idea" : "Add Idea";
    this.tempIdeaLinks = [];

    if (id && this.ideas) {
      const idea = this.ideas.find(i => i.id === id);
      if (idea) {
        document.getElementById("ideaTitle").value = idea.title;
        document.getElementById("ideaStatus").value = idea.status;
        document.getElementById("ideaCategory").value = idea.category || "";
        document.getElementById("ideaDescription").value = idea.description || "";
        this.tempIdeaLinks = [...(idea.links || [])];
        linksSection?.classList.remove("hidden");
        this.updateIdeaLinksDisplay();
      }
    } else {
      linksSection?.classList.add("hidden");
    }

    modal.classList.remove("hidden");
    modal.classList.add("flex");
  }

  // ================== BILLING FUNCTIONALITY ==================

  async loadBillingData() {
    try {
      const [customers, rates, quotes, invoices, summary] = await Promise.all([
        fetch("/api/customers").then(r => r.json()),
        fetch("/api/billing-rates").then(r => r.json()),
        fetch("/api/quotes").then(r => r.json()),
        fetch("/api/invoices").then(r => r.json()),
        fetch("/api/billing/summary").then(r => r.json()),
      ]);

      this.customers = customers;
      this.billingRates = rates;
      this.quotes = quotes;
      this.invoices = invoices;
      this.billingSummary = summary;

      this.renderBillingSummary();
      this.renderCustomersView();
      this.renderBillingRatesView();
      this.renderQuotesView();
      this.renderInvoicesView();
    } catch (error) {
      console.error("Error loading billing data:", error);
    }
  }

  renderBillingSummary() {
    const s = this.billingSummary || {};
    document.getElementById("billingSummaryOutstanding").textContent = this.formatCurrency(s.totalOutstanding || 0);
    document.getElementById("billingSummaryOverdue").textContent = this.formatCurrency(s.totalOverdue || 0);
    document.getElementById("billingSummaryPaid").textContent = this.formatCurrency(s.totalPaid || 0);
    document.getElementById("billingSummaryDraft").textContent = s.draftInvoices || 0;
  }

  formatCurrency(amount) {
    return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(amount);
  }

  switchBillingTab(tab) {
    document.querySelectorAll(".billing-tab").forEach(t => {
      t.classList.remove("text-gray-900", "dark:text-gray-100", "border-b-2", "border-gray-900", "dark:border-gray-100");
      t.classList.add("text-gray-500", "dark:text-gray-400");
    });
    document.querySelector(`[data-billing-tab="${tab}"]`)?.classList.add("text-gray-900", "dark:text-gray-100", "border-b-2", "border-gray-900", "dark:border-gray-100");
    document.querySelector(`[data-billing-tab="${tab}"]`)?.classList.remove("text-gray-500", "dark:text-gray-400");

    document.querySelectorAll(".billing-tab-content").forEach(c => c.classList.add("hidden"));
    document.getElementById(`${tab}Tab`)?.classList.remove("hidden");
  }

  // Customer methods
  renderCustomersView() {
    const container = document.getElementById("customersContainer");
    const emptyState = document.getElementById("emptyCustomersState");

    if (!this.customers || this.customers.length === 0) {
      emptyState?.classList.remove("hidden");
      container.innerHTML = "";
      return;
    }

    emptyState?.classList.add("hidden");
    container.innerHTML = this.customers.map(c => `
      <div class="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 border border-gray-200 dark:border-gray-600">
        <div class="flex justify-between items-start mb-2">
          <h3 class="font-medium text-gray-900 dark:text-gray-100">${c.name}</h3>
          ${c.company ? `<span class="text-xs px-2 py-0.5 bg-gray-200 dark:bg-gray-600 rounded">${c.company}</span>` : ""}
        </div>
        ${c.email ? `<p class="text-sm text-gray-600 dark:text-gray-400">${c.email}</p>` : ""}
        ${c.phone ? `<p class="text-sm text-gray-600 dark:text-gray-400">${c.phone}</p>` : ""}
        <div class="flex justify-end space-x-2 mt-3">
          <button onclick="taskManager.openCustomerModal('${c.id}')" class="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900">Edit</button>
          <button onclick="taskManager.deleteCustomer('${c.id}')" class="text-sm text-red-600 hover:text-red-800">Delete</button>
        </div>
      </div>
    `).join("");
  }

  openCustomerModal(id = null) {
    this.editingCustomerId = id;
    const modal = document.getElementById("customerModal");
    const title = document.getElementById("customerModalTitle");
    document.getElementById("customerForm").reset();

    title.textContent = id ? "Edit Customer" : "Add Customer";

    if (id) {
      const c = this.customers.find(c => c.id === id);
      if (c) {
        document.getElementById("customerName").value = c.name;
        document.getElementById("customerEmail").value = c.email || "";
        document.getElementById("customerPhone").value = c.phone || "";
        document.getElementById("customerCompany").value = c.company || "";
        document.getElementById("customerStreet").value = c.billingAddress?.street || "";
        document.getElementById("customerCity").value = c.billingAddress?.city || "";
        document.getElementById("customerState").value = c.billingAddress?.state || "";
        document.getElementById("customerPostalCode").value = c.billingAddress?.postalCode || "";
        document.getElementById("customerCountry").value = c.billingAddress?.country || "";
        document.getElementById("customerNotes").value = c.notes || "";
      }
    }

    modal.classList.remove("hidden");
    modal.classList.add("flex");
  }

  closeCustomerModal() {
    const modal = document.getElementById("customerModal");
    modal.classList.add("hidden");
    modal.classList.remove("flex");
    this.editingCustomerId = null;
  }

  async saveCustomer(e) {
    e.preventDefault();
    const data = {
      name: document.getElementById("customerName").value,
      email: document.getElementById("customerEmail").value || null,
      phone: document.getElementById("customerPhone").value || null,
      company: document.getElementById("customerCompany").value || null,
      billingAddress: {
        street: document.getElementById("customerStreet").value || null,
        city: document.getElementById("customerCity").value || null,
        state: document.getElementById("customerState").value || null,
        postalCode: document.getElementById("customerPostalCode").value || null,
        country: document.getElementById("customerCountry").value || null,
      },
      notes: document.getElementById("customerNotes").value || null,
    };

    try {
      if (this.editingCustomerId) {
        await BillingAPI.updateCustomer(this.editingCustomerId, data);
      } else {
        await BillingAPI.createCustomer(data);
      }
      this.closeCustomerModal();
      await this.loadBillingData();
    } catch (error) {
      console.error("Error saving customer:", error);
    }
  }

  async deleteCustomer(id) {
    if (!confirm("Delete this customer?")) return;
    try {
      await BillingAPI.deleteCustomer(id);
      await this.loadBillingData();
    } catch (error) {
      console.error("Error deleting customer:", error);
    }
  }

  // Billing Rate methods
  renderBillingRatesView() {
    const container = document.getElementById("billingRatesContainer");
    const emptyState = document.getElementById("emptyRatesState");

    if (!this.billingRates || this.billingRates.length === 0) {
      emptyState?.classList.remove("hidden");
      container.innerHTML = "";
      return;
    }

    emptyState?.classList.add("hidden");
    container.innerHTML = this.billingRates.map(r => `
      <div class="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 border border-gray-200 dark:border-gray-600">
        <div class="flex justify-between items-start mb-2">
          <h3 class="font-medium text-gray-900 dark:text-gray-100">${r.name}</h3>
          ${r.isDefault ? '<span class="text-xs px-2 py-0.5 bg-gray-900 text-white rounded">Default</span>' : ""}
        </div>
        <p class="text-xl font-bold text-gray-900 dark:text-gray-100">${this.formatCurrency(r.hourlyRate)}/hr</p>
        ${r.assignee ? `<p class="text-sm text-gray-600 dark:text-gray-400">Assignee: ${r.assignee}</p>` : ""}
        <div class="flex justify-end space-x-2 mt-3">
          <button onclick="taskManager.openBillingRateModal('${r.id}')" class="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900">Edit</button>
          <button onclick="taskManager.deleteBillingRate('${r.id}')" class="text-sm text-red-600 hover:text-red-800">Delete</button>
        </div>
      </div>
    `).join("");
  }

  openBillingRateModal(id = null) {
    this.editingBillingRateId = id;
    const modal = document.getElementById("billingRateModal");
    const title = document.getElementById("billingRateModalTitle");
    document.getElementById("billingRateForm").reset();

    title.textContent = id ? "Edit Billing Rate" : "Add Billing Rate";

    if (id) {
      const r = this.billingRates.find(r => r.id === id);
      if (r) {
        document.getElementById("billingRateName").value = r.name;
        document.getElementById("billingRateHourly").value = r.hourlyRate;
        document.getElementById("billingRateAssignee").value = r.assignee || "";
        document.getElementById("billingRateDefault").checked = r.isDefault || false;
      }
    }

    modal.classList.remove("hidden");
    modal.classList.add("flex");
  }

  closeBillingRateModal() {
    const modal = document.getElementById("billingRateModal");
    modal.classList.add("hidden");
    modal.classList.remove("flex");
    this.editingBillingRateId = null;
  }

  async saveBillingRate(e) {
    e.preventDefault();
    const data = {
      name: document.getElementById("billingRateName").value,
      hourlyRate: parseFloat(document.getElementById("billingRateHourly").value) || 0,
      assignee: document.getElementById("billingRateAssignee").value || null,
      isDefault: document.getElementById("billingRateDefault").checked,
    };

    try {
      if (this.editingBillingRateId) {
        await BillingAPI.updateRate(this.editingBillingRateId, data);
      } else {
        await BillingAPI.createRate(data);
      }
      this.closeBillingRateModal();
      await this.loadBillingData();
    } catch (error) {
      console.error("Error saving billing rate:", error);
    }
  }

  async deleteBillingRate(id) {
    if (!confirm("Delete this billing rate?")) return;
    try {
      await BillingAPI.deleteRate(id);
      await this.loadBillingData();
    } catch (error) {
      console.error("Error deleting billing rate:", error);
    }
  }

  // Quote methods
  renderQuotesView() {
    const container = document.getElementById("quotesContainer");
    const emptyState = document.getElementById("emptyQuotesState");

    if (!this.quotes || this.quotes.length === 0) {
      emptyState?.classList.remove("hidden");
      container.innerHTML = "";
      return;
    }

    emptyState?.classList.add("hidden");
    const statusColors = {
      draft: "bg-gray-200 text-gray-800",
      sent: "bg-blue-100 text-blue-800",
      accepted: "bg-green-100 text-green-800",
      rejected: "bg-red-100 text-red-800",
    };

    container.innerHTML = this.quotes.map(q => {
      const customer = this.customers.find(c => c.id === q.customerId);
      return `
        <div class="bg-white dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600 p-4">
          <div class="flex justify-between items-start mb-2">
            <div>
              <p class="text-xs text-gray-500 dark:text-gray-400">${q.number}</p>
              <h3 class="font-medium text-gray-900 dark:text-gray-100">${q.title}</h3>
              <p class="text-sm text-gray-600 dark:text-gray-400">${customer?.name || "Unknown"}</p>
            </div>
            <span class="px-2 py-1 text-xs rounded ${statusColors[q.status] || statusColors.draft}">${q.status}</span>
          </div>
          <p class="text-xl font-bold text-gray-900 dark:text-gray-100">${this.formatCurrency(q.total)}</p>
          <p class="text-xs text-gray-500 dark:text-gray-400">Created: ${q.created}</p>
          <div class="flex justify-end space-x-2 mt-3">
            ${q.status === "draft" ? `<button onclick="taskManager.sendQuote('${q.id}')" class="text-sm text-blue-600 hover:text-blue-800">Send</button>` : ""}
            ${q.status === "sent" ? `<button onclick="taskManager.acceptQuote('${q.id}')" class="text-sm text-green-600 hover:text-green-800">Accept</button>` : ""}
            ${q.status === "accepted" ? `<button onclick="taskManager.convertQuoteToInvoice('${q.id}')" class="text-sm text-purple-600 hover:text-purple-800">To Invoice</button>` : ""}
            <button onclick="taskManager.openQuoteModal('${q.id}')" class="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900">Edit</button>
            <button onclick="taskManager.deleteQuote('${q.id}')" class="text-sm text-red-600 hover:text-red-800">Delete</button>
          </div>
        </div>
      `;
    }).join("");
  }

  openQuoteModal(id = null) {
    this.editingQuoteId = id;
    const modal = document.getElementById("quoteModal");
    const title = document.getElementById("quoteModalTitle");
    document.getElementById("quoteForm").reset();
    this.quoteLineItems = [];

    this.populateCustomerSelect("quoteCustomer");
    title.textContent = id ? "Edit Quote" : "New Quote";

    if (id) {
      const q = this.quotes.find(q => q.id === id);
      if (q) {
        document.getElementById("quoteTitle").value = q.title;
        document.getElementById("quoteCustomer").value = q.customerId;
        document.getElementById("quoteValidUntil").value = q.validUntil || "";
        document.getElementById("quoteTaxRate").value = q.taxRate || 0;
        document.getElementById("quoteNotes").value = q.notes || "";
        this.quoteLineItems = [...q.lineItems];
      }
    }

    this.renderQuoteLineItems();
    this.updateQuoteTotals();
    modal.classList.remove("hidden");
    modal.classList.add("flex");
  }

  closeQuoteModal() {
    const modal = document.getElementById("quoteModal");
    modal.classList.add("hidden");
    modal.classList.remove("flex");
    this.editingQuoteId = null;
  }

  populateCustomerSelect(selectId) {
    const select = document.getElementById(selectId);
    select.innerHTML = '<option value="">Select customer...</option>' +
      this.customers.map(c => `<option value="${c.id}">${c.name}</option>`).join("");
  }

  addQuoteLineItem() {
    const id = crypto.randomUUID().substring(0, 8);
    this.quoteLineItems.push({ id, description: "", quantity: 1, rate: 0, amount: 0 });
    this.renderQuoteLineItems();
  }

  renderQuoteLineItems() {
    const container = document.getElementById("quoteLineItems");
    container.innerHTML = this.quoteLineItems.map((item, idx) => `
      <div class="flex gap-2 items-center" data-line-id="${item.id}">
        <input type="text" placeholder="Description" value="${item.description}"
          onchange="taskManager.updateQuoteLineItem('${item.id}', 'description', this.value)"
          class="flex-1 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded px-2 py-1 text-sm">
        <input type="number" placeholder="Qty" value="${item.quantity}" step="0.01" min="0"
          onchange="taskManager.updateQuoteLineItem('${item.id}', 'quantity', this.value)"
          class="w-16 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded px-2 py-1 text-sm">
        <input type="number" placeholder="Rate" value="${item.rate}" step="0.01" min="0"
          onchange="taskManager.updateQuoteLineItem('${item.id}', 'rate', this.value)"
          class="w-20 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded px-2 py-1 text-sm">
        <span class="w-20 text-sm text-right">${this.formatCurrency(item.amount)}</span>
        <button type="button" onclick="taskManager.removeQuoteLineItem('${item.id}')" class="text-red-600 hover:text-red-800">&times;</button>
      </div>
    `).join("");
  }

  updateQuoteLineItem(id, field, value) {
    const item = this.quoteLineItems.find(i => i.id === id);
    if (!item) return;
    if (field === "quantity" || field === "rate") {
      item[field] = parseFloat(value) || 0;
      item.amount = item.quantity * item.rate;
    } else {
      item[field] = value;
    }
    this.renderQuoteLineItems();
    this.updateQuoteTotals();
  }

  removeQuoteLineItem(id) {
    this.quoteLineItems = this.quoteLineItems.filter(i => i.id !== id);
    this.renderQuoteLineItems();
    this.updateQuoteTotals();
  }

  updateQuoteTotals() {
    const subtotal = this.quoteLineItems.reduce((sum, i) => sum + i.amount, 0);
    const taxRate = parseFloat(document.getElementById("quoteTaxRate").value) || 0;
    const tax = subtotal * (taxRate / 100);
    const total = subtotal + tax;

    document.getElementById("quoteSubtotal").textContent = this.formatCurrency(subtotal);
    document.getElementById("quoteTax").textContent = this.formatCurrency(tax);
    document.getElementById("quoteTotal").textContent = this.formatCurrency(total);
  }

  async saveQuote(e) {
    e.preventDefault();
    const data = {
      title: document.getElementById("quoteTitle").value,
      customerId: document.getElementById("quoteCustomer").value,
      validUntil: document.getElementById("quoteValidUntil").value || null,
      taxRate: parseFloat(document.getElementById("quoteTaxRate").value) || 0,
      lineItems: this.quoteLineItems,
      notes: document.getElementById("quoteNotes").value || null,
    };

    try {
      if (this.editingQuoteId) {
        await BillingAPI.updateQuote(this.editingQuoteId, data);
      } else {
        await BillingAPI.createQuote(data);
      }
      this.closeQuoteModal();
      await this.loadBillingData();
    } catch (error) {
      console.error("Error saving quote:", error);
    }
  }

  async deleteQuote(id) {
    if (!confirm("Delete this quote?")) return;
    try {
      await BillingAPI.deleteQuote(id);
      await this.loadBillingData();
    } catch (error) {
      console.error("Error deleting quote:", error);
    }
  }

  async sendQuote(id) {
    try {
      await BillingAPI.sendQuote(id);
      await this.loadBillingData();
    } catch (error) {
      console.error("Error sending quote:", error);
    }
  }

  async acceptQuote(id) {
    try {
      await BillingAPI.acceptQuote(id);
      await this.loadBillingData();
    } catch (error) {
      console.error("Error accepting quote:", error);
    }
  }

  async convertQuoteToInvoice(id) {
    try {
      await BillingAPI.convertQuoteToInvoice(id);
      await this.loadBillingData();
      this.switchBillingTab("invoices");
    } catch (error) {
      console.error("Error converting quote to invoice:", error);
    }
  }

  // Invoice methods
  renderInvoicesView() {
    const container = document.getElementById("invoicesContainer");
    const emptyState = document.getElementById("emptyInvoicesState");

    if (!this.invoices || this.invoices.length === 0) {
      emptyState?.classList.remove("hidden");
      container.innerHTML = "";
      return;
    }

    emptyState?.classList.add("hidden");
    const statusColors = {
      draft: "bg-gray-200 text-gray-800",
      sent: "bg-blue-100 text-blue-800",
      paid: "bg-green-100 text-green-800",
      overdue: "bg-red-100 text-red-800",
      cancelled: "bg-gray-400 text-gray-800",
    };

    container.innerHTML = this.invoices.map(inv => {
      const customer = this.customers.find(c => c.id === inv.customerId);
      const balance = inv.total - inv.paidAmount;
      return `
        <div class="bg-white dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600 p-4">
          <div class="flex justify-between items-start mb-2">
            <div>
              <p class="text-xs text-gray-500 dark:text-gray-400">${inv.number}</p>
              <h3 class="font-medium text-gray-900 dark:text-gray-100">${inv.title}</h3>
              <p class="text-sm text-gray-600 dark:text-gray-400">${customer?.name || "Unknown"}</p>
            </div>
            <span class="px-2 py-1 text-xs rounded ${statusColors[inv.status] || statusColors.draft}">${inv.status}</span>
          </div>
          <div class="flex justify-between items-center">
            <div>
              <p class="text-xl font-bold text-gray-900 dark:text-gray-100">${this.formatCurrency(inv.total)}</p>
              ${balance > 0 ? `<p class="text-sm text-red-600">Balance: ${this.formatCurrency(balance)}</p>` : ""}
            </div>
            ${inv.dueDate ? `<p class="text-xs text-gray-500">Due: ${inv.dueDate}</p>` : ""}
          </div>
          <div class="flex justify-end space-x-2 mt-3">
            ${inv.status === "draft" ? `<button onclick="taskManager.sendInvoice('${inv.id}')" class="text-sm text-blue-600 hover:text-blue-800">Send</button>` : ""}
            ${(inv.status === "sent" || inv.status === "overdue") && balance > 0 ? `<button onclick="taskManager.openPaymentModal('${inv.id}')" class="text-sm text-green-600 hover:text-green-800">Record Payment</button>` : ""}
            <button onclick="taskManager.openInvoiceModal('${inv.id}')" class="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900">Edit</button>
            <button onclick="taskManager.deleteInvoice('${inv.id}')" class="text-sm text-red-600 hover:text-red-800">Delete</button>
          </div>
        </div>
      `;
    }).join("");
  }

  openInvoiceModal(id = null) {
    this.editingInvoiceId = id;
    const modal = document.getElementById("invoiceModal");
    const title = document.getElementById("invoiceModalTitle");
    document.getElementById("invoiceForm").reset();
    this.invoiceLineItems = [];

    this.populateCustomerSelect("invoiceCustomer");
    title.textContent = id ? "Edit Invoice" : "New Invoice";

    if (id) {
      const inv = this.invoices.find(i => i.id === id);
      if (inv) {
        document.getElementById("invoiceTitle").value = inv.title;
        document.getElementById("invoiceCustomer").value = inv.customerId;
        document.getElementById("invoiceDueDate").value = inv.dueDate || "";
        document.getElementById("invoiceTaxRate").value = inv.taxRate || 0;
        document.getElementById("invoiceNotes").value = inv.notes || "";
        this.invoiceLineItems = [...inv.lineItems];
      }
    }

    this.renderInvoiceLineItems();
    this.updateInvoiceTotals();
    modal.classList.remove("hidden");
    modal.classList.add("flex");
  }

  closeInvoiceModal() {
    const modal = document.getElementById("invoiceModal");
    modal.classList.add("hidden");
    modal.classList.remove("flex");
    this.editingInvoiceId = null;
  }

  addInvoiceLineItem() {
    const id = crypto.randomUUID().substring(0, 8);
    this.invoiceLineItems.push({ id, description: "", quantity: 1, rate: 0, amount: 0 });
    this.renderInvoiceLineItems();
  }

  renderInvoiceLineItems() {
    const container = document.getElementById("invoiceLineItems");
    container.innerHTML = this.invoiceLineItems.map((item, idx) => `
      <div class="flex gap-2 items-center" data-line-id="${item.id}">
        <input type="text" placeholder="Description" value="${item.description}"
          onchange="taskManager.updateInvoiceLineItem('${item.id}', 'description', this.value)"
          class="flex-1 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded px-2 py-1 text-sm">
        <input type="number" placeholder="Qty" value="${item.quantity}" step="0.01" min="0"
          onchange="taskManager.updateInvoiceLineItem('${item.id}', 'quantity', this.value)"
          class="w-16 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded px-2 py-1 text-sm">
        <input type="number" placeholder="Rate" value="${item.rate}" step="0.01" min="0"
          onchange="taskManager.updateInvoiceLineItem('${item.id}', 'rate', this.value)"
          class="w-20 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded px-2 py-1 text-sm">
        <span class="w-20 text-sm text-right">${this.formatCurrency(item.amount)}</span>
        <button type="button" onclick="taskManager.removeInvoiceLineItem('${item.id}')" class="text-red-600 hover:text-red-800">&times;</button>
      </div>
    `).join("");
  }

  updateInvoiceLineItem(id, field, value) {
    const item = this.invoiceLineItems.find(i => i.id === id);
    if (!item) return;
    if (field === "quantity" || field === "rate") {
      item[field] = parseFloat(value) || 0;
      item.amount = item.quantity * item.rate;
    } else {
      item[field] = value;
    }
    this.renderInvoiceLineItems();
    this.updateInvoiceTotals();
  }

  removeInvoiceLineItem(id) {
    this.invoiceLineItems = this.invoiceLineItems.filter(i => i.id !== id);
    this.renderInvoiceLineItems();
    this.updateInvoiceTotals();
  }

  updateInvoiceTotals() {
    const subtotal = this.invoiceLineItems.reduce((sum, i) => sum + i.amount, 0);
    const taxRate = parseFloat(document.getElementById("invoiceTaxRate").value) || 0;
    const tax = subtotal * (taxRate / 100);
    const total = subtotal + tax;

    document.getElementById("invoiceSubtotal").textContent = this.formatCurrency(subtotal);
    document.getElementById("invoiceTaxDisplay").textContent = this.formatCurrency(tax);
    document.getElementById("invoiceTotal").textContent = this.formatCurrency(total);
  }

  async saveInvoice(e) {
    e.preventDefault();
    const data = {
      title: document.getElementById("invoiceTitle").value,
      customerId: document.getElementById("invoiceCustomer").value,
      dueDate: document.getElementById("invoiceDueDate").value || null,
      taxRate: parseFloat(document.getElementById("invoiceTaxRate").value) || 0,
      lineItems: this.invoiceLineItems,
      notes: document.getElementById("invoiceNotes").value || null,
    };

    try {
      if (this.editingInvoiceId) {
        await BillingAPI.updateInvoice(this.editingInvoiceId, data);
      } else {
        await BillingAPI.createInvoice(data);
      }
      this.closeInvoiceModal();
      await this.loadBillingData();
    } catch (error) {
      console.error("Error saving invoice:", error);
    }
  }

  async deleteInvoice(id) {
    if (!confirm("Delete this invoice?")) return;
    try {
      await BillingAPI.deleteInvoice(id);
      await this.loadBillingData();
    } catch (error) {
      console.error("Error deleting invoice:", error);
    }
  }

  async sendInvoice(id) {
    try {
      await BillingAPI.sendInvoice(id);
      await this.loadBillingData();
    } catch (error) {
      console.error("Error sending invoice:", error);
    }
  }

  // Payment methods
  openPaymentModal(invoiceId) {
    this.payingInvoiceId = invoiceId;
    const modal = document.getElementById("paymentModal");
    document.getElementById("paymentForm").reset();
    document.getElementById("paymentDate").value = new Date().toISOString().split("T")[0];

    const inv = this.invoices.find(i => i.id === invoiceId);
    if (inv) {
      document.getElementById("paymentAmount").value = inv.total - inv.paidAmount;
    }

    modal.classList.remove("hidden");
    modal.classList.add("flex");
  }

  closePaymentModal() {
    const modal = document.getElementById("paymentModal");
    modal.classList.add("hidden");
    modal.classList.remove("flex");
    this.payingInvoiceId = null;
  }

  async savePayment(e) {
    e.preventDefault();
    if (!this.payingInvoiceId) return;

    const data = {
      amount: parseFloat(document.getElementById("paymentAmount").value) || 0,
      date: document.getElementById("paymentDate").value,
      method: document.getElementById("paymentMethod").value || null,
      reference: document.getElementById("paymentReference").value || null,
      notes: document.getElementById("paymentNotes").value || null,
    };

    try {
      await BillingAPI.createPayment(this.payingInvoiceId, data);
      this.closePaymentModal();
      await this.loadBillingData();
    } catch (error) {
      console.error("Error recording payment:", error);
    }
  }

  // Generate Invoice from Time Entries
  openGenerateInvoiceModal() {
    const modal = document.getElementById("generateInvoiceModal");
    document.getElementById("generateInvoiceForm").reset();
    this.populateCustomerSelect("generateInvoiceCustomer");

    // Set default rate from billing rates
    const defaultRate = this.billingRates.find(r => r.isDefault);
    if (defaultRate) {
      document.getElementById("generateInvoiceRate").value = defaultRate.hourlyRate;
    }

    // Populate tasks with time entries
    this.renderGenerateInvoiceTasks();

    modal.classList.remove("hidden");
    modal.classList.add("flex");
  }

  closeGenerateInvoiceModal() {
    const modal = document.getElementById("generateInvoiceModal");
    modal.classList.add("hidden");
    modal.classList.remove("flex");
  }

  renderGenerateInvoiceTasks() {
    const container = document.getElementById("generateInvoiceTasks");
    const tasksWithTime = this.tasks.filter(t => t.config?.time_entries?.length > 0);

    if (tasksWithTime.length === 0) {
      container.innerHTML = '<p class="text-gray-500 text-sm">No tasks with time entries found</p>';
      return;
    }

    container.innerHTML = tasksWithTime.map(t => {
      const totalHours = t.config.time_entries.reduce((sum, e) => sum + e.hours, 0);
      return `
        <label class="flex items-center p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded cursor-pointer">
          <input type="checkbox" class="generate-invoice-task h-4 w-4 text-gray-900 border-gray-300 rounded" value="${t.id}">
          <span class="ml-2 text-sm text-gray-700 dark:text-gray-300">${t.title}</span>
          <span class="ml-auto text-xs text-gray-500">${totalHours}h</span>
        </label>
      `;
    }).join("");
  }

  async generateInvoice(e) {
    e.preventDefault();

    const taskIds = Array.from(document.querySelectorAll(".generate-invoice-task:checked")).map(cb => cb.value);
    if (taskIds.length === 0) {
      alert("Please select at least one task");
      return;
    }

    const data = {
      customerId: document.getElementById("generateInvoiceCustomer").value,
      title: document.getElementById("generateInvoiceTitle").value || null,
      startDate: document.getElementById("generateInvoiceStartDate").value || null,
      endDate: document.getElementById("generateInvoiceEndDate").value || null,
      hourlyRate: parseFloat(document.getElementById("generateInvoiceRate").value) || 0,
      taskIds,
    };

    try {
      await BillingAPI.generateInvoice(data);
      this.closeGenerateInvoiceModal();
      await this.loadBillingData();
      this.switchBillingTab("invoices");
    } catch (error) {
      console.error("Error generating invoice:", error);
    }
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
