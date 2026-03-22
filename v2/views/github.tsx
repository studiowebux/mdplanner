// GitHub fragment components — loaded via htmx into portfolio detail page.

import type { FC } from "hono/jsx";
import type {
  GitHubIssue,
  GitHubMilestone,
  GitHubPR,
  GitHubRepo,
  GitHubRelease,
} from "../types/github.types.ts";

// ---------------------------------------------------------------------------
// Repo card
// ---------------------------------------------------------------------------

export const GitHubRepoCard: FC<{
  repo: GitHubRepo;
  release: GitHubRelease | null;
}> = ({ repo, release }) => (
  <div class="github-card">
    <div class="github-card__header">
      <a
        href={repo.htmlUrl}
        target="_blank"
        rel="noopener noreferrer"
        class="github-card__name"
      >
        {repo.owner}/{repo.repo}
      </a>
      {repo.license && (
        <span class="github-card__license">{repo.license}</span>
      )}
    </div>
    <div class="github-card__stats">
      <span class="github-card__stat">
        <span class="github-card__stat-value">{repo.stars}</span>
        {" "}{repo.stars === 1 ? "star" : "stars"}
      </span>
      <span class="github-card__stat">
        <span class="github-card__stat-value">
          {Math.max(0, repo.openIssues - repo.openPRs)}
        </span>
        {" "}{repo.openIssues - repo.openPRs === 1 ? "issue" : "issues"}
      </span>
      <span class="github-card__stat">
        <span class="github-card__stat-value">{repo.openPRs}</span>
        {" "}{repo.openPRs === 1 ? "PR" : "PRs"}
      </span>
    </div>
    <div class="github-card__footer">
      {release && (
        <a
          href={release.htmlUrl}
          target="_blank"
          rel="noopener noreferrer"
          class="github-card__release"
        >
          {release.tagName}
        </a>
      )}
      {repo.lastCommitAt && (
        <span class="github-card__pushed">
          pushed {new Date(repo.lastCommitAt).toLocaleDateString()}
        </span>
      )}
    </div>
  </div>
);

// ---------------------------------------------------------------------------
// Issues table
// ---------------------------------------------------------------------------

