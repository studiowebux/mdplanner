import type { ColumnDef } from "../../components/ui/data-table.tsx";
import type { FieldDef } from "../../components/ui/form-builder.tsx";
import type { StickyNote } from "../../types/sticky-note.types.ts";
import { formatDate } from "../../utils/time.ts";

// ---------------------------------------------------------------------------
// Colors
// ---------------------------------------------------------------------------

export const STICKY_NOTE_COLORS = [
  "yellow",
  "pink",
  "blue",
  "green",
  "purple",
  "orange",
] as const;

export type StickyNoteColor = (typeof STICKY_NOTE_COLORS)[number];

export const STICKY_NOTE_COLOR_OPTIONS = STICKY_NOTE_COLORS.map((c) => ({
  value: c,
  label: c.charAt(0).toUpperCase() + c.slice(1),
}));

// ---------------------------------------------------------------------------
// Table
// ---------------------------------------------------------------------------

function actionBtns(_value: unknown, row: Record<string, unknown>) {
  return (
    <div class="domain-card__actions">
      <button
        class="btn btn--secondary btn--sm"
        type="button"
        hx-get={`/sticky-notes/${row.id}/edit`}
        hx-target="#sticky-notes-form-container"
        hx-swap="innerHTML"
      >
        Edit
      </button>
      <button
        class="btn btn--danger btn--sm"
        type="button"
        hx-delete={`/sticky-notes/${row.id}`}
        hx-confirm={`Delete this note? This cannot be undone.`}
        hx-swap="none"
      >
        Delete
      </button>
    </div>
  );
}

export const STICKY_NOTE_TABLE_COLUMNS: ColumnDef[] = [
  {
    key: "content",
    label: "Content",
    sortable: true,
    render: (v) => {
      const text = String(v ?? "");
      return text.length > 80 ? text.slice(0, 80) + "…" : text;
    },
  },
  {
    key: "color",
    label: "Color",
    sortable: true,
    render: (v) => (
      <span class={`sticky-note-color-dot sticky-note-color-dot--${v}`}>
        {String(v ?? "")}
      </span>
    ),
  },
  {
    key: "createdAt",
    label: "Created",
    sortable: true,
    render: (v) => formatDate(v as string),
  },
  { key: "_actions", label: "", render: actionBtns },
];

// ---------------------------------------------------------------------------
// Form
// ---------------------------------------------------------------------------

export const STICKY_NOTE_FORM_FIELDS: FieldDef[] = [
  {
    type: "textarea",
    name: "content",
    label: "Content",
    required: true,
    rows: 4,
  },
  {
    type: "select",
    name: "color",
    label: "Color",
    options: STICKY_NOTE_COLOR_OPTIONS,
  },
];

// ---------------------------------------------------------------------------
// Row mapper
// ---------------------------------------------------------------------------

export function stickyNoteToRow(note: StickyNote): Record<string, unknown> {
  return {
    id: note.id,
    content: note.content,
    color: note.color,
    createdAt: note.createdAt,
  };
}
