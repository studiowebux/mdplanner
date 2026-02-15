// Help System
// In-app help panel using Sidenav pattern

import { Sidenav } from "./sidenav.js";

const PANEL_ID = "helpPanel";

// View-specific help content
// Keys match view names from app.js switchView()
const VIEW_HELP_CONTENT = {
  summary: {
    title: "Summary",
    description: "Overview of your project with key metrics and recent activity.",
    tips: [
      "Click on any chart segment to filter tasks",
      "Drag and drop to reorder sections",
      "Use the status selector to update project health",
    ],
    shortcuts: [],
  },
  list: {
    title: "List View",
    description: "All tasks in a filterable, sortable table format.",
    tips: [
      "Click column headers to sort",
      "Use filters to narrow down tasks",
      "Click a task to open details panel",
      "Multi-select tasks for bulk actions",
    ],
    shortcuts: [],
  },
  board: {
    title: "Board View",
    description: "Kanban-style board organized by task status.",
    tips: [
      "Drag tasks between columns to change status",
      "Collapse columns to save space",
      "Right-click for quick actions",
    ],
    shortcuts: [],
  },
  timeline: {
    title: "Timeline",
    description: "Gantt-style view showing task schedules and dependencies.",
    tips: [
      "Drag task bars to reschedule",
      "Zoom in/out to adjust time scale",
      "Dependencies shown as connecting lines",
    ],
    shortcuts: [],
  },
  goals: {
    title: "Goals",
    description: "Define and track high-level project objectives.",
    tips: [
      "Link goals to milestones for progress tracking",
      "Use status filters to focus on active goals",
      "Goals cascade down to tasks",
    ],
    shortcuts: [],
  },
  milestones: {
    title: "Milestones",
    description: "Track key project deliverables and deadlines.",
    tips: [
      "Link tasks to milestones",
      "Progress auto-calculated from linked tasks",
      "Overdue milestones highlighted in red",
    ],
    shortcuts: [],
  },
  ideas: {
    title: "Ideas",
    description: "Capture and organize project ideas for later implementation.",
    tips: [
      "Convert ideas to tasks when ready",
      "Use priority to rank ideas",
      "Archive completed or rejected ideas",
    ],
    shortcuts: [],
  },
  retrospectives: {
    title: "Retrospectives",
    description: "Document lessons learned and team feedback.",
    tips: [
      "Create retros at sprint or milestone end",
      "Categorize feedback for patterns",
      "Action items can become tasks",
    ],
    shortcuts: [],
  },
  swot: {
    title: "SWOT Analysis",
    description: "Analyze Strengths, Weaknesses, Opportunities, and Threats.",
    tips: [
      "Create multiple SWOT analyses for different contexts",
      "Click quadrants to add items",
      "Export for presentations",
    ],
    shortcuts: [],
  },
  riskAnalysis: {
    title: "Risk Analysis",
    description: "Identify and assess project risks with mitigation strategies.",
    tips: [
      "Plot risks by probability and impact",
      "Define mitigation actions for high risks",
      "Review risks regularly",
    ],
    shortcuts: [],
  },
  leanCanvas: {
    title: "Lean Canvas",
    description: "One-page business model for your project or product.",
    tips: [
      "Fill sections in order: Problem first",
      "Keep entries concise and focused",
      "Iterate as you learn more",
    ],
    shortcuts: [],
  },
  businessModel: {
    title: "Business Model Canvas",
    description: "Full business model with 9 building blocks.",
    tips: [
      "Start with Value Propositions",
      "Connect related blocks logically",
      "Review periodically",
    ],
    shortcuts: [],
  },
  projectValue: {
    title: "Value Board",
    description: "Define and communicate project value proposition.",
    tips: [
      "Identify key stakeholders",
      "Map value to specific outcomes",
      "Use for stakeholder alignment",
    ],
    shortcuts: [],
  },
  brief: {
    title: "Project Brief",
    description: "Structured document defining project scope and context.",
    tips: [
      "Complete all sections before starting",
      "Update as scope changes",
      "Share with stakeholders",
    ],
    shortcuts: [],
  },
  canvas: {
    title: "Canvas",
    description: "Free-form visual workspace with sticky notes and mindmaps.",
    tips: [
      "Double-click to add sticky notes",
      "Drag to pan the canvas",
      "Use mouse wheel to zoom",
    ],
    shortcuts: [],
  },
  mindmap: {
    title: "Mindmap",
    description: "Hierarchical visual diagrams for brainstorming and planning.",
    tips: [
      "Use indentation to create hierarchy",
      "Tab to indent, Shift+Tab to outdent",
      "Alt+Up/Down to reorder nodes",
    ],
    shortcuts: [
      { keys: ["Tab"], action: "Indent node" },
      { keys: ["Shift", "Tab"], action: "Outdent node" },
      { keys: ["Enter"], action: "New sibling node" },
      { keys: ["Alt", "Up"], action: "Move line up" },
      { keys: ["Alt", "Down"], action: "Move line down" },
    ],
  },
  c4: {
    title: "C4 Architecture",
    description: "Software architecture diagrams using C4 model levels.",
    tips: [
      "Start at Context level",
      "Drill down to Container, Component, Code",
      "Navigate between levels with breadcrumbs",
    ],
    shortcuts: [],
  },
  timeTracking: {
    title: "Time Tracking",
    description: "Log and review time spent on tasks.",
    tips: [
      "Start timer from any task",
      "Manual entries also supported",
      "Export for invoicing",
    ],
    shortcuts: [],
  },
  capacity: {
    title: "Capacity Planning",
    description: "Manage team workload and resource allocation.",
    tips: [
      "Set team member availability",
      "View allocation heatmaps",
      "Balance workloads across team",
    ],
    shortcuts: [],
  },
  billing: {
    title: "Billing",
    description: "Track project costs and generate invoices.",
    tips: [
      "Link time entries to billing",
      "Set hourly rates per team member",
      "Export invoices as PDF",
    ],
    shortcuts: [],
  },
  crm: {
    title: "CRM",
    description: "Manage contacts and client relationships.",
    tips: [
      "Link contacts to projects",
      "Track communication history",
      "Set follow-up reminders",
    ],
    shortcuts: [],
  },
  notes: {
    title: "Notes",
    description: "Rich text notes with markdown support.",
    tips: [
      "Use markdown for formatting",
      "Link notes to tasks",
      "Toggle preview mode to see rendered output",
    ],
    shortcuts: [
      { keys: ["Tab"], action: "Indent list item" },
      { keys: ["Shift", "Tab"], action: "Outdent list item" },
    ],
  },
  strategicLevels: {
    title: "Strategic Levels",
    description: "Multi-level planning from vision to execution.",
    tips: [
      "Define vision at the top level",
      "Break down into objectives and initiatives",
      "Link to tasks for execution",
    ],
    shortcuts: [],
  },
  config: {
    title: "Settings",
    description: "Configure project and application preferences.",
    tips: [
      "Set default values for new tasks",
      "Configure team members and sections",
      "Export/import project data",
    ],
    shortcuts: [],
  },
};

