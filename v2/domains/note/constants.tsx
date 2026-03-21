import type { ColumnDef } from "../../components/ui/data-table.tsx";
import type { Note } from "../../types/note.types.ts";
import { Highlight } from "../../utils/highlight.tsx";
import { formatDate, timeAgo } from "../../utils/time.ts";

const actionBtns = (_value: unknown, row: Record<string, unknown>) => (
  <div class="note-card__actions">
    <a class="btn btn--secondary btn--sm" href={`/notes/${row.id}`}>
      View
    </a>
    <button
      class="btn btn--secondary btn--sm"
      type="button"
      hx-get={`/notes/${row.id}/edit`}
      hx-target="#notes-form-container"
      hx-swap="innerHTML"
    >
      Edit
    </button>
    <button
      class="btn btn--danger btn--sm"
      type="button"
      hx-delete={`/notes/${row.id}`}
      hx-swap="none"
      hx-confirm-dialog={`Delete "${row.title}"? This cannot be undone.`}
      data-confirm-name={String(row.title)}
    >
      Delete
    </button>
  </div>
);

export const NOTE_TABLE_COLUMNS: ColumnDef[] = [
  {
    key: "title",
    label: "Title",
    sortable: true,
    render: (v, row) => (
      <a href={`/notes/${row.id}`}>
        <Highlight text={String(v)} q={row._q as string} />
      </a>
    ),
  },
  {
    key: "project",
    label: "Project",
    sortable: true,
    render: (v, row) => <Highlight text={String(v)} q={row._q as string} />,
  },
  {
    key: "updatedAt",
    label: "Updated",
    sortable: true,
    render: (v) => formatDate(v as string),
  },
  {
    key: "age",
    label: "Age",
    render: (_, row) => timeAgo(row.createdAt as string),
  },
  { key: "_actions", label: "", render: actionBtns },
];

export function noteToRow(n: Note): Record<string, unknown> {
  return {
    id: n.id,
    title: n.title,
    project: n.project ?? "",
    createdAt: n.createdAt,
    updatedAt: n.updatedAt,
  };
}
