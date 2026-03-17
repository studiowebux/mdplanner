import type { FC } from "hono/jsx";
import { MainLayout } from "../components/layout/main.tsx";
import { MilestoneCard } from "./components/milestone-card.tsx";
import { MilestoneForm } from "./components/milestone-form.tsx";
import { CardGrid } from "../components/ui/card-grid.tsx";
import { DataTable } from "../components/ui/data-table.tsx";
import { EmptyState } from "../components/ui/empty-state.tsx";
import type { Milestone } from "../types/milestone.types.ts";
import type { ViewProps, ViewMode } from "../types/app.ts";
import { MILESTONE_TABLE_COLUMNS, milestoneToRow } from "../domains/milestone/constants.tsx";

const ViewToggleButtons: FC<{ view: ViewMode; oobSwap?: string }> = ({ view, oobSwap }) => (
  <div id="milestones-view-toggle" class="view-toggle" {...(oobSwap ? { "hx-swap-oob": oobSwap } : {})}>
    <button
      class={`btn btn--secondary view-toggle__btn${view === "grid" ? " view-toggle__btn--active" : ""}`}
      type="button"
      hx-get="/milestones/view?view=grid"
      hx-target="#milestones-view"
      hx-swap="outerHTML swap:100ms"
      hx-include="#milestones-toolbar"
    >
      Grid
    </button>
    <button
      class={`btn btn--secondary view-toggle__btn${view === "table" ? " view-toggle__btn--active" : ""}`}
      type="button"
      hx-get="/milestones/view?view=table"
      hx-target="#milestones-view"
      hx-swap="outerHTML swap:100ms"
      hx-include="#milestones-toolbar"
    >
      Table
    </button>
  </div>
);

// Filter state passed from the route after reading query params / cookies.
export type MilestoneFilterState = {
  view: ViewMode;
  status?: string;
  project?: string;
  q?: string;
  hideCompleted?: boolean;
  sort?: string;
  order?: "asc" | "desc";
};

// View container — returned as outerHTML on every state change (filter, toggle, SSE).
// SSE events trigger hx-get which re-fetches this with current toolbar state.
export const MilestonesViewContainer: FC<{ milestones: Milestone[]; state: MilestoneFilterState; fragment?: boolean }> = ({ milestones, state, fragment }) => (
  <div
    id="milestones-view"
    class="view-container"
  >
    <input type="hidden" name="view" value={state.view} />
    {fragment && (
      <span id="milestones-count" class="domain-page__count" {...{"hx-swap-oob": "true"}}>{milestones.length} total</span>
    )}
    {fragment && (
      <ViewToggleButtons view={state.view} oobSwap="true" />
    )}
    {milestones.length === 0
      ? <EmptyState message="No milestones yet. Create one to get started." />
      : state.view === "table"
        ? (
          <DataTable
            id="milestones-table"
            domain="milestones"
            compact
            columns={MILESTONE_TABLE_COLUMNS}
            rows={milestones.map((m) => ({ ...milestoneToRow(m), _q: state.q }))}
          />
        )
        : (
          <CardGrid id="milestones-grid">
            {milestones.map((m) => <MilestoneCard key={m.id} milestone={m} q={state.q} />)}
          </CardGrid>
        )}
  </div>
);

type Props = ViewProps & { milestones: Milestone[]; state: MilestoneFilterState; allProjects: string[] };

export const MilestonesView: FC<Props> = ({ milestones, nonce, activePath, state, allProjects }) => (
  <MainLayout
    title="Milestones"
    nonce={nonce}
    activePath={activePath}
    styles={["/css/views/milestones.css"]}
    scripts={["/js/milestones-form.js"]}
  >
    <main
      class="domain-page"
      data-domain="milestones"
      hx-ext="sse"
      sse-connect="/sse"
      hx-get="/milestones/view"
      hx-trigger="sse:milestone.created, sse:milestone.updated, sse:milestone.deleted"
      hx-target="#milestones-view"
      hx-swap="outerHTML"
      hx-include="#milestones-toolbar"
    >
      <header class="domain-page__header">
        <h1 class="domain-page__title">Milestones</h1>
        <span id="milestones-count" class="domain-page__count">{milestones.length} total</span>
        <button
          class="btn btn--primary"
          type="button"
          data-sidenav-open="milestone-form"
          data-milestone-action="create"
        >
          New
        </button>
      </header>

      <div id="milestones-toolbar" class="domain-toolbar">
        <div class="domain-toolbar__left">
          <input
            type="search"
            class="domain-toolbar__search"
            name="q"
            value={state.q ?? ""}
            placeholder="Search milestones..."
            aria-label="Search"
            hx-get="/milestones/view"
            hx-trigger="input changed delay:300ms, search"
            hx-target="#milestones-view"
            hx-swap="outerHTML"
            hx-include="#milestones-toolbar"
          />
          <select
            class="filter-bar__select"
            name="status"
            hx-get="/milestones/view"
            hx-trigger="change"
            hx-target="#milestones-view"
            hx-swap="outerHTML"
            hx-include="#milestones-toolbar"
          >
            <option value="">All statuses</option>
            <option value="open" selected={state.status === "open"}>Open</option>
            <option value="completed" selected={state.status === "completed"}>Completed</option>
          </select>
          {allProjects.length > 0 && (
            <select
              class="filter-bar__select"
              name="project"
              hx-get="/milestones/view"
              hx-trigger="change"
              hx-target="#milestones-view"
              hx-swap="outerHTML"
              hx-include="#milestones-toolbar"
            >
              <option value="">All projects</option>
              {allProjects.map((p) => (
                <option key={p} value={p} selected={state.project === p}>{p}</option>
              ))}
            </select>
          )}
          <label class="domain-toolbar__toggle">
            <input
              type="checkbox"
              name="hideCompleted"
              value="true"
              checked={state.hideCompleted}
              hx-get="/milestones/view"
              hx-trigger="change"
              hx-target="#milestones-view"
              hx-swap="outerHTML"
              hx-include="#milestones-toolbar"
            />
            <span class="domain-toolbar__toggle-label">Hide completed</span>
          </label>
        </div>
        <div class="domain-toolbar__right">
          <ViewToggleButtons view={state.view} />
        </div>
      </div>

      <MilestonesViewContainer milestones={milestones} state={state} />
    </main>
    <MilestoneForm />
  </MainLayout>
);
