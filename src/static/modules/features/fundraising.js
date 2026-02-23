/**
 * Fundraising view — tab controller.
 * Manages which sub-tab is visible and delegates load/bind to sub-modules.
 * Pattern: View Module (tab controller)
 */

export class FundraisingModule {
  constructor(taskManager) {
    this.tm = taskManager;
    this.activeTab = "safe";
  }

  async load() {
    await Promise.all([
      this.tm.fundraisingSafeModule.load(),
      this.tm.fundraisingPipelineModule.load(),
      this.tm.fundraisingKpiModule.load(),
    ]);
    this.tm.fundraisingRunwayModule.load();
    this.tm.fundraisingTargetsModule.load();
    this.switchTab(this.activeTab);
  }

  switchTab(tab) {
    this.activeTab = tab;

    const panels = ["safe", "pipeline", "kpi", "runway", "targets"];
    panels.forEach((p) => {
      const panel = document.getElementById(`fundraising-panel-${p}`);
      if (panel) panel.classList.toggle("hidden", p !== tab);
    });

    const targetPanel = document.getElementById(`fundraising-panel-${tab}`);
    if (targetPanel) {
      targetPanel.querySelectorAll(".view-tab").forEach((btn) => {
        btn.classList.toggle("active", btn.dataset.tab === tab);
      });
    }
  }

  toggleGlossary() {
    const glossary = document.getElementById("fundraising-glossary");
    if (glossary) glossary.classList.toggle("hidden");
  }

  bindEvents() {
    const container = document.getElementById("fundraisingView");
    container?.querySelectorAll(".view-tab").forEach((btn) => {
      btn.addEventListener("click", () => this.switchTab(btn.dataset.tab));
    });

    document.querySelectorAll("[data-action='fundraising-info']").forEach(
      (btn) => btn.addEventListener("click", () => this.toggleGlossary()),
    );

    document.addEventListener("click", (e) => {
      const glossary = document.getElementById("fundraising-glossary");
      if (
        glossary &&
        !glossary.classList.contains("hidden") &&
        !glossary.contains(e.target) &&
        !e.target.closest("[data-action='fundraising-info']")
      ) {
        glossary.classList.add("hidden");
      }
    });

    this.tm.fundraisingSafeModule.bindEvents();
    this.tm.fundraisingPipelineModule.bindEvents();
    this.tm.fundraisingKpiModule.bindEvents();
    this.tm.fundraisingRunwayModule.bindEvents();
    this.tm.fundraisingTargetsModule.bindEvents();
    this.tm.fundraisingSafeSidenavModule.bindEvents();
    this.tm.fundraisingPipelineSidenavModule.bindEvents();
    this.tm.fundraisingKpiSidenavModule.bindEvents();
  }
}
