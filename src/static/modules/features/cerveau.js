// Cerveau Viewer Module — read-only brain viewer
import { CerveauAPI } from "../api.js";
import { showLoading, hideLoading } from "../ui/loading.js";

export class CerveauModule {
  constructor(taskManager) {
    this.tm = taskManager;
    this.enabled = false;
    this.brains = [];
    this.protocol = null;
    this.registry = null;
    this.manifest = null;
    this.selectedBrain = null;
    this.activeTab = "overview";
    this.expandedDirs = new Set();
    this.fileCache = new Map();
  }

  async load() {
    showLoading("cerveauView");
    try {
      const result = await CerveauAPI.fetchBrains();
      if (result === null) {
        this.enabled = false;
        this.brains = [];
      } else {
        this.enabled = true;
        this.brains = result;
        const [protocol, registry, manifest] = await Promise.all([
          CerveauAPI.fetchProtocol(),
          CerveauAPI.fetchRegistry(),
          CerveauAPI.fetchManifest(),
        ]);
        this.protocol = protocol;
        this.registry = registry;
        this.manifest = manifest;
      }
    } catch {
      this.enabled = false;
      this.brains = [];
    }
    this.renderView();
    hideLoading("cerveauView");
  }

  renderView() {
    const container = document.getElementById("cerveauContainer");
    const emptyState = document.getElementById("emptyCerveauState");
    if (!container) return;

    if (!this.enabled) {
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
    const sidebar = document.getElementById("cerveauSidebar");
    if (!sidebar) return;

    const version = this.manifest ? `v${this.manifest.version}` : "";

    sidebar.innerHTML = `
      ${version ? `<div class="cerveau-version">${version}</div>` : ""}
      <div class="cerveau-sidebar-section">Brains</div>
      ${this.brains.map((b) => `
        <button class="cerveau-sidebar-item ${this.selectedBrain === b.name ? "active" : ""}"
          data-brain="${b.name}" title="${b.codebase}">
          <span class="cerveau-sidebar-name">${b.name}</span>
          ${b.isCore ? '<span class="cerveau-core-badge">core</span>' : ""}
        </button>
      `).join("")}
    `;
  }

  _renderTabs() {
    const tabs = document.getElementById("cerveauTabs");
    if (!tabs) return;

    const tabList = [
      { id: "overview", label: "Overview" },
      { id: "rules", label: "Rules" },
      { id: "memory", label: "Memory" },
      { id: "files", label: "Files" },
      { id: "protocol", label: "Protocol" },
      { id: "packages", label: "Packages" },
    ];

    tabs.innerHTML = tabList
      .map(
        (t) =>
          `<button class="cerveau-tab ${this.activeTab === t.id ? "active" : ""}" data-tab="${t.id}">${t.label}</button>`,
      )
      .join("");
  }

  selectBrain(name) {
    this.selectedBrain = name;
    this.expandedDirs.clear();
    this.fileCache.clear();
    this._renderSidebar();
    this._renderActivePanel();
  }

  switchTab(tabId) {
    this.activeTab = tabId;
    this._renderTabs();
    this._renderActivePanel();
  }

  _renderActivePanel() {
    if (!this.selectedBrain && this.activeTab !== "protocol" && this.activeTab !== "packages") return;

    switch (this.activeTab) {
      case "overview":
        this._renderOverview();
        break;
      case "rules":
        this._renderRules();
        break;
      case "memory":
        this._renderMemory();
        break;
      case "files":
        this._renderFiles();
        break;
      case "protocol":
        this._renderProtocol();
        break;
      case "packages":
        this._renderPackages();
        break;
    }
  }

  _renderOverview() {
    const panel = document.getElementById("cerveauContent");
    if (!panel) return;
    const brain = this.brains.find((b) => b.name === this.selectedBrain);
    if (!brain) return;

    panel.innerHTML = `
      <div class="cerveau-detail">
        <h3>${brain.name}</h3>
        <table class="cerveau-props">
          <tr><td class="cerveau-prop-label">Path</td><td>${brain.path}</td></tr>
          <tr><td class="cerveau-prop-label">Codebase</td><td>${brain.codebase}</td></tr>
          <tr><td class="cerveau-prop-label">Core</td><td>${brain.isCore ? "Yes" : "No"}</td></tr>
        </table>
        <div class="cerveau-config-section">
          <h4>Stacks</h4>
          ${brain.stacks.length ? brain.stacks.map((s) => `<span class="cerveau-tag">${s}</span>`).join("") : '<span class="text-tertiary">All (no filter)</span>'}
        </div>
        <div class="cerveau-config-section">
          <h4>Practices</h4>
          ${brain.practices.length ? brain.practices.map((p) => `<span class="cerveau-tag">${p}</span>`).join("") : '<span class="text-tertiary">All (no filter)</span>'}
        </div>
        <div class="cerveau-config-section">
          <h4>Workflows</h4>
          ${brain.workflows.length ? brain.workflows.map((w) => `<span class="cerveau-tag">${w}</span>`).join("") : '<span class="text-tertiary">All (no filter)</span>'}
        </div>
        <div class="cerveau-config-section">
          <h4>Agents</h4>
          ${brain.agents.length ? brain.agents.map((a) => `<span class="cerveau-tag">${a}</span>`).join("") : '<span class="text-tertiary">All (no filter)</span>'}
        </div>
      </div>
    `;
  }

  _renderRules() {
    const panel = document.getElementById("cerveauContent");
    if (!panel || !this.protocol) return;
    const brain = this.brains.find((b) => b.name === this.selectedBrain);
    if (!brain) return;

    const renderSection = (title, available, selected) => {
      const showAll = selected.length === 0;
      return `
        <div class="cerveau-rules-section">
          <h4>${title}</h4>
          <div class="cerveau-rules-list">
            ${available.map((name) => {
              const active = showAll || selected.includes(name);
              return `<span class="cerveau-rule ${active ? "active" : "inactive"}">${name}</span>`;
            }).join("")}
            ${available.length === 0 ? '<span class="text-tertiary">None available</span>' : ""}
          </div>
        </div>
      `;
    };

    panel.innerHTML = `
      <div class="cerveau-detail">
        <h3>Rules for ${brain.name}</h3>
        ${renderSection("Stacks", this.protocol.stacks, brain.stacks)}
        ${renderSection("Practices", this.protocol.practices, brain.practices)}
        ${renderSection("Workflows", this.protocol.workflows, brain.workflows)}
        ${renderSection("Agents", this.protocol.agents, brain.agents)}
      </div>
    `;
  }

  async _renderMemory() {
    const panel = document.getElementById("cerveauContent");
    if (!panel) return;

    panel.innerHTML = '<div class="cerveau-loading">Loading memory...</div>';

    try {
      const data = await CerveauAPI.fetchBrainMemory(this.selectedBrain);
      const escaped = (data.content || "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");
      panel.innerHTML = `
        <div class="cerveau-detail">
          <h3>Brain Memory</h3>
          ${data.content
            ? `<pre class="cerveau-memory-content"><code>${escaped}</code></pre>`
            : '<p class="text-tertiary">No brain memory section found in local-dev.md</p>'}
        </div>
      `;
    } catch {
      panel.innerHTML = '<div class="cerveau-error">Failed to load memory</div>';
    }
  }

  async _renderFiles() {
    const panel = document.getElementById("cerveauContent");
    if (!panel) return;
    const brain = this.brains.find((b) => b.name === this.selectedBrain);
    if (!brain) return;

    panel.innerHTML = `
      <div class="cerveau-files-layout">
        <div class="cerveau-files-tree" id="cerveauFileTree">
          <div class="cerveau-loading">Loading files...</div>
        </div>
        <div class="cerveau-files-content" id="cerveauFileContent">
          <div class="cerveau-files-placeholder">Select a file to view its content</div>
        </div>
      </div>
    `;

    this.expandedDirs.clear();
    this.fileCache.clear();
    await this._loadDir(brain.path);
  }

  async _loadDir(path) {
    if (!this.fileCache.has(path)) {
      const files = await CerveauAPI.fetchFiles(path);
      this.fileCache.set(path, files);
    }
    this._renderTree();
  }

  _renderTree() {
    const tree = document.getElementById("cerveauFileTree");
    if (!tree) return;
    const brain = this.brains.find((b) => b.name === this.selectedBrain);
    if (!brain) return;
    const rootFiles = this.fileCache.get(brain.path) || [];
    tree.innerHTML = this._renderEntries(rootFiles, 0);
  }

  _renderEntries(entries, depth) {
    return entries
      .map((entry) => {
        const indent = depth * 1.25;
        if (entry.isDir) {
          const expanded = this.expandedDirs.has(entry.path);
          const children = expanded ? this.fileCache.get(entry.path) || [] : [];
          return `
            <div class="cerveau-file-entry cerveau-file-dir ${expanded ? "expanded" : ""}"
              style="padding-left: ${indent}rem" data-path="${entry.path}">
              <svg class="cerveau-file-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="${expanded ? "M6 9l6 6 6-6" : "M9 18l6-6-6-6"}"/>
              </svg>
              <span class="cerveau-file-name">${entry.name}</span>
              ${entry.isSymlink ? '<span class="cerveau-symlink-badge">link</span>' : ""}
            </div>
            ${expanded ? this._renderEntries(children, depth + 1) : ""}
          `;
        }
        const sizeStr = entry.size != null ? this._formatSize(entry.size) : "";
        return `
          <div class="cerveau-file-entry cerveau-file-item"
            style="padding-left: ${indent + 1.25}rem" data-path="${entry.path}">
            <svg class="cerveau-file-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
              <polyline points="14 2 14 8 20 8"/>
            </svg>
            <span class="cerveau-file-name">${entry.name}</span>
            ${entry.isSymlink ? '<span class="cerveau-symlink-badge">link</span>' : ""}
            <span class="cerveau-file-size">${sizeStr}</span>
          </div>
        `;
      })
      .join("");
  }

  async _toggleDir(path) {
    if (this.expandedDirs.has(path)) {
      this.expandedDirs.delete(path);
      this._renderTree();
    } else {
      this.expandedDirs.add(path);
      await this._loadDir(path);
    }
  }

  async _showFile(path) {
    const contentEl = document.getElementById("cerveauFileContent");
    if (!contentEl) return;

    contentEl.innerHTML = '<div class="cerveau-loading">Loading file...</div>';

    try {
      const content = await CerveauAPI.fetchFile(path);
      const escaped = content
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");
      contentEl.innerHTML = `
        <div class="cerveau-file-viewer">
          <div class="cerveau-file-viewer-header">
            <span class="cerveau-file-viewer-path">${path}</span>
          </div>
          <pre class="cerveau-file-viewer-code"><code>${escaped}</code></pre>
        </div>
      `;
    } catch {
      contentEl.innerHTML = '<div class="cerveau-error">Failed to load file</div>';
    }
  }

  _renderProtocol() {
    const panel = document.getElementById("cerveauContent");
    if (!panel || !this.protocol) return;

    const renderList = (title, items) => `
      <div class="cerveau-protocol-section">
        <h4>${title}</h4>
        <div class="cerveau-protocol-list">
          ${items.length ? items.map((i) => `<span class="cerveau-tag">${i}</span>`).join("") : '<span class="text-tertiary">None</span>'}
        </div>
      </div>
    `;

    panel.innerHTML = `
      <div class="cerveau-detail">
        <h3>Protocol</h3>
        ${renderList("Stacks", this.protocol.stacks)}
        ${renderList("Practices", this.protocol.practices)}
        ${renderList("Workflows", this.protocol.workflows)}
        ${renderList("Hooks", this.protocol.hooks)}
        ${renderList("Skills", this.protocol.skills)}
        ${renderList("Agents", this.protocol.agents)}
      </div>
    `;
  }

  _renderPackages() {
    const panel = document.getElementById("cerveauContent");
    if (!panel) return;

    if (!this.registry || !this.registry.packages.length) {
      panel.innerHTML = '<div class="cerveau-detail"><p class="text-tertiary">No packages in registry</p></div>';
      return;
    }

    panel.innerHTML = `
      <div class="cerveau-detail">
        <h3>Package Registry (${this.registry.version})</h3>
        <div class="cerveau-packages">
          ${this.registry.packages.map((pkg) => `
            <div class="cerveau-package">
              <div class="cerveau-package-header">
                <span class="cerveau-package-name">${pkg.name}</span>
                <span class="cerveau-package-type">${pkg.type}</span>
              </div>
              <p class="cerveau-package-desc">${pkg.description}</p>
              <div class="cerveau-package-tags">
                ${pkg.tags.map((t) => `<span class="cerveau-tag-sm">${t}</span>`).join("")}
              </div>
              <div class="cerveau-package-files">
                ${pkg.files.map((f) => `<code class="cerveau-package-file">${f}</code>`).join("")}
              </div>
            </div>
          `).join("")}
        </div>
      </div>
    `;
  }

  _formatSize(bytes) {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
  }

  bindEvents() {
    // Sidebar brain selection
    document.getElementById("cerveauSidebar")?.addEventListener("click", (e) => {
      const item = e.target.closest("[data-brain]");
      if (item) this.selectBrain(item.dataset.brain);
    });

    // Tab switching
    document.getElementById("cerveauTabs")?.addEventListener("click", (e) => {
      const tab = e.target.closest("[data-tab]");
      if (tab) this.switchTab(tab.dataset.tab);
    });

    // File tree + file content (event delegation on cerveauContent)
    document.getElementById("cerveauContent")?.addEventListener("click", (e) => {
      const dir = e.target.closest(".cerveau-file-dir");
      if (dir) {
        this._toggleDir(dir.dataset.path);
        return;
      }
      const file = e.target.closest(".cerveau-file-item");
      if (file) {
        document
          .querySelectorAll(".cerveau-file-item.active")
          .forEach((el) => el.classList.remove("active"));
        file.classList.add("active");
        this._showFile(file.dataset.path);
      }
    });
  }
}
