import type { ColumnDef } from "../../components/ui/data-table.tsx";
import type { FieldDef } from "../../components/ui/form-builder.tsx";
import type { Brief } from "../../types/brief.types.ts";
import { BRIEF_SECTIONS } from "../../types/brief.types.ts";
import { Highlight } from "../../utils/highlight.tsx";
import { formatDate } from "../../utils/time.ts";

// ---------------------------------------------------------------------------
// Action buttons
// ---------------------------------------------------------------------------

const actionBtns = (_value: unknown, row: Record<string, unknown>) => (
  <div class="domain-card__actions">
    <a class="btn btn--secondary btn--sm" href={`/briefs/${row.id}`}>
      View
    </a>
    <button
      class="btn btn--secondary btn--sm"
      type="button"
      hx-get={`/briefs/${row.id}/edit`}
      hx-target="#briefs-form-container"
      hx-swap="innerHTML"
    >
      Edit
    </button>
    <button
      class="btn btn--danger btn--sm"
      type="button"
      hx-delete={`/briefs/${row.id}`}
      hx-confirm={`Delete "${row.title}"? This cannot be undone.`}
      hx-swap="none"
    >
      Delete
    </button>
  </div>
);

// ---------------------------------------------------------------------------
// Table columns
// ---------------------------------------------------------------------------

export const BRIEF_TABLE_COLUMNS: ColumnDef[] = [
  {
    key: "title",
    label: "Title",
    sortable: true,
    render: (v, row) => (
      <a href={`/briefs/${row.id}`}>
        <Highlight text={String(v)} q={row._q as string} />
      </a>
    ),
  },
  {
    key: "date",
    label: "Date",
    sortable: true,
  },
  {
    key: "sectionCount",
    label: "Sections",
    sortable: true,
  },
  {
    key: "createdAtDisplay",
    label: "Created",
    sortable: true,
  },
  { key: "_actions", label: "", render: actionBtns },
];

// ---------------------------------------------------------------------------
// Form fields
// ---------------------------------------------------------------------------

export const BRIEF_FORM_FIELDS: FieldDef[] = [
  {
    type: "text",
    name: "title",
    label: "Title",
    required: true,
    maxLength: 200,
  },
  {
    type: "date",
    name: "date",
    label: "Date",
  },
  ...BRIEF_SECTIONS.map((s) => ({
    type: "textarea" as const,
    name: s.key,
    label: s.label,
    rows: 4,
  })),
];

// ---------------------------------------------------------------------------
// Row mapper
// ---------------------------------------------------------------------------

/** Count how many sections have content. */
function countSections(b: Brief): number {
  let count = 0;
  for (const s of BRIEF_SECTIONS) {
    const val = b[s.key as keyof Brief] as string[] | undefined;
    if (val && val.length > 0) count++;
  }
  return count;
}

export function briefToRow(b: Brief): Record<string, unknown> {
  return {
    id: b.id,
    title: b.title,
    date: b.date ?? "",
    sectionCount: `${countSections(b)}/${BRIEF_SECTIONS.length}`,
    createdAtDisplay: formatDate(b.createdAt),
  };
}
