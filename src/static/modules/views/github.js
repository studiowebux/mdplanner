// GitHub view — overview of linked repos with live stats.
import { GitHubAPI, PortfolioAPI } from "../api.js";
import { showLoading, hideLoading } from "../ui/loading.js";

export class GitHubView {
  constructor(taskManager) {
    this.tm = taskManager;
    this._loading = false;
    this._repos = []; // cached results for re-filtering
    this._filtersBound = false;
  }

  async load() {
    const container = document.getElementById("githubViewContainer");
    if (!container) return;
    if (this._loading) return;
    this._loading = true;

    showLoading("githubView");

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

    let header = `
      <div class="github-view-header">
        <span class="github-view-connected">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.3 3.44 9.8 8.2 11.39.6.11.82-.26.82-.58 0-.28-.01-1.03-.02-2.02-3.34.73-4.04-1.61-4.04-1.61-.54-1.37-1.33-1.74-1.33-1.74-1.09-.74.08-.73.08-.73 1.2.08 1.84 1.24 1.84 1.24 1.07 1.83 2.8 1.3 3.49 1 .1-.78.42-1.31.76-1.61-2.67-.3-5.47-1.33-5.47-5.93 0-1.31.47-2.38 1.24-3.22-.12-.3-.54-1.52.12-3.18 0 0 1.01-.32 3.3 1.23a11.5 11.5 0 0 1 3-.4c1.02.004 2.04.14 3 .4 2.28-1.55 3.29-1.23 3.29-1.23.66 1.66.24 2.88.12 3.18.77.84 1.24 1.91 1.24 3.22 0 4.61-2.81 5.63-5.48 5.92.43.37.81 1.1.81 2.22 0 1.6-.01 2.9-.01 3.29 0 .32.21.7.82.58C20.56 21.8 24 17.3 24 12c0-6.63-5.37-12-12-12z"/></svg>
          Connected as <strong>@${login}</strong>
        </span>
        <button type="button" id="githubRefreshBtn" class="btn-secondary">Refresh</button>
      </div>
    `;

    if (linked.length === 0) {
      container.innerHTML = header + `
        <div class="github-view-notice">
          <p>No portfolio projects are linked to GitHub repositories.</p>
          <p>Open a portfolio project and set the <strong>GitHub Repository</strong> field (e.g. <code>owner/repo</code>).</p>
        </div>
      `;
      this._bindRefresh();
      this._loading = false;
      hideLoading("githubView");
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

    // Build repo list (include failed ones with null data)
    this._repos = results.map((result, i) => {
      if (result.status === "rejected") {
        return { project: linked[i], data: null };
      }
      return result.value;
    });

    container.innerHTML = header;
    this._bindRefresh();
    this._bindFilters();
    this._renderTable();
    this._renderWorkflowRuns(linked);
    this._loading = false;
    hideLoading("githubView");
  }

  _renderTable() {
    const container = document.getElementById("githubViewContainer");
    if (!container) return;

    const search = (document.getElementById("githubSearch")?.value || "").toLowerCase().trim();
    const sort = document.getElementById("githubSort")?.value || "default";

    let repos = [...this._repos];

    // Search filter
    if (search) {
      repos = repos.filter((r) =>
        r.project.name.toLowerCase().includes(search) ||
        r.project.githubRepo.toLowerCase().includes(search)
      );
    }

    // Sort
    if (sort !== "default") {
      const [field, dir] = sort.split("_");
      const asc = dir === "asc" ? 1 : -1;
      repos.sort((a, b) => {
        if (!a.data) return 1;
        if (!b.data) return -1;
        let va, vb;
        if (field === "stars") { va = a.data.stars ?? 0; vb = b.data.stars ?? 0; }
        else if (field === "issues") { va = a.data.openIssues ?? 0; vb = b.data.openIssues ?? 0; }
        else if (field === "prs") { va = a.data.openPRs ?? 0; vb = b.data.openPRs ?? 0; }
        else if (field === "push") {
          va = a.data.lastCommitAt ? new Date(a.data.lastCommitAt).getTime() : 0;
          vb = b.data.lastCommitAt ? new Date(b.data.lastCommitAt).getTime() : 0;
        }
        return (va - vb) * asc;
      });
    }

    // Remove old table if present
    container.querySelector(".github-view-table")?.remove();

    if (repos.length === 0) {
      const existing = container.querySelector(".github-view-empty");
      if (!existing) {
        const empty = document.createElement("p");
        empty.className = "github-view-empty text-muted";
        empty.style.padding = "1rem";
        empty.textContent = "No repositories match the search.";
        container.appendChild(empty);
      }
      return;
    }
    container.querySelector(".github-view-empty")?.remove();

    let html = `<table class="github-view-table">
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

    for (const { project, data } of repos) {
      if (!data) {
        html += `<tr>
          <td>${this._esc(project.name)}</td>
          <td>${this._esc(project.githubRepo)}</td>
          <td colspan="5" class="text-muted text-sm">Failed to load</td>
        </tr>`;
        continue;
      }
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
    container.insertAdjacentHTML("beforeend", html);
  }

  _bindRefresh() {
    document.getElementById("githubRefreshBtn")?.addEventListener("click", () => {
      this._loading = false;
      this._repos = [];
      this._filtersBound = false;
      this.load();
    });
  }

  _bindFilters() {
    if (this._filtersBound) return;
    this._filtersBound = true;

    document.getElementById("githubSearch")?.addEventListener("input", () => this._renderTable());
    document.getElementById("githubSort")?.addEventListener("change", () => this._renderTable());
  }

  async _renderWorkflowRuns(linkedProjects) {
    const container = document.getElementById("githubViewContainer");
    if (!container) return;

    // Fetch workflow runs for all linked repos in parallel
    const results = await Promise.allSettled(
      linkedProjects.map(async (p) => {
        const [owner, repo] = p.githubRepo.split("/");
        const runs = await GitHubAPI.listWorkflowRuns(owner, repo);
        return { project: p, runs };
      }),
    );

    // Flatten all runs with project context, take most recent 20
    const allRuns = [];
    for (const result of results) {
      if (result.status !== "fulfilled") continue;
      for (const run of result.value.runs) {
        allRuns.push({ project: result.value.project, run });
      }
    }
    allRuns.sort((a, b) => new Date(b.run.createdAt) - new Date(a.run.createdAt));
    const recent = allRuns.slice(0, 20);

    if (recent.length === 0) return;

    let html = `
      <h3 class="github-runs-title">Recent Workflow Runs</h3>
      <table class="github-view-table">
        <thead>
          <tr>
            <th>Status</th>
            <th>Workflow</th>
            <th>Repository</th>
            <th>Branch</th>
            <th>Event</th>
            <th>Time</th>
          </tr>
        </thead>
        <tbody>`;

    for (const { project, run } of recent) {
      const statusClass = this._runStatusClass(run);
      const statusLabel = this._runStatusLabel(run);
      const timeAgo = this._timeAgo(run.createdAt);

      html += `<tr>
        <td><span class="github-run-status ${statusClass}">${statusLabel}</span></td>
        <td><a href="${this._esc(run.htmlUrl)}" target="_blank" rel="noopener noreferrer" class="github-view-repolink">${this._esc(run.name)}</a></td>
        <td>${this._esc(project.githubRepo)}</td>
        <td class="text-muted">${this._esc(run.headBranch)}</td>
        <td class="text-muted">${this._esc(run.event)}</td>
        <td class="text-muted">${timeAgo}</td>
      </tr>`;
    }

    html += `</tbody></table>`;
    container.insertAdjacentHTML("beforeend", html);
  }

  _runStatusClass(run) {
    if (run.status !== "completed") return "github-run-pending";
    if (run.conclusion === "success") return "github-run-success";
    if (run.conclusion === "failure") return "github-run-failure";
    if (run.conclusion === "cancelled") return "github-run-cancelled";
    return "github-run-neutral";
  }

  _runStatusLabel(run) {
    if (run.status === "queued") return "Queued";
    if (run.status === "in_progress") return "Running";
    if (run.status === "waiting") return "Waiting";
    if (run.conclusion === "success") return "Success";
    if (run.conclusion === "failure") return "Failed";
    if (run.conclusion === "cancelled") return "Cancelled";
    if (run.conclusion === "skipped") return "Skipped";
    if (run.conclusion === "timed_out") return "Timed out";
    return run.conclusion || run.status;
  }

  _timeAgo(dateStr) {
    const now = Date.now();
    const then = new Date(dateStr).getTime();
    const seconds = Math.floor((now - then) / 1000);
    if (seconds < 60) return "just now";
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  }

  _esc(str) {
    return String(str ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }
}
