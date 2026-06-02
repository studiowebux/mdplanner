import type { ColumnDef } from "../../components/ui/data-table.tsx";
import type { FieldDef } from "../../components/ui/form-builder.tsx";
import type { Reflection } from "../../types/reflection.types.ts";
import {
  REFLECTION_PERIOD_LABELS,
  REFLECTION_PERIODS,
} from "../../types/reflection.types.ts";
import { createActionBtns } from "../../components/ui/action-btns.tsx";
import { Highlight } from "../../utils/highlight.tsx";
import type { BadgeVariant } from "../../components/ui/status-badge.tsx";

// ---------------------------------------------------------------------------
// Period badge variants
// ---------------------------------------------------------------------------

export const REFLECTION_PERIOD_VARIANTS: Record<string, BadgeVariant> = {
  weekly: "teal",
  monthly: "info",
  quarterly: "warning",
  annual: "success",
};

// ---------------------------------------------------------------------------
// Period filter options
// ---------------------------------------------------------------------------

export const REFLECTION_PERIOD_OPTIONS = REFLECTION_PERIODS.map((p) => ({
  value: p,
  label: REFLECTION_PERIOD_LABELS[p],
}));

// ---------------------------------------------------------------------------
// Table columns
// ---------------------------------------------------------------------------

const actionBtns = createActionBtns(
  "reflections",
  "reflections-form-container",
);

export const REFLECTION_TABLE_COLUMNS: ColumnDef[] = [
  {
    key: "title",
    label: "Title",
    sortable: true,
    render: (v, row) => (
      <a href={`/reflections/${row.id}`}>
        <Highlight text={String(v)} q={row._q as string} />
      </a>
    ),
  },
  { key: "period", label: "Period", sortable: true },
  { key: "date", label: "Date", sortable: true },
  { key: "_actions", label: "", render: actionBtns },
];

// ---------------------------------------------------------------------------
// Form fields
// ---------------------------------------------------------------------------

export const REFLECTION_FORM_FIELDS: FieldDef[] = [
  {
    type: "text",
    name: "title",
    label: "Title",
    required: true,
    maxLength: 200,
  },
  {
    type: "select",
    name: "period",
    label: "Period",
    required: true,
    options: REFLECTION_PERIOD_OPTIONS,
  },
  {
    type: "date",
    name: "date",
    label: "Date",
    required: true,
  },
  {
    type: "autocomplete",
    name: "templateId",
    label: "Template",
    source: "reflection-templates-by-id",
    placeholder: "Search templates...",
  },
  {
    type: "textarea",
    name: "content",
    label: "Content",
    rows: 8,
  },
  {
    type: "tags",
    name: "tags",
    label: "Tags",
    placeholder: "Add tag and press Enter...",
  },
];

// ---------------------------------------------------------------------------
// Row mapper
// ---------------------------------------------------------------------------

export function reflectionToRow(r: Reflection): Record<string, unknown> {
  return {
    id: r.id,
    title: r.title,
    period: r.period,
    date: r.date,
  };
}
