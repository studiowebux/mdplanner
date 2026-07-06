// GitHub issues / PRs / milestones tables — htmx fragments rendered into the
// portfolio detail GitHub tabs.

import type { FC } from "hono/jsx";
import { badgeClass } from "../../components/ui/status-badge.tsx";
import type {
  GitHubIssue,
  GitHubMilestone,
  GitHubPR,
} from "../../types/github.types.ts";
import { GITHUB_STATE_VARIANTS } from "./cards.tsx";

export const GitHubIssuesTable: FC<{
  issues: GitHubIssue[];
  itemId: string;
}> = ({ issues, itemId }) => (
  <div class="github-table-wrap">
    {issues.length === 0
      ? <p class="github-empty">No issues found</p>
      : (
        <table class="data-table data-table--uppercase data-table--no-last-border">
          <thead>
            <tr>
              <th scope="col">#</th>
              <th scope="col">Title</th>
              <th scope="col">Labels</th>
              <th scope="col">Assignee</th>
              <th scope="col">Date</th>
              <th scope="col">Actions</th>
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
                    hx-patch={`/portfolio/${itemId}/github/issues/${issue.number}`}
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

export const GitHubPRsTable: FC<{
  prs: GitHubPR[];
  itemId: string;
}> = ({ prs, itemId }) => (
  <div class="github-table-wrap">
    {prs.length === 0
      ? <p class="github-empty">No pull requests found</p>
      : (
        <table class="data-table data-table--uppercase data-table--no-last-border">
          <thead>
            <tr>
              <th scope="col">#</th>
              <th scope="col">Title</th>
              <th scope="col">Branch</th>
              <th scope="col">Status</th>
              <th scope="col">Assignee</th>
              <th scope="col">Date</th>
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
                    <span class={badgeClass(GITHUB_STATE_VARIANTS, status)}>
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
                data-pct={pct}
              />
            </div>
          </div>
        );
      })}
  </div>
);
