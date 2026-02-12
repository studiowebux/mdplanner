// Static class mappings for Tailwind JIT compatibility
const PRIORITY_CLASSES = {
  1: { badge: 'bg-red-600 text-white border border-red-700 dark:bg-red-500 dark:border-red-400' },
  2: { badge: 'bg-orange-500 text-white border border-orange-600 dark:bg-orange-400 dark:text-orange-900 dark:border-orange-300' },
  3: { badge: 'bg-yellow-400 text-yellow-900 border border-yellow-500 dark:bg-yellow-300 dark:text-yellow-900 dark:border-yellow-400' },
  4: { badge: 'bg-blue-500 text-white border border-blue-600 dark:bg-blue-400 dark:text-blue-900 dark:border-blue-300' },
  5: { badge: 'bg-gray-200 text-gray-700 border border-gray-300 dark:bg-gray-600 dark:text-gray-200 dark:border-gray-500' }
};

const STATUS_CLASSES = {
  active: 'border-l-4 border-l-gray-400 bg-gray-50 text-gray-700 dark:border-l-gray-500 dark:bg-gray-800 dark:text-gray-300',
  'on-track': 'border-l-4 border-l-emerald-600 bg-emerald-50/50 text-gray-800 dark:border-l-emerald-400 dark:bg-emerald-900/20 dark:text-gray-200',
  'at-risk': 'border-l-4 border-l-amber-500 bg-amber-50/50 text-gray-700 dark:border-l-amber-400 dark:bg-amber-900/20 dark:text-gray-300',
  late: 'border-l-4 border-l-red-600 bg-red-50/50 text-gray-900 dark:border-l-red-400 dark:bg-red-900/20 dark:text-gray-100',
  'on-hold': 'border-l-4 border-l-gray-300 bg-gray-50 text-gray-500 dark:border-l-gray-600 dark:bg-gray-800 dark:text-gray-400',
  completed: 'border-l-4 border-l-gray-400 bg-gray-100 text-gray-600 dark:border-l-gray-500 dark:bg-gray-700 dark:text-gray-300'
};

const TAG_CLASSES = 'badge badge-tag';

const DEADLINE_CLASSES = {
  overdue: 'border-l-4 border-l-red-600 border border-red-200 bg-red-50/50 dark:border-l-red-400 dark:border-red-800 dark:bg-red-900/20',
  today: 'border-l-4 border-l-amber-500 border border-amber-200 bg-amber-50/50 dark:border-l-amber-400 dark:border-amber-700 dark:bg-amber-900/20',
  soon: 'border-l-4 border-l-gray-400 border border-gray-200 bg-gray-50 dark:border-l-gray-500 dark:border-gray-600 dark:bg-gray-800'
};

