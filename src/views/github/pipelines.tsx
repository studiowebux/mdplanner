// GitHub Actions pipelines — the filter form + paginated workflow-run results
// table, rendered into the portfolio detail Pipelines tab.

import type { FC } from "hono/jsx";
import { badgeClass } from "../../components/ui/status-badge.tsx";
import {
  GITHUB_PIPELINE_STATUSES,
  GITHUB_WORKFLOW_EVENTS,
} from "../../types/github.types.ts";
import type { GitHubWorkflowRun } from "../../types/github.types.ts";
import { GITHUB_STATE_VARIANTS } from "./cards.tsx";

export type PipelineFilters = {
  status?: string;
  event?: string;
  branch?: string;
  q?: string;
};

export const GitHubPipelinesTable: FC<{
  runs: GitHubWorkflowRun[];
  total: number;
  itemId: string;
  filters: PipelineFilters;
  page: number;
  hasNext: boolean;
}> = ({ runs, total, itemId, filters, page, hasNext }) => {
  const filterQs = [
    filters.status ? `status=${filters.status}` : "",
    filters.event ? `event=${filters.event}` : "",
    filters.branch ? `branch=${encodeURIComponent(filters.branch)}` : "",
    filters.q ? `q=${encodeURIComponent(filters.q)}` : "",
  ].filter(Boolean).join("&");
  const resultsUrl = (p: number) => {
    const params = [`page=${p}`, filterQs].filter(Boolean).join("&");
    return `/portfolio/${itemId}/github/pipelines/results?${params}`;
  };

  return (
    <div class="github-table-wrap">
      <form
        class="github-pipeline__filters"
        hx-get={`/portfolio/${itemId}/github/pipelines/results`}
        hx-target="#github-pipeline-results"
        hx-swap="innerHTML"
        hx-trigger="change from:select, search from:input, input delay:300ms from:[name=q], input delay:300ms from:[name=branch]"
        hx-indicator="#github-pipeline-spinner"
        hx-vals={JSON.stringify({ page: 1 })}
      >
        <input
          type="search"
          name="q"
          placeholder="Search workflow..."
          value={filters.q ?? ""}
          class="github-pipeline__search"
          autocomplete="off"
        />
        <select name="status" class="github-pipeline__select">
          <option value="">All statuses</option>
          {GITHUB_PIPELINE_STATUSES.map((s) => (
            <option key={s} value={s} selected={filters.status === s}>
              {s}
            </option>
          ))}
        </select>
        <select name="event" class="github-pipeline__select">
          <option value="">All events</option>
          {GITHUB_WORKFLOW_EVENTS.map((e) => (
            <option key={e} value={e} selected={filters.event === e}>
              {e}
            </option>
          ))}
        </select>
        <input
          type="text"
          name="branch"
          placeholder="Branch..."
          value={filters.branch ?? ""}
          class="github-pipeline__search github-pipeline__search--branch"
          autocomplete="off"
        />
        <span id="github-pipeline-spinner" class="htmx-indicator">
          <div class="loading-spinner__ring" />
        </span>
      </form>

      <div id="github-pipeline-results">
        <GitHubPipelineResults
          runs={runs}
          total={total}
          itemId={itemId}
          page={page}
          hasNext={hasNext}
          resultsUrl={resultsUrl}
        />
      </div>
    </div>
  );
};

/** Inner results — swapped independently by filters and pagination. */
export const GitHubPipelineResults: FC<{
  runs: GitHubWorkflowRun[];
  total: number;
  itemId: string;
  page: number;
  hasNext: boolean;
  resultsUrl: (p: number) => string;
}> = ({ runs, total, itemId, page, hasNext, resultsUrl }) => (
  <>
    <span class="github-pipeline__count">
      {total} runs — page {page}
    </span>

    {runs.length === 0
      ? <p class="github-empty">No workflow runs match filters</p>
      : (
        <table class="data-table data-table--uppercase data-table--no-last-border">
          <thead>
            <tr>
              <th scope="col">Status</th>
              <th scope="col">Workflow</th>
              <th scope="col">Branch</th>
              <th scope="col">Event</th>
              <th scope="col">Started</th>
              <th scope="col">Actions</th>
            </tr>
          </thead>
          <tbody>
            {runs.map((run) => {
              const badge = run.conclusion ?? run.status;
              const canCancel = run.status === "queued" ||
                run.status === "in_progress";
              const canRerun = run.status === "completed";
              return (
                <tr key={run.id}>
                  <td>
                    <span class={badgeClass(GITHUB_STATE_VARIANTS, badge)}>
                      {badge}
                    </span>
                  </td>
                  <td>
                    <a
                      href={run.htmlUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {run.name}
                    </a>
                  </td>
                  <td>
                    <code class="github-branch">{run.headBranch}</code>
                  </td>
                  <td>{run.event}</td>
                  <td class="github-table__date">
                    {new Date(run.createdAt).toLocaleDateString()}
                  </td>
                  <td class="github-pipeline__actions">
                    {canCancel && (
                      <button
                        class="btn btn--danger btn--sm"
                        type="button"
                        hx-post={`/portfolio/${itemId}/github/pipelines/cancel/${run.id}`}
                        hx-target="#github-pipeline-results"
                        hx-swap="innerHTML"
                        hx-indicator="#github-pipeline-spinner"
                      >
                        Cancel
                      </button>
                    )}
                    {canRerun && (
                      <>
                        <button
                          class="btn btn--secondary btn--sm"
                          type="button"
                          hx-post={`/portfolio/${itemId}/github/pipelines/rerun/${run.id}`}
                          hx-target="#github-pipeline-results"
                          hx-swap="innerHTML"
                          hx-indicator="#github-pipeline-spinner"
                        >
                          Re-run
                        </button>
                        {run.conclusion === "failure" && (
                          <button
                            class="btn btn--secondary btn--sm"
                            type="button"
                            hx-post={`/portfolio/${itemId}/github/pipelines/rerun-failed/${run.id}`}
                            hx-target="#github-pipeline-results"
                            hx-swap="innerHTML"
                            hx-indicator="#github-pipeline-spinner"
                          >
                            Re-run failed
                          </button>
                        )}
                      </>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}

    <div class="github-pipeline__pagination">
      {page > 1 && (
        <button
          class="btn btn--secondary btn--sm"
          type="button"
          hx-get={resultsUrl(page - 1)}
          hx-target="#github-pipeline-results"
          hx-swap="innerHTML"
          hx-indicator="#github-pipeline-spinner"
        >
          Previous
        </button>
      )}
      {hasNext && (
        <button
          class="btn btn--secondary btn--sm"
          type="button"
          hx-get={resultsUrl(page + 1)}
          hx-target="#github-pipeline-results"
          hx-swap="innerHTML"
          hx-indicator="#github-pipeline-spinner"
        >
          Next
        </button>
      )}
    </div>
  </>
);
