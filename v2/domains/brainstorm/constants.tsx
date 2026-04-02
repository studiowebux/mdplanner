import type { ColumnDef } from "../../components/ui/data-table.tsx";
import type { FieldDef } from "../../components/ui/form-builder.tsx";
import type { Brainstorm } from "../../types/brainstorm.types.ts";
import { Highlight } from "../../utils/highlight.tsx";
import { formatDate } from "../../utils/time.ts";

// ---------------------------------------------------------------------------
// Action buttons
// ---------------------------------------------------------------------------

const actionBtns = (_value: unknown, row: Record<string, unknown>) => (
  <div class="domain-card__actions">
    <a class="btn btn--secondary btn--sm" href={`/brainstorms/${row.id}`}>
      View
    </a>
    <button
      class="btn btn--secondary btn--sm"
      type="button"
      hx-get={`/brainstorms/${row.id}/edit`}
      hx-target="#brainstorms-form-container"
      hx-swap="innerHTML"
    >
      Edit
    </button>
    <button
      class="btn btn--danger btn--sm"
      type="button"
      hx-delete={`/brainstorms/${row.id}`}
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

export const BRAINSTORM_TABLE_COLUMNS: ColumnDef[] = [
  {
    key: "title",
    label: "Title",
    sortable: true,
    render: (v, row) => (
      <a href={`/brainstorms/${row.id}`}>
        <Highlight text={String(v)} q={row._q as string} />
      </a>
    ),
  },
  {
    key: "questionCount",
    label: "Questions",
    sortable: true,
  },
  {
    key: "tagsDisplay",
    label: "Tags",
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

export const BRAINSTORM_FORM_FIELDS: FieldDef[] = [
  {
    type: "text",
    name: "title",
    label: "Title",
    required: true,
    maxLength: 200,
  },
  {
    type: "tags",
    name: "tags",
    label: "Tags",
    placeholder: "Add tag and press Enter...",
  },
  {
    type: "tags",
    name: "linkedProjects",
    label: "Linked Projects",
    placeholder: "Project name...",
  },
  {
    type: "tags",
    name: "linkedTasks",
    label: "Linked Tasks",
    placeholder: "task_...",
  },
  {
    type: "tags",
    name: "linkedGoals",
    label: "Linked Goals",
    placeholder: "goal_...",
  },
  {
    type: "array-table",
    name: "questions",
    label: "Question",
    section: "brainstorm_questions",
    addLabel: "Add question",
    itemFields: [
      {
        type: "text",
        name: "question",
        label: "Question",
        placeholder: "What do you want to explore?",
      },
      {
        type: "textarea",
        name: "answer",
        label: "Answer",
        rows: 3,
        placeholder: "Answer...",
      },
    ],
  },
];

// ---------------------------------------------------------------------------
// Row mapper
// ---------------------------------------------------------------------------

export function brainstormToRow(b: Brainstorm): Record<string, unknown> {
  return {
    id: b.id,
    title: b.title,
    questionCount: b.questions.length,
    tagsDisplay: b.tags?.join(", ") ?? "",
    createdAtDisplay: formatDate(b.createdAt),
  };
}
