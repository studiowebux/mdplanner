// Breadcrumb Component
// Shows navigation path: Home > Category > Current View

import { AccessibilityManager } from "./accessibility.js";

const VIEW_CATEGORIES = {
  summary: { category: "Overview", label: "Summary" },
  list: { category: "Tasks", label: "List View" },
  board: { category: "Tasks", label: "Board View" },
  timeline: { category: "Tasks", label: "Timeline" },
  notes: { category: "Planning", label: "Notes" },
  goals: { category: "Planning", label: "Goals" },
  milestones: { category: "Planning", label: "Milestones" },
  ideas: { category: "Planning", label: "Ideas" },
  canvas: { category: "Diagrams", label: "Canvas" },
  mindmap: { category: "Diagrams", label: "Mindmap" },
  c4: { category: "Diagrams", label: "C4 Architecture" },
  retrospectives: { category: "Analysis", label: "Retrospectives" },
  swot: { category: "Analysis", label: "SWOT Analysis" },
  riskAnalysis: { category: "Analysis", label: "Risk Analysis" },
  leanCanvas: { category: "Strategy", label: "Lean Canvas" },
  businessModel: { category: "Strategy", label: "Business Model" },
  projectValue: { category: "Strategy", label: "Value Board" },
  brief: { category: "Strategy", label: "Brief" },
  strategicLevels: { category: "Strategy", label: "Strategic Levels" },
  timeTracking: { category: "Resources", label: "Time Tracking" },
  capacity: { category: "Resources", label: "Capacity" },
  billing: { category: "Resources", label: "Billing" },
  config: { category: "Settings", label: "Configuration" },
};

/**
 * Breadcrumb navigation component
 */
export class Breadcrumb {
  /**
   * Render breadcrumb for current view
   * @param {string} currentView
   */
  static render(currentView) {
    const container = document.getElementById("breadcrumb");
    if (!container) return;

    // Check if breadcrumbs should be shown
    if (!AccessibilityManager.get("showBreadcrumbs")) {
      container.classList.add("hidden");
      return;
    }
    container.classList.remove("hidden");

    const viewInfo = VIEW_CATEGORIES[currentView] ||
      { category: "Other", label: currentView };

    container.innerHTML = `
      <nav class="breadcrumb-nav" aria-label="Breadcrumb">
        <ol class="breadcrumb-list">
          <li class="breadcrumb-item">
            <button onclick="taskManager.switchView('summary')" class="breadcrumb-link">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"></path>
              </svg>
              <span>Home</span>
            </button>
          </li>
          <li class="breadcrumb-separator" aria-hidden="true">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path>
            </svg>
          </li>
          <li class="breadcrumb-item">
            <span class="breadcrumb-category">${viewInfo.category}</span>
          </li>
          <li class="breadcrumb-separator" aria-hidden="true">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path>
            </svg>
          </li>
          <li class="breadcrumb-item">
            <span class="breadcrumb-current" aria-current="page">${viewInfo.label}</span>
          </li>
        </ol>
      </nav>
    `;
  }
}
