// Task list view — section-grouped task rows with sticky headers.
// Uses shared groupBy + getSectionOrder() for ordering.

import type { FC } from "hono/jsx";
import type { Task, TaskViewProps } from "../../types/task.types.ts";
import { getSectionOrder } from "../../constants/mod.ts";
import { groupBy } from "../../utils/group.ts";
import { formatDate } from "../../utils/time.ts";
import {
  sortTasksInSection,
  TASK_PRIORITY_LABELS,
  TASK_SORTABLE_COLS,
} from "../../domains/task/constants.tsx";

// ---------------------------------------------------------------------------
// Task row
// ---------------------------------------------------------------------------

type PeopleOption = { value: string; label: string };

const TaskRow: FC<{ task: Task; peopleOptions?: PeopleOption[] }> = (
  { task, peopleOptions },
) => (
  <div
    class={`task-list__row${
      task.completed ? " task-list__row--completed" : ""
    }`}
    data-task-id={task.id}
  >
    <div class="task-list__row-main">
      <div class="task-list__row-left">
        {task.priority && (
          <span class={`badge priority--${task.priority}`}>
            {TASK_PRIORITY_LABELS[String(task.priority)] ?? `P${task.priority}`}
          </span>
        )}
        <a class="task-list__row-title" href={`/tasks/${task.id}`}>
          {task.title}
        </a>
      </div>
      <div class="task-list__row-right">
        <span
          class="task-list__meta task-list__meta--assignee"
          data-col="assignee"
        >
          {peopleOptions && peopleOptions.length > 0
            ? (
              <select
                class="form__select form__select--sm"
                hx-post={`/tasks/${task.id}/assign`}
                hx-swap="none"
                hx-trigger="change"
                hx-include="this"
                name="assignee"
                aria-label="Assign"
              >
                <option value="">Unassigned</option>
                {peopleOptions.map((p) => (
                  <option
                    key={p.value}
                    value={p.value}
                    selected={p.value === task.assignee}
                  >
                    {p.label}
                  </option>
                ))}
              </select>
            )
            : (task.assignee ?? "")}
        </span>
        <span
          class="task-list__meta task-list__meta--milestone"
          data-col="milestone"
        >
          {task.milestone
            ? (
              <a
                href={`/milestones?q=${encodeURIComponent(task.milestone)}`}
                target="_blank"
                class="task-list__milestone-link"
              >
                {task.milestone}
              </a>
            )
            : ""}
        </span>
        <span class="task-list__meta task-list__meta--due" data-col="due">
          {task.due_date ? formatDate(task.due_date) : ""}
        </span>
        <span class="task-list__meta task-list__meta--effort" data-col="effort">
          {task.effort != null ? `${task.effort}d` : ""}
        </span>
      </div>
    </div>
    <div class="task-list__row-actions">
      <select
        class="form__select form__select--sm"
        hx-post={`/tasks/${task.id}/move`}
        hx-swap="none"
        hx-trigger="change"
        hx-include="this"
        name="section"
        aria-label="Move section"
      >
        {(getSectionOrder() as readonly string[]).map((s) => (
          <option key={s} value={s} selected={s === task.section}>{s}</option>
        ))}
      </select>
      <button
        class="btn btn--secondary btn--sm"
        type="button"
        hx-get={`/tasks/${task.id}/edit`}
        hx-target="#tasks-form-container"
        hx-swap="innerHTML"
      >
        Edit
      </button>
      <button
        class="btn btn--danger btn--sm"
        type="button"
        hx-delete={`/tasks/${task.id}`}
        hx-confirm={`Delete "${task.title}"? This cannot be undone.`}
        hx-swap="none"
      >
        Delete
      </button>
    </div>
  </div>
);

// ---------------------------------------------------------------------------
// Section header
// ---------------------------------------------------------------------------

const SectionHeader: FC<{ name: string; count: number }> = (
  { name, count },
) => (
  <div
    class="task-list__section-header"
    id={`section-${name.toLowerCase().replace(/\s+/g, "-")}`}
  >
    <h2 class="task-list__section-title">{name}</h2>
    <span class="task-list__section-count">{count}</span>
  </div>
);

// ---------------------------------------------------------------------------
// Column header — labels for the row-right metadata columns
// ---------------------------------------------------------------------------

