// Task domain view constants — table columns, row mapper, state keys.

import type { ColumnDef } from "../../components/ui/data-table.tsx";
import type { Task, TaskSortableCol } from "../../types/task.types.ts";
import { statusBadgeRenderer } from "../../components/ui/status-badge.tsx";
import { Highlight } from "../../utils/highlight.tsx";
import { formatDate } from "../../utils/time.ts";
import { toKebab } from "../../utils/slug.ts";
import {
  getSectionOrder,
  PRIORITY_LABELS,
  PRIORITY_OPTIONS,
} from "../../constants/mod.ts";

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
      return (
        <span class={`badge priority--${v}`}>
          {TASK_PRIORITY_LABELS[String(v)] ?? String(v)}
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
    render: (v, row) =>
      v
        ? (
          <a href={`/portfolio/${toKebab(String(v))}`}>
            <Highlight text={String(v)} q={row._q as string} />
          </a>
        )
        : "",
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
  "priority",
  "tags",
  "q",
  "hideCompleted",
  "sort",
  "order",
  "zoom",
] as const;

export const TASK_SORTABLE_COLS: TaskSortableCol[] = [
  { key: "assignee", label: "Assignee", cls: "task-list__meta--assignee" },
  { key: "milestone", label: "Milestone", cls: "task-list__meta--milestone" },
  { key: "due_date", label: "Due", cls: "task-list__meta--due" },
  { key: "effort", label: "Effort", cls: "task-list__meta--effort" },
];

export const TASK_PRIORITY_LABELS = PRIORITY_LABELS;
export const TASK_PRIORITY_OPTIONS = PRIORITY_OPTIONS;

/** Sort tasks by order, then priority, then title. */
export function sortTasks(tasks: Task[]): Task[] {
  return [...tasks].sort((a, b) => {
    if ((a.order ?? Infinity) !== (b.order ?? Infinity)) {
      return (a.order ?? Infinity) - (b.order ?? Infinity);
    }
    if ((a.priority ?? 5) !== (b.priority ?? 5)) {
      return (a.priority ?? 5) - (b.priority ?? 5);
    }
    return a.title.localeCompare(b.title);
  });
}

/** Sort tasks within a section — uses explicit sort/order when provided, falls back to default. */
export function sortTasksInSection(
  tasks: Task[],
  sort?: string,
  order?: string,
): Task[] {
  if (!sort) return sortTasks(tasks);
  const dir = order === "desc" ? -1 : 1;
  return [...tasks].sort((a, b) =>
    String((a as Record<string, unknown>)[sort] ?? "")
      .localeCompare(String((b as Record<string, unknown>)[sort] ?? "")) * dir
  );
}

/** Build section options dynamically from discovered task sections. */
export function buildSectionOptions(
  tasks: Task[],
): { value: string; label: string }[] {
  const seen = new Set<string>();
  for (const t of tasks) {
    seen.add(t.section);
  }
  const ordered: { value: string; label: string }[] = [];
  for (const s of getSectionOrder()) {
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
