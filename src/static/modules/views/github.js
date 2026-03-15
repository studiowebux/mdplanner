// GitHub view — overview of linked repos with live stats, issues, PRs, merge.
import { GitHubAPI, PortfolioAPI } from "../api.js";
import { showLoading, hideLoading } from "../ui/loading.js";

const RUNS_PER_PAGE = 25;

export class GitHubView {
  constructor(taskManager) {
    this.tm = taskManager;
    this._loading = false;
    this._repos = []; // cached results for re-filtering
    this._filtersBound = false;
    this._allRuns = []; // all fetched workflow runs
    this._runsPage = 1;
    this._runsTypeFilter = "";
    this._runsSortDir = "desc"; // "desc" = newest first
    this._runsBound = false;
    this._expandedRows = new Set(); // track which repos are expanded
    this._detailCache = {}; // cache fetched issues/PRs per "owner/repo"
    this._login = null; // authenticated user login
  }

  async load() {
    const container = document.getElementById("githubViewContainer");
    if (!container) return;
    if (this._loading) return;
    this._loading = true;

    showLoading("githubView");

    // Check token
    let connected = false;
    try {
      const status = await GitHubAPI.testConnection();
      if (status?.login) {
        connected = true;
        this._login = status.login;
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
          Connected as <strong>@${this._login}</strong>
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

    // Fetch stats and latest release for each linked repo in parallel
    const results = await Promise.allSettled(
      linked.map(async (p) => {
        const [owner, repo] = p.githubRepo.split("/");
        const [data, release] = await Promise.all([
          GitHubAPI.getRepo(owner, repo),
          GitHubAPI.getLatestRelease(owner, repo).catch(() => null),
        ]);
        return { project: p, data, release };
      }),
    );

    // Build repo list (include failed ones with null data)
    this._repos = results.map((result, i) => {
      if (result.status === "rejected") {
        return { project: linked[i], data: null, release: null };
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
        empty.textContent = "No repositories match the search.";
        container.appendChild(empty);
      }
      return;
    }
    container.querySelector(".github-view-empty")?.remove();

    let html = `<table class="github-view-table">
      <thead>
        <tr>
          <th></th>
          <th>Project</th>
          <th>Repository</th>
          <th>Stars</th>
          <th>Open Issues</th>
          <th>Open PRs</th>
          <th>Release</th>
          <th>Last Push</th>
          <th>License</th>
        </tr>
      </thead>
      <tbody>`;

    for (const { project, data, release } of repos) {
      const repoKey = project.githubRepo;
      const isExpanded = this._expandedRows.has(repoKey);

      if (!data) {
        html += `<tr>
          <td></td>
          <td>${this._esc(project.name)}</td>
          <td>${this._esc(project.githubRepo)}</td>
          <td colspan="6" class="text-muted text-sm">Failed to load</td>
        </tr>`;
        continue;
      }
      const lastPush = data.lastCommitAt
        ? new Date(data.lastCommitAt).toLocaleDateString()
        : "\u2014";
      const repoBase = `https://github.com/${this._esc(project.githubRepo)}`;
      const releaseCell = release
        ? `<a href="${this._esc(release.htmlUrl)}" target="_blank" rel="noopener noreferrer" class="github-view-repolink github-release-badge">${this._esc(release.tagName)}</a>`
        : "\u2014";
      const expandIcon = isExpanded ? "\u25BC" : "\u25B6";
      html += `<tr>
        <td><button type="button" class="github-expand-btn" data-repo="${this._esc(repoKey)}" aria-label="Toggle details">${expandIcon}</button></td>
        <td>${this._esc(project.name)}</td>
        <td>
          <a href="${this._esc(data.htmlUrl)}" target="_blank" rel="noopener noreferrer" class="github-view-repolink">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.3 3.44 9.8 8.2 11.39.6.11.82-.26.82-.58 0-.28-.01-1.03-.02-2.02-3.34.73-4.04-1.61-4.04-1.61-.54-1.37-1.33-1.74-1.33-1.74-1.09-.74.08-.73.08-.73 1.2.08 1.84 1.24 1.84 1.24 1.07 1.83 2.8 1.3 3.49 1 .1-.78.42-1.31.76-1.61-2.67-.3-5.47-1.33-5.47-5.93 0-1.31.47-2.38 1.24-3.22-.12-.3-.54-1.52.12-3.18 0 0 1.01-.32 3.3 1.23a11.5 11.5 0 0 1 3-.4c1.02.004 2.04.14 3 .4 2.28-1.55 3.29-1.23 3.29-1.23.66 1.66.24 2.88.12 3.18.77.84 1.24 1.91 1.24 3.22 0 4.61-2.81 5.63-5.48 5.92.43.37.81 1.1.81 2.22 0 1.6-.01 2.9-.01 3.29 0 .32.21.7.82.58C20.56 21.8 24 17.3 24 12c0-6.63-5.37-12-12-12z"/></svg>
            ${this._esc(project.githubRepo)}
          </a>
        </td>
        <td>${data.stars}</td>
        <td><a href="${repoBase}/issues" target="_blank" rel="noopener noreferrer" class="github-view-repolink">${data.openIssues}</a></td>
        <td><a href="${repoBase}/pulls" target="_blank" rel="noopener noreferrer" class="github-view-repolink">${data.openPRs ?? 0}</a></td>
        <td>${releaseCell}</td>
        <td class="text-muted">${lastPush}</td>
        <td>${data.license ? `<span class="github-license-badge">${this._esc(data.license)}</span>` : "\u2014"}</td>
      </tr>`;

      if (isExpanded) {
        html += `<tr class="github-detail-row"><td colspan="9"><div class="github-detail-panel" id="ghDetail-${this._esc(repoKey).replace("/", "-")}"><span class="text-muted text-sm">Loading...</span></div></td></tr>`;
      }
    }

    html += `</tbody></table>`;
    container.insertAdjacentHTML("beforeend", html);

    // Bind expand buttons
    container.querySelectorAll(".github-expand-btn").forEach((btn) => {
      btn.addEventListener("click", () => this._toggleDetail(btn.dataset.repo));
    });

    // Render already-expanded detail panels from cache
    for (const repoKey of this._expandedRows) {
      if (this._detailCache[repoKey]) {
        this._renderDetailPanel(repoKey, this._detailCache[repoKey]);
      }
    }
  }

  async _toggleDetail(repoKey) {
    if (this._expandedRows.has(repoKey)) {
      this._expandedRows.delete(repoKey);
      this._renderTable();
      return;
    }

    this._expandedRows.add(repoKey);
    this._renderTable();

    // Fetch issues and PRs if not cached
    if (!this._detailCache[repoKey]) {
      const [owner, repo] = repoKey.split("/");
      try {
        const [issues, prs] = await Promise.all([
          GitHubAPI.listIssues(owner, repo, "open"),
          GitHubAPI.listPRs(owner, repo, "open"),
        ]);
        this._detailCache[repoKey] = { issues, prs };
      } catch {
        this._detailCache[repoKey] = { issues: [], prs: [], error: true };
      }
    }

    this._renderDetailPanel(repoKey, this._detailCache[repoKey]);
  }

  _renderDetailPanel(repoKey, data) {
    const panelId = `ghDetail-${repoKey.replace("/", "-")}`;
    const panel = document.getElementById(panelId);
    if (!panel) return;

    if (data.error) {
      panel.innerHTML = `<span class="text-muted text-sm">Failed to load details.</span>`;
      return;
    }

    const { issues, prs } = data;
    const activeTab = panel.dataset.activeTab || "issues";

    // Tabs
    let html = `<div class="github-detail-tabs" role="tablist">
      <button type="button" class="github-detail-tab" role="tab" aria-selected="${activeTab === "issues"}" data-tab="issues">Issues (${issues.length})</button>
      <button type="button" class="github-detail-tab" role="tab" aria-selected="${activeTab === "prs"}" data-tab="prs">Pull Requests (${prs.length})</button>
    </div>`;

    if (activeTab === "issues") {
      html += this._renderIssuesList(issues);
    } else {
      html += this._renderPRsList(repoKey, prs);
    }

    panel.innerHTML = html;
    panel.dataset.activeTab = activeTab;

    // Bind tab switches
    panel.querySelectorAll(".github-detail-tab").forEach((tab) => {
      tab.addEventListener("click", () => {
        panel.dataset.activeTab = tab.dataset.tab;
        this._renderDetailPanel(repoKey, data);
      });
    });

    // Bind merge buttons
    panel.querySelectorAll(".github-merge-btn").forEach((btn) => {
      btn.addEventListener("click", () => this._handleMerge(repoKey, parseInt(btn.dataset.pr, 10), btn));
    });
  }

  _renderIssuesList(issues) {
    if (issues.length === 0) {
      return `<div class="github-detail-empty">No open issues.</div>`;
    }

    let html = `<ul class="github-detail-list">`;
    for (const issue of issues) {
      const isMe = this._login && issue.assignee === this._login;
      const assigneeHtml = isMe
        ? `<span class="github-assigned-to-me">you</span>`
        : issue.assignee
        ? `<span class="github-detail-item-meta">${this._esc(issue.assignee)}</span>`
        : "";
      const labelsHtml = (issue.labels || [])
        .slice(0, 3)
        .map((l) => `<span class="github-label">${this._esc(l)}</span>`)
        .join("");
      html += `<li class="github-detail-item">
        <span class="github-issue-badge github-issue-open">open</span>
        <span class="github-detail-item-title">
          <a href="${this._esc(issue.htmlUrl)}" target="_blank" rel="noopener noreferrer">#${issue.number} ${this._esc(issue.title)}</a>${labelsHtml}
        </span>
        ${assigneeHtml}
        <span class="github-detail-item-meta">${this._timeAgo(issue.createdAt)}</span>
      </li>`;
    }
    html += `</ul>`;
    return html;
  }

  _renderPRsList(repoKey, prs) {
    if (prs.length === 0) {
      return `<div class="github-detail-empty">No open pull requests.</div>`;
    }

    let html = `<ul class="github-detail-list">`;
    for (const pr of prs) {
      const isMe = this._login && pr.assignee === this._login;
      const assigneeHtml = isMe
        ? `<span class="github-assigned-to-me">you</span>`
        : pr.assignee
        ? `<span class="github-detail-item-meta">${this._esc(pr.assignee)}</span>`
        : "";
      const stateClass = pr.merged ? "github-pr-merged" : pr.state === "open" ? "github-pr-open" : "github-pr-closed";
      const stateLabel = pr.merged ? "merged" : pr.state;
      const mergeBtn = pr.state === "open"
        ? `<button type="button" class="github-merge-btn" data-pr="${pr.number}">Merge</button>`
        : "";
      html += `<li class="github-detail-item">
        <span class="github-pr-badge ${stateClass}">${stateLabel}</span>
        <span class="github-detail-item-title">
          <a href="${this._esc(pr.htmlUrl)}" target="_blank" rel="noopener noreferrer">#${pr.number} ${this._esc(pr.title)}</a>
          <span class="github-detail-item-meta">${this._esc(pr.headBranch)}</span>
        </span>
        ${assigneeHtml}
        ${mergeBtn}
        <span class="github-detail-item-meta">${this._timeAgo(pr.createdAt)}</span>
      </li>`;
    }
    html += `</ul>`;
    return html;
  }

  async _handleMerge(repoKey, prNumber, btn) {
    btn.disabled = true;
    btn.textContent = "Merging...";

    const [owner, repo] = repoKey.split("/");
    try {
      const result = await GitHubAPI.mergePR(owner, repo, prNumber);
      if (result.merged) {
        btn.textContent = "Merged";
        // Refresh the detail cache for this repo
        delete this._detailCache[repoKey];
        const [issues, prs] = await Promise.all([
          GitHubAPI.listIssues(owner, repo, "open"),
          GitHubAPI.listPRs(owner, repo, "open"),
        ]);
        this._detailCache[repoKey] = { issues, prs };
        this._renderDetailPanel(repoKey, this._detailCache[repoKey]);
      } else {
        btn.textContent = result.message || "Failed";
        btn.disabled = false;
      }
    } catch (err) {
      btn.textContent = "Error";
      btn.disabled = false;
    }
  }

  _bindRefresh() {
    document.getElementById("githubRefreshBtn")?.addEventListener("click", () => {
      this._loading = false;
      this._repos = [];
      this._allRuns = [];
      this._runsPage = 1;
      this._runsTypeFilter = "";
      this._runsSortDir = "desc";
      this._filtersBound = false;
      this._runsBound = false;
      this._expandedRows.clear();
      this._detailCache = {};
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
        const data = await GitHubAPI.listWorkflowRuns(owner, repo);
        return { project: p, runs: data.runs ?? data };
      }),
    );

    // Flatten all runs with project context into module state
    this._allRuns = [];
    for (const result of results) {
      if (result.status !== "fulfilled") continue;
      for (const run of result.value.runs) {
        this._allRuns.push({ project: result.value.project, run });
      }
    }

    if (this._allRuns.length === 0) return;

    // Inject the runs section shell (controls + table target)
    container.insertAdjacentHTML(
      "beforeend",
      `<div id="githubRunsSection">
        <div class="github-runs-header">
          <h3 class="github-runs-title">Workflow Runs</h3>
          <div class="github-runs-controls">
            <select id="githubRunsType" class="text-sm border border-strong rounded-md px-2 py-1">
              <option value="">All event types</option>
            </select>
            <select id="githubRunsSort" class="text-sm border border-strong rounded-md px-2 py-1">
              <option value="desc">Newest first</option>
              <option value="asc">Oldest first</option>
            </select>
          </div>
        </div>
        <div id="githubRunsTable"></div>
        <div id="githubRunsPager" class="github-runs-pager"></div>
      </div>`,
    );

    // Populate event type filter with distinct values from fetched runs
    const types = [...new Set(this._allRuns.map((r) => r.run.event))].sort();
    const typeSelect = document.getElementById("githubRunsType");
    for (const t of types) {
      const opt = document.createElement("option");
      opt.value = t;
      opt.textContent = t;
      typeSelect.appendChild(opt);
    }

    this._renderRunsView();
    this._bindRunsControls();
  }

  _renderRunsView() {
    let runs = [...this._allRuns];

    // Filter by event type
    if (this._runsTypeFilter) {
      runs = runs.filter((r) => r.run.event === this._runsTypeFilter);
    }

    // Sort
    runs.sort((a, b) => {
      const diff = new Date(a.run.createdAt) - new Date(b.run.createdAt);
      return this._runsSortDir === "asc" ? diff : -diff;
    });

    const total = runs.length;
    const totalPages = Math.max(1, Math.ceil(total / RUNS_PER_PAGE));
    if (this._runsPage > totalPages) this._runsPage = totalPages;

    const start = (this._runsPage - 1) * RUNS_PER_PAGE;
    const page = runs.slice(start, start + RUNS_PER_PAGE);

    // Render table
    const tableEl = document.getElementById("githubRunsTable");
    if (!tableEl) return;

    if (page.length === 0) {
      tableEl.innerHTML =
        `<p class="text-muted github-detail-empty">No workflow runs match the filter.</p>`;
    } else {
      let html =
        `<table class="github-view-table"><thead><tr><th>Status</th><th>Workflow</th><th>Repository</th><th>Branch</th><th>Event</th><th>Time</th></tr></thead><tbody>`;
      for (const { project, run } of page) {
        const statusClass = this._runStatusClass(run);
        const statusLabel = this._runStatusLabel(run);
        const timeAgo = this._timeAgo(run.createdAt);
        html +=
          `<tr><td><span class="github-run-status ${statusClass}">${statusLabel}</span></td><td><a href="${this._esc(run.htmlUrl)}" target="_blank" rel="noopener noreferrer" class="github-view-repolink">${this._esc(run.name)}</a></td><td>${this._esc(project.githubRepo)}</td><td class="text-muted">${this._esc(run.headBranch)}</td><td class="text-muted">${this._esc(run.event)}</td><td class="text-muted">${timeAgo}</td></tr>`;
      }
      html += `</tbody></table>`;
      tableEl.innerHTML = html;
    }

    // Render pager
    const pagerEl = document.getElementById("githubRunsPager");
    if (!pagerEl) return;
    const from = total === 0 ? 0 : start + 1;
    const to = Math.min(start + RUNS_PER_PAGE, total);
    pagerEl.innerHTML = `
      <span class="github-runs-count">Showing ${from}\u2013${to} of ${total}</span>
      <div class="github-runs-nav">
        <button id="githubRunsPrev" class="btn-secondary" ${this._runsPage <= 1 ? "disabled" : ""}>Previous</button>
        <span class="github-runs-page">Page ${this._runsPage} of ${totalPages}</span>
        <button id="githubRunsNext" class="btn-secondary" ${this._runsPage >= totalPages ? "disabled" : ""}>Next</button>
      </div>
    `;

    document.getElementById("githubRunsPrev")?.addEventListener("click", () => {
      if (this._runsPage > 1) { this._runsPage--; this._renderRunsView(); }
    });
    document.getElementById("githubRunsNext")?.addEventListener("click", () => {
      if (this._runsPage < totalPages) { this._runsPage++; this._renderRunsView(); }
    });
  }

  _bindRunsControls() {
    if (this._runsBound) return;
    this._runsBound = true;

    document.getElementById("githubRunsType")?.addEventListener("change", (e) => {
      this._runsTypeFilter = e.target.value;
      this._runsPage = 1;
      this._renderRunsView();
    });

    document.getElementById("githubRunsSort")?.addEventListener("change", (e) => {
      this._runsSortDir = e.target.value;
      this._runsPage = 1;
      this._renderRunsView();
    });
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
