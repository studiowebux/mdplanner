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
        // Reload all data for new project
        this.tm.tasks = [];
        this.tm.filteredTasks = [];
        this.tm.projectInfo = null;
        this.tm.projectConfig = null;

        await this.tm.loadProjectConfig();
        await this.tm.loadSections();
        await this.tm.loadTasks();

        if (this.tm.currentView === "summary") {
          this.tm.loadProjectInfo();
        } else if (this.tm.currentView === "notes") {
          this.tm.loadNotes();
        } else if (this.tm.currentView === "goals") {
          this.tm.loadGoals();
        }

        this.tm.renderTasks();
      }
    } catch (error) {
      console.error("Error switching project:", error);
    }
  }
}
