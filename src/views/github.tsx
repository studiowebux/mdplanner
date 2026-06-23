// GitHub fragment components — loaded via htmx into the portfolio detail page.
// The card / table / pipeline components live in ./github/*; this module owns
// the section wrapper + error fragment and re-exports the rest so existing
// `views/github.tsx` import paths stay unchanged.

import type { FC } from "hono/jsx";

export {
  GITHUB_STATE_VARIANTS,
  GitHubCardFooter,
  GitHubCardStats,
  GitHubRepoCard,
} from "./github/cards.tsx";
export {
  GitHubIssuesTable,
  GitHubMilestonesList,
  GitHubPRsTable,
} from "./github/tables.tsx";
export {
  GitHubPipelineResults,
  GitHubPipelinesTable,
  type PipelineFilters,
} from "./github/pipelines.tsx";

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

export const GitHubSection: FC<{ itemId: string; provider?: string }> = (
  { itemId, provider = "GitHub" },
) => (
  <section class="portfolio-detail__section github-section">
    <h2 class="section-heading">{provider}</h2>

    <div
      id="github-repo-card"
      hx-get={`/portfolio/${itemId}/github/card`}
      hx-trigger="load"
      hx-swap="innerHTML"
    >
      <div class="loading-spinner" aria-label="Loading">
        <div class="loading-spinner__ring" />
      </div>
    </div>

    <div class="github-tabs">
      <button
        class="github-tabs__btn github-tabs__btn--active"
        type="button"
        hx-get={`/portfolio/${itemId}/github/issues`}
        hx-target="#github-tab-content"
        hx-swap="innerHTML"
        hx-trigger="click"
        hx-indicator="#github-tab-spinner"
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
        hx-indicator="#github-tab-spinner"
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
        hx-indicator="#github-tab-spinner"
        data-github-tab
      >
        Milestones
      </button>
      <button
        class="github-tabs__btn"
        type="button"
        hx-get={`/portfolio/${itemId}/github/pipelines`}
        hx-target="#github-tab-content"
        hx-swap="innerHTML"
        hx-trigger="click"
        hx-indicator="#github-tab-spinner"
        data-github-tab
      >
        Pipelines
      </button>
      <button
        class="github-tabs__btn github-tabs__refresh"
        type="button"
        data-github-refresh
      >
        Refresh
      </button>
      <span id="github-tab-spinner" class="htmx-indicator">
        <div class="loading-spinner__ring" />
      </span>
    </div>

    <div
      id="github-tab-content"
      hx-get={`/portfolio/${itemId}/github/issues`}
      hx-trigger="load"
      hx-swap="innerHTML"
      hx-indicator="#github-tab-spinner"
    >
      <div class="loading-spinner" aria-label="Loading">
        <div class="loading-spinner__ring" />
      </div>
    </div>
  </section>
);
