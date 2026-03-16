import type { FC } from "hono/jsx";
import { MainLayout } from "../components/layout/main.tsx";
import { MilestoneCard } from "./components/milestone-card.tsx";
import { MilestoneForm } from "./components/milestone-form.tsx";
import { CardGrid } from "../components/ui/card-grid.tsx";
import { DataTable } from "../components/ui/data-table.tsx";
import { ViewToggle } from "../components/ui/view-toggle.tsx";
import { EmptyState } from "../components/ui/empty-state.tsx";
import type { Milestone } from "../types/milestone.types.ts";
import type { ColumnDef } from "../components/ui/data-table.tsx";
import type { ViewProps } from "../types/app.ts";
import { timeAgo, duration, variance, dueIn, formatDate } from "../utils/time.ts";

const statusPill = (value: unknown) => (
  <span class={`milestone-card__badge milestone-card__badge--${value}`}>
    {String(value)}
  </span>
);

const actionBtns = (_value: unknown, row: Record<string, unknown>) => (
  <div class="milestone-card__actions">
    <button
      class="btn btn--secondary btn--sm"
      type="button"
      data-sidenav-open="milestone-form"
      data-milestone-action="edit"
      data-milestone-id={String(row.id)}
      data-milestone-name={String(row.name)}
      data-milestone-status={String(row.status)}
      data-milestone-target={String(row.target ?? "")}
      data-milestone-description={String(row.description ?? "")}
      data-milestone-project={String(row.project ?? "")}
    >
      Edit
    </button>
    <button
      class="btn btn--danger btn--sm"
      type="button"
      data-milestone-action="delete"
      data-milestone-id={String(row.id)}
      data-milestone-name={String(row.name)}
    >
      Delete
    </button>
  </div>
);

const TABLE_COLUMNS: ColumnDef[] = [
  { key: "name", label: "Name", sortable: true },
  { key: "status", label: "Status", sortable: true, render: statusPill },
  { key: "target", label: "Target", sortable: true },
  { key: "progress", label: "Progress", sortable: true },
  { key: "taskCount", label: "Tasks", sortable: true },
  { key: "project", label: "Project", sortable: true },
  { key: "createdAt", label: "Created", sortable: true, render: (v) => formatDate(v as string) },
  { key: "age", label: "Age", render: (_, row) => timeAgo(row.createdAt as string) },
  { key: "due", label: "Due", render: (_, row) => {
    if (row.status === "completed" || !row.target) return "";
    const d = dueIn(row.target as string);
    return <span class={d.includes("overdue") ? "text-error" : ""}>{d}</span>;
  }},
  { key: "completedAt", label: "Completed", sortable: true, render: (v) => formatDate(v as string) },
  { key: "duration", label: "Completed in", render: (_, row) => duration(row.createdAt as string, row.completedAt as string) },
  { key: "variance", label: "Planned vs Actual", render: (_, row) => {
    const v = variance(row.target as string, row.completedAt as string);
    if (!v) return "";
    const cls = v.includes("late") ? "text-error" : v.includes("early") ? "text-success" : "";
    return <span class={cls}>{v}</span>;
  }},
  { key: "_actions", label: "", render: actionBtns },
];

type Props = ViewProps & { milestones: Milestone[] };

export const MilestonesView: FC<Props> = ({ milestones, nonce, activePath }) => (
  <MainLayout
    title="Milestones"
    nonce={nonce}
    activePath={activePath}
    styles={["/css/views/milestones.css"]}
    scripts={["/js/milestones-sse.js", "/js/milestones-form.js"]}
  >
    <main class="milestones-page">
      <header class="milestones-page__header">
        <h1 class="milestones-page__title">Milestones</h1>
        <span class="milestones-page__count">{milestones.length} total</span>
        <ViewToggle domain="milestones" />
        <button
          class="btn btn--primary"
          type="button"
          data-sidenav-open="milestone-form"
          data-milestone-action="create"
        >
          New
        </button>
      </header>

      {milestones.length === 0
        ? <EmptyState message="No milestones yet. Create one to get started." />
        : (
          <div class="view-container">
            <CardGrid id="milestones-grid">
              {milestones.map((m) => <MilestoneCard key={m.id} milestone={m} />)}
            </CardGrid>
            <DataTable
              id="milestones-table"
              columns={TABLE_COLUMNS}
              rows={milestones.map((m) => ({
                id: m.id,
                name: m.name,
                status: m.status,
                target: m.target ?? "",
                progress: `${m.progress}%`,
                taskCount: `${m.completedCount}/${m.taskCount}`,
                project: m.project ?? "",
                createdAt: m.createdAt ?? "",
                completedAt: m.completedAt ?? "",
                description: m.description ?? "",
              }))}
            />
          </div>
        )}
    </main>
    <MilestoneForm />
  </MainLayout>
);
