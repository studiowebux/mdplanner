// Brain Manager Module — main view with sidebar + tabbed content
import { BrainsAPI } from "../api.js";
import { BrainFilesPanel } from "./brains-files.js";
import { BrainSessionsPanel } from "./brains-sessions.js";
import { BrainSyncPanel } from "./brains-sync.js";
import { BrainSetupPanel } from "./brains-setup.js";

export class BrainsModule {
  constructor(taskManager) {
    this.tm = taskManager;
    this.brains = [];
    this.selectedBrain = null;
    this.activeTab = "files";
    this.filesPanel = new BrainFilesPanel(this);
    this.sessionsPanel = new BrainSessionsPanel(this);
    this.syncPanel = new BrainSyncPanel(this);
    this.setupPanel = new BrainSetupPanel(this);
  }

  async load() {
    try {
      this.brains = await BrainsAPI.fetchAll();
    } catch {
      this.brains = [];
    }
    this.renderView();
  }

  renderView() {
    const container = document.getElementById("brainsContainer");
    const emptyState = document.getElementById("emptyBrainsState");
    if (!container) return;

    if (!this.brains.length) {
      container.classList.add("hidden");
      if (emptyState) emptyState.classList.remove("hidden");
      return;
    }
    if (emptyState) emptyState.classList.add("hidden");
    container.classList.remove("hidden");

    this._renderSidebar();
    this._renderTabs();

    if (!this.selectedBrain && this.brains.length > 0) {
      this.selectBrain(this.brains[0].name);
    } else if (this.selectedBrain) {
      this._renderActivePanel();
    }
  }

  _renderSidebar() {
    const sidebar = document.getElementById("brainsSidebar");
    if (!sidebar) return;

    sidebar.innerHTML = this.brains
      .map(
        (b) => `
      <button class="brain-sidebar-item ${this.selectedBrain === b.name ? "active" : ""}"
        data-brain="${b.name}" title="${b.path}">
        <span class="brain-sidebar-name">${b.name}</span>
        ${b.isCore ? '<span class="brain-core-badge">core</span>' : ""}
        ${b.lastActive ? `<span class="brain-sidebar-date">${new Date(b.lastActive).toLocaleDateString()}</span>` : ""}
      </button>
    `,
      )
      .join("");
  }

  _renderTabs() {
    const tabs = document.getElementById("brainsTabs");
    if (!tabs) return;

    const tabList = [
      { id: "files", label: "Files" },
      { id: "sessions", label: "Sessions" },
      { id: "memory", label: "Memory" },
      { id: "sync", label: "Sync" },
      { id: "setup", label: "Setup" },
    ];

    tabs.innerHTML = tabList
      .map(
        (t) =>
          `<button class="brain-tab ${this.activeTab === t.id ? "active" : ""}" data-tab="${t.id}">${t.label}</button>`,
      )
      .join("");
  }

  selectBrain(name) {
    this.selectedBrain = name;
    this._renderSidebar();
    this._renderActivePanel();
  }

  switchTab(tabId) {
    this.activeTab = tabId;
    this._renderTabs();
    this._renderActivePanel();
  }

  _renderActivePanel() {
    if (!this.selectedBrain) return;

    switch (this.activeTab) {
      case "files":
        this.filesPanel.render(this.selectedBrain);
        break;
      case "sessions":
        this.sessionsPanel.render(this.selectedBrain);
        break;
      case "memory":
        this._renderMemoryPanel();
        break;
      case "sync":
        this.syncPanel.render(this.brains);
        break;
      case "setup":
        this.setupPanel.render();
        break;
    }
  }

  async _renderMemoryPanel() {
    const panel = document.getElementById("brainsContent");
    if (!panel) return;

    panel.innerHTML =
      '<div class="brain-loading">Loading memory...</div>';

    try {
      const data = await BrainsAPI.fetchMemory(this.selectedBrain);
      panel.innerHTML = `
        <div class="brain-memory-panel">
          <div class="brain-memory-header">
            <h3>MEMORY.md</h3>
            <div class="brain-memory-actions">
              <span class="brain-memory-status">${data.exists ? "Saved" : "New file"}</span>
              <button id="brainMemorySaveBtn" class="btn-outline">Save</button>
            </div>
          </div>
          <textarea id="brainMemoryEditor" class="brain-memory-editor"
            placeholder="No memory file yet. Start typing to create one.">${data.content || ""}</textarea>
        </div>
      `;

      document
        .getElementById("brainMemorySaveBtn")
        ?.addEventListener("click", () => this._saveMemory());
    } catch {
      panel.innerHTML =
        '<div class="brain-error">Failed to load memory</div>';
    }
  }

  async _saveMemory() {
    const editor = document.getElementById("brainMemoryEditor");
    const btn = document.getElementById("brainMemorySaveBtn");
    const status = document.querySelector(".brain-memory-status");
    if (!editor || !btn) return;

    btn.disabled = true;
    btn.textContent = "Saving...";
    try {
      await BrainsAPI.saveMemory(this.selectedBrain, editor.value);
      if (status) status.textContent = "Saved";
    } catch {
      if (status) status.textContent = "Save failed";
    } finally {
      btn.disabled = false;
      btn.textContent = "Save";
    }
  }

  async registerBrain() {
    const nameInput = document.getElementById("brainRegisterName");
    const pathInput = document.getElementById("brainRegisterPath");
    if (!nameInput || !pathInput) return;

    const name = nameInput.value.trim();
    const path = pathInput.value.trim();
    if (!name || !path) return;

    try {
      const resp = await BrainsAPI.register({ name, path });
      if (resp.ok) {
        nameInput.value = "";
        pathInput.value = "";
        await this.load();
      }
    } catch {
      // Registration failed
    }
  }

  async removeBrain(name) {
    if (!confirm(`Remove brain "${name}" from registry?`)) return;
    try {
      await BrainsAPI.remove(name);
      if (this.selectedBrain === name) this.selectedBrain = null;
      await this.load();
    } catch {
      // Removal failed
    }
  }

  bindEvents() {
    // Sidebar brain selection (event delegation)
    document.getElementById("brainsSidebar")?.addEventListener("click", (e) => {
      const item = e.target.closest("[data-brain]");
      if (item) this.selectBrain(item.dataset.brain);
    });

    // Tab switching (event delegation)
    document.getElementById("brainsTabs")?.addEventListener("click", (e) => {
      const tab = e.target.closest("[data-tab]");
      if (tab) this.switchTab(tab.dataset.tab);
    });

    // Register brain button
    document
      .getElementById("brainRegisterBtn")
      ?.addEventListener("click", () => this.registerBrain());

    this.filesPanel.bindEvents();
    this.sessionsPanel.bindEvents();
    this.syncPanel.bindEvents();
    this.setupPanel.bindEvents();
  }
}
