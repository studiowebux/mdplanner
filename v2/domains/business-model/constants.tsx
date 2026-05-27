import type { ColumnDef } from "../../components/ui/data-table.tsx";
import type { FieldDef } from "../../components/ui/form-builder.tsx";
import type { BusinessModel } from "../../types/business-model.types.ts";
import {
  BUSINESS_MODEL_SECTION_KEYS,
  type BusinessModelSectionKey,
} from "../../types/business-model.types.ts";
import { createActionBtns } from "../../components/ui/action-btns.tsx";
import { Highlight } from "../../utils/highlight.tsx";
import { formatDate } from "../../utils/time.ts";

// ---------------------------------------------------------------------------
// Section display metadata
// ---------------------------------------------------------------------------

export const BUSINESS_MODEL_SECTION_META: Record<
  BusinessModelSectionKey,
  { label: string; modifier: string; gridArea: string }
> = {
  keyPartners: {
    label: "Key Partners",
    modifier: "key-partners",
    gridArea: "kp",
  },
  keyActivities: {
    label: "Key Activities",
    modifier: "key-activities",
    gridArea: "ka",
  },
  keyResources: {
    label: "Key Resources",
    modifier: "key-resources",
    gridArea: "kr",
  },
  valueProposition: {
    label: "Value Proposition",
    modifier: "value-proposition",
    gridArea: "vp",
  },
  customerRelationships: {
    label: "Customer Relationships",
    modifier: "customer-relationships",
    gridArea: "cr",
  },
  channels: { label: "Channels", modifier: "channels", gridArea: "ch" },
  customerSegments: {
    label: "Customer Segments",
    modifier: "customer-segments",
    gridArea: "cs",
  },
  costStructure: {
    label: "Cost Structure",
    modifier: "cost-structure",
    gridArea: "co",
  },
  revenueStreams: {
    label: "Revenue Streams",
    modifier: "revenue-streams",
    gridArea: "re",
  },
};

// ---------------------------------------------------------------------------
// Table columns
// ---------------------------------------------------------------------------

const actionBtns = createActionBtns(
  "business-models",
  "business-models-form-container",
);

export const BUSINESS_MODEL_TABLE_COLUMNS: ColumnDef[] = [
  {
    key: "title",
    label: "Title",
    sortable: true,
    render: (v, row) => (
      <a href={`/business-models/${row.id}`}>
        <Highlight text={String(v)} q={row._q as string} />
      </a>
    ),
  },
  {
    key: "date",
    label: "Date",
    sortable: true,
    render: (v) => formatDate(v as string),
  },
  { key: "project", label: "Project", sortable: true },
  { key: "_actions", label: "", render: actionBtns },
];

// ---------------------------------------------------------------------------
// Form fields
// ---------------------------------------------------------------------------

// The 9 canvas section fields (keyPartners, keyActivities, keyResources,
// valueProposition, customerRelationships, channels, customerSegments,
// costStructure, revenueStreams) are edited in-place on the detail page
// (?editing=true). They are intentionally absent from this sidenav — saving
// them as raw textarea strings corrupts the data into single-character bullets
// (same root cause as the Lean Canvas fix in commit 47f4cf4).
export const BUSINESS_MODEL_FORM_FIELDS: FieldDef[] = [
  {
    type: "text",
    name: "title",
    label: "Title",
    required: true,
    maxLength: 200,
  },
  { type: "date", name: "date", label: "Date" },
  {
    type: "autocomplete",
    name: "project",
    label: "Project",
    source: "portfolio",
    placeholder: "Search projects...",
  },
  { type: "textarea", name: "notes", label: "Notes", rows: 3 },
];

// ---------------------------------------------------------------------------
// Row mapper
// ---------------------------------------------------------------------------

export function businessModelToRow(
  b: BusinessModel,
): Record<string, unknown> {
  const total = BUSINESS_MODEL_SECTION_KEYS.reduce(
    (sum, k) => sum + b[k].length,
    0,
  );
  return {
    id: b.id,
    title: b.title,
    date: b.date,
    project: b.project ?? "",
    total,
  };
}
