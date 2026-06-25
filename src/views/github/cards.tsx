// GitHub repo card components + the shared status→badge variant map. Leaf
// module (imported by tables.tsx, pipelines.tsx, github.tsx, and the summary
// cards); imports no sibling github view module.

import type { FC } from "hono/jsx";
import {
  badgeClass,
  type BadgeVariant,
} from "../../components/ui/status-badge.tsx";
import type { GitHubRelease, GitHubRepo } from "../../types/github.types.ts";
import type { WoodpeckerPipeline } from "../../types/woodpecker.types.ts";

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

// CI (Woodpecker) pipeline status → badge variant. Only colored statuses are
// listed; badgeClass defaults the rest (blocked/declined/skipped/created) to
// neutral. Labeled generically "CI" — not "Woodpecker" — in the UI.
export const CI_STATUS_VARIANTS: Record<string, BadgeVariant> = {
  success: "success",
  failure: "error",
  error: "error",
  killed: "error",
  running: "warning",
  pending: "warning",
  started: "warning",
};

/** Latest CI status pill linking to the pipeline. Null when no pipeline. */
export const CiStatusBadge: FC<{ pipeline: WoodpeckerPipeline | null }> = (
  { pipeline },
) => {
  if (!pipeline) return null;
  return (
    <a
      href={pipeline.forgeUrl}
      target="_blank"
      rel="noopener noreferrer"
      class="github-card__ci"
      title={`CI #${pipeline.number} on ${pipeline.branch}`}
    >
      <span class={badgeClass(CI_STATUS_VARIANTS, pipeline.status)}>
        CI: {pipeline.status}
      </span>
    </a>
  );
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
  ci?: WoodpeckerPipeline | null;
}> = ({ repo, release, showLicense, ci }) => (
  <div class="github-card__footer">
    <CiStatusBadge pipeline={ci ?? null} />
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
  ci?: WoodpeckerPipeline | null;
}> = ({ repo, release, ci }) => (
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
    <GitHubCardFooter repo={repo} release={release} ci={ci} />
  </div>
);
