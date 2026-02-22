// Uploads Management View
// Pattern: View module with load/render/bindEvents

import { UploadsAPI } from "../api.js";
import { escapeHtml } from "../utils.js";
import { showToast } from "../ui/toast.js";

function formatBytes(bytes) {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
}

export class UploadsView {
  constructor(taskManager) {
    this.tm = taskManager;
  }

  async load() {
    const container = document.getElementById("uploadsContent");
    if (!container) return;
    container.innerHTML = "<p>Loading...</p>";

    try {
      const [listData, orphanData] = await Promise.all([
        UploadsAPI.list(),
        UploadsAPI.orphans(),
      ]);
      this.render(container, listData, orphanData);
    } catch (err) {
      container.innerHTML =
        '<p class="uploads-empty">Failed to load uploads.</p>';
      console.error("UploadsView load error:", err);
    }
  }

  render(
    container,
    { files = [], total_size = 0 },
    { orphans = [], total_orphan_size = 0 },
  ) {
    // Build path → task title map from already-loaded tasks
    const attachmentMap = new Map();
    for (const task of this.tm.tasks ?? []) {
      for (const p of task.config?.attachments ?? []) {
        attachmentMap.set(p, task.title);
      }
    }
    const orphanPaths = new Set(orphans.map((o) => o.path));

    let html = `
      <div class="uploads-summary">
        <span>${files.length} file${files.length !== 1 ? "s" : ""}</span>
        <span class="uploads-summary-sep">·</span>
        <span>${formatBytes(total_size)} used</span>
        ${
          orphans.length
            ? `<span class="uploads-summary-sep">·</span>
               <span class="uploads-orphan-badge">${orphans.length} orphaned — ${formatBytes(total_orphan_size)}</span>`
            : ""
        }
      </div>
    `;

    if (orphans.length) {
      html += `
        <div class="uploads-section">
          <div class="uploads-section-header">
            <h3>Orphaned Files</h3>
            <button id="deleteAllOrphansBtn" class="btn-danger">
              Delete all (${orphans.length})
            </button>
          </div>
          <p class="uploads-hint">Not referenced in any task attachment.</p>
          <table class="uploads-table">
            <thead>
              <tr>
                <th>File</th><th>Size</th><th>Modified</th><th></th>
              </tr>
            </thead>
            <tbody>
              ${orphans.map((f) => this.renderRow(f, false)).join("")}
            </tbody>
          </table>
        </div>
      `;
    }

    html += `
      <div class="uploads-section">
        <div class="uploads-section-header">
          <h3>All Files</h3>
        </div>
        ${
          files.length === 0
            ? '<p class="uploads-empty">No uploaded files.</p>'
            : `
            <table class="uploads-table">
              <thead>
                <tr>
                  <th>File</th><th>Size</th><th>Modified</th>
                  <th>Linked Task</th><th></th>
                </tr>
              </thead>
              <tbody>
                ${files
                  .map((f) =>
                    this.renderRow(
                      f,
                      true,
                      attachmentMap.get(f.path),
                      orphanPaths.has(f.path),
                    )
                  )
                  .join("")}
              </tbody>
            </table>
          `
        }
      </div>
    `;

    container.innerHTML = html;

    document
      .getElementById("deleteAllOrphansBtn")
      ?.addEventListener("click", () => this.deleteAllOrphans(orphans));

    container.querySelectorAll("[data-delete-path]").forEach((btn) => {
      btn.addEventListener("click", () =>
        this.deleteFile(btn.dataset.deletePath),
      );
    });
  }

  renderRow(file, showTaskCol, taskTitle = "", isOrphan = false) {
    const parts = file.path.split("/");
    const filename = parts[parts.length - 1] ?? file.path;
    const date = file.modified ? file.modified.slice(0, 10) : "—";
    const taskCell = showTaskCol
      ? `<td class="${taskTitle ? "text-secondary" : "text-tertiary"}">${taskTitle ? escapeHtml(taskTitle) : "—"}</td>`
      : "";

    return `
      <tr class="${isOrphan ? "uploads-row-orphan" : ""}">
        <td>
          <a href="/${escapeHtml(file.path)}" target="_blank" rel="noopener"
             class="uploads-link">${escapeHtml(filename)}</a>
        </td>
        <td class="text-secondary">${formatBytes(file.size)}</td>
        <td class="text-secondary">${date}</td>
        ${taskCell}
        <td>
          <button class="uploads-delete-btn"
                  data-delete-path="${escapeHtml(file.path)}">Delete</button>
        </td>
      </tr>
    `;
  }

  async deleteFile(filePath) {
    const [, year, month, day, filename] = filePath.split("/");
    if (!year || !month || !day || !filename) {
      showToast("Invalid file path", "error");
      return;
    }
    try {
      const res = await UploadsAPI.delete(year, month, day, filename);
      if (!res.ok) throw new Error();
      showToast("File deleted", "success");
      await this.load();
    } catch {
      showToast("Failed to delete file", "error");
    }
  }

  async deleteAllOrphans(orphans) {
    let deleted = 0;
    for (const file of orphans) {
      const [, year, month, day, filename] = file.path.split("/");
      if (!year || !month || !day || !filename) continue;
      try {
        const res = await UploadsAPI.delete(year, month, day, filename);
        if (res.ok) deleted++;
      } catch {
        // continue to next file
      }
    }
    showToast(
      `Deleted ${deleted} file${deleted !== 1 ? "s" : ""}`,
      deleted > 0 ? "success" : "error",
    );
    await this.load();
  }

  bindEvents() {
    // All event bindings are set dynamically in render()
  }
}