// Global shortcuts available everywhere
const GLOBAL_SHORTCUTS = [
  { keys: ["?"], action: "Toggle help panel" },
  { keys: ["Escape"], action: "Close panels and modals" },
  { keys: ["Ctrl/Cmd", "K"], action: "Search (when focused)" },
];

// Documentation links
const DOC_LINKS = [
  { label: "Getting Started", url: "https://github.com/studiowebux/mdplanner#getting-started" },
  { label: "Keyboard Shortcuts", url: "https://github.com/studiowebux/mdplanner#keyboard-shortcuts" },
  { label: "Report an Issue", url: "https://github.com/studiowebux/mdplanner/issues" },
];

/**
 * Help System
 * Provides contextual help via a sidenav panel
 */
export class Help {
  static currentView = "summary";
  static initialized = false;

  /**
   * Initialize the help system
   */
  static init() {
    if (this.initialized) return;

    this._setupKeyboardHandler();
    this._setupButtonHandler();
    this._setupCloseHandler();
    this.render();

    this.initialized = true;
  }

  /**
   * Open the help panel
   */
  static open() {
    Sidenav.open(PANEL_ID, { focusFirst: false });
    this.render();
  }

  /**
   * Close the help panel
   */
  static close() {
    Sidenav.close(PANEL_ID);
  }

