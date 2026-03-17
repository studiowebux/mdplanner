import type { FC } from "hono/jsx";
import { MainLayout } from "../components/layout/main.tsx";
import { MilestoneCard } from "./components/milestone-card.tsx";
import { MilestoneForm } from "./components/milestone-form.tsx";
import { CardGrid } from "../components/ui/card-grid.tsx";
import { DataTable } from "../components/ui/data-table.tsx";
import { DomainToolbar } from "../components/ui/domain-toolbar.tsx";
import { EmptyState } from "../components/ui/empty-state.tsx";
import type { Milestone } from "../types/milestone.types.ts";
import type { ViewProps, ViewMode } from "../types/app.ts";
import {
  MILESTONE_TABLE_COLUMNS,
  MILESTONE_COLUMN_DEFS,
  buildMilestoneFilters,
  milestoneToRow,
} from "../domains/milestone/constants.tsx";

// Grid fragment — reused by full page render and htmx view swap route.
export const MilestonesGrid: FC<{ milestones: Milestone[] }> = ({ milestones }) => (
  <CardGrid id="milestones-grid">
    {milestones.map((m) => <MilestoneCard key={m.id} milestone={m} />)}
  </CardGrid>
);

// Table fragment — reused by full page render and htmx view swap route.
export const MilestonesTable: FC<{ milestones: Milestone[] }> = ({ milestones }) => (
  <DataTable
    id="milestones-table"
    domain="milestones"
    compact
    columns={MILESTONE_TABLE_COLUMNS}
    rows={milestones.map(milestoneToRow)}
    rowFilterAttrs={(row) => ({
      "data-filter-status": String(row.status),
      "data-filter-project": String(row.project),
    })}
  />
);

type Props = ViewProps & { milestones: Milestone[]; view: ViewMode };

export const MilestonesView: FC<Props> = ({ milestones, nonce, activePath, view }) => (
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
      sse-connect={`/sse?view=${view}`}
    >
      <header class="domain-page__header">
        <h1 class="domain-page__title">Milestones</h1>
        <span class="domain-page__count" data-filter-count>{milestones.length} total</span>
        <button
          class="btn btn--primary"
          type="button"
          data-sidenav-open="milestone-form"
          data-milestone-action="create"
        >
          New
        </button>
      </header>

      <DomainToolbar
        domain="milestones"
        filters={buildMilestoneFilters(milestones)}
        columns={view === "table" ? MILESTONE_COLUMN_DEFS : undefined}
        searchPlaceholder="Search milestones..."
        completedStatus="completed"
        view={view}
      />

      <div
        id="milestones-view"
        class="view-container"
        sse-swap="milestone:created milestone:updated milestone:deleted"
        hx-swap="none"
      >
        {milestones.length === 0
          ? <EmptyState message="No milestones yet. Create one to get started." />
          : view === "table"
            ? <MilestonesTable milestones={milestones} />
            : <MilestonesGrid milestones={milestones} />}
      </div>
    </main>
    <MilestoneForm />
  </MainLayout>
);
