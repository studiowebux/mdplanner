// Brain Sync Panel — diff and apply file sync between brains
import { BrainsAPI } from "../api.js";

export class BrainSyncPanel {
  constructor(brainsModule) {
    this.mod = brainsModule;
    this.diffEntries = [];
  }

  render(brains) {
    const panel = document.getElementById("brainsContent");
    if (!panel) return;

    const options = brains
      .map((b) => `<option value="${b.name}">${b.name}</option>`)
      .join("");

    panel.innerHTML = `
      <div class="brain-sync-panel">
        <div class="brain-sync-controls">
          <div class="brain-sync-select">
            <label>From</label>
            <select id="brainSyncFrom">${options}</select>
          </div>
          <div class="brain-sync-arrow">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M5 12h14M12 5l7 7-7 7"/>
            </svg>
          </div>
          <div class="brain-sync-select">
            <label>To</label>
            <select id="brainSyncTo">${options}</select>
          </div>
          <button id="brainSyncDiffBtn" class="btn-outline">Compute Diff</button>
        </div>
        <div id="brainSyncResults"></div>
      </div>
    `;

    // Pre-select different brains
    const toSelect = document.getElementById("brainSyncTo");
    if (toSelect && brains.length > 1) {
      toSelect.selectedIndex = 1;
    }
  }

  async _computeDiff() {
    const from = document.getElementById("brainSyncFrom")?.value;
    const to = document.getElementById("brainSyncTo")?.value;
    const results = document.getElementById("brainSyncResults");
    if (!from || !to || !results) return;

    if (from === to) {
      results.innerHTML =
        '<div class="brain-error">Source and target must be different</div>';
      return;
    }

    results.innerHTML =
      '<div class="brain-loading">Computing diff...</div>';

    try {
      this.diffEntries = await BrainsAPI.syncDiff(from, to);
      this._renderDiff(from, to);
    } catch {
      results.innerHTML =
        '<div class="brain-error">Failed to compute diff</div>';
    }
  }

  _renderDiff(from, to) {
    const results = document.getElementById("brainSyncResults");
    if (!results) return;

    const actionable = this.diffEntries.filter(
      (e) => e.status !== "identical" && e.status !== "skipped",
    );

    if (!this.diffEntries.length) {
      results.innerHTML =
        '<div class="brain-files-placeholder">No files found in sync directories</div>';
      return;
    }

    const rows = this.diffEntries
      .map(
        (e) => `
      <tr class="brain-diff-row brain-diff-${e.status}">
        <td>
          ${e.status !== "identical" && e.status !== "skipped" && e.status !== "removed" ? `<input type="checkbox" class="brain-diff-check" data-path="${e.relPath}" checked>` : ""}
        </td>
        <td class="brain-diff-path">${e.relPath}</td>
        <td><span class="brain-diff-badge brain-diff-badge-${e.status}">${e.status}</span></td>
        <td class="brain-diff-newer">${e.newer || ""}</td>
      </tr>
    `,
      )
      .join("");

    results.innerHTML = `
      <div class="brain-sync-summary">
        ${actionable.length} actionable file(s) out of ${this.diffEntries.length} total
      </div>
      <table class="brain-diff-table">
        <thead>
          <tr>
            <th></th>
            <th>Path</th>
            <th>Status</th>
            <th>Newer</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
      ${actionable.length ? `<button id="brainSyncApplyBtn" class="btn-outline" data-from="${from}" data-to="${to}">Apply Selected</button>` : ""}
    `;
  }

  async _applySync() {
    const btn = document.getElementById("brainSyncApplyBtn");
    if (!btn) return;

    const from = btn.dataset.from;
    const to = btn.dataset.to;
    const checked = document.querySelectorAll(".brain-diff-check:checked");
    const files = Array.from(checked).map((cb) => cb.dataset.path);

    if (!files.length) return;

    btn.disabled = true;
    btn.textContent = "Applying...";

    try {
      const resp = await BrainsAPI.syncApply({ from, to, files });
      const result = await resp.json();
      const results = document.getElementById("brainSyncResults");
      if (results) {
        results.innerHTML = `
          <div class="brain-sync-result">
            <p>Applied: ${result.applied?.length || 0} file(s)</p>
            ${result.failed?.length ? `<p class="brain-error">Failed: ${result.failed.join(", ")}</p>` : ""}
          </div>
        `;
      }
    } catch {
      btn.textContent = "Apply failed";
    } finally {
      btn.disabled = false;
      btn.textContent = "Apply Selected";
    }
  }

  bindEvents() {
    document
      .getElementById("brainsContent")
      ?.addEventListener("click", (e) => {
        if (e.target.id === "brainSyncDiffBtn") {
          this._computeDiff();
        }
        if (e.target.id === "brainSyncApplyBtn") {
          this._applySync();
        }
      });
  }
}
