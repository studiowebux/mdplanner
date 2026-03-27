import type { ColumnDef } from "../../components/ui/data-table.tsx";
import type { FieldDef } from "../../components/ui/form-builder.tsx";
import type { Goal } from "../../types/goal.types.ts";
import { GOAL_STATUSES, GOAL_TYPES } from "../../types/goal.types.ts";
import { PRIORITY_LABELS, PRIORITY_OPTIONS } from "../../constants/mod.ts";
import { statusBadgeRenderer } from "../../components/ui/status-badge.tsx";
import { Highlight } from "../../utils/highlight.tsx";
import { formatDate } from "../../utils/time.ts";

import { toKebab } from "../../utils/slug.ts";

const actionBtns = (_value: unknown, row: Record<string, unknown>) => (
  <div class="domain-card__actions">
    <a class="btn btn--secondary btn--sm" href={`/goals/${row.id}`}>
      View
    </a>
    <button
      class="btn btn--secondary btn--sm"
      type="button"
      hx-get={`/goals/${row.id}/edit`}
      hx-target="#goals-form-container"
      hx-swap="innerHTML"
    >
      Edit
    </button>
    <button
      class="btn btn--danger btn--sm"
      type="button"
      hx-delete={`/goals/${row.id}`}
      hx-confirm={`Delete "${row.title}"? This cannot be undone.`}
      hx-swap="none"
    >
      Delete
    </button>
  </div>
);

export const GOAL_TABLE_COLUMNS: ColumnDef[] = [
  {
    key: "title",
    label: "Title",
    sortable: true,
    render: (v, row) => (
      <a href={`/goals/${row.id}`}>
        <Highlight text={String(v)} q={row._q as string} />
      </a>
    ),
  },
  {
    key: "type",
    label: "Type",
    sortable: true,
    render: statusBadgeRenderer("goal-badge"),
  },
  {
    key: "status",
    label: "Status",
    sortable: true,
    render: statusBadgeRenderer("goal-status"),
  },
  {
    key: "priority",
    label: "Priority",
    sortable: true,
    render: (v) => {
      if (!v) return "";
      return (
        <span class={`badge priority--${v}`}>
          {GOAL_PRIORITY_LABELS[String(v)] ?? String(v)}
        </span>
      );
    },
  },
  { key: "owner", label: "Owner", sortable: true },
  { key: "kpi", label: "KPI", sortable: true },
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
  {
    key: "startDate",
    label: "Start",
    sortable: true,
    render: (v) => formatDate(v as string),
  },
  {
    key: "endDate",
    label: "End",
    sortable: true,
    render: (v) => formatDate(v as string),
  },
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
  { key: "_actions", label: "", render: actionBtns },
];

export const GOAL_PRIORITY_OPTIONS = PRIORITY_OPTIONS;
const GOAL_PRIORITY_LABELS = PRIORITY_LABELS;

export const GOAL_FORM_FIELDS: FieldDef[] = [
  { type: "text", name: "title", label: "Title", required: true },
  {
    type: "select",
    name: "type",
    label: "Type",
    options: GOAL_TYPES.map((t) => ({ value: t, label: t })),
  },
  {
    type: "select",
    name: "status",
    label: "Status",
    options: GOAL_STATUSES.map((s) => ({ value: s, label: s })),
  },
  {
    type: "autocomplete",
    name: "owner",
    label: "Owner",
    source: "people",
    placeholder: "Search people...",
  },
  {
    type: "select",
    name: "priority",
    label: "Priority",
    options: GOAL_PRIORITY_OPTIONS,
  },
  {
    type: "text",
    name: "kpi",
    label: "Success criteria",
    placeholder: "Define a measurable target (e.g. Reach $50k MRR by Q4)",
  },
  {
    type: "autocomplete",
    name: "kpiMetric",
    label: "KPI metric",
    source: "kpi-metrics",
    placeholder: "Search metrics...",
    freetext: true,
  },
  { type: "number", name: "kpiTarget", label: "Target value", min: 0 },
  { type: "number", name: "kpiValue", label: "Current value", min: 0 },
  { type: "date", name: "startDate", label: "Start date" },
  { type: "date", name: "endDate", label: "End date" },
  {
    type: "number",
    name: "progress",
    label: "Progress (%)",
    min: 0,
    max: 100,
  },
  {
    type: "autocomplete",
    name: "project",
    label: "Project",
    source: "portfolio",
    placeholder: "Search projects...",
  },
  {
    type: "autocomplete",
    name: "parentGoal",
    label: "Parent goal",
    source: "goals-by-id",
    placeholder: "Search goals...",
  },
  {
    type: "tags",
    name: "linkedMilestones",
    label: "Linked milestones",
    source: "milestones",
    placeholder: "Search milestones...",
  },
  {
    type: "tags",
    name: "contributors",
    label: "Contributors",
    source: "people",
    placeholder: "Search people...",
  },
  {
    type: "tags",
    name: "tags",
    label: "Tags",
    source: "project-tags",
    placeholder: "Type and press Enter...",
  },
  { type: "textarea", name: "notes", label: "Notes", rows: 3 },
  { type: "textarea", name: "description", label: "Description", rows: 4 },
];

export function goalToRow(g: Goal): Record<string, unknown> {
  return {
    id: g.id,
    title: g.title,
    type: g.type,
    status: g.status,
    priority: g.priority ?? "",
    owner: g.owner ?? "",
    kpi: g.kpi ?? "",
    progress: g.progress ?? "",
    startDate: g.startDate ?? "",
    endDate: g.endDate ?? "",
    project: g.project ?? "",
    tags: g.tags?.join(", ") ?? "",
    description: g.description ?? "",
  };
}
