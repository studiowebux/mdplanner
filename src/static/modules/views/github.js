// GitHub view — overview of linked repos with live stats.
import { GitHubAPI, PortfolioAPI } from "../api.js";
import { showToast } from "../ui/toast.js";

export class GitHubView {
  /** @param {import("../app.js").TaskManager} taskManager */
  constructor(taskManager) {
    this.tm = taskManager;
    this._loading = false;
  }

  async load() {
    const container = document.getElementById("githubViewContainer");
    if (!container) return;
    if (this._loading) return;
    this._loading = true;

    container.innerHTML = `<p class="text-secondary" style="padding:1rem;">Loading…</p>`;

    // Check token
    let connected = false;
    let login = null;
    try {
      const status = await GitHubAPI.testConnection();
      if (status?.login) {
        connected = true;
        login = status.login;
      }
    } catch {
      // token not configured or invalid
    }

    if (!connected) {
      container.innerHTML = `
        <div class="github-view-notice">
          <p>No GitHub token configured.</p>
          <p>Go to <strong>Settings → Integrations</strong> to connect your GitHub account.</p>
        </div>
      `;
      this._loading = false;
      return;
    }

    // Fetch portfolio to find linked repos
    let projects = [];
    try {
      projects = await PortfolioAPI.fetchAll();
    } catch {
      // ignore — show empty state
    }

    const linked = projects.filter((p) => p.githubRepo && p.githubRepo.includes("/"));

    let html = `
      <div class="github-view-header">
        <span class="github-view-connected">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.3 3.44 9.8 8.2 11.39.6.11.82-.26.82-.58 0-.28-.01-1.03-.02-2.02-3.34.73-4.04-1.61-4.04-1.61-.54-1.37-1.33-1.74-1.33-1.74-1.09-.74.08-.73.08-.73 1.2.08 1.84 1.24 1.84 1.24 1.07 1.83 2.8 1.3 3.49 1 .1-.78.42-1.31.76-1.61-2.67-.3-5.47-1.33-5.47-5.93 0-1.31.47-2.38 1.24-3.22-.12-.3-.54-1.52.12-3.18 0 0 1.01-.32 3.3 1.23a11.5 11.5 0 0 1 3-.4c1.02.004 2.04.14 3 .4 2.28-1.55 3.29-1.23 3.29-1.23.66 1.66.24 2.88.12 3.18.77.84 1.24 1.91 1.24 3.22 0 4.61-2.81 5.63-5.48 5.92.43.37.81 1.1.81 2.22 0 1.6-.01 2.9-.01 3.29 0 .32.21.7.82.58C20.56 21.8 24 17.3 24 12c0-6.63-5.37-12-12-12z"/></svg>
          Connected as <strong>@${login}</strong>
        </span>
        <button type="button" id="githubRefreshBtn" class="btn-secondary">Refresh</button>
      </div>
    `;

    if (linked.length === 0) {
      html += `
        <div class="github-view-notice">
          <p>No portfolio projects are linked to GitHub repositories.</p>
          <p>Open a portfolio project and set the <strong>GitHub Repository</strong> field (e.g. <code>owner/repo</code>).</p>
        </div>
      `;
      container.innerHTML = html;
      this._bindRefresh();
      this._loading = false;
      return;
    }

    // Fetch stats for each linked repo in parallel
    const results = await Promise.allSettled(
      linked.map(async (p) => {
        const [owner, repo] = p.githubRepo.split("/");
        const data = await GitHubAPI.getRepo(owner, repo);
        return { project: p, data };
      }),
    );

    html += `<table class="github-view-table">
      <thead>
        <tr>
          <th>Project</th>
          <th>Repository</th>
          <th>Stars</th>
          <th>Open Issues</th>
          <th>Open PRs</th>
          <th>Last Push</th>
          <th>License</th>
        </tr>
      </thead>
      <tbody>`;

    for (const result of results) {
      if (result.status === "rejected") {
        const p = linked[results.indexOf(result)];
        html += `<tr>
          <td>${this._esc(p.name)}</td>
          <td>${this._esc(p.githubRepo)}</td>
          <td colspan="5" class="text-muted text-sm">Failed to load</td>
        </tr>`;
        continue;
      }
      const { project, data } = result.value;
      const lastPush = data.lastCommitAt
        ? new Date(data.lastCommitAt).toLocaleDateString()
        : "—";
      html += `<tr>
        <td>${this._esc(project.name)}</td>
        <td>
          <a href="${this._esc(data.htmlUrl)}" target="_blank" rel="noopener noreferrer" class="github-view-repolink">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.3 3.44 9.8 8.2 11.39.6.11.82-.26.82-.58 0-.28-.01-1.03-.02-2.02-3.34.73-4.04-1.61-4.04-1.61-.54-1.37-1.33-1.74-1.33-1.74-1.09-.74.08-.73.08-.73 1.2.08 1.84 1.24 1.84 1.24 1.07 1.83 2.8 1.3 3.49 1 .1-.78.42-1.31.76-1.61-2.67-.3-5.47-1.33-5.47-5.93 0-1.31.47-2.38 1.24-3.22-.12-.3-.54-1.52.12-3.18 0 0 1.01-.32 3.3 1.23a11.5 11.5 0 0 1 3-.4c1.02.004 2.04.14 3 .4 2.28-1.55 3.29-1.23 3.29-1.23.66 1.66.24 2.88.12 3.18.77.84 1.24 1.91 1.24 3.22 0 4.61-2.81 5.63-5.48 5.92.43.37.81 1.1.81 2.22 0 1.6-.01 2.9-.01 3.29 0 .32.21.7.82.58C20.56 21.8 24 17.3 24 12c0-6.63-5.37-12-12-12z"/></svg>
            ${this._esc(project.githubRepo)}
          </a>
        </td>
        <td>${data.stars}</td>
        <td>${data.openIssues}</td>
        <td>${data.openPRs ?? 0}</td>
        <td class="text-muted">${lastPush}</td>
        <td>${data.license ? `<span class="github-license-badge">${this._esc(data.license)}</span>` : "—"}</td>
      </tr>`;
    }

    html += `</tbody></table>`;
    container.innerHTML = html;
    this._bindRefresh();
    this._loading = false;
  }

  _bindRefresh() {
    document.getElementById("githubRefreshBtn")?.addEventListener("click", () => {
      this._loading = false;
      this.load();
    });
  }

  _esc(str) {
    return String(str ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }
}
