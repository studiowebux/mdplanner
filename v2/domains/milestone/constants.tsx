import type { ColumnDef } from "../../components/ui/data-table.tsx";
import type { Milestone } from "../../types/milestone.types.ts";
import {
  type BadgeVariant,
  statusBadgeRenderer,
} from "../../components/ui/status-badge.tsx";
import { createActionBtns } from "../../components/ui/action-btns.tsx";
import { Highlight } from "../../utils/highlight.tsx";
import { toKebab } from "../../utils/slug.ts";
import {
  dueIn,
  duration,
  formatDate,
  timeAgo,
  variance,
  varianceClass,
} from "../../utils/time.ts";

export const MILESTONE_STATUS_VARIANTS: Record<string, BadgeVariant> = {
  open: "accent",
  completed: "success",
};

const actionBtns = createActionBtns("milestones", "milestones-form-container", {
  nameField: "name",
  actionsClass: "milestone-card__actions",
});

export const MILESTONE_TABLE_COLUMNS: ColumnDef[] = [
  {
    key: "name",
    label: "Name",
    sortable: true,
    render: (v, row) => (
      <a href={`/milestones/${row.id}`}>
        <Highlight text={String(v)} q={row._q as string} />
      </a>
    ),
  },
  {
    key: "status",
    label: "Status",
    sortable: true,
    render: statusBadgeRenderer(MILESTONE_STATUS_VARIANTS),
  },
  { key: "target", label: "Target", sortable: true },
  {
    key: "progress",
    label: "Progress",
    sortable: true,
    render: (v) => {
      if (v === "" || v === undefined || v === null) return "";
      return (
        <div class="goal-progress-cell">
          <progress class="progress-bar" value={Number(v)} max={100} />
          <span>{v}%</span>
        </div>
      );
    },
  },
  { key: "taskCount", label: "Tasks", sortable: true },
  {
    key: "project",
    label: "Project",
    sortable: true,
    render: (v, row) =>
      v
        ? (
          <a href={`/portfolio/${toKebab(String(v))}`}>
            <Highlight text={String(v)} q={row._q as string} />
          </a>
        )
        : "",
  },
  {
    key: "createdAt",
    label: "Created",
    sortable: true,
    render: (v) => formatDate(v as string),
  },
  {
    key: "age",
    label: "Age",
    render: (_, row) => timeAgo(row.createdAt as string),
  },
  {
    key: "due",
    label: "Due",
    render: (_, row) => {
      if (row.status === "completed" || !row.target) return "";
      const d = dueIn(row.target as string);
      return <span class={d.includes("overdue") ? "text-error" : ""}>{d}</span>;
    },
  },
  {
    key: "completedAt",
    label: "Completed",
    sortable: true,
    render: (v) => formatDate(v as string),
  },
  {
    key: "duration",
    label: "Duration",
    render: (_, row) =>
      duration(row.createdAt as string, row.completedAt as string),
  },
  {
    key: "variance",
    label: "Planned vs Actual",
    render: (_, row) => {
      const v = variance(row.target as string, row.completedAt as string);
      if (!v) return "";
      return (
        <span
          class={varianceClass(row.target as string, row.completedAt as string)}
        >
          {v}
        </span>
      );
    },
  },
  { key: "_actions", label: "", render: actionBtns },
];

export const MILESTONE_DOMAIN = "milestones";

export const MILESTONE_STATE_KEYS = [
  "view",
  "status",
  "project",
  "q",
  "hideCompleted",
  "sort",
  "order",
] as const;

export function milestoneToRow(m: Milestone): Record<string, unknown> {
  return {
    id: m.id,
    name: m.name,
    status: m.status,
    target: m.target ?? "",
    progress: m.progress,
    taskCount: `${m.completedCount}/${m.taskCount}`,
    project: m.project ?? "",
    createdAt: m.createdAt ?? "",
    completedAt: m.completedAt ?? "",
    description: m.description ?? "",
  };
}
