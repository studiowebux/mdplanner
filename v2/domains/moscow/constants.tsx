import type { ColumnDef } from "../../components/ui/data-table.tsx";
import type { FieldDef } from "../../components/ui/form-builder.tsx";
import type { Moscow } from "../../types/moscow.types.ts";
import { createActionBtns } from "../../components/ui/action-btns.tsx";
import { Highlight } from "../../utils/highlight.tsx";
import { formatDate } from "../../utils/time.ts";

// ---------------------------------------------------------------------------
// Quadrant constants — shared with repository
// ---------------------------------------------------------------------------

export const MOSCOW_QUADRANTS = [
  "Must Have",
  "Should Have",
  "Could Have",
  "Won't Have",
] as const;

export type MoscowQuadrantKey = "must" | "should" | "could" | "wont";

/** Quadrant display metadata — label, singular, and CSS modifier. */
export const MOSCOW_QUADRANT_META: Record<
  MoscowQuadrantKey,
  { label: string; singular: string; modifier: string }
> = {
  must: { label: "Must Have", singular: "must-have item", modifier: "must" },
  should: {
    label: "Should Have",
    singular: "should-have item",
    modifier: "should",
  },
  could: {
    label: "Could Have",
    singular: "could-have item",
    modifier: "could",
  },
  wont: {
    label: "Won't Have",
    singular: "won't-have item",
    modifier: "wont",
  },
};

/** Maps frontmatter section heading prefixes to quadrant field keys. */
export const MOSCOW_SECTION_MAP: Record<string, MoscowQuadrantKey> = {
  "must": "must",
  "should": "should",
  "could": "could",
  "won": "wont",
  "wont": "wont",
};

export const MOSCOW_QUADRANT_KEYS: MoscowQuadrantKey[] = [
  "must",
  "should",
  "could",
  "wont",
];

// ---------------------------------------------------------------------------
// Table columns
// ---------------------------------------------------------------------------

const actionBtns = createActionBtns("moscow", "moscow-form-container");

export const MOSCOW_TABLE_COLUMNS: ColumnDef[] = [
  {
    key: "title",
    label: "Title",
    sortable: true,
    render: (v, row) => (
      <a href={`/moscow/${row.id}`}>
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
  { key: "mustCount", label: "M", sortable: true },
  { key: "shouldCount", label: "S", sortable: true },
  { key: "couldCount", label: "C", sortable: true },
  { key: "wontCount", label: "W", sortable: true },
  { key: "_actions", label: "", render: actionBtns },
];

// ---------------------------------------------------------------------------
// Form fields
// ---------------------------------------------------------------------------

export const MOSCOW_FORM_FIELDS: FieldDef[] = [
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

export function moscowToRow(m: Moscow): Record<string, unknown> {
  return {
    id: m.id,
    title: m.title,
    date: m.date,
    project: m.project ?? "",
    mustCount: m.must.length,
    shouldCount: m.should.length,
    couldCount: m.could.length,
    wontCount: m.wont.length,
  };
}
