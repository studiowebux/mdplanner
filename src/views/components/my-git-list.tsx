// My Work — "Git" card body. Aggregates, across every configured portfolio
// repo (GitHub + Gitea via the provider pattern) plus Woodpecker CI: my open
// PRs, PRs requesting my review, issues assigned to me, and CI pipelines that
// need attention. Generic "Git"/"CI" labels (note_1782348283430). Loaded lazily
// by GET /me/git; total failure renders GitHubError instead of this card.

import type { FC } from "hono/jsx";
import { badgeClass } from "../../components/ui/status-badge.tsx";
import { CI_STATUS_VARIANTS, GITHUB_STATE_VARIANTS } from "../github/cards.tsx";

/** A PR surfaced on My Work (author or review-requested). */
export type MyGitPR = {
  repo: string;
  number: number;
  title: string;
  state: string;
  htmlUrl: string;
};

/** An issue assigned to me. */
export type MyGitIssue = {
  repo: string;
  number: number;
  title: string;
  htmlUrl: string;
};

/** A CI pipeline needing attention (non-success latest status). */
export type MyGitCi = {
  repo: string;
  number: number;
  status: string;
  branch: string;
  forgeUrl: string;
};

export type MyGitData = {
  myPRs: MyGitPR[];
  reviewRequested: MyGitPR[];
  assignedIssues: MyGitIssue[];
  ciAttention: MyGitCi[];
};

const PrRows: FC<{ prs: MyGitPR[] }> = ({ prs }) => (
  <ul class="me-dashboard__list">
    {prs.map((pr) => (
      <li key={`${pr.repo}#${pr.number}`} class="me-dashboard__item">
        <a
          href={pr.htmlUrl}
          target="_blank"
          rel="noopener noreferrer"
          class="me-dashboard__item-link"
        >
          {pr.title}
        </a>
        <span class="me-dashboard__item-meta">
          <span class="me-git__repo">{pr.repo} #{pr.number}</span>
          <span class={badgeClass(GITHUB_STATE_VARIANTS, pr.state)}>
            {pr.state}
          </span>
        </span>
      </li>
    ))}
  </ul>
);

/** Renders the My Work Git card body. Empty subsections are hidden. */
export const MyGitCard: FC<MyGitData> = (
  { myPRs, reviewRequested, assignedIssues, ciAttention },
) => {
  const empty = myPRs.length === 0 && reviewRequested.length === 0 &&
    assignedIssues.length === 0 && ciAttention.length === 0;

  if (empty) {
    return (
      <p class="me-dashboard__empty">Nothing assigned to you right now.</p>
    );
  }

  return (
    <div class="me-git">
      {myPRs.length > 0 && (
        <div class="me-git__group">
          <h3 class="me-git__subhead">My open PRs ({myPRs.length})</h3>
          <PrRows prs={myPRs} />
        </div>
      )}

      {reviewRequested.length > 0 && (
        <div class="me-git__group">
          <h3 class="me-git__subhead">
            Review requested ({reviewRequested.length})
          </h3>
          <PrRows prs={reviewRequested} />
        </div>
      )}

      {assignedIssues.length > 0 && (
        <div class="me-git__group">
          <h3 class="me-git__subhead">
            Assigned issues ({assignedIssues.length})
          </h3>
          <ul class="me-dashboard__list">
            {assignedIssues.map((issue) => (
              <li
                key={`${issue.repo}#${issue.number}`}
                class="me-dashboard__item"
              >
                <a
                  href={issue.htmlUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  class="me-dashboard__item-link"
                >
                  {issue.title}
                </a>
                <span class="me-dashboard__item-meta">
                  <span class="me-git__repo">
                    {issue.repo} #{issue.number}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {ciAttention.length > 0 && (
        <div class="me-git__group">
          <h3 class="me-git__subhead">
            CI needs attention ({ciAttention.length})
          </h3>
          <ul class="me-dashboard__list">
            {ciAttention.map((ci) => (
              <li key={`${ci.repo}#${ci.number}`} class="me-dashboard__item">
                <a
                  href={ci.forgeUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  class="me-dashboard__item-link"
                >
                  {ci.repo} · {ci.branch}
                </a>
                <span class="me-dashboard__item-meta">
                  <span class="me-git__repo">#{ci.number}</span>
                  <span class={badgeClass(CI_STATUS_VARIANTS, ci.status)}>
                    {ci.status}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};
