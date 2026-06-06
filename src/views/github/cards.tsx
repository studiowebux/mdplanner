// GitHub repo card components + the shared status→badge variant map. Leaf
// module (imported by tables.tsx, pipelines.tsx, github.tsx, and the summary
// cards); imports no sibling github view module.

import type { FC } from "hono/jsx";
import type { BadgeVariant } from "../../components/ui/status-badge.tsx";
import type { GitHubRelease, GitHubRepo } from "../../types/github.types.ts";

export const GITHUB_STATE_VARIANTS: Record<string, BadgeVariant> = {
  open: "success",
  merged: "info",
  closed: "error",
  in_progress: "info",
  queued: "warning",
  success: "success",
  failure: "error",
  timed_out: "error",
  cancelled: "neutral",
  skipped: "neutral",
  neutral: "neutral",
  action_required: "warning",
  waiting: "warning",
};

// ---------------------------------------------------------------------------
// Repo card — shared stats + footer (reused by the GitHub summary cards)
// ---------------------------------------------------------------------------

/** Star / issue / PR counters. Shared by GitHubRepoCard and GitHubSummaryCard. */
export const GitHubCardStats: FC<{ repo: GitHubRepo }> = ({ repo }) => (
  <div class="github-card__stats">
    <span class="github-card__stat">
      <span class="github-card__stat-value">{repo.stars}</span>{" "}
      {repo.stars === 1 ? "star" : "stars"}
    </span>
    <span class="github-card__stat">
      <span class="github-card__stat-value">
        {Math.max(0, repo.openIssues - repo.openPRs)}
      </span>{" "}
      {repo.openIssues - repo.openPRs === 1 ? "issue" : "issues"}
    </span>
    <span class="github-card__stat">
      <span class="github-card__stat-value">{repo.openPRs}</span>{" "}
      {repo.openPRs === 1 ? "PR" : "PRs"}
    </span>
  </div>
);

/**
 * Release / license / last-pushed footer. `showLicense` renders the license
 * here (summary cards); GitHubRepoCard shows the license in its header instead.
 */
export const GitHubCardFooter: FC<{
  repo: GitHubRepo;
  release: GitHubRelease | null;
  showLicense?: boolean;
}> = ({ repo, release, showLicense }) => (
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
    {showLicense && repo.license && (
      <span class="github-card__license">{repo.license}</span>
    )}
    {repo.lastCommitAt && (
      <span class="github-card__pushed">
        pushed {new Date(repo.lastCommitAt).toLocaleDateString()}
      </span>
    )}
  </div>
);

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
      {repo.license && <span class="github-card__license">{repo.license}</span>}
    </div>
    <GitHubCardStats repo={repo} />
    <GitHubCardFooter repo={repo} release={release} />
  </div>
);
