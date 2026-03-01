// Goal Sidenav Module
// Pattern: Template Method (extends BaseSidenavModule)

import { BaseSidenavModule } from "../ui/base-sidenav.js";
import { GitHubAPI, GoalsAPI } from "../api.js";
import { bindAutocomplete } from "../ui/autocomplete.js";
import { showToast } from "../utils.js";

export class GoalSidenavModule extends BaseSidenavModule {
  get prefix() { return "goal"; }
  get entityName() { return "Goal"; }
  get api() { return GoalsAPI; }
  get inputIds() {
    return [
      "goalSidenavTitle", "goalSidenavType", "goalSidenavStatus",
      "goalSidenavKpi", "goalSidenavStartDate", "goalSidenavEndDate",
      "goalSidenavDescription", "goalSidenavGithubRepo", "goalSidenavGithubMilestone",
    ];
  }

  clearForm() {
    document.getElementById("goalSidenavTitle").value = "";
    document.getElementById("goalSidenavType").value = "project";
    document.getElementById("goalSidenavStatus").value = "planning";
    document.getElementById("goalSidenavKpi").value = "";
    document.getElementById("goalSidenavStartDate").value = "";
    document.getElementById("goalSidenavEndDate").value = "";
    document.getElementById("goalSidenavDescription").value = "";
    document.getElementById("goalSidenavGithubRepo").value = "";
    document.getElementById("goalSidenavGithubMilestone").value = "";
    this._resetMilestonePanel();
  }

  fillForm(goal) {
    document.getElementById("goalSidenavTitle").value = goal.title || "";
    document.getElementById("goalSidenavType").value = goal.type || "project";
    document.getElementById("goalSidenavStatus").value = goal.status || "planning";
    document.getElementById("goalSidenavKpi").value = goal.kpi || "";
    document.getElementById("goalSidenavStartDate").value = goal.startDate || "";
    document.getElementById("goalSidenavEndDate").value = goal.endDate || "";
    document.getElementById("goalSidenavDescription").value = goal.description || "";
    document.getElementById("goalSidenavGithubRepo").value = goal.githubRepo || "";
    document.getElementById("goalSidenavGithubMilestone").value = goal.githubMilestone ?? "";

    if (goal.githubMilestone) {
      this._setMilestoneSummary(goal.githubMilestone, null, null, null);
    } else {
      this._resetMilestonePanel();
    }
  }

  getFormData() {
    const repoVal = document.getElementById("goalSidenavGithubRepo").value.trim();
    const milestoneVal = document.getElementById("goalSidenavGithubMilestone").value;
    return {
      title: document.getElementById("goalSidenavTitle").value.trim(),
      type: document.getElementById("goalSidenavType").value,
      status: document.getElementById("goalSidenavStatus").value,
      kpi: document.getElementById("goalSidenavKpi").value.trim(),
      startDate: document.getElementById("goalSidenavStartDate").value,
      endDate: document.getElementById("goalSidenavEndDate").value,
      description: document.getElementById("goalSidenavDescription").value.trim(),
      githubRepo: repoVal || null,
      githubMilestone: milestoneVal ? parseInt(milestoneVal, 10) : null,
    };
  }

  findEntity(id) {
    return this.tm.goals.find((g) => g.id === id);
  }

  async reloadData() {
    await this.tm.goalsModule.load();
  }

  // --- GitHub helpers ---

  _resetMilestonePanel() {
    const panel = document.getElementById("goalMilestonePanel");
    if (panel) panel.innerHTML = "";
    const select = document.getElementById("goalMilestoneSelect");
    if (select) select.innerHTML = "<option value=''>Select milestone...</option>";
  }

