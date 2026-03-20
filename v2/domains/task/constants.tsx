// Task domain view constants — table columns, row mapper, state keys.

import type { ColumnDef } from "../../components/ui/data-table.tsx";
import type { Task } from "../../types/task.types.ts";
import { statusBadgeRenderer } from "../../components/ui/status-badge.tsx";
import { Highlight } from "../../utils/highlight.tsx";
import { formatDate } from "../../utils/time.ts";
import { SECTION_DISPLAY_ORDER } from "../../constants/mod.ts";

const actionBtns = (_value: unknown, row: Record<string, unknown>) => (
  <div class="task-card__actions">
    <a class="btn btn--secondary btn--sm" href={`/tasks/${row.id}`}>
      View
    </a>
    <button
      class="btn btn--secondary btn--sm"
      type="button"
      hx-get={`/tasks/${row.id}/edit`}
      hx-target="#tasks-form-container"
      hx-swap="innerHTML"
    >
      Edit
    </button>
    <button
      class="btn btn--danger btn--sm"
      type="button"
      hx-delete={`/tasks/${row.id}`}
      hx-swap="none"
      hx-confirm-dialog={`Delete "${row.title}"? This cannot be undone.`}
      data-confirm-name={String(row.title)}
    >
      Delete
    </button>
  </div>
);

export const TASK_TABLE_COLUMNS: ColumnDef[] = [
  {
    key: "title",
    label: "Title",
    sortable: true,
    render: (v, row) => (
      <a href={`/tasks/${row.id}`}>
        <Highlight text={String(v)} q={row._q as string} />
      </a>
    ),
  },
  {
    key: "section",
    label: "Section",
    sortable: true,
    render: statusBadgeRenderer("task-card__badge"),
  },
  {
    key: "priority",
    label: "Priority",
    sortable: true,
    render: (v) => {
      if (!v) return "";
      const labels: Record<string, string> = {
        "1": "P1", "2": "P2", "3": "P3", "4": "P4", "5": "P5",
      };
      return (
        <span class={`task-priority task-priority--${v}`}>
          {labels[String(v)] ?? String(v)}
        </span>
      );
    },
  },
  { key: "assignee", label: "Assignee", sortable: true },
  {
    key: "tags",
    label: "Tags",
    render: (v) => String(v),
  },
  { key: "milestone", label: "Milestone", sortable: true },
  {
    key: "due_date",
    label: "Due",
    sortable: true,
    render: (v) => formatDate(v as string),
  },
  { key: "effort", label: "Effort", sortable: true },
  {
    key: "project",
    label: "Project",
    sortable: true,
    render: (v, row) => <Highlight text={String(v)} q={row._q as string} />,
  },
  { key: "_actions", label: "", render: actionBtns },
];

export const TASK_DOMAIN = "tasks";

export const TASK_STATE_KEYS = [
  "view",
  "section",
  "project",
  "milestone",
  "assignee",
  "q",
  "hideCompleted",
  "sort",
  "order",
] as const;

export const TASK_PRIORITY_OPTIONS = [
  { value: "1", label: "P1 — Critical" },
  { value: "2", label: "P2 — High" },
  { value: "3", label: "P3 — Medium" },
  { value: "4", label: "P4 — Low" },
  { value: "5", label: "P5 — Minimal" },
];

/** Build section options dynamically from discovered task sections. */
export function buildSectionOptions(
  tasks: Task[],
): { value: string; label: string }[] {
  const seen = new Set<string>();
  for (const t of tasks) {
    seen.add(t.section);
  }
  const ordered: { value: string; label: string }[] = [];
  for (const s of SECTION_DISPLAY_ORDER) {
    if (seen.has(s)) {
      ordered.push({ value: s, label: s });
      seen.delete(s);
    }
  }
  for (const s of [...seen].sort()) {
    ordered.push({ value: s, label: s });
  }
  return ordered;
}

export function taskToRow(t: Task): Record<string, unknown> {
  return {
    id: t.id,
    title: t.title,
    section: t.section,
    priority: t.priority ?? "",
    assignee: t.assignee ?? "",
    tags: t.tags?.join(", ") ?? "",
    milestone: t.milestone ?? "",
    due_date: t.due_date ?? "",
    effort: t.effort ?? "",
    project: t.project ?? "",
    completed: t.completed,
  };
}
