import type { ColumnDef } from "../../components/ui/data-table.tsx";
import type { FieldDef } from "../../components/ui/form-builder.tsx";
import type { Idea } from "../../types/idea.types.ts";
import { IDEA_PRIORITIES, IDEA_STATUSES } from "../../types/idea.types.ts";
import {
  type BadgeVariant,
  statusBadgeRenderer,
} from "../../components/ui/status-badge.tsx";
import { Highlight } from "../../utils/highlight.tsx";
import { formatDate } from "../../utils/time.ts";
import { toKebab } from "../../utils/slug.ts";

export const IDEA_STATUS_VARIANTS: Record<string, BadgeVariant> = {
  new: "accent",
  considering: "info",
  planned: "warning",
  approved: "success",
  rejected: "error",
  implemented: "success",
  cancelled: "neutral",
};

export const IDEA_PRIORITY_VARIANTS: Record<string, BadgeVariant> = {
  high: "error",
  medium: "warning",
  low: "neutral",
};

const IDEA_PRIORITY_LABELS: Record<string, string> = {
  high: "High",
  medium: "Medium",
  low: "Low",
};

const actionBtns = (_value: unknown, row: Record<string, unknown>) => (
  <div class="domain-card__actions">
    <a class="btn btn--secondary btn--sm" href={`/ideas/${row.id}`}>
      View
    </a>
    <button
      class="btn btn--secondary btn--sm"
      type="button"
      hx-get={`/ideas/${row.id}/edit`}
      hx-target="#ideas-form-container"
      hx-swap="innerHTML"
    >
      Edit
    </button>
    <button
      class="btn btn--danger btn--sm"
      type="button"
      hx-delete={`/ideas/${row.id}`}
      hx-confirm={`Delete "${row.title}"? This cannot be undone.`}
      hx-swap="none"
    >
      Delete
    </button>
  </div>
);

export const IDEA_TABLE_COLUMNS: ColumnDef[] = [
  {
    key: "title",
    label: "Title",
    sortable: true,
    render: (v, row) => (
      <a href={`/ideas/${row.id}`}>
        <Highlight text={String(v)} q={row._q as string} />
      </a>
    ),
  },
  {
    key: "status",
    label: "Status",
    sortable: true,
    render: statusBadgeRenderer(IDEA_STATUS_VARIANTS),
  },
  {
    key: "category",
    label: "Category",
    sortable: true,
  },
  {
    key: "priority",
    label: "Priority",
    sortable: true,
    render: (v) => {
      if (!v) return "";
      return (
        <span
          class={`badge badge--${
            IDEA_PRIORITY_VARIANTS[String(v)] ?? "neutral"
          }`}
        >
          {IDEA_PRIORITY_LABELS[String(v)] ?? String(v)}
        </span>
      );
    },
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
    key: "linkCount",
    label: "Links",
    sortable: true,
  },
  { key: "_actions", label: "", render: actionBtns },
];

export const IDEA_STATUS_OPTIONS = IDEA_STATUSES.map((s) => ({
  value: s,
  label: s,
}));

export const IDEA_PRIORITY_OPTIONS = IDEA_PRIORITIES.map((p) => ({
  value: p,
  label: IDEA_PRIORITY_LABELS[p] ?? p,
}));

export const IDEA_FORM_FIELDS: FieldDef[] = [
  {
    type: "text",
    name: "title",
    label: "Title",
    required: true,
    maxLength: 200,
  },
  {
    type: "select",
    name: "status",
    label: "Status",
    options: IDEA_STATUS_OPTIONS,
  },
  {
    type: "text",
    name: "category",
    label: "Category",
    placeholder: "e.g. feature, enhancement, research",
  },
  {
    type: "select",
    name: "priority",
    label: "Priority",
    options: IDEA_PRIORITY_OPTIONS,
  },
  {
    type: "autocomplete",
    name: "project",
    label: "Project",
    source: "portfolio",
    placeholder: "Search projects...",
  },
  { type: "date", name: "startDate", label: "Start date" },
  { type: "date", name: "endDate", label: "End date" },
  {
    type: "text",
    name: "resources",
    label: "Resources",
    placeholder: "e.g. 2 devs, API budget",
  },
  {
    type: "tags",
    name: "subtasks",
    label: "Subtasks",
    placeholder: "Type and press Enter...",
  },
  {
    type: "tags",
    name: "links",
    label: "Linked ideas",
    source: "ideas-by-id",
    placeholder: "Search ideas...",
  },
  { type: "textarea", name: "description", label: "Description", rows: 4 },
];

export function ideaToRow(i: Idea): Record<string, unknown> {
  return {
    id: i.id,
    title: i.title,
    status: i.status,
    category: i.category ?? "",
    priority: i.priority ?? "",
    project: i.project ?? "",
    startDate: i.startDate ?? "",
    endDate: i.endDate ?? "",
    resources: i.resources ?? "",
    linkCount: i.links?.length ?? 0,
  };
}