export const GitHubIssuesTable: FC<{
  issues: GitHubIssue[];
  itemId: string;
}> = ({ issues, itemId }) => (
  <div class="github-table-wrap">
    {issues.length === 0
      ? <p class="github-empty">No issues found</p>
      : (
        <table class="github-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Title</th>
              <th>Labels</th>
              <th>Assignee</th>
              <th>Date</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {issues.map((issue) => (
              <tr key={issue.number} id={`issue-${issue.number}`}>
                <td class="github-table__num">{issue.number}</td>
                <td>
                  <a
                    href={issue.htmlUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {issue.title}
                  </a>
                </td>
                <td>
                  {issue.labels.map((l) => (
                    <span key={l} class="github-label">{l}</span>
                  ))}
                </td>
                <td>{issue.assignee ?? ""}</td>
                <td class="github-table__date">
                  {new Date(issue.createdAt).toLocaleDateString()}
                </td>
                <td>
                  <button
                    class="btn btn--secondary btn--sm"
                    type="button"
                    hx-patch={`/api/v1/portfolio/${itemId}/github/issues/${issue.number}`}
                    hx-vals={JSON.stringify({
                      state: issue.state === "open" ? "closed" : "open",
                    })}
                    hx-headers='{"Content-Type": "application/json"}'
                    hx-target="#github-tab-content"
                    hx-swap="innerHTML"
                    hx-get={`/portfolio/${itemId}/github/issues`}
                  >
                    {issue.state === "open" ? "Close" : "Reopen"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
  </div>
);

// ---------------------------------------------------------------------------
// PRs table
// ---------------------------------------------------------------------------

export const GitHubPRsTable: FC<{
  prs: GitHubPR[];
  itemId: string;
}> = ({ prs, itemId }) => (
  <div class="github-table-wrap">
    {prs.length === 0
      ? <p class="github-empty">No pull requests found</p>
      : (
        <table class="github-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Title</th>
              <th>Branch</th>
              <th>Status</th>
              <th>Assignee</th>
              <th>Date</th>
            </tr>
          </thead>
          <tbody>
            {prs.map((pr) => {
              const status = pr.merged
                ? "merged"
                : pr.state === "closed"
                ? "closed"
                : "open";
              return (
                <tr key={pr.number}>
                  <td class="github-table__num">{pr.number}</td>
                  <td>
                    <a
                      href={pr.htmlUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {pr.title}
                    </a>
                  </td>
                  <td>
                    <code class="github-branch">{pr.headBranch}</code>
                  </td>
                  <td>
                    <span class={`github-badge github-badge--${status}`}>
                      {status}
                    </span>
                  </td>
                  <td>{pr.assignee ?? ""}</td>
                  <td class="github-table__date">
                    {new Date(pr.createdAt).toLocaleDateString()}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
  </div>
);

// ---------------------------------------------------------------------------
// Milestones list
// ---------------------------------------------------------------------------

export const GitHubMilestonesList: FC<{ milestones: GitHubMilestone[] }> = ({
  milestones,
}) => (
  <div class="github-milestones">
    {milestones.length === 0
      ? <p class="github-empty">No open milestones</p>
      : milestones.map((m) => {
        const total = m.openIssues + m.closedIssues;
        const pct = total > 0 ? Math.round((m.closedIssues / total) * 100) : 0;
        return (
          <div key={m.number} class="github-milestone">
            <div class="github-milestone__header">
              <a
                href={m.htmlUrl}
                target="_blank"
                rel="noopener noreferrer"
                class="github-milestone__title"
              >
                {m.title}
              </a>
              <span class="github-milestone__count">
                {m.closedIssues}/{total}
              </span>
            </div>
            <div class="github-milestone__bar">
              <div
                class="github-milestone__fill"
                style={`width: ${pct}%`}
              />
            </div>
          </div>
        );
      })}
  </div>
);

// ---------------------------------------------------------------------------
// Error / not configured
// ---------------------------------------------------------------------------

export const GitHubError: FC<{ message: string }> = ({ message }) => (
  <div class="github-error">
    <p>{message}</p>
  </div>
);

// ---------------------------------------------------------------------------
// Tab section wrapper — rendered into portfolio detail
// ---------------------------------------------------------------------------

export const GitHubSection: FC<{ itemId: string }> = ({ itemId }) => (
  <section class="portfolio-detail__section github-section">
    <h2 class="portfolio-detail__section-heading">GitHub</h2>

    <div
      id="github-repo-card"
      hx-get={`/portfolio/${itemId}/github/card`}
      hx-trigger="load"
      hx-swap="innerHTML"
    >
      <span class="loading-spinner" />
    </div>

    <div class="github-tabs">
      <button
        class="github-tabs__btn github-tabs__btn--active"
        type="button"
        hx-get={`/portfolio/${itemId}/github/issues`}
        hx-target="#github-tab-content"
        hx-swap="innerHTML"
        hx-trigger="click"
        data-github-tab
      >
        Issues
      </button>
      <button
        class="github-tabs__btn"
        type="button"
        hx-get={`/portfolio/${itemId}/github/pulls`}
        hx-target="#github-tab-content"
        hx-swap="innerHTML"
        hx-trigger="click"
        data-github-tab
      >
        PRs
      </button>
      <button
        class="github-tabs__btn"
        type="button"
        hx-get={`/portfolio/${itemId}/github/milestones`}
        hx-target="#github-tab-content"
        hx-swap="innerHTML"
        hx-trigger="click"
        data-github-tab
      >
        Milestones
      </button>
    </div>

    <div
      id="github-tab-content"
      hx-get={`/portfolio/${itemId}/github/issues`}
      hx-trigger="load"
      hx-swap="innerHTML"
    >
      <span class="loading-spinner" />
    </div>
  </section>
);
