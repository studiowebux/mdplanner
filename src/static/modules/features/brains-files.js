// Brain Files Panel — lazy expandable directory tree + file content viewer
import { BrainsAPI } from "../api.js";

export class BrainFilesPanel {
  constructor(brainsModule) {
    this.mod = brainsModule;
    this.expandedDirs = new Set();
    this.fileCache = new Map();
  }

  async render(brainName) {
    const panel = document.getElementById("brainsContent");
    if (!panel) return;

    panel.innerHTML = `
      <div class="brain-files-layout">
        <div class="brain-files-tree" id="brainsFileTree">
          <div class="brain-loading">Loading files...</div>
        </div>
        <div class="brain-files-content" id="brainsFileContent">
          <div class="brain-files-placeholder">Select a file to view its content</div>
        </div>
      </div>
    `;

    this.expandedDirs.clear();
    this.fileCache.clear();
    await this._loadDir(brainName, "");
  }

  async _loadDir(brainName, path) {
    const cacheKey = `${brainName}:${path}`;
    if (!this.fileCache.has(cacheKey)) {
      const files = await BrainsAPI.fetchFiles(brainName, path);
      this.fileCache.set(cacheKey, files);
    }
    this._renderTree(brainName);
  }

  _renderTree(brainName) {
    const tree = document.getElementById("brainsFileTree");
    if (!tree) return;

    const rootFiles = this.fileCache.get(`${brainName}:`) || [];
    tree.innerHTML = this._renderEntries(brainName, rootFiles, 0);
  }

  _renderEntries(brainName, entries, depth) {
    return entries
      .map((entry) => {
        const indent = depth * 1.25;
        if (entry.isDir) {
          const expanded = this.expandedDirs.has(entry.path);
          const children = expanded
            ? this.fileCache.get(`${brainName}:${entry.path}`) || []
            : [];
          return `
          <div class="brain-file-entry brain-file-dir ${expanded ? "expanded" : ""}"
            style="padding-left: ${indent}rem" data-path="${entry.path}" data-brain="${brainName}">
            <svg class="brain-file-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="${expanded ? "M6 9l6 6 6-6" : "M9 18l6-6-6-6"}"/>
            </svg>
            <span class="brain-file-name">${entry.name}</span>
          </div>
          ${expanded ? this._renderEntries(brainName, children, depth + 1) : ""}
        `;
        }
        const sizeStr = entry.size != null ? this._formatSize(entry.size) : "";
        return `
        <div class="brain-file-entry brain-file-item"
          style="padding-left: ${indent + 1.25}rem" data-path="${entry.path}" data-brain="${brainName}">
          <svg class="brain-file-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
            <polyline points="14 2 14 8 20 8"/>
          </svg>
          <span class="brain-file-name">${entry.name}</span>
          <span class="brain-file-size">${sizeStr}</span>
        </div>
      `;
      })
      .join("");
  }

  async _toggleDir(brainName, path) {
    if (this.expandedDirs.has(path)) {
      this.expandedDirs.delete(path);
      this._renderTree(brainName);
    } else {
      this.expandedDirs.add(path);
      await this._loadDir(brainName, path);
    }
  }

  async _showFile(brainName, path) {
    const contentEl = document.getElementById("brainsFileContent");
    if (!contentEl) return;

    contentEl.innerHTML =
      '<div class="brain-loading">Loading file...</div>';

    try {
      const content = await BrainsAPI.fetchFile(brainName, path);
      const escaped = content
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");
      contentEl.innerHTML = `
        <div class="brain-file-viewer">
          <div class="brain-file-viewer-header">
            <span class="brain-file-viewer-path">${path}</span>
          </div>
          <pre class="brain-file-viewer-code"><code>${escaped}</code></pre>
        </div>
      `;
    } catch {
      contentEl.innerHTML =
        '<div class="brain-error">Failed to load file</div>';
    }
  }

  _formatSize(bytes) {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
  }

  bindEvents() {
    document
      .getElementById("brainsContent")
      ?.addEventListener("click", (e) => {
        const dir = e.target.closest(".brain-file-dir");
        if (dir) {
          this._toggleDir(dir.dataset.brain, dir.dataset.path);
          return;
        }
        const file = e.target.closest(".brain-file-item");
        if (file) {
          // Highlight active file
          document
            .querySelectorAll(".brain-file-item.active")
            .forEach((el) => el.classList.remove("active"));
          file.classList.add("active");
          this._showFile(file.dataset.brain, file.dataset.path);
        }
      });
  }
}
