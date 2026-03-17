import type { ColumnDef } from "../../components/ui/data-table.tsx";
import type { Milestone } from "../../types/milestone.types.ts";
import { statusBadgeRenderer } from "../../components/ui/status-badge.tsx";
import { Highlight } from "../../utils/highlight.tsx";
import { timeAgo, duration, variance, dueIn, formatDate } from "../../utils/time.ts";

// Action buttons render function for table rows.
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

export const MILESTONE_TABLE_COLUMNS: ColumnDef[] = [
  { key: "name", label: "Name", sortable: true, render: (v, row) => <Highlight text={String(v)} q={row._q as string} /> },
  { key: "status", label: "Status", sortable: true, render: statusBadgeRenderer("milestone-card__badge") },
  { key: "target", label: "Target", sortable: true },
  { key: "progress", label: "Progress", sortable: true },
  { key: "taskCount", label: "Tasks", sortable: true },
  { key: "project", label: "Project", sortable: true, render: (v, row) => <Highlight text={String(v)} q={row._q as string} /> },
  { key: "createdAt", label: "Created", sortable: true, render: (v) => formatDate(v as string) },
  { key: "age", label: "Age", render: (_, row) => timeAgo(row.createdAt as string) },
  { key: "due", label: "Due", render: (_, row) => {
    if (row.status === "completed" || !row.target) return "";
    const d = dueIn(row.target as string);
    return <span class={d.includes("overdue") ? "text-error" : ""}>{d}</span>;
  }},
  { key: "completedAt", label: "Completed", sortable: true, render: (v) => formatDate(v as string) },
  { key: "duration", label: "Duration", render: (_, row) => duration(row.createdAt as string, row.completedAt as string) },
  { key: "variance", label: "Planned vs Actual", render: (_, row) => {
    const v = variance(row.target as string, row.completedAt as string);
    if (!v) return "";
    const cls = v.includes("late") ? "text-error" : v.includes("early") ? "text-success" : "";
    return <span class={cls}>{v}</span>;
  }},
  { key: "_actions", label: "", render: actionBtns },
];

export const MILESTONE_DOMAIN = "milestones";

export const MILESTONE_STATE_KEYS = ["view", "status", "project", "q", "hideCompleted", "sort", "order"] as const;

export function milestoneToRow(m: Milestone): Record<string, unknown> {
  return {
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
  };
}
