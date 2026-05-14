import type { ColumnDef } from "../../components/ui/data-table.tsx";
import type { FieldDef } from "../../components/ui/form-builder.tsx";
import type { Risk } from "../../types/risk.types.ts";
import { RISK_CATEGORIES, RISK_STATUSES } from "../../types/risk.types.ts";
import { createActionBtns } from "../../components/ui/action-btns.tsx";
import { Highlight } from "../../utils/highlight.tsx";
import { toKebab } from "../../utils/slug.ts";
import {
  type BadgeVariant,
  statusBadgeRenderer,
} from "../../components/ui/status-badge.tsx";

// ---------------------------------------------------------------------------
// Status → shared badge variant (used by table renderer)
// ---------------------------------------------------------------------------

export const RISK_STATUS_VARIANTS: Record<string, BadgeVariant> = {
  open: "error",
  mitigated: "warning",
  accepted: "teal",
  closed: "success",
};

// ---------------------------------------------------------------------------
// Table columns
// ---------------------------------------------------------------------------

const actionBtns = createActionBtns("risks", "risks-form-container");

export const RISK_TABLE_COLUMNS: ColumnDef[] = [
  {
    key: "title",
    label: "Title",
    sortable: true,
    render: (v, row) => (
      <a href={`/risks/${row.id}`}>
        <Highlight text={String(v)} q={row._q as string} />
      </a>
    ),
  },
  { key: "category", label: "Category", sortable: true },
  { key: "likelihood", label: "Likelihood", sortable: true },
  { key: "impact", label: "Impact", sortable: true },
  {
    key: "status",
    label: "Status",
    sortable: true,
    render: statusBadgeRenderer(RISK_STATUS_VARIANTS),
  },
  {
    key: "project",
    label: "Project",
    sortable: true,
    render: (v) =>
      v ? <a href={`/portfolio/${toKebab(String(v))}`}>{String(v)}</a> : "",
  },
  { key: "_actions", label: "", render: actionBtns },
];

// ---------------------------------------------------------------------------
// Form fields
// ---------------------------------------------------------------------------

export const RISK_FORM_FIELDS: FieldDef[] = [
  {
    type: "text",
    name: "title",
    label: "Title",
    required: true,
    maxLength: 200,
  },
  {
    type: "select",
    name: "category",
    label: "Category",
    required: true,
    options: RISK_CATEGORIES.map((c) => ({ value: c, label: c })),
  },
  {
    type: "select",
    name: "likelihood",
    label: "Likelihood (1–5)",
    required: true,
    options: [1, 2, 3, 4, 5].map((n) => ({ value: String(n), label: String(n) })),
  },
  {
    type: "select",
    name: "impact",
    label: "Impact (1–5)",
    required: true,
    options: [1, 2, 3, 4, 5].map((n) => ({ value: String(n), label: String(n) })),
  },
  {
    type: "select",
    name: "status",
    label: "Status",
    required: true,
    options: RISK_STATUSES.map((s) => ({ value: s, label: s })),
  },
  {
    type: "textarea",
    name: "description",
    label: "Description",
    rows: 3,
  },
  {
    type: "textarea",
    name: "mitigation",
    label: "Mitigation Plan",
    rows: 3,
  },
  {
    type: "text",
    name: "owner",
    label: "Owner",
  },
  {
    type: "autocomplete",
    name: "project",
    label: "Project",
    source: "portfolio",
    placeholder: "Search projects...",
  },
  {
    type: "text",
    name: "tags",
    label: "Tags (comma-separated)",
  },
];

// ---------------------------------------------------------------------------
// Row mapper
// ---------------------------------------------------------------------------

export function riskToRow(r: Risk): Record<string, unknown> {
  return {
    id: r.id,
    title: r.title,
    category: r.category,
    likelihood: r.likelihood,
    impact: r.impact,
    status: r.status,
    project: r.project ?? "",
  };
}
