import type { ColumnDef } from "../../components/ui/data-table.tsx";
import type { FieldDef } from "../../components/ui/form-builder.tsx";
import type { Goal } from "../../types/goal.types.ts";
import { GOAL_STATUSES, GOAL_TYPES } from "../../types/goal.types.ts";
import { statusBadgeRenderer } from "../../components/ui/status-badge.tsx";
import { Highlight } from "../../utils/highlight.tsx";
import { formatDate } from "../../utils/time.ts";

function nameToSlug(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(
    /(^-|-$)/g,
    "",
  );
}

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
      hx-swap="none"
      hx-confirm-dialog={`Delete "${row.title}"? This cannot be undone.`}
      data-confirm-name={String(row.title)}
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
  { key: "kpi", label: "KPI", sortable: true },
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
          <a href={`/portfolio/${nameToSlug(String(v))}`}>
            <Highlight text={String(v)} q={row._q as string} />
          </a>
        )
        : "",
  },
  { key: "_actions", label: "", render: actionBtns },
];

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
    type: "text",
    name: "kpi",
    label: "Success criteria",
    placeholder: "e.g. $50k MRR, 10k users, Churn below 3%",
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
    type: "autocomplete",
    name: "project",
    label: "Project",
    source: "portfolio",
    placeholder: "Search projects...",
  },
  { type: "textarea", name: "description", label: "Description", rows: 4 },
];

export function goalToRow(g: Goal): Record<string, unknown> {
  return {
    id: g.id,
    title: g.title,
    type: g.type,
    status: g.status,
    kpi: g.kpi ?? "",
    startDate: g.startDate ?? "",
    endDate: g.endDate ?? "",
    project: g.project ?? "",
    description: g.description ?? "",
  };
}