const SortIndicator = (
  { active, order }: { active: boolean; order?: string },
) => {
  if (!active) return null;
  return (
    <span class="task-list__sort-arrow">
      {order === "desc" ? " \u25BC" : " \u25B2"}
    </span>
  );
};

const ColumnHeader: FC<{ sort?: string; order?: string }> = (
  { sort, order },
) => (
  <div class="task-list__row task-list__column-header" aria-hidden="true">
    <div class="task-list__row-main">
      <div class="task-list__row-left">
        <span
          class={`task-list__column-label task-list__column-label--sortable${
            sort === "title" ? " task-list__column-label--sorted" : ""
          }`}
          hx-get={`/tasks/view?sort=title&order=${
            sort === "title" && order === "asc" ? "desc" : "asc"
          }`}
          hx-target="#tasks-view"
          hx-swap="outerHTML swap:100ms"
          hx-include="#tasks-toolbar"
        >
          Task
          <SortIndicator active={sort === "title"} order={order} />
        </span>
      </div>
      <div class="task-list__row-right">
        {TASK_SORTABLE_COLS.map((col) => {
          const active = sort === col.key;
          const nextOrder = active && order === "asc" ? "desc" : "asc";
          return (
            <span
              key={col.key}
              data-col={col.cls.replace("task-list__meta--", "")}
              class={`task-list__meta ${col.cls} task-list__column-label--sortable${
                active ? " task-list__column-label--sorted" : ""
              }`}
              hx-get={`/tasks/view?sort=${col.key}&order=${nextOrder}`}
              hx-target="#tasks-view"
              hx-swap="outerHTML swap:100ms"
              hx-include="#tasks-toolbar"
            >
              {col.label}
              <SortIndicator active={active} order={order} />
            </span>
          );
        })}
      </div>
    </div>
    <div class="task-list__row-actions task-list__column-label">Actions</div>
  </div>
);

// ---------------------------------------------------------------------------
// Section jump bar
// ---------------------------------------------------------------------------

const SectionJumpBar: FC<{ sections: string[] }> = ({ sections }) => (
  <nav class="task-list__jump-bar" aria-label="Jump to section">
    {sections.map((s) => (
      <a
        key={s}
        class="task-list__jump-pill"
        href={`#section-${s.toLowerCase().replace(/\s+/g, "-")}`}
      >
        {s}
      </a>
    ))}
  </nav>
);

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

type ListProps = TaskViewProps & {
  sort?: string;
  order?: string;
  peopleOptions?: { value: string; label: string }[];
};

export const TaskListView: FC<ListProps> = (
  { tasks, sort, order, peopleOptions },
) => {
  if (tasks.length === 0) {
    return (
      <div class="task-list__empty">
        No tasks match the current filters.
      </div>
    );
  }

  const grouped = groupBy(tasks, (t) => t.section, [...getSectionOrder()]);
  const sectionNames = Object.keys(grouped);

  return (
    <div class="task-list" data-column-table="tasks">
      <div class="task-list__sticky-header">
        <div class="task-list__header-controls">
          {sectionNames.length > 1 && (
            <SectionJumpBar
              sections={sectionNames}
            />
          )}
          <details class="column-toggle" data-column-toggle="tasks">
            <summary class="btn btn--secondary btn--sm">Columns</summary>
            <div class="column-toggle__panel">
              {[
                { key: "assignee", label: "Assignee" },
                { key: "milestone", label: "Milestone" },
                { key: "due", label: "Due" },
                { key: "effort", label: "Effort" },
              ].map((col) => (
                <label key={col.key} class="column-toggle__item">
                  <input type="checkbox" checked data-column-key={col.key} />
                  {col.label}
                </label>
              ))}
            </div>
          </details>
        </div>
        <ColumnHeader sort={sort} order={order} />
      </div>
      {sectionNames.map((name) => {
        const sorted = sortTasksInSection(grouped[name], sort, order);
        return (
          <div key={name} class="task-list__section">
            <SectionHeader name={name} count={sorted.length} />
            <div class="task-list__rows">
              {sorted.map((t) => (
                <TaskRow key={t.id} task={t} peopleOptions={peopleOptions} />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
};