  /**
   * Toggle the help panel
   */
  static toggle() {
    Sidenav.toggle(PANEL_ID, { focusFirst: false });
    if (Sidenav.isOpen(PANEL_ID)) {
      this.render();
    }
  }

  /**
   * Update contextual content for current view
   * @param {string} viewName - Name of the current view
   */
  static setCurrentView(viewName) {
    this.currentView = viewName;
    if (Sidenav.isOpen(PANEL_ID)) {
      this.render();
    }
  }

  /**
   * Render help content
   */
  static render() {
    const content = VIEW_HELP_CONTENT[this.currentView] || VIEW_HELP_CONTENT.summary;

    // Context section
    const contextSection = document.getElementById("helpContextSection");
    if (contextSection) {
      contextSection.innerHTML = `
        <h3 class="help-view-title">${content.title}</h3>
        <p class="help-view-desc">${content.description}</p>
      `;
    }

    // Tips section
    const tipsSection = document.getElementById("helpTipsSection");
    if (tipsSection && content.tips.length > 0) {
      tipsSection.innerHTML = `
        <h4 class="sidenav-section-title">Tips</h4>
        <ul class="help-tips-list">
          ${content.tips.map((tip) => `<li>${tip}</li>`).join("")}
        </ul>
      `;
      tipsSection.classList.remove("hidden");
    } else if (tipsSection) {
      tipsSection.classList.add("hidden");
    }

    // Shortcuts section
    const shortcutsSection = document.getElementById("helpShortcutsSection");
    if (shortcutsSection) {
      const viewShortcuts = content.shortcuts || [];
      const allShortcuts = [...GLOBAL_SHORTCUTS, ...viewShortcuts];

      shortcutsSection.innerHTML = `
        <h4 class="sidenav-section-title">Keyboard Shortcuts</h4>
        <div class="help-shortcuts-grid">
          ${allShortcuts
            .map(
              (s) => `
            <div class="help-shortcut-row">
              <span class="help-shortcut-keys">
                ${s.keys.map((k) => `<kbd class="help-kbd">${k}</kbd>`).join(" + ")}
              </span>
              <span class="help-shortcut-action">${s.action}</span>
            </div>
          `
            )
            .join("")}
        </div>
      `;
    }

    // Docs section
    const docsSection = document.getElementById("helpDocsSection");
    if (docsSection) {
      docsSection.innerHTML = `
        <h4 class="sidenav-section-title">Documentation</h4>
        <ul class="help-links-list">
          ${DOC_LINKS.map(
            (link) => `
            <li>
              <a href="${link.url}" target="_blank" rel="noopener noreferrer" class="help-link">
                ${link.label}
                <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"></path>
                </svg>
              </a>
            </li>
          `
          ).join("")}
        </ul>
      `;
    }
  }

  /**
   * Setup global ? key handler
   */
  static _setupKeyboardHandler() {
    document.addEventListener("keydown", (e) => {
      // Ignore if typing in an input
      const tagName = e.target.tagName.toLowerCase();
      if (tagName === "input" || tagName === "textarea" || tagName === "select") {
        return;
      }

      // Ignore if modifier keys are held (except shift for ?)
      if (e.ctrlKey || e.metaKey || e.altKey) {
        return;
      }

      if (e.key === "?") {
        e.preventDefault();
        this.toggle();
      }
    });
  }

  /**
   * Setup help button click handler
   */
  static _setupButtonHandler() {
    const btn = document.getElementById("helpBtn");
    if (btn) {
      btn.addEventListener("click", () => this.toggle());
    }

    // Mobile button
    const mobileBtn = document.getElementById("helpBtnMobile");
    if (mobileBtn) {
      mobileBtn.addEventListener("click", () => {
        this.toggle();
        // Close mobile menu if open
        document.getElementById("mobileMenu")?.classList.add("hidden");
      });
    }
  }

  /**
   * Setup close button handler
   */
  static _setupCloseHandler() {
    const closeBtn = document.getElementById("helpPanelClose");
    if (closeBtn) {
      closeBtn.addEventListener("click", () => this.close());
    }
  }
}

export default Help;
