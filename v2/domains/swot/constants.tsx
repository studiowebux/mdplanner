import type { ColumnDef } from "../../components/ui/data-table.tsx";
import type { FieldDef } from "../../components/ui/form-builder.tsx";
import type { Swot } from "../../types/swot.types.ts";
import { createActionBtns } from "../../components/ui/action-btns.tsx";
import { Highlight } from "../../utils/highlight.tsx";
import { formatDate } from "../../utils/time.ts";

// ---------------------------------------------------------------------------
// Quadrant constants — shared with repository
// ---------------------------------------------------------------------------

export const SWOT_QUADRANTS = [
  "Strengths",
  "Weaknesses",
  "Opportunities",
  "Threats",
] as const;

export type SwotQuadrantKey =
  | "strengths"
  | "weaknesses"
  | "opportunities"
  | "threats";

/** Quadrant display metadata — label, singular, and CSS modifier. */
export const SWOT_QUADRANT_META: Record<
  SwotQuadrantKey,
  { label: string; singular: string; modifier: string }
> = {
  strengths: {
    label: "Strengths",
    singular: "strength",
    modifier: "strengths",
  },
  weaknesses: {
    label: "Weaknesses",
    singular: "weakness",
    modifier: "weaknesses",
  },
  opportunities: {
    label: "Opportunities",
    singular: "opportunity",
    modifier: "opportunities",
  },
  threats: { label: "Threats", singular: "threat", modifier: "threats" },
};

/** Maps lowercase heading prefixes to quadrant field keys. */
export const SWOT_SECTION_MAP: Record<string, SwotQuadrantKey> = {
  strength: "strengths",
  weakness: "weaknesses",
  opportunit: "opportunities",
  threat: "threats",
};

// ---------------------------------------------------------------------------
// Table columns
// ---------------------------------------------------------------------------

const actionBtns = createActionBtns("swot", "swot-form-container");

export const SWOT_TABLE_COLUMNS: ColumnDef[] = [
  {
    key: "title",
    label: "Title",
    sortable: true,
    render: (v, row) => (
      <a href={`/swot/${row.id}`}>
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
  { key: "strengthCount", label: "S", sortable: true },
  { key: "weaknessCount", label: "W", sortable: true },
  { key: "opportunityCount", label: "O", sortable: true },
  { key: "threatCount", label: "T", sortable: true },
  { key: "_actions", label: "", render: actionBtns },
];

// ---------------------------------------------------------------------------
// Form fields
// ---------------------------------------------------------------------------

export const SWOT_FORM_FIELDS: FieldDef[] = [
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
  { type: "textarea", name: "notes", label: "Notes", rows: 4 },
];

// ---------------------------------------------------------------------------
// Row mapper
// ---------------------------------------------------------------------------

export function swotToRow(s: Swot): Record<string, unknown> {
  return {
    id: s.id,
    title: s.title,
    date: s.date,
    project: s.project ?? "",
    strengthCount: s.strengths.length,
    weaknessCount: s.weaknesses.length,
    opportunityCount: s.opportunities.length,
    threatCount: s.threats.length,
  };
}