  _setMilestoneSummary(number, title, openIssues, closedIssues) {
    const panel = document.getElementById("goalMilestonePanel");
    if (!panel) return;
    if (number && title !== null) {
      const total = (openIssues ?? 0) + (closedIssues ?? 0);
      const pct = total > 0 ? Math.round(((closedIssues ?? 0) / total) * 100) : 0;
      panel.innerHTML = `
        <div class="text-xs text-secondary flex items-center gap-2 mt-1">
          <span>${title}</span>
          <span class="github-milestone-progress"><span class="github-milestone-fill" style="width:${pct}%"></span></span>
          <span>${closedIssues ?? "?"}/${total} issues closed</span>
        </div>`;
    } else if (number) {
      panel.innerHTML = `<div class="text-xs text-secondary mt-1">Milestone #${number}</div>`;
    } else {
      panel.innerHTML = "";
    }
  }

  async fetchMilestones() {
    const repoInput = document.getElementById("goalSidenavGithubRepo");
    const repo = repoInput?.value?.trim();
    if (!repo || !repo.includes("/")) {
      showToast("Enter a GitHub repo first (owner/repo)", "error");
      return;
    }
    const [owner, repoName] = repo.split("/");
    const btn = document.getElementById("goalFetchMilestonesBtn");
    if (btn) { btn.disabled = true; btn.textContent = "Loading..."; }

    try {
      const milestones = await GitHubAPI.listMilestones(owner, repoName);
      const select = document.getElementById("goalMilestoneSelect");
      if (!select) return;
      select.innerHTML = "<option value=''>Select milestone...</option>" +
        milestones.map((m) => {
          const total = m.openIssues + m.closedIssues;
          const pct = total > 0 ? Math.round((m.closedIssues / total) * 100) : 0;
          return `<option value="${m.number}" data-open="${m.openIssues}" data-closed="${m.closedIssues}" data-title="${m.title.replace(/"/g, "&quot;")}" data-url="${m.htmlUrl}">${m.title} (${pct}%)</option>`;
        }).join("");

      // On change, update hidden milestone field and summary
      select.addEventListener("change", () => {
        const opt = select.options[select.selectedIndex];
        const numInput = document.getElementById("goalSidenavGithubMilestone");
        if (select.value) {
          if (numInput) numInput.value = select.value;
          this._setMilestoneSummary(
            parseInt(select.value, 10),
            opt.dataset.title,
            parseInt(opt.dataset.open, 10),
            parseInt(opt.dataset.closed, 10),
          );
        } else {
          if (numInput) numInput.value = "";
          this._resetMilestonePanel();
        }
      }, { once: true });

      showToast(`${milestones.length} milestone(s) loaded`, "success");
    } catch (err) {
      showToast(err?.message?.includes("404") ? "Repo not found" : "Failed to fetch milestones", "error");
    } finally {
      if (btn) { btn.disabled = false; btn.textContent = "Load milestones"; }
    }
  }

  onOpen() {
    // Bind repo autocomplete
    const repoInput = document.getElementById("goalSidenavGithubRepo");
    if (repoInput && !repoInput._ghAutocomplete) {
      repoInput._ghAutocomplete = bindAutocomplete(
        repoInput,
        () => [], // Static suggestions — dynamic fetch below
        (val) => { repoInput.value = val; },
      );

      // Fetch repos dynamically on input
      let _repoFetchTimer = null;
      repoInput.addEventListener("input", () => {
        clearTimeout(_repoFetchTimer);
        _repoFetchTimer = setTimeout(async () => {
          const q = repoInput.value.trim();
          if (q.length < 2) return;
          try {
            const repos = await GitHubAPI.listRepos(q);
            // Update autocomplete suggestions
            if (repoInput._ghAutocomplete) {
              repoInput._ghAutocomplete.detach();
              delete repoInput._ghAutocomplete;
            }
            repoInput._ghAutocomplete = bindAutocomplete(
              repoInput,
              () => repos.map((r) => r.fullName),
              (val) => { repoInput.value = val; },
            );
          } catch {
            // Silently skip — autocomplete is optional
          }
        }, 400);
      });
    }

    // Bind fetch milestones button
    const fetchBtn = document.getElementById("goalFetchMilestonesBtn");
    if (fetchBtn && !fetchBtn._bound) {
      fetchBtn._bound = true;
      fetchBtn.addEventListener("click", () => this.fetchMilestones());
    }
  }
}

export default GoalSidenavModule;