const SECTION_COLORS = [
  'gray-900', 'gray-700', 'gray-600', 'gray-500', 'gray-400', 'gray-800', 'gray-300', 'gray-200'
];

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
    this.isFullscreen = false;
    this.resizableEvents = [];
    this.notesLoaded = false;
    this.retrospectives = [];
    this.editingRetrospectiveId = null;
    this.timeEntries = {};
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
      const response = await fetch("/api/version");
      const data = await response.json();
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
      const response = await fetch("/api/projects");
      const projects = await response.json();

      const activeResponse = await fetch("/api/projects/active");
      const activeData = await activeResponse.json();

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
      const response = await fetch("/api/projects/switch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filename }),
      });

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
      .getElementById("timeTrackingViewBtnMobile")
      ?.addEventListener("click", () => {
        this.switchView("timeTracking");
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

    // Modal close on background click
    document.getElementById("noteModal").addEventListener("click", (e) => {
      if (e.target.id === "noteModal") {
        this.closeNoteModal();
      }
    });

    document.getElementById("goalModal").addEventListener("click", (e) => {
      if (e.target.id === "goalModal") {
        this.closeGoalModal();
      }
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
      const response = await fetch("/api/tasks");
      this.tasks = await response.json();
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
      retrospectives: "Retrospectives", timeTracking: "Time Tracking", config: "Settings"
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
    const desktopNavBtns = ["summaryViewBtn", "listViewBtn", "boardViewBtn", "timelineViewBtn", "notesViewBtn", "goalsViewBtn", "milestonesViewBtn", "ideasViewBtn", "canvasViewBtn", "mindmapViewBtn", "c4ViewBtn", "retrospectivesViewBtn", "timeTrackingViewBtn"];
    desktopNavBtns.forEach((id) => {
      const btn = document.getElementById(id);
      if (btn) {
        btn.classList.remove("text-gray-900", "dark:text-white", "bg-gray-100", "dark:bg-gray-700");
        btn.classList.add("text-gray-600", "dark:text-gray-300");
      }
    });

    // Reset mobile buttons
    const mobileBtnIds = ["summaryViewBtnMobile", "listViewBtnMobile", "boardViewBtnMobile", "timelineViewBtnMobile", "notesViewBtnMobile", "goalsViewBtnMobile", "milestonesViewBtnMobile", "canvasViewBtnMobile", "mindmapViewBtnMobile", "c4ViewBtnMobile", "ideasViewBtnMobile", "retrospectivesViewBtnMobile", "timeTrackingViewBtnMobile", "configViewBtnMobile"];
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
    document.getElementById("timeTrackingView").classList.add("hidden");
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
    } else if (view === "timeTracking") {
      this.activateViewButton("timeTracking");
      document.getElementById("timeTrackingView").classList.remove("hidden");
      this.loadTimeTracking();
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
      const response = await fetch("/api/project");
      this.projectInfo = await response.json();
      this.renderSummaryView();
    } catch (error) {
      console.error("Error loading project info:", error);
    }
  }

  renderSummaryView() {
    if (!this.projectInfo) return;

    // Update project name and description
    document.getElementById("projectName").textContent = this.projectInfo.name;
    const descriptionEl = document.getElementById("projectDescription");

    if (
      this.projectInfo.description &&
      this.projectInfo.description.length > 0
    ) {
      const markdownText = this.projectInfo.description.join("\n");
      descriptionEl.innerHTML = this.markdownToHtml(markdownText);
    } else {
      descriptionEl.innerHTML =
        '<p class="text-gray-500 dark:text-gray-400 italic">No project description available.</p>';
    }

    // Calculate task statistics
    const stats = this.calculateTaskStats();

    // Update task counts
    document.getElementById("totalTasks").textContent = stats.total;
    document.getElementById("completedTasks").textContent = stats.completed;

    // Update dynamic section counts
    this.renderDynamicSectionCounts(stats.allTasks);

    // Update section breakdown dynamically
    this.renderSectionBreakdown();

    // Update milestone breakdown
    this.renderMilestoneBreakdown(stats.allTasks);

    // Update progress bar
    const progressPercent =
      stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0;
    document.getElementById("progressPercent").textContent =
      `${progressPercent}%`;
    document.getElementById("progressBar").style.width = `${progressPercent}%`;

    // Update project dates in summary view
    const startDateEl = document.getElementById("summaryStartDate");
    const lastUpdatedEl = document.getElementById("summaryLastUpdated");

    if (this.projectConfig && this.projectConfig.startDate) {
      const date = new Date(this.projectConfig.startDate);
      startDateEl.textContent = date.toLocaleDateString();
    } else {
      startDateEl.textContent = "-";
    }

    if (this.projectConfig && this.projectConfig.lastUpdated) {
      const date = new Date(this.projectConfig.lastUpdated);
      lastUpdatedEl.textContent = `${date.toLocaleDateString()} ${date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
    } else {
      lastUpdatedEl.textContent = "-";
    }

    // Render project links
    this.renderProjectLinks();

    // Render project status
    this.renderProjectStatus();

    // Render task deadlines
    this.renderTaskDeadlines(stats.allTasks);
  }

  renderTaskDeadlines(allTasks) {
    const container = document.getElementById("taskDeadlines");
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const nextWeek = new Date(today);
    nextWeek.setDate(nextWeek.getDate() + 7);

    const tasksWithDueDate = allTasks
      .filter((task) => task.config.due_date && !task.completed)
      .map((task) => {
        let dueDate = new Date(task.config.due_date);
        if (isNaN(dueDate.getTime())) {
          if (task.config.due_date.match(/^\d{4}-\d{2}-\d{2}T\d{1,2}$/)) {
            dueDate = new Date(task.config.due_date + ":00:00");
          } else if (task.config.due_date.match(/^\d{4}-\d{2}-\d{2}$/)) {
            dueDate = new Date(task.config.due_date + "T00:00:00");
          }
        }
        dueDate.setHours(0, 0, 0, 0);
        return { ...task, dueDateParsed: dueDate };
      })
      .filter((task) => !isNaN(task.dueDateParsed.getTime()))
      .sort((a, b) => a.dueDateParsed - b.dueDateParsed);

    const overdue = tasksWithDueDate.filter((t) => t.dueDateParsed < today);
    const dueToday = tasksWithDueDate.filter((t) => t.dueDateParsed.getTime() === today.getTime());
    const dueSoon = tasksWithDueDate.filter((t) => t.dueDateParsed > today && t.dueDateParsed <= nextWeek);

    if (overdue.length === 0 && dueToday.length === 0 && dueSoon.length === 0) {
      container.innerHTML = '<p class="text-sm text-gray-500 dark:text-gray-400 italic">No upcoming deadlines.</p>';
      return;
    }

    let html = "";

    if (overdue.length > 0) {
      html += `
        <div>
          <h4 class="text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">Overdue (${overdue.length})</h4>
          <div class="space-y-2">
            ${overdue.map((task) => this.renderDeadlineTask(task, "overdue")).join("")}
          </div>
        </div>
      `;
    }

    if (dueToday.length > 0) {
      html += `
        <div>
          <h4 class="text-sm font-medium text-gray-800 dark:text-gray-200 mb-2">Due Today (${dueToday.length})</h4>
          <div class="space-y-2">
            ${dueToday.map((task) => this.renderDeadlineTask(task, "today")).join("")}
          </div>
        </div>
      `;
    }

    if (dueSoon.length > 0) {
      html += `
        <div>
          <h4 class="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">Due This Week (${dueSoon.length})</h4>
          <div class="space-y-2">
            ${dueSoon.map((task) => this.renderDeadlineTask(task, "soon")).join("")}
          </div>
        </div>
      `;
    }

    container.innerHTML = html;
  }

  renderDeadlineTask(task, urgency) {
    const dateStr = task.dueDateParsed.toLocaleDateString();
    return `
      <div class="p-2 rounded border ${DEADLINE_CLASSES[urgency]} cursor-pointer hover:opacity-80 transition-opacity"
           onclick="taskManager.openTaskModal('${task.id}')">
        <div class="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">${task.title}</div>
        <div class="text-xs text-gray-500 dark:text-gray-400 mt-1 flex items-center gap-1">
          <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
          ${dateStr} · ${task.section || "No section"}
        </div>
      </div>
    `;
  }

  renderProjectStatus() {
    const select = document.getElementById("projectStatus");
    const commentContainer = document.getElementById("projectStatusComment");
    const commentText = document.getElementById("statusCommentText");

    const status = this.projectConfig?.status || "active";
    select.value = status;

    if (status !== "active" && this.projectConfig?.statusComment) {
      commentContainer.classList.remove("hidden");
      commentText.value = this.projectConfig.statusComment;
    } else if (status !== "active") {
      commentContainer.classList.remove("hidden");
      commentText.value = "";
    } else {
      commentContainer.classList.add("hidden");
      commentText.value = "";
    }

    this.updateStatusDropdownStyle();
  }

  renderProjectLinks() {
    const container = document.getElementById("projectLinks");
    const links = this.projectConfig?.links || [];

    if (links.length === 0) {
      container.innerHTML = '<p class="text-sm text-gray-500 dark:text-gray-400 italic">No links added yet.</p>';
      return;
    }

    container.innerHTML = links.map((link, index) => `
      <div class="flex items-center justify-between group">
        <a href="${link.url}" target="_blank" rel="noopener noreferrer"
           class="text-sm text-gray-900 hover:text-gray-600 dark:text-gray-100 dark:hover:text-gray-300 truncate flex-1 underline">
          ${link.title}
        </a>
        <button onclick="taskManager.removeLink(${index})"
                class="ml-2 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 opacity-0 group-hover:opacity-100 transition-opacity"
                title="Remove link">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
          </svg>
        </button>
      </div>
    `).join("");
  }

  toggleAddLinkForm() {
    const form = document.getElementById("addLinkForm");
    form.classList.toggle("hidden");
    if (!form.classList.contains("hidden")) {
      document.getElementById("linkTitle").focus();
    }
  }

  async addLink() {
    const titleInput = document.getElementById("linkTitle");
    const urlInput = document.getElementById("linkUrl");
    const title = titleInput.value.trim();
    const url = urlInput.value.trim();

    if (!title || !url) {
      this.showToast("Please enter both title and URL", true);
      return;
    }

    if (!this.projectConfig.links) {
      this.projectConfig.links = [];
    }
    this.projectConfig.links.push({ title, url });

    await this.saveProjectConfig();
    this.renderProjectLinks();

    // Reset form
    titleInput.value = "";
    urlInput.value = "";
    document.getElementById("addLinkForm").classList.add("hidden");
    this.showToast("Link added");
  }

  async removeLink(index) {
    if (!this.projectConfig.links) return;
    this.projectConfig.links.splice(index, 1);
    await this.saveProjectConfig();
    this.renderProjectLinks();
    this.showToast("Link removed");
  }

  async updateProjectStatus(status) {
    this.projectConfig.status = status;
    const commentContainer = document.getElementById("projectStatusComment");
    if (status !== "active") {
      commentContainer.classList.remove("hidden");
    } else {
      commentContainer.classList.add("hidden");
    }
    await this.saveProjectConfig();
    this.updateStatusDropdownStyle();
    this.showToast("Status updated");
  }

  async saveStatusComment() {
    const comment = document.getElementById("statusCommentText").value.trim();
    this.projectConfig.statusComment = comment || undefined;
    await this.saveProjectConfig();
  }

  updateStatusDropdownStyle() {
    const select = document.getElementById("projectStatus");
    const status = select.value;
    const statusClass = `status-select-${status}`;
    select.className = `text-sm border-2 rounded-md px-2 py-1 font-medium focus:outline-none focus:ring-2 focus:ring-gray-500 focus:border-transparent ${statusClass}`;
  }

  renderDynamicSectionCounts(allTasks) {
    const container = document.getElementById("dynamicSectionCounts");
    container.innerHTML = "";

    const sections = this.sections || [];

    sections.forEach((section, index) => {
      const sectionTasks = allTasks.filter(
        (task) => task.section === section && !task.completed,
      );

      const div = document.createElement("div");
      div.className = "flex justify-between items-center";
      div.innerHTML = `
                <span class="text-sm text-gray-600 dark:text-gray-400">${section}</span>
                <span class="text-lg font-semibold text-gray-900 dark:text-gray-100">${sectionTasks.length}</span>
            `;
      container.appendChild(div);
    });
  }

  calculateTaskStats() {
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

    addTasksRecursively(this.tasks);

    return {
      total: allTasks.length,
      completed: allTasks.filter((t) => t.completed).length,
      allTasks: allTasks, // Return all tasks for section breakdown
    };
  }

  renderSectionBreakdown() {
    const container = document.getElementById("sectionBreakdown");
    const sections = this.sections || [];

    // Get all tasks including children
    let allTasks = [];
    const addTasksRecursively = (tasks) => {
      for (const task of tasks) {
        allTasks.push(task);
        if (task.children && task.children.length > 0) {
          addTasksRecursively(task.children);
        }
      }
    };
    addTasksRecursively(this.tasks);

    container.innerHTML = "";

    sections.forEach((section, index) => {
      const count = allTasks.filter((task) => task.section === section).length;
      // Alternate between different grey shades for visual distinction
      const dotShade = index % 2 === 0 ? 'bg-gray-800 dark:bg-gray-200' : 'bg-gray-500 dark:bg-gray-400';

      const div = document.createElement("div");
      div.className = "flex items-center justify-between";
      div.innerHTML = `
                <div class="flex items-center space-x-2">
                    <div class="w-3 h-3 ${dotShade} rounded-full"></div>
                    <span class="text-sm text-gray-600 dark:text-gray-400">${section}</span>
                </div>
                <span class="text-sm font-medium text-gray-900 dark:text-gray-100">${count}</span>
            `;
      container.appendChild(div);
    });
  }

  renderMilestoneBreakdown(allTasks) {
    const milestonesSection = document.getElementById("milestonesSection");
    const container = document.getElementById("milestoneBreakdown");

    // Find all unique milestones from tasks
    const milestoneData = {};

    allTasks.forEach((task) => {
      if (task.config.milestone) {
        const milestone = task.config.milestone;
        if (!milestoneData[milestone]) {
          milestoneData[milestone] = {
            total: 0,
            incomplete: 0,
          };
        }
        milestoneData[milestone].total++;
        if (!task.completed) {
          milestoneData[milestone].incomplete++;
        }
      }
    });

    const milestones = Object.keys(milestoneData);

    // Show/hide milestones section based on whether we have milestones
    if (milestones.length === 0) {
      milestonesSection.classList.add("hidden");
      return;
    }

    milestonesSection.classList.remove("hidden");
    container.innerHTML = "";

    milestones.sort().forEach((milestone, index) => {
      const data = milestoneData[milestone];
      const completedCount = data.total - data.incomplete;
      const progressPercent =
        data.total > 0 ? Math.round((completedCount / data.total) * 100) : 0;
      // Alternate between different grey shades for visual distinction
      const dotShade = index % 2 === 0 ? 'bg-gray-800 dark:bg-gray-200' : 'bg-gray-500 dark:bg-gray-400';

      const div = document.createElement("div");
      div.className = "space-y-2";
      div.innerHTML = `
                <div class="flex items-center justify-between">
                    <div class="flex items-center space-x-2">
                        <div class="w-3 h-3 ${dotShade} rounded-full"></div>
                        <span class="text-sm font-medium text-gray-900 dark:text-gray-100 flex items-center gap-1"><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 21v-4m0 0V5a2 2 0 012-2h6.5l1 1H21l-3 6 3 6h-8.5l-1-1H5a2 2 0 00-2 2zm9-13.5V9"></path></svg>${milestone}</span>
                    </div>
                    <span class="text-sm font-medium text-gray-900 dark:text-gray-100">${data.incomplete} remaining</span>
                </div>
                <div class="flex items-center space-x-2 text-xs text-gray-500 dark:text-gray-400">
                    <span>${completedCount}/${data.total} completed</span>
                    <div class="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
                        <div class="bg-gray-900 dark:bg-gray-100 h-1.5 rounded-full transition-all duration-300" style="width: ${progressPercent}%"></div>
                    </div>
                    <span>${progressPercent}%</span>
                </div>
            `;
      container.appendChild(div);
    });
  }

  populateListFilters() {
    const sections = this.sections || [];
    const assignees = this.projectConfig?.assignees || [];
    const milestones = this.projectConfig?.milestones || [];

    const sectionSelect = document.getElementById("filterSection");
    sectionSelect.innerHTML = '<option value="">All Sections</option>' +
      sections.map((s) => `<option value="${s}">${s}</option>`).join("");

    const assigneeSelect = document.getElementById("filterAssignee");
    assigneeSelect.innerHTML = '<option value="">All Assignees</option>' +
      assignees.map((a) => `<option value="${a}">${a}</option>`).join("");

    const milestoneSelect = document.getElementById("filterMilestone");
    milestoneSelect.innerHTML = '<option value="">All Milestones</option>' +
      milestones.map((m) => `<option value="${m}">${m}</option>`).join("");
  }

  applyListFilters() {
    this.listFilters.section = document.getElementById("filterSection").value;
    this.listFilters.assignee = document.getElementById("filterAssignee").value;
    this.listFilters.milestone = document.getElementById("filterMilestone").value;
    this.listFilters.status = document.getElementById("filterStatus").value;
    this.listFilters.sort = document.getElementById("sortTasks").value;

    const hasFilters = this.listFilters.section || this.listFilters.assignee ||
      this.listFilters.milestone || this.listFilters.status || this.listFilters.sort !== "default";
    document.getElementById("clearFilters").classList.toggle("hidden", !hasFilters);

    this.renderListView();
  }

  clearListFilters() {
    document.getElementById("filterSection").value = "";
    document.getElementById("filterAssignee").value = "";
    document.getElementById("filterMilestone").value = "";
    document.getElementById("filterStatus").value = "";
    document.getElementById("sortTasks").value = "default";
    this.listFilters = { section: "", assignee: "", milestone: "", status: "", sort: "default" };
    document.getElementById("clearFilters").classList.add("hidden");
    this.renderListView();
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
    let result = [...tasks];

    // Apply filters
    if (this.listFilters.section) {
      result = result.filter((t) => t.section === this.listFilters.section);
    }
    if (this.listFilters.assignee) {
      result = result.filter((t) => t.config.assignee === this.listFilters.assignee);
    }
    if (this.listFilters.milestone) {
      result = result.filter((t) => t.config.milestone === this.listFilters.milestone);
    }
    if (this.listFilters.status === "completed") {
      result = result.filter((t) => t.completed);
    } else if (this.listFilters.status === "incomplete") {
      result = result.filter((t) => !t.completed);
    }

    // Apply sort
    if (this.listFilters.sort === "due_date") {
      result.sort((a, b) => {
        const dateA = a.config.due_date ? new Date(a.config.due_date) : new Date("9999-12-31");
        const dateB = b.config.due_date ? new Date(b.config.due_date) : new Date("9999-12-31");
        return dateA - dateB;
      });
    } else if (this.listFilters.sort === "priority") {
      const priorityOrder = { high: 0, medium: 1, low: 2 };
      result.sort((a, b) => {
        const pA = priorityOrder[a.config.priority] ?? 3;
        const pB = priorityOrder[b.config.priority] ?? 3;
        return pA - pB;
      });
    } else if (this.listFilters.sort === "title") {
      result.sort((a, b) => a.title.localeCompare(b.title));
    }

    return result;
  }

  renderListView() {
    const container = document.getElementById("listContainer");
    container.innerHTML = "";

    // Populate filter dropdowns
    this.populateListFilters();

    // Show no results message when search is active but no tasks match
    if (this.searchQuery && this.filteredTasks.length === 0) {
      container.innerHTML = `
        <div class="px-6 py-8 text-center text-gray-500 dark:text-gray-400">
          <svg class="w-12 h-12 mx-auto mb-4 text-gray-300 dark:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
          </svg>
          <p class="text-lg font-medium">No tasks found</p>
          <p class="text-sm mt-1">No tasks match "${this.searchQuery}"</p>
        </div>`;
      return;
    }

    // Group tasks by section
    let sections = this.sections || [];

    if (sections.length === 0) {
      container.innerHTML =
        '<div class="px-6 py-8 text-center text-gray-500 dark:text-gray-400">No sections found. Please add sections to your markdown board with "## Section Name".</div>';
      return;
    }

    // If section filter is active, only show that section
    if (this.listFilters.section) {
      sections = sections.filter((s) => s === this.listFilters.section);
    }

    const allTasks = this.getFilteredAndSortedTasks(this.getTasksToRender());

    // Check if all filtered sections are empty
    const hasAnyTasks = sections.some((section) =>
      allTasks.some((task) => task.section === section && !task.parentId)
    );

    if (!hasAnyTasks && (this.listFilters.assignee || this.listFilters.milestone || this.listFilters.status)) {
      container.innerHTML = `
        <div class="px-6 py-8 text-center text-gray-500 dark:text-gray-400">
          <p class="text-lg font-medium">No tasks match filters</p>
          <button onclick="taskManager.clearListFilters()" class="mt-2 text-sm text-gray-900 dark:text-gray-100 hover:underline">Clear filters</button>
        </div>`;
      return;
    }

    sections.forEach((section) => {
      const sectionTasks = allTasks.filter(
        (task) => task.section === section && !task.parentId,
      );

      // Add section separator (always show, even if empty)
      const sectionHeader = document.createElement("div");
      sectionHeader.className =
        "px-6 py-3 bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600 list-section-header";
      sectionHeader.dataset.section = section;
      sectionHeader.innerHTML = `
                <div class="flex items-center justify-between">
                    <h3 class="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide">${section}</h3>
                    <span class="text-xs text-gray-500 dark:text-gray-400">${sectionTasks.length} task${sectionTasks.length !== 1 ? "s" : ""}</span>
                </div>
            `;
      container.appendChild(sectionHeader);

      // Add empty state if no tasks
      if (sectionTasks.length === 0) {
        const emptyState = document.createElement("div");
        emptyState.className =
          "px-6 py-8 text-center text-gray-400 dark:text-gray-500 text-sm border-b border-gray-100 dark:border-gray-700 list-drop-zone";
        emptyState.dataset.section = section;
        emptyState.innerHTML = `
                    <div class="border-2 border-dashed border-gray-200 dark:border-gray-600 rounded-lg py-6">
                        Drop tasks here or click + to add
                    </div>
                `;
        container.appendChild(emptyState);
      } else {
        // Add tasks in this section
        sectionTasks.forEach((task) => {
          const taskElement = this.createListTaskElement(task);
          container.appendChild(taskElement);

          // Add children if any
          if (task.children && task.children.length > 0) {
            task.children.forEach((child) => {
              const childElement = this.createListTaskElement(child, true);
              container.appendChild(childElement);
            });
          }
        });

        // Add drop zone after existing tasks
        const dropZone = document.createElement("div");
        dropZone.className =
          "px-6 py-2 text-center text-gray-400 dark:text-gray-500 text-xs border-b border-gray-100 dark:border-gray-700 list-drop-zone";
        dropZone.dataset.section = section;
        dropZone.innerHTML = `
                    <div class="border border-dashed border-transparent rounded-lg py-2 transition-colors">
                        Drop tasks here
                    </div>
                `;
        container.appendChild(dropZone);
      }
    });
  }

  createListTaskElement(task, isChild = false) {
    const div = document.createElement("div");
    div.className = `task-list-item px-6 py-4 hover:bg-gray-50 dark:hover:bg-gray-700 ${isChild ? "pl-12 bg-gray-25 dark:bg-gray-800" : ""} cursor-move border-b border-gray-100 dark:border-gray-700`;
    div.draggable = !isChild; // Only allow parent tasks to be dragged
    div.dataset.taskId = task.id;

    const priorityBadgeClasses = this.getPriorityBadgeClasses(task.config.priority);
    const priorityText = this.getPriorityText(task.config.priority);

    div.innerHTML = `
            <div class="flex items-center justify-between">
                <div class="flex items-center space-x-3">
                    <input type="checkbox" ${task.completed ? "checked" : ""}
                           onchange="taskManager.toggleTask('${task.id}')"
                           class="rounded border-gray-300 dark:border-gray-600 text-gray-900 focus:ring-gray-500 dark:bg-gray-700">
                    <div>
                        <div class="flex items-center space-x-2 flex-wrap gap-1">
                            <span class="${task.completed ? "line-through text-gray-500 dark:text-gray-400" : "text-gray-900 dark:text-gray-100"} font-medium">
                                ${task.title}
                            </span>
                            ${task.config.priority ? `<span class="px-2 py-0.5 text-xs font-medium rounded ${priorityBadgeClasses}">${priorityText}</span>` : ""}
                            ${task.config.tag ? task.config.tag.map((tag) => `<span class="px-2 py-0.5 text-xs font-medium rounded border ${TAG_CLASSES}">${tag}</span>`).join("") : ""}
                        </div>
                        <div class="text-sm text-gray-500 dark:text-gray-400 mt-1 flex flex-wrap items-center gap-x-2 gap-y-1">
                            <span class="text-xs font-mono text-gray-400">#${task.id}</span>
                            ${task.config.assignee ? `<span class="flex items-center gap-1"><svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path></svg>${task.config.assignee}</span>` : ""}
                            ${task.config.due_date ? `<span class="flex items-center gap-1"><svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>${this.formatDate(task.config.due_date)}</span>` : ""}
                            ${task.config.effort ? `<span class="flex items-center gap-1"><svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>${task.config.effort}d</span>` : ""}
                            ${task.config.milestone ? `<span class="flex items-center gap-1"><svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 21v-4m0 0V5a2 2 0 012-2h6.5l1 1H21l-3 6 3 6h-8.5l-1-1H5a2 2 0 00-2 2zm9-13.5V9"></path></svg>${task.config.milestone}</span>` : ""}
                            ${task.config.blocked_by && task.config.blocked_by.length > 0 ? `<span class="flex items-center gap-1"><svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"></path></svg>${task.config.blocked_by.join(", ")}</span>` : ""}
                            <span class="text-gray-400">${task.section}</span>
                        </div>
                    </div>
                </div>
                <div class="flex space-x-2">
                    ${
                      !isChild
                        ? `
                        <button onclick="taskManager.addSubtask('${task.id}')"
                                class="text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors" title="Add Subtask">
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path>
                            </svg>
                        </button>
                    `
                        : ""
                    }
                    ${
                      task.description && task.description.length > 0
                        ? `
                        <button onclick="taskManager.toggleDescription('${task.id}')"
                                class="text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors" title="View Description">
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                            </svg>
                        </button>
                    `
                        : ""
                    }
                    <button onclick="taskManager.copyTaskLink('${task.id}')"
                            class="text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors" title="Copy Link">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"></path>
                        </svg>
                    </button>
                    <button onclick="taskManager.editTask('${task.id}')"
                            class="text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors" title="Edit">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path>
                        </svg>
                    </button>
                    <button onclick="taskManager.deleteTask('${task.id}')"
                            class="text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                        </svg>
                    </button>
                </div>
            </div>
        `;

    return div;
  }

  renderBoardView() {
    const sections = this.sections || [];
    const container = document.getElementById("boardContainer");

    // Show no results message when search is active but no tasks match
    if (this.searchQuery && this.filteredTasks.length === 0) {
      container.className = "flex items-center justify-center h-64";
      container.innerHTML = `
        <div class="text-center text-gray-500 dark:text-gray-400">
          <svg class="w-12 h-12 mx-auto mb-4 text-gray-300 dark:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
          </svg>
          <p class="text-lg font-medium">No tasks found</p>
          <p class="text-sm mt-1">No tasks match "${this.searchQuery}"</p>
        </div>`;
      return;
    }

    if (sections.length === 0) {
      container.className = "flex items-center justify-center h-64";
      container.innerHTML =
        '<div class="text-center text-gray-500 dark:text-gray-400">No sections found. Please add sections to your markdown board with "## Section Name".</div>';
      return;
    }

    // Use flex with horizontal scroll to keep all columns on same row
    container.className = "flex gap-6 overflow-x-auto pb-4";
    container.innerHTML = "";

    sections.forEach((section) => {
      const tasksToRender = this.getTasksToRender();
      const sectionTasks = tasksToRender.filter(
        (task) => task.section === section && !task.parentId,
      );

      // Create column with fixed width for consistent layout
      const column = document.createElement("div");
      column.className =
        "bg-white dark:bg-gray-800 rounded-lg shadow flex-shrink-0 w-80";
      column.innerHTML = `
                <div class="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
                    <h3 class="text-sm font-medium text-gray-900 dark:text-gray-100">${section}</h3>
                    <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">${sectionTasks.length} tasks</p>
                </div>
                <div class="p-4 min-h-96 space-y-3" data-section="${section}">
                    <!-- Tasks will be populated here -->
                </div>
            `;

      const tasksContainer = column.querySelector("[data-section]");
      sectionTasks.forEach((task) => {
        const taskCard = this.createBoardTaskElement(task);
        tasksContainer.appendChild(taskCard);
      });

      container.appendChild(column);
    });
  }

  createBoardTaskElement(task) {
    const div = document.createElement("div");
    div.className =
      "task-card bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg p-3 cursor-move";
    div.draggable = true;
    div.dataset.taskId = task.id;

    const priorityBadgeClasses = this.getPriorityBadgeClasses(task.config.priority);
    const priorityText = this.getPriorityText(task.config.priority);

    div.innerHTML = `
            <div class="flex items-start justify-between mb-2">
                <h4 class="${task.completed ? "line-through text-gray-500 dark:text-gray-400" : "text-gray-900 dark:text-gray-100"} font-medium text-sm">
                    ${task.title}
                </h4>
                <div class="flex space-x-1">
                    <button onclick="taskManager.addSubtask('${task.id}')"
                            class="text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors" title="Add Subtask">
                        <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path>
                        </svg>
                    </button>
                    ${
                      task.description && task.description.length > 0
                        ? `
                        <button onclick="taskManager.toggleDescription('${task.id}')"
                                class="text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors" title="View Description">
                            <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                            </svg>
                        </button>
                    `
                        : ""
                    }
                    <button onclick="taskManager.copyTaskLink('${task.id}')"
                            class="text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors" title="Copy Link">
                        <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"></path>
                        </svg>
                    </button>
                    <button onclick="taskManager.editTask('${task.id}')"
                            class="text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors" title="Edit">
                        <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path>
                        </svg>
                    </button>
                    <button onclick="taskManager.deleteTask('${task.id}')"
                            class="text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors" title="Delete">
                        <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                        </svg>
                    </button>
                </div>
            </div>

            <div class="space-y-2">
                <div class="flex items-center space-x-1">
                    <input type="checkbox" ${task.completed ? "checked" : ""}
                           onchange="taskManager.toggleTask('${task.id}')"
                           class="rounded border-gray-300 dark:border-gray-600 text-gray-900 focus:ring-gray-500 dark:bg-gray-600 text-xs">
                    <span class="text-xs text-gray-500 dark:text-gray-400">Complete</span>
                </div>

                <div class="flex flex-wrap gap-1">
                    ${task.config.priority ? `<span class="inline-block px-2 py-0.5 text-xs font-medium rounded ${priorityBadgeClasses}">${priorityText}</span>` : ""}
                    ${
                      task.config.tag
                        ? task.config.tag
                            .map(
                              (tag) =>
                                `<span class="inline-block px-2 py-0.5 text-xs font-medium rounded border ${TAG_CLASSES}">${tag}</span>`,
                            )
                            .join("")
                        : ""
                    }
                </div>

                <div class="text-xs font-mono text-gray-400">#${task.id}</div>
                ${task.config.assignee ? `<div class="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1"><svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path></svg> ${task.config.assignee}</div>` : ""}
                ${task.config.due_date ? `<div class="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1"><svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg> ${this.formatDate(task.config.due_date)}</div>` : ""}
                ${task.config.effort ? `<div class="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1"><svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg> ${task.config.effort}d</div>` : ""}
                ${task.config.milestone ? `<div class="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1"><svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 21v-4m0 0V5a2 2 0 012-2h6.5l1 1H21l-3 6 3 6h-8.5l-1-1H5a2 2 0 00-2 2zm9-13.5V9"></path></svg> ${task.config.milestone}</div>` : ""}
                ${task.config.blocked_by && task.config.blocked_by.length > 0 ? `<div class="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1"><svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"></path></svg> ${task.config.blocked_by.join(", ")}</div>` : ""}

                ${
                  task.children && task.children.length > 0
                    ? `
                    <div class="mt-3 pt-2 border-t border-gray-100 dark:border-gray-600">
                        <div class="text-xs text-gray-500 dark:text-gray-400 mb-2 flex items-center gap-1"><svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"></path></svg> Subtasks (${task.children.length})</div>
                        <div class="space-y-1">
                            ${task.children
                              .map(
                                (child) => `
                                <div class="flex items-center space-x-2 text-xs">
                                    <input type="checkbox" ${child.completed ? "checked" : ""}
                                           onchange="taskManager.toggleTask('${child.id}')"
                                           class="rounded border-gray-300 dark:border-gray-600 text-gray-900 focus:ring-gray-500 dark:bg-gray-600" style="transform: scale(0.8);">
                                    <span class="${child.completed ? "line-through text-gray-400 dark:text-gray-500" : "text-gray-600 dark:text-gray-300"}">${child.title}</span>
                                </div>
                            `,
                              )
                              .join("")}
                        </div>
                    </div>
                `
                    : ""
                }
            </div>
        `;

    return div;
  }

  setupDragAndDrop() {
    // Add drag event listeners to board columns and list drop zones
    document.addEventListener("dragover", (e) => {
      if (
        e.target.hasAttribute("data-section") ||
        e.target.closest("[data-section]")
      ) {
        this.handleDragOver(e);
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
        this.handleDragEnter(e);
      }
    });

    document.addEventListener("dragleave", (e) => {
      if (
        e.target.hasAttribute("data-section") ||
        e.target.closest("[data-section]")
      ) {
        this.handleDragLeave(e);
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

  handleDragOver(e) {
    e.preventDefault();
  }

  handleDragEnter(e) {
    e.preventDefault();
    const target = e.target.hasAttribute("data-section")
      ? e.target
      : e.target.closest("[data-section]");
    if (target) {
      target.classList.add("drag-over");
    }
  }

  handleDragLeave(e) {
    const target = e.target.hasAttribute("data-section")
      ? e.target
      : e.target.closest("[data-section]");
    if (target) {
      target.classList.remove("drag-over");
    }
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
      const response = await fetch(`/api/tasks/${taskId}/move`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ section: newSection }),
      });

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
        const response = await fetch(`/api/tasks/${taskId}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ completed: newCompleted }),
        });

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
    const findInTasks = (tasks) => {
      for (const task of tasks) {
        if (task.id === id) return task;
        if (task.children) {
          const found = findInTasks(task.children);
          if (found) return found;
        }
      }
      return null;
    };
    return findInTasks(this.tasks);
  }

  async openTaskModal(task = null, parentTaskId = null) {
    // If task is a string (ID), find the actual task object
    if (typeof task === "string") {
      task = this.findTaskById(task);
    }
    this.editingTask = task;
    this.parentTaskId = parentTaskId;
    const modal = document.getElementById("taskModal");
    const form = document.getElementById("taskForm");
    const title = document.getElementById("modalTitle");

    if (parentTaskId) {
      const parentTask = this.findTaskById(parentTaskId);
      title.textContent = `Add Subtask to: ${parentTask.title}`;
    } else {
      title.textContent = task ? "Edit Task" : "Add Task";
    }

    // Populate form options
    await this.populateFormOptions(task ? task.id : null);

    if (task) {
      document.getElementById("taskTitle").value = task.title;
      document.getElementById("taskSection").value = task.section;
      document.getElementById("taskPriority").value =
        task.config.priority || "";
      document.getElementById("taskAssignee").value =
        task.config.assignee || "";
      document.getElementById("taskEffort").value = task.config.effort || "";
      document.getElementById("taskDueDate").value =
        this.formatDateForInput(task.config.due_date) || "";
      document.getElementById("taskMilestone").value =
        task.config.milestone || "";
      document.getElementById("taskPlannedStart").value =
        task.config.planned_start || "";
      document.getElementById("taskPlannedEnd").value =
        task.config.planned_end || "";

      // Show time entries section for existing tasks
      document.getElementById("timeEntriesSection").classList.remove("hidden");
      this.loadTaskTimeEntries(task.id);

      // Set selected tags
      const tagSelect = document.getElementById("taskTags");
      Array.from(tagSelect.options).forEach((option) => {
        option.selected =
          task.config.tag && task.config.tag.includes(option.value);
      });

      // Set selected dependencies
      this.selectedDependencies = task.config.blocked_by
        ? [...task.config.blocked_by]
        : [];
      this.updateSelectedDependencies();

      document.getElementById("taskDescription").value = task.description
        ? task.description.join("\n")
        : "";
    } else {
      form.reset();
      this.selectedDependencies = [];
      this.updateSelectedDependencies();
      // Hide time entries section for new tasks
      document.getElementById("timeEntriesSection").classList.add("hidden");
      document.getElementById("timeEntriesList").innerHTML = "";
      // If creating a subtask, inherit parent's section
      if (parentTaskId) {
        const parentTask = this.findTaskById(parentTaskId);
        document.getElementById("taskSection").value = parentTask.section;
      }
    }

    // Hide time entry form on modal open
    this.hideTimeEntryForm();

    modal.classList.remove("hidden");
    modal.classList.add("flex");
  }

  closeTaskModal() {
    const modal = document.getElementById("taskModal");
    modal.classList.add("hidden");
    modal.classList.remove("flex");
    this.editingTask = null;
    this.parentTaskId = null;
    // Clear task hash from URL
    if (window.location.hash.startsWith("#task=")) {
      history.replaceState(null, "", window.location.pathname + window.location.search);
    }
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
      "ideaModal"
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
    e.preventDefault();

    const formData = {
      title: document.getElementById("taskTitle").value,
      section: document.getElementById("taskSection").value,
      completed: false,
      config: {
        priority: document.getElementById("taskPriority").value
          ? parseInt(document.getElementById("taskPriority").value)
          : undefined,
        assignee: document.getElementById("taskAssignee").value || undefined,
        effort: document.getElementById("taskEffort").value
          ? parseInt(document.getElementById("taskEffort").value)
          : undefined,
        due_date: document.getElementById("taskDueDate").value || undefined,
        milestone: document.getElementById("taskMilestone").value || undefined,
        planned_start: document.getElementById("taskPlannedStart").value || undefined,
        planned_end: document.getElementById("taskPlannedEnd").value || undefined,
        tag: this.getSelectedTags(),
        blocked_by:
          this.selectedDependencies.length > 0
            ? this.selectedDependencies
            : undefined,
      },
      description: document.getElementById("taskDescription").value
        ? document.getElementById("taskDescription").value.split("\n")
        : undefined,
      children: [],
      parentId: this.parentTaskId || undefined,
    };

    try {
      let response;
      if (this.editingTask) {
        response = await fetch(`/api/tasks/${this.editingTask.id}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(formData),
        });
      } else {
        response = await fetch("/api/tasks", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(formData),
        });
      }

      if (response.ok) {
        await this.loadTasks();
        this.closeTaskModal();
      } else {
        console.error("Failed to save task");
      }
    } catch (error) {
      console.error("Error saving task:", error);
    }
  }

  async editTask(taskId) {
    const task = this.findTaskById(taskId);
    if (task) {
      history.replaceState(null, "", `#task=${taskId}`);
      await this.openTaskModal(task);
    }
  }

  copyTaskLink(taskId) {
    const url = `${window.location.origin}${window.location.pathname}#task=${taskId}`;
    navigator.clipboard.writeText(url).then(() => {
      this.showToast("Link copied to clipboard");
    }).catch(err => {
      console.error("Failed to copy link:", err);
      this.showToast("Failed to copy link", true);
    });
  }

  showToast(message, isError = false) {
    // Remove existing toast if any
    const existing = document.getElementById("toast-notification");
    if (existing) existing.remove();

    const toast = document.createElement("div");
    toast.id = "toast-notification";
    toast.className = `fixed bottom-16 left-1/2 transform -translate-x-1/2 px-4 py-2 rounded-md text-sm font-medium z-50 transition-opacity duration-300 ${
      isError
        ? "bg-red-600 text-white"
        : "bg-gray-800 dark:bg-gray-700 text-white"
    }`;
    toast.textContent = message;
    document.body.appendChild(toast);

    // Fade out and remove after 2 seconds
    setTimeout(() => {
      toast.style.opacity = "0";
      setTimeout(() => toast.remove(), 300);
    }, 2000);
  }

  async addSubtask(parentTaskId) {
    const parentTask = this.findTaskById(parentTaskId);
    if (parentTask) {
      await this.openTaskModal(null, parentTaskId);
    }
  }

  toggleDescription(taskId) {
    const task = this.findTaskById(taskId);
    if (!task || !task.description || task.description.length === 0) return;

    // Create or toggle description modal
    let modal = document.getElementById("descriptionModal");
    if (!modal) {
      modal = document.createElement("div");
      modal.id = "descriptionModal";
      modal.className =
        "fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50";
      modal.innerHTML = `
                <div class="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto">
                    <div class="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
                        <h3 id="descriptionModalTitle" class="text-lg font-medium text-gray-900 dark:text-gray-100">Task Description</h3>
                        <button onclick="taskManager.closeDescriptionModal()" class="text-gray-400 dark:text-gray-500 hover:text-gray-500 dark:hover:text-gray-400">
                            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                            </svg>
                        </button>
                    </div>
                    <div class="p-6">
                        <div id="descriptionContent" class="prose prose-gray dark:prose-invert max-w-none"></div>
                    </div>
                </div>
            `;
      document.body.appendChild(modal);

      // Close on background click
      modal.addEventListener("click", (e) => {
        if (e.target === modal) {
          this.closeDescriptionModal();
        }
      });
    }

    // Update content
    document.getElementById("descriptionModalTitle").textContent =
      `${task.title} - Description`;
    const markdownText = task.description.join("\n");
    document.getElementById("descriptionContent").innerHTML =
      this.markdownToHtml(markdownText);

    modal.classList.remove("hidden");
  }

  closeDescriptionModal() {
    const modal = document.getElementById("descriptionModal");
    if (modal) {
      modal.classList.add("hidden");
    }
  }

  async deleteTask(taskId) {
    if (confirm("Are you sure you want to delete this task?")) {
      try {
        const response = await fetch(`/api/tasks/${taskId}`, {
          method: "DELETE",
        });

        if (response.ok) {
          await this.loadTasks();
        } else {
          console.error("Failed to delete task");
        }
      } catch (error) {
        console.error("Error deleting task:", error);
      }
    }
  }

  getPriorityColor(priority) {
    // Now returns grey scale colors (darker = higher priority)
    switch (priority) {
      case 1:
        return "gray-900";
      case 2:
        return "gray-700";
      case 3:
        return "gray-500";
      case 4:
        return "gray-400";
      case 5:
        return "gray-300";
      default:
        return "gray-400";
    }
  }

  getPriorityBadgeClasses(priority) {
    return PRIORITY_CLASSES[priority]?.badge || PRIORITY_CLASSES[5].badge;
  }

  getPriorityText(priority) {
    switch (priority) {
      case 1:
        return "Highest";
      case 2:
        return "High";
      case 3:
        return "Medium";
      case 4:
        return "Low";
      case 5:
        return "Lowest";
      default:
        return "";
    }
  }

  formatDate(dateString) {
    if (!dateString) return "";

    try {
      // Handle various date formats
      let date;

      // If it's just a date (YYYY-MM-DD)
      if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
        date = new Date(dateString + "T00:00:00");
      }
      // If it's incomplete datetime (YYYY-MM-DDTHH)
      else if (/^\d{4}-\d{2}-\d{2}T\d{1,2}$/.test(dateString)) {
        date = new Date(dateString + ":00:00");
      }
      // If it's incomplete datetime (YYYY-MM-DDTHH:MM)
      else if (/^\d{4}-\d{2}-\d{2}T\d{1,2}:\d{2}$/.test(dateString)) {
        date = new Date(dateString + ":00");
      }
      // Otherwise try to parse as-is
      else {
        date = new Date(dateString);
      }

      // Check if date is valid
      if (isNaN(date.getTime())) {
        return dateString; // Return original string if can't parse
      }

      return date.toLocaleDateString();
    } catch (error) {
      console.warn("Error parsing date:", dateString, error);
      return dateString; // Return original string on error
    }
  }

  formatDateForInput(dateString) {
    if (!dateString) return "";

    try {
      let date;

      // If it's just a date (YYYY-MM-DD), convert to datetime for input
      if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
        return dateString + "T09:00"; // Default to 9 AM
      }
      // If it's incomplete datetime (YYYY-MM-DDTHH)
      else if (/^\d{4}-\d{2}-\d{2}T\d{1,2}$/.test(dateString)) {
        return dateString.padEnd(13, "0") + ":00"; // Pad and add minutes
      }
      // If it's incomplete datetime (YYYY-MM-DDTHH:MM)
      else if (/^\d{4}-\d{2}-\d{2}T\d{1,2}:\d{2}$/.test(dateString)) {
        return dateString; // Already in correct format
      }
      // If it's full datetime (YYYY-MM-DDTHH:MM:SS)
      else if (/^\d{4}-\d{2}-\d{2}T\d{1,2}:\d{2}:\d{2}/.test(dateString)) {
        return dateString.substring(0, 16); // Remove seconds
      }
      // Try to parse and format
      else {
        date = new Date(dateString);
        if (!isNaN(date.getTime())) {
          // Format as YYYY-MM-DDTHH:MM
          const year = date.getFullYear();
          const month = (date.getMonth() + 1).toString().padStart(2, "0");
          const day = date.getDate().toString().padStart(2, "0");
          const hours = date.getHours().toString().padStart(2, "0");
          const minutes = date.getMinutes().toString().padStart(2, "0");
          return `${year}-${month}-${day}T${hours}:${minutes}`;
        }
      }

      return dateString; // Return original if can't process
    } catch (error) {
      console.warn("Error formatting date for input:", dateString, error);
      return dateString;
    }
  }

  toggleDarkMode() {
    const html = document.documentElement;
    const isDark = html.classList.contains("dark");

    if (isDark) {
      html.classList.remove("dark");
      localStorage.setItem("darkMode", "false");
    } else {
      html.classList.add("dark");
      localStorage.setItem("darkMode", "true");
    }
  }

  toggleFullscreen() {
    this.isFullscreen = !this.isFullscreen;
    this.applyFullscreenMode();
    localStorage.setItem("fullscreenMode", this.isFullscreen.toString());
  }

  applyFullscreenMode() {
    const header = document.querySelector("header");
    const main = document.querySelector("main");
    const body = document.body;
    const fullscreenIcon = document.getElementById("fullscreenIcon");
    const exitFullscreenIcon = document.getElementById("exitFullscreenIcon");

    if (this.isFullscreen) {
      // Keep header visible but remove container constraints from main
      main.classList.remove(
        "max-w-7xl",
        "mx-auto",
        "px-2",
        "sm:px-4",
        "lg:px-8",
        "py-4",
        "sm:py-8",
      );
      main.classList.add("w-full", "h-screen", "p-2", "pb-16", "overflow-auto");

      // Make body fill the screen
      body.classList.add("h-screen", "overflow-hidden");

      // Update button icons
      fullscreenIcon.classList.add("hidden");
      exitFullscreenIcon.classList.remove("hidden");

      // Add escape key listener
      this.bindEscapeKey();
    } else {
      // Restore container constraints
      main.classList.add(
        "max-w-7xl",
        "mx-auto",
        "px-2",
        "sm:px-4",
        "lg:px-8",
        "py-4",
        "sm:py-8",
      );
      main.classList.remove("w-full", "h-screen", "p-2", "pb-16", "overflow-auto");

      // Restore body
      body.classList.remove("h-screen", "overflow-hidden");

      // Update button icons
      fullscreenIcon.classList.remove("hidden");
      exitFullscreenIcon.classList.add("hidden");

      // Remove escape key listener
      this.unbindEscapeKey();
    }
  }

  bindEscapeKey() {
    this.escapeKeyHandler = (e) => {
      if (e.key === "Escape" && this.isFullscreen) {
        this.toggleFullscreen();
      }
    };
    document.addEventListener("keydown", this.escapeKeyHandler);
  }

  unbindEscapeKey() {
    if (this.escapeKeyHandler) {
      document.removeEventListener("keydown", this.escapeKeyHandler);
      this.escapeKeyHandler = null;
    }
  }

  initDarkMode() {
    const savedDarkMode = localStorage.getItem("darkMode");
    const prefersDark = window.matchMedia(
      "(prefers-color-scheme: dark)",
    ).matches;

    if (savedDarkMode === "true" || (savedDarkMode === null && prefersDark)) {
      document.documentElement.classList.add("dark");
    }
  }

  initFullscreenMode() {
    const savedFullscreenMode = localStorage.getItem("fullscreenMode");
    if (savedFullscreenMode === "true") {
      this.isFullscreen = true;
      // Apply fullscreen mode after DOM is ready
      setTimeout(() => this.applyFullscreenMode(), 0);
    }
  }

  markdownToHtml(markdown) {
    if (!markdown) return "";

    // Simple markdown to HTML converter
    let html = markdown;

    // Headers
    html = html.replace(
      /^### (.*$)/gim,
      '<h3 class="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">$1</h3>',
    );
    html = html.replace(
      /^## (.*$)/gim,
      '<h2 class="text-xl font-bold text-gray-900 dark:text-gray-100 mb-3">$1</h2>',
    );
    html = html.replace(
      /^# (.*$)/gim,
      '<h1 class="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-4">$1</h1>',
    );

    // Bold and italic
    html = html.replace(
      /\*\*(.*?)\*\*/g,
      '<strong class="font-semibold text-gray-900 dark:text-gray-100">$1</strong>',
    );
    html = html.replace(
      /\*(.*?)\*/g,
      '<em class="italic text-gray-700 dark:text-gray-300">$1</em>',
    );

    // Code (inline)
    html = html.replace(
      /`([^`]+)`/g,
      '<code class="bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100 px-1 py-0.5 rounded text-sm font-mono">$1</code>',
    );

    // Links
    html = html.replace(
      /\[([^\]]+)\]\(([^)]+)\)/g,
      '<a href="$2" class="text-gray-900 dark:text-gray-100 underline hover:no-underline" target="_blank" rel="noopener noreferrer">$1</a>',
    );

    // Simple line processing for better text wrapping
    html = html
      .split("\n")
      .map((line) => {
        const trimmed = line.trim();

        // Skip empty lines
        if (!trimmed) {
          return "<br>";
        }

        // Handle list items
        if (trimmed.startsWith("- ")) {
          return `<li class="text-gray-700 dark:text-gray-300 mb-1">${trimmed.substring(2)}</li>`;
        }

        // Skip already processed HTML
        if (trimmed.startsWith("<")) {
          return trimmed;
        }

        // Wrap plain text in paragraphs
        return `<p class="text-gray-700 dark:text-gray-300 mb-2">${trimmed}</p>`;
      })
      .join("");

    // Wrap consecutive list items
    html = html.replace(
      /(<li[^>]*>.*?<\/li>)+/g,
      '<ul class="list-disc list-inside mb-3">$&</ul>',
    );

    // Clean up consecutive <br> tags
    html = html.replace(/(<br>\s*){2,}/g, "<br>");

    return html;
  }

  async populateFormOptions(currentTaskId = null) {
    // Load project config if not already loaded
    if (!this.projectConfig) {
      await this.loadProjectConfig();
    }

    // Populate sections
    const sectionSelect = document.getElementById("taskSection");
    sectionSelect.innerHTML = "";
    const sections = this.sections || [];
    sections.forEach((section) => {
      const option = document.createElement("option");
      option.value = section;
      option.textContent = section;
      sectionSelect.appendChild(option);
    });

    // Populate assignees
    const assigneeSelect = document.getElementById("taskAssignee");
    assigneeSelect.innerHTML = '<option value="">Select Assignee</option>';
    if (this.projectConfig && this.projectConfig.assignees) {
      this.projectConfig.assignees.forEach((assignee) => {
        const option = document.createElement("option");
        option.value = assignee;
        option.textContent = assignee;
        assigneeSelect.appendChild(option);
      });
    }

    // Populate tags
    const tagSelect = document.getElementById("taskTags");
    tagSelect.innerHTML = "";
    if (this.projectConfig && this.projectConfig.tags) {
      this.projectConfig.tags.forEach((tag) => {
        const option = document.createElement("option");
        option.value = tag;
        option.textContent = tag;
        tagSelect.appendChild(option);
      });
    }
  }

  getSelectedTags() {
    const tagSelect = document.getElementById("taskTags");
    const selected = [];
    Array.from(tagSelect.selectedOptions).forEach((option) => {
      selected.push(option.value);
    });
    return selected.length > 0 ? selected : undefined;
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
    await this.loadProjectConfig();
    this.updateTimelineConfig();
    this.generateTimeline();
  }

  async renderConfigView() {
    await this.loadProjectConfig();
    this.renderProjectConfigUI();
    this.updateConfigStats();
  }

  updateTimelineConfig() {
    // Show read-only config in timeline view
    document.getElementById("timelineStartDate").value =
      this.projectConfig?.startDate || "";
    document.getElementById("timelineWorkingDays").value =
      this.projectConfig?.workingDaysPerWeek || 5;
  }

  async updateWorkingDays(workingDays) {
    if (this.projectConfig) {
      this.projectConfig.workingDaysPerWeek = workingDays;
      // Update both UI fields to keep them in sync
      document.getElementById("workingDays").value = workingDays;
      document.getElementById("timelineWorkingDays").value = workingDays;
      await this.saveProjectConfig();
      this.generateTimeline(); // Refresh timeline with new working days
    }
  }

  updateConfigStats() {
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
    addTasksRecursively(this.tasks);

    document.getElementById("configTotalTasks").textContent = allTasks.length;
    document.getElementById("configTotalSections").textContent =
      this.projectConfig?.sections?.length || 0;
    document.getElementById("configTotalAssignees").textContent =
      this.projectConfig?.assignees?.length || 0;
    document.getElementById("configTotalTags").textContent =
      this.projectConfig?.tags?.length || 0;
  }

  async loadProjectConfig() {
    try {
      const response = await fetch("/api/project/config");
      this.projectConfig = await response.json();

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
        this.renderProjectConfigUI();
        this.updateConfigStats();
      } else if (this.currentView === "timeline") {
        this.updateTimelineConfig();
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
      const response = await fetch("/api/project/sections");
      this.sections = await response.json();
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
      const response = await fetch("/api/project/config", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(config),
      });

      const result = await response.text();
      console.log("Save response:", result);

      if (response.ok) {
        this.projectConfig = config;
        if (this.currentView === "timeline") {
          this.generateTimeline();
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

  generateTimeline() {
    const timelineContent = document.getElementById("timelineContent");

    if (!this.projectConfig || !this.projectConfig.startDate) {
      timelineContent.innerHTML =
        '<div class="text-center text-gray-500 dark:text-gray-400 py-8">Please configure project start date first</div>';
      return;
    }

    // Count tasks without effort numbers
    const tasksWithoutEffort = this.getTasksWithoutEffort();

    // Calculate task scheduling based on dependencies and effort
    const scheduledTasks = this.calculateTaskSchedule();

    let html = '<div class="timeline-chart">';

    // Add warning banner if there are tasks without effort
    if (tasksWithoutEffort.length > 0) {
      html +=
        '<div class="mb-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">';
      html += '<div class="flex items-center">';
      html +=
        '<svg class="w-5 h-5 text-yellow-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">';
      html +=
        '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16c-.77.833.192 2.5 1.732 2.5z"></path>';
      html += "</svg>";
      html += `<span class="text-sm font-medium text-yellow-800 dark:text-yellow-200">${tasksWithoutEffort.length} task${tasksWithoutEffort.length !== 1 ? "s" : ""} without effort estimates (not shown in timeline)</span>`;
      html += "</div>";
      html += '<div class="mt-2 text-xs text-yellow-700 dark:text-yellow-300">';
      html +=
        "Tasks missing effort: " +
        tasksWithoutEffort.map((t) => `${t.title} (${t.id})`).join(", ");
      html += "</div>";
      html += "</div>";
    }

    if (scheduledTasks.length === 0) {
      html +=
        '<div class="text-center text-gray-500 dark:text-gray-400 py-8">No tasks with effort estimates found</div>';
    } else {
      html += this.generateTimelineHeader(scheduledTasks);
      html += this.generateTimelineRows(scheduledTasks);
    }

    html += "</div>";

    timelineContent.innerHTML = html;
  }

  getTasksWithoutEffort() {
    const tasksWithoutEffort = [];

    const collectTasks = (tasks) => {
      for (const task of tasks) {
        if (!task.config.effort || task.config.effort <= 0) {
          tasksWithoutEffort.push(task);
        }
        if (task.children && task.children.length > 0) {
          collectTasks(task.children);
        }
      }
    };

    collectTasks(this.tasks);
    return tasksWithoutEffort;
  }

  calculateTaskSchedule() {
    const allTasks = [];

    // Collect all tasks with effort estimates
    const collectTasks = (tasks) => {
      for (const task of tasks) {
        if (task.config.effort && task.config.effort > 0 && !task.completed) {
          allTasks.push(task);
        }
        if (task.children && task.children.length > 0) {
          collectTasks(task.children);
        }
      }
    };

    collectTasks(this.tasks);

    const scheduled = new Map(); // taskId -> scheduled task
    const projectStartDate = new Date(this.projectConfig.startDate);

    // Recursive function to calculate start date for a task
    const calculateTaskStartDate = (task) => {
      if (scheduled.has(task.id)) {
        return scheduled.get(task.id);
      }

      const blockedBy = task.config.blocked_by || [];
      let taskStartDate = new Date(projectStartDate);

      if (blockedBy.length > 0) {
        // Find the latest end date among all blocking tasks that are still incomplete
        let latestEndDate = new Date(projectStartDate);
        let hasIncompleteDependencies = false;

        for (const depId of blockedBy) {
          // Find dependency in incomplete tasks with effort
          const depTask = allTasks.find((t) => t.id === depId);
          if (depTask && depTask.config.effort > 0) {
            hasIncompleteDependencies = true;
            const depScheduled = calculateTaskStartDate(depTask);
            if (depScheduled.endDate > latestEndDate) {
              latestEndDate = new Date(depScheduled.endDate);
            }
          }
          // Note: Completed dependencies are automatically ignored since they're not in allTasks
        }

        // Only adjust start date if there are still incomplete dependencies
        if (hasIncompleteDependencies) {
          // Start this task the day after the latest blocking task ends
          taskStartDate = new Date(latestEndDate);
          taskStartDate.setDate(taskStartDate.getDate() + 1);
        }
        // If all dependencies are completed, task starts at project start date (taskStartDate remains unchanged)
      }

      // Handle tasks with no effort but due dates
      let endDate;
      let duration;
      if (!task.config.effort || task.config.effort === 0) {
        if (task.config.due_date) {
          endDate = new Date(task.config.due_date);
          taskStartDate = new Date(task.config.due_date);
          duration = 0;
        } else {
          endDate = new Date(taskStartDate);
          duration = 0;
        }
      } else {
        endDate = this.addWorkingDays(taskStartDate, task.config.effort);
        duration = task.config.effort;
      }

      const scheduledTask = {
        ...task,
        startDate: taskStartDate,
        endDate,
        duration,
        blockedBy: blockedBy,
        isDueDateOnly: !task.config.effort || task.config.effort === 0,
      };

      scheduled.set(task.id, scheduledTask);
      return scheduledTask;
    };

    // Calculate schedule for all tasks
    const result = [];
    for (const task of allTasks) {
      result.push(calculateTaskStartDate(task));
    }

    // Sort to group dependencies visually
    return this.sortTasksForVisualGrouping(result);
  }

  sortTasksForVisualGrouping(tasks) {
    // Create a dependency map to understand relationships
    const dependencyMap = new Map(); // taskId -> array of tasks that depend on it
    const dependentMap = new Map(); // taskId -> array of tasks this task depends on

    // Build dependency relationships
    tasks.forEach((task) => {
      dependentMap.set(task.id, task.config.blocked_by || []);

      // For each dependency, add this task to its dependents list
      (task.config.blocked_by || []).forEach((depId) => {
        if (!dependencyMap.has(depId)) {
          dependencyMap.set(depId, []);
        }
        dependencyMap.get(depId).push(task.id);
      });
    });

    // Create groups of related tasks
    const groups = [];
    const processed = new Set();

    tasks.forEach((task) => {
      if (processed.has(task.id)) return;

      // Start a new dependency chain
      const group = [];
      const toProcess = [task.id];
      const groupSet = new Set();

      while (toProcess.length > 0) {
        const currentId = toProcess.pop();
        if (groupSet.has(currentId)) continue;

        groupSet.add(currentId);
        const currentTask = tasks.find((t) => t.id === currentId);
        if (currentTask) {
          group.push(currentTask);
          processed.add(currentId);

          // Add dependencies and dependents to the same group
          const deps = dependentMap.get(currentId) || [];
          const dependents = dependencyMap.get(currentId) || [];

          deps.forEach((depId) => {
            if (!groupSet.has(depId)) toProcess.push(depId);
          });
          dependents.forEach((depId) => {
            if (!groupSet.has(depId)) toProcess.push(depId);
          });
        }
      }

      // Sort group by start date and dependency order
      group.sort((a, b) => {
        // First sort by start date
        const dateCompare = a.startDate - b.startDate;
        if (dateCompare !== 0) return dateCompare;

        // If same start date, put dependencies before dependents
        if (a.config.blocked_by && a.config.blocked_by.includes(b.id)) return 1;
        if (b.config.blocked_by && b.config.blocked_by.includes(a.id))
          return -1;

        return 0;
      });

      groups.push(group);
    });

    // Sort groups by earliest start date in each group
    groups.sort((a, b) => {
      const minDateA = Math.min(...a.map((t) => t.startDate));
      const minDateB = Math.min(...b.map((t) => t.startDate));
      return minDateA - minDateB;
    });

    // Flatten groups back into a single array
    return groups.flat();
  }

  addWorkingDays(startDate, days) {
    const result = new Date(startDate);
    const workingDaysPerWeek = this.projectConfig.workingDaysPerWeek || 5;
    let addedDays = 0;

    while (addedDays < days) {
      result.setDate(result.getDate() + 1);
      const dayOfWeek = result.getDay();

      // Count working days based on configuration
      if (
        workingDaysPerWeek === 7 ||
        (workingDaysPerWeek === 6 && dayOfWeek !== 0) ||
        (workingDaysPerWeek === 5 && dayOfWeek !== 0 && dayOfWeek !== 6)
      ) {
        addedDays++;
      }
    }

    return result;
  }

  generateTimelineHeader(scheduledTasks) {
    if (scheduledTasks.length === 0) return "";

    const startDate = new Date(
      Math.min(...scheduledTasks.map((t) => t.startDate)),
    );
    const endDate = new Date(Math.max(...scheduledTasks.map((t) => t.endDate)));

    let html =
      '<div class="flex border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">';
    html +=
      '<div class="w-48 p-3 font-medium text-gray-900 dark:text-gray-100 border-r border-gray-200 dark:border-gray-700">Task</div>';
    html += '<div class="flex-1 p-3">';
    html +=
      '<div class="flex justify-between text-sm text-gray-600 dark:text-gray-400">';
    html += `<span>Start: ${startDate.toLocaleDateString()}</span>`;
    html += `<span>End: ${endDate.toLocaleDateString()}</span>`;
    html += "</div>";
    html += "</div>";
    html += "</div>";

    return html;
  }

  generateTimelineRows(scheduledTasks) {
    if (scheduledTasks.length === 0) return "";

    const projectStart = new Date(
      Math.min(...scheduledTasks.map((t) => t.startDate)),
    );
    const projectEnd = new Date(
      Math.max(...scheduledTasks.map((t) => t.endDate)),
    );
    const totalDays =
      Math.ceil((projectEnd - projectStart) / (1000 * 60 * 60 * 24)) + 1;

    let html = "";

    scheduledTasks.forEach((task) => {
      const startOffset = Math.ceil(
        (task.startDate - projectStart) / (1000 * 60 * 60 * 24),
      );
      const duration =
        Math.ceil((task.endDate - task.startDate) / (1000 * 60 * 60 * 24)) + 1;
      const widthPercent = (duration / totalDays) * 100;
      const leftPercent = (startOffset / totalDays) * 100;

      const priorityColor = this.getPriorityColor(task.config.priority);

      // Check if task is overdue
      const isOverdue =
        task.config.due_date && task.endDate > new Date(task.config.due_date);
      const taskBarColor = isOverdue ? "red" : priorityColor;

      html +=
        '<div class="flex border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800">';
      html += `<div class="w-48 p-3 border-r border-gray-200 dark:border-gray-700">`;
      html += `<div class="font-medium text-gray-900 dark:text-gray-100 text-sm">${task.title}</div>`;
      html += `<div class="text-xs text-gray-500 dark:text-gray-400 mt-1">ID: ${task.id}</div>`;
      html += `<div class="text-xs text-gray-500 dark:text-gray-400 mt-1">`;
      html += `${task.config.effort} days • ${task.section}`;
      if (task.config.due_date) {
        const dueDate = new Date(task.config.due_date);
        const isOverdue = task.endDate > dueDate;
        html += ` • Due: ${dueDate.toLocaleDateString()}`;
        if (isOverdue) {
          html += ` <span class="text-red-600 dark:text-red-400 font-medium inline-flex items-center gap-1"><svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg> OVERDUE</span>`;
        }
      }
      if (task.config.blocked_by && task.config.blocked_by.length > 0) {
        html += ` • Blocked by: ${task.config.blocked_by.join(", ")}`;
      }
      html += `</div>`;
      html += `</div>`;
      html += `<div class="flex-1 p-3 relative">`;

      // Add dependency arrows if task is blocked
      if (task.config.blocked_by && task.config.blocked_by.length > 0) {
        task.config.blocked_by.forEach((depId) => {
          const depTask = scheduledTasks.find((t) => t.id === depId);
          if (depTask) {
            const depEndOffset = Math.ceil(
              (depTask.endDate - projectStart) / (1000 * 60 * 60 * 24),
            );
            const depEndPercent = (depEndOffset / totalDays) * 100;

            // Draw arrow from dependency end to task start
            const arrowLength = leftPercent - depEndPercent;
            if (arrowLength > 0) {
              html += `<div class="absolute h-0.5 bg-red-400 dark:bg-red-500" style="left: ${depEndPercent}%; width: ${arrowLength}%; top: 50%; z-index: 10;">`;
              html += `<div class="absolute right-0 top-1/2 transform -translate-y-1/2 translate-x-1">`;
              html += `<svg class="w-3 h-3 text-red-400 dark:text-red-500" fill="currentColor" viewBox="0 0 20 20">`;
              html += `<path fill-rule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clip-rule="evenodd"></path>`;
              html += `</svg>`;
              html += `</div>`;
              html += `<div class="absolute left-1/2 -top-5 transform -translate-x-1/2 text-xs text-red-600 dark:text-red-400 font-medium">${depId}</div>`;
              html += `</div>`;
            }
          }
        });
      }

      html += `<div class="absolute h-6 bg-${taskBarColor}-400 dark:bg-${taskBarColor}-500 rounded border border-${taskBarColor}-500 dark:border-${taskBarColor}-600${isOverdue ? " animate-pulse" : ""}" style="left: ${leftPercent}%; width: ${widthPercent}%; top: 50%; transform: translateY(-50%); z-index: 20;">`;
      html += `<div class="px-2 py-1 text-xs text-white font-medium truncate">${task.startDate.toLocaleDateString()} - ${task.endDate.toLocaleDateString()}</div>`;
      html += `</div>`;

      // Add per-task due date marker
      if (task.config.due_date) {
        // Parse due date properly for different formats
        let dueDate = new Date(task.config.due_date);

        // If invalid, try fixing incomplete datetime format like "2025-08-21T22"
        if (isNaN(dueDate.getTime())) {
          if (task.config.due_date.match(/^\d{4}-\d{2}-\d{2}T\d{1,2}$/)) {
            dueDate = new Date(task.config.due_date + ":00:00");
          } else if (task.config.due_date.match(/^\d{4}-\d{2}-\d{2}$/)) {
            dueDate = new Date(task.config.due_date + "T00:00:00");
          }
        }

        if (!isNaN(dueDate.getTime())) {
          const dueDateOffset = Math.ceil(
            (dueDate - projectStart) / (1000 * 60 * 60 * 24),
          );
          const dueDatePercent = (dueDateOffset / totalDays) * 100;

          if (dueDatePercent >= 0 && dueDatePercent <= 100) {
            html += `<div class="absolute w-0.5 bg-orange-500 dark:bg-orange-400" style="left: ${dueDatePercent}%; height: 100%; top: 0; z-index: 25;">`;
            html += `<div class="absolute -top-5 left-1/2 transform -translate-x-1/2 text-xs text-orange-600 dark:text-orange-400 font-medium whitespace-nowrap bg-white dark:bg-gray-800 px-1 rounded flex items-center gap-1"><svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>${dueDate.toLocaleDateString()}</div>`;
            html += `</div>`;
          }
        }
      }
      html += `</div>`;
      html += "</div>";
    });

    return html;
  }

  async rewriteTasksWithUpdatedSections() {
    try {
      // Use the dedicated rewrite endpoint to update section headers
      const response = await fetch("/api/project/rewrite", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          sections: this.sections,
        }),
      });

      if (response.ok) {
        // Reload tasks and sections to reflect changes
        await this.loadTasks();
        await this.loadSections();
      } else {
        console.error("Failed to rewrite tasks with updated sections");
      }
    } catch (error) {
      console.error("Error updating sections in markdown:", error);
    }
  }

  renderProjectConfigUI() {
    if (!this.projectConfig) return;

    this.renderSections();
    this.renderAssignees();
    this.renderTags();
  }

  renderSections() {
    const container = document.getElementById("sectionsContainer");
    container.innerHTML = "";

    const sections = this.sections || [];
    sections.forEach((section, index) => {
      const div = document.createElement("div");
      div.className =
        "flex items-center gap-2 p-2 bg-gray-50 dark:bg-gray-700 rounded border";
      div.innerHTML = `
                <span class="flex-1 text-gray-900 dark:text-gray-100">${section}</span>
                <div class="flex gap-1">
                    ${
                      index > 0
                        ? `<button onclick="taskManager.moveSectionUp(${index})" class="p-1 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200" title="Move Up">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 15l7-7 7 7"></path>
                        </svg>
                    </button>`
                        : ""
                    }
                    ${
                      index < sections.length - 1
                        ? `<button onclick="taskManager.moveSectionDown(${index})" class="p-1 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200" title="Move Down">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
                        </svg>
                    </button>`
                        : ""
                    }
                    <button onclick="taskManager.removeSection(${index})" class="p-1 text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300" title="Remove">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                        </svg>
                    </button>
                </div>
            `;
      container.appendChild(div);
    });
  }

  renderAssignees() {
    const container = document.getElementById("assigneesContainer");
    container.innerHTML = "";

    const assignees = this.projectConfig.assignees || [];
    assignees.forEach((assignee, index) => {
      const chip = document.createElement("div");
      chip.className =
        "inline-flex items-center px-3 py-1 rounded-full text-sm border border-gray-300 bg-gray-100 dark:border-gray-600 dark:bg-gray-700 text-gray-800 dark:text-gray-200";
      chip.innerHTML = `
                <span>${assignee}</span>
                <button onclick="taskManager.removeAssignee(${index})" class="ml-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200">
                    <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                    </svg>
                </button>
            `;
      container.appendChild(chip);
    });
  }

  renderTags() {
    const container = document.getElementById("tagsContainer");
    container.innerHTML = "";

    const tags = this.projectConfig.tags || [];
    tags.forEach((tag, index) => {
      const chip = document.createElement("div");
      chip.className =
        "inline-flex items-center px-3 py-1 rounded-full text-sm bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200";
      chip.innerHTML = `
                <span>${tag}</span>
                <button onclick="taskManager.removeTag(${index})" class="ml-2 text-green-600 dark:text-green-400 hover:text-green-800 dark:hover:text-green-200">
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

    if (sectionName && !this.sections.includes(sectionName)) {
      // Add section to local array
      this.sections.push(sectionName);
      input.value = "";
      this.renderSections();
      this.updateConfigStats();

      // Rewrite the markdown file to include the new section
      await this.rewriteTasksWithUpdatedSections();

      // Refresh summary view if it's currently active
      if (this.currentView === "summary") {
        this.renderSummaryView();
      }
    }
  }

  async removeSection(index) {
    const remainingSections = this.sections.filter((_, i) => i !== index);
    const targetSection =
      remainingSections.length > 0 ? remainingSections[0] : "Backlog";

    if (
      confirm(
        `Are you sure you want to remove this section? Tasks in this section will be moved to "${targetSection}".`,
      )
    ) {
      const removedSection = this.sections[index];
      this.sections.splice(index, 1);

      // Move tasks from removed section to first remaining section or Backlog
      await this.moveTasksFromSection(removedSection, targetSection);

      this.renderSections();
      this.updateConfigStats();
      // Rewrite tasks to remove old section headers
      await this.rewriteTasksWithUpdatedSections();
    }
  }

  async moveSectionUp(index) {
    if (index > 0) {
      const sections = this.sections;
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
    const sections = this.sections;
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
    const tasksToMove = this.tasks.filter(
      (task) => task.section === fromSection,
    );
    for (const task of tasksToMove) {
      await this.updateTask(task.id, { section: toSection });
    }
    await this.loadTasks();
  }

  async addAssignee() {
    const input = document.getElementById("newAssigneeInput");
    const assigneeName = input.value.trim();

    if (assigneeName && !this.projectConfig.assignees.includes(assigneeName)) {
      this.projectConfig.assignees.push(assigneeName);
      // Sort assignees alphabetically
      this.projectConfig.assignees.sort();
      input.value = "";
      this.renderAssignees();
      this.updateConfigStats();
      // Auto-save the configuration
      await this.saveProjectConfig();
    }
  }

  async removeAssignee(index) {
    this.projectConfig.assignees.splice(index, 1);
    this.renderAssignees();
    this.updateConfigStats();
    // Auto-save the configuration
    await this.saveProjectConfig();
  }

  async addTag() {
    const input = document.getElementById("newTagInput");
    const tagName = input.value.trim();

    if (tagName && !this.projectConfig.tags.includes(tagName)) {
      this.projectConfig.tags.push(tagName);
      // Sort tags alphabetically
      this.projectConfig.tags.sort();
      input.value = "";
      this.renderTags();
      this.updateConfigStats();
      // Auto-save the configuration
      await this.saveProjectConfig();
    }
  }

  async removeTag(index) {
    this.projectConfig.tags.splice(index, 1);
    this.renderTags();
    this.updateConfigStats();
    // Auto-save the configuration
    await this.saveProjectConfig();
  }

  async updateTask(taskId, updates) {
    try {
      const response = await fetch(`/api/tasks/${taskId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(updates),
      });
      return response.ok;
    } catch (error) {
      console.error("Error updating task:", error);
      return false;
    }
  }

  handleSearch(query) {
    this.searchQuery = query.toLowerCase().trim();
    if (this.searchQuery === "") {
      this.filteredTasks = this.tasks;
    } else {
      this.filteredTasks = this.filterTasksRecursive(this.tasks);
      // Auto-switch to list view when searching from non-task pages
      if (!["list", "board"].includes(this.currentView)) {
        this.switchView("list");
        return; // switchView will call renderTasks
      }
    }
    this.renderTasks();
  }

  filterTasksRecursive(tasks) {
    const filtered = [];
    for (const task of tasks) {
      if (this.matchesSearch(task)) {
        // Include the task with all its children if it matches
        filtered.push({
          ...task,
          children: task.children || [],
        });
      } else if (task.children && task.children.length > 0) {
        // Check if any children match
        const filteredChildren = this.filterTasksRecursive(task.children);
        if (filteredChildren.length > 0) {
          // Include parent if children match
          filtered.push({
            ...task,
            children: filteredChildren,
          });
        }
      }
    }
    return filtered;
  }

  matchesSearch(task) {
    const query = this.searchQuery;
    return (
      task.title.toLowerCase().includes(query) ||
      task.id.toLowerCase().includes(query) ||
      task.section.toLowerCase().includes(query) ||
      (task.config.assignee &&
        task.config.assignee.toLowerCase().includes(query)) ||
      (task.config.milestone &&
        task.config.milestone.toLowerCase().includes(query)) ||
      (task.config.tag &&
        task.config.tag.some((tag) => tag.toLowerCase().includes(query))) ||
      (task.description &&
        task.description.some((desc) => desc.toLowerCase().includes(query)))
    );
  }

  getTasksToRender() {
    return this.searchQuery ? this.filteredTasks : this.tasks;
  }

  // Notes functionality
  async loadNotes() {
    try {
      const response = await fetch("/api/project");
      const projectInfo = await response.json();
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
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
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

      const response = await fetch(`/api/notes/${activeNote.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(saveData),
      });

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
      if (this.editingNote !== null) {
        // Update existing note using backend ID
        const note = this.notes[this.editingNote];
        await fetch(`/api/notes/${note.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title, content }),
        });
      } else {
        // Create new note
        const noteData = { title, content };
        if (enhancedMode) {
          noteData.mode = "enhanced";
          noteData.paragraphs = content ? [{ id: `p-${Date.now()}`, type: "text", content }] : [];
        }
        await fetch("/api/notes", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(noteData),
        });
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
      await fetch(`/api/notes/${note.id}`, { method: "DELETE" });
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
      const response = await fetch('/api/notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newNote)
      });

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
    const fileRef = `[📎 ${file.name}](attachment:${file.name})`;
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
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
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
      const response = await fetch("/api/project");
      const projectInfo = await response.json();
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
        await fetch(`/api/goals/${goal.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(goalData),
        });
      } else {
        // Create new goal
        await fetch("/api/goals", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(goalData),
        });
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
      await fetch(`/api/goals/${goal.id}`, { method: "DELETE" });
      await this.loadGoals();
    } catch (error) {
      console.error("Error deleting goal:", error);
    }
  }

  // Milestones functionality
  async loadMilestones() {
    try {
      const response = await fetch("/api/milestones");
      this.milestones = await response.json();
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
        await fetch(`/api/milestones/${this.editingMilestoneId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        });
      } else {
        await fetch("/api/milestones", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        });
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
      await fetch(`/api/milestones/${id}`, { method: "DELETE" });
      await this.loadMilestones();
    } catch (error) {
      console.error("Error deleting milestone:", error);
    }
  }

  // Ideas functionality
  async loadIdeas() {
    try {
      const response = await fetch("/api/ideas");
      this.ideas = await response.json();
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

    container.innerHTML = this.ideas.map(idea => `
      <div class="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 border border-gray-200 dark:border-gray-600">
        <div class="flex justify-between items-start mb-2">
          <h3 class="font-medium text-gray-900 dark:text-gray-100">${idea.title}</h3>
          <span class="px-2 py-1 text-xs rounded ${statusColors[idea.status] || statusColors.new}">${idea.status}</span>
        </div>
        ${idea.category ? `<span class="inline-block px-2 py-0.5 text-xs bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300 rounded mb-2">${idea.category}</span>` : ""}
        <p class="text-xs text-gray-500 dark:text-gray-400 mb-2">Created: ${idea.created}</p>
        ${idea.description ? `<p class="text-sm text-gray-600 dark:text-gray-300">${idea.description}</p>` : ""}
        <div class="flex justify-end space-x-2 mt-3">
          <button onclick="taskManager.openIdeaModal('${idea.id}')" class="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100">Edit</button>
          <button onclick="taskManager.deleteIdea('${idea.id}')" class="text-sm text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-200">Delete</button>
        </div>
      </div>
    `).join("");
  }

  openIdeaModal(id = null) {
    this.editingIdeaId = id;
    const modal = document.getElementById("ideaModal");
    const title = document.getElementById("ideaModalTitle");
    const form = document.getElementById("ideaForm");

    form.reset();
    title.textContent = id ? "Edit Idea" : "Add Idea";

    if (id && this.ideas) {
      const idea = this.ideas.find(i => i.id === id);
      if (idea) {
        document.getElementById("ideaTitle").value = idea.title;
        document.getElementById("ideaStatus").value = idea.status;
        document.getElementById("ideaCategory").value = idea.category || "";
        document.getElementById("ideaDescription").value = idea.description || "";
      }
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
    };

    try {
      if (this.editingIdeaId) {
        await fetch(`/api/ideas/${this.editingIdeaId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        });
      } else {
        await fetch("/api/ideas", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        });
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
      await fetch(`/api/ideas/${id}`, { method: "DELETE" });
      await this.loadIdeas();
    } catch (error) {
      console.error("Error deleting idea:", error);
    }
  }

  // Retrospectives functionality
  async loadRetrospectives() {
    try {
      const response = await fetch("/api/retrospectives");
      this.retrospectives = await response.json();
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
        await fetch(`/api/retrospectives/${this.editingRetrospectiveId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        });
      } else {
        await fetch("/api/retrospectives", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        });
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
      await fetch(`/api/retrospectives/${id}`, { method: "DELETE" });
      await this.loadRetrospectives();
    } catch (error) {
      console.error("Error deleting retrospective:", error);
    }
  }

  // Time Tracking functionality
  async loadTimeTracking() {
    try {
      const response = await fetch("/api/time-entries");
      this.timeEntries = await response.json();
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
      await fetch(`/api/time-entries/${taskId}/${entryId}`, { method: "DELETE" });
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
      await fetch(`/api/time-entries/${this.editingTask.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date, hours, person, description }),
      });
      this.hideTimeEntryForm();
      await this.loadTaskTimeEntries(this.editingTask.id);
    } catch (error) {
      console.error("Error saving time entry:", error);
    }
  }

  async loadTaskTimeEntries(taskId) {
    try {
      const response = await fetch(`/api/time-entries/${taskId}`);
      const entries = await response.json();
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
      await fetch(`/api/time-entries/${this.editingTask.id}/${entryId}`, { method: "DELETE" });
      await this.loadTaskTimeEntries(this.editingTask.id);
    } catch (error) {
      console.error("Error deleting time entry:", error);
    }
  }

  // Mobile menu functionality
  toggleMobileMenu() {
    const mobileMenu = document.getElementById("mobileMenu");
    const isHidden = mobileMenu.classList.contains("hidden");

    if (isHidden) {
      mobileMenu.classList.remove("hidden");
      // Sync search values
      const searchInput = document.getElementById("searchInput");
      const searchInputMobile = document.getElementById("searchInputMobile");
      searchInputMobile.value = searchInput.value;
    } else {
      mobileMenu.classList.add("hidden");
    }
  }

  closeMobileMenu() {
    const mobileMenu = document.getElementById("mobileMenu");
    mobileMenu.classList.add("hidden");
  }

  // Canvas functionality
  async loadCanvas() {
    try {
      const response = await fetch("/api/canvas/sticky_notes");
      this.stickyNotes = await response.json();
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
                <button onclick="taskManager.editStickyNote('${stickyNote.id}')">✏️</button>
                <button onclick="taskManager.deleteStickyNote('${stickyNote.id}')">🗑️</button>
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

      await fetch(`/api/canvas/sticky_notes/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ size }),
      });
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

      const response = await fetch("/api/canvas/sticky_notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(postData),
      });

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
      await fetch(`/api/canvas/sticky_notes/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: content.trim() }),
      });
    } catch (error) {
      console.error("Error updating sticky note:", error);
    }
  }

  async updateStickyNotePosition(id, position) {
    try {
      await fetch(`/api/canvas/sticky_notes/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ position }),
      });
    } catch (error) {
      console.error("Error updating sticky note position:", error);
    }
  }

  async deleteStickyNote(id) {
    if (confirm("Delete this sticky note?")) {
      try {
        await fetch(`/api/canvas/sticky_notes/${id}`, { method: "DELETE" });
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
      const response = await fetch("/api/mindmaps");
      this.mindmaps = await response.json();
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
    // Draw lines between connected nodes
    this.selectedMindmap.nodes.forEach((node) => {
      if (node.parent) {
        const parent = this.selectedMindmap.nodes.find(
          (n) => n.id === node.parent,
        );
        if (parent && parent.x !== undefined && node.x !== undefined) {
          const line = document.createElement("div");
          line.className = "mindmap-connection";

          const x1 = parent.x + 80; // Offset for node width
          const y1 = parent.y + 20; // Offset for node height center
          const x2 = node.x;
          const y2 = node.y + 20;

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
        await fetch(`/api/mindmaps/${this.selectedMindmap.id}`, {
          method: "DELETE",
        });
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
        response = await fetch(`/api/mindmaps/${this.editingMindmap.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title, nodes }),
        });
      } else {
        // Create new mindmap
        response = await fetch("/api/mindmaps", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title, nodes }),
        });
      }

      if (response.ok) {
        this.closeMindmapModal();
        this.loadMindmaps();

        // If we were editing, reselect the mindmap
        if (this.editingMindmap) {
          setTimeout(() => {
            document.getElementById("mindmapSelector").value =
              this.editingMindmap.id;
            this.selectMindmap(this.editingMindmap.id);
          }, 100);
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
      const response = await fetch('/api/c4');
      if (response.ok) {
        const data = await response.json();
        this.c4Components = data.components || [];
      } else {
        this.c4Components = this.getDefaultC4Components();
      }
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
      await fetch('/api/c4', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ components: this.c4Components }),
      });
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
}

// Initialize the app when DOM is ready
let taskManager;
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => {
    taskManager = new TaskManager();
  });
} else {
  taskManager = new TaskManager();
}
