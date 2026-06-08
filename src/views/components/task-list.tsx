// Task list view — section-grouped task rows with sticky headers.
// Uses shared groupBy + getSectionOrder() for ordering.

import type { FC } from "hono/jsx";
import type { Task, TaskViewProps } from "../../types/task.types.ts";
import type { DomainFilterState } from "../../factories/domain.types.ts";
import { getSectionOrder } from "../../constants/mod.ts";
import { groupBy } from "../../utils/group.ts";
import { formatDate } from "../../utils/time.ts";
import { EmptyState } from "../../components/ui/empty-state.tsx";
import {
  sortTasksInSection,
  TASK_PRIORITY_LABELS,
  TASK_SORTABLE_COLS,
} from "../../domains/task/constants.tsx";
import { SectionLoadMore } from "./task-pagination.tsx";

// ---------------------------------------------------------------------------
// Task row
// ---------------------------------------------------------------------------

type PeopleOption = { value: string; label: string };

export const TaskRow: FC<
  {
    task: Task;
    peopleOptions?: PeopleOption[];
    moveSections: string[];
    index: number;
    archived?: boolean;
  }
> = (
  { task, peopleOptions, moveSections, index, archived },
) => (
  <div
    // Stable id so idiomorph keys this row by identity during the SSE morph of
    // #tasks-view. Without it idiomorph soft-matches rows positionally and, when
    // assigning re-sorts the list, reconciles each row's <select> against a
    // different task's markup — scrambling the view and resetting the assignee
    // select the user just used (the source of the spurious empty-assignee POST).
    id={`task-row-${task.id}`}
    class={`task-list__row${
      task.completed ? " task-list__row--completed" : ""
    }`}
    data-task-id={task.id}
    data-order={task.order != null ? task.order : (index + 1) * 10}
    data-tags={JSON.stringify(task.tags ?? [])}
  >
    <input type="hidden" name="sid" value={task.id} />
    <input
      type="checkbox"
      class="task-list__select"
      name="taskId"
      value={task.id}
      aria-label={`Select ${task.title}`}
      data-task-id={task.id}
    />
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
                id={`assignee-${task.id}`}
                class="form__select form__select--sm"
                hx-post={`/tasks/${task.id}/assign`}
                hx-swap="none"
                hx-trigger="change"
                hx-include="this"
                // Override the hx-params="sid,reorderSection" inherited from the
                // SortableJS reorder container below — without this, htmx filters
                // the POST body down to sid/reorderSection and drops `assignee`,
                // so the server unassigns ("Unassigned" toast).
                hx-params="assignee"
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
        <span
          class="task-list__meta task-list__meta--project"
          data-col="project"
        >
          {task.project ?? ""}
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
      {archived
        ? (
          <>
            <button
              class="btn btn--secondary btn--sm"
              type="button"
              hx-post={`/tasks/${task.id}/restore`}
              hx-swap="none"
            >
              Restore
            </button>
            <button
              class="btn btn--secondary btn--sm"
              type="button"
              data-copy
              data-copy-value={`/tasks/${task.id}`}
              aria-label="Copy link to task"
            >
              Link
            </button>
            <button
              class="btn btn--danger btn--sm"
              type="button"
              hx-post={`/tasks/${task.id}/destroy`}
              hx-confirm={`Permanently delete "${task.title}"? This cannot be undone — the file will be removed from disk.`}
              data-confirm-title="Delete permanently"
              data-confirm-label="Delete permanently"
              hx-swap="none"
            >
              Delete permanently
            </button>
          </>
        )
        : (
          <>
            <select
              id={`move-${task.id}`}
              class="form__select form__select--sm"
              hx-post={`/tasks/${task.id}/move`}
              hx-swap="none"
              hx-trigger="change"
              hx-include="this"
              // Override the inherited hx-params="sid,reorderSection" from the
              // SortableJS reorder container — otherwise `section` is filtered
              // out of the POST body and /move returns 400 (Missing section).
              hx-params="section"
              name="section"
              aria-label="Move section"
            >
              {moveSections.map((s) => (
                <option key={s} value={s} selected={s === task.section}>
                  {s}
                </option>
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
              class="btn btn--secondary btn--sm"
              type="button"
              data-copy
              data-copy-value={`/tasks/${task.id}`}
              aria-label="Copy link to task"
            >
              Link
            </button>
            <button
              class="btn btn--danger btn--sm"
              type="button"
              hx-delete={`/tasks/${task.id}`}
              hx-confirm={`Archive "${task.title}"? Archived items can be restored from the archived view.`}
              data-confirm-title="Archive"
              data-confirm-label="Archive"
              hx-swap="none"
            >
              Archive
            </button>
          </>
        )}
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
    <input
      type="checkbox"
      class="task-list__select-all-section"
      data-section={name}
      aria-label={`Select all ${name} tasks`}
    />
    <h2 class="section-heading">{name}</h2>
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
    <input
      type="checkbox"
      class="task-list__select task-list__select-all"
      aria-label="Select all tasks"
    />
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
  archived?: boolean;
  pageSize?: number;
  state?: DomainFilterState;
  /**
   * Move-target sections (configured order + every custom section across the
   * whole project). Computed by the caller from the COMPLETE task set — never
   * from the filtered/paginated `tasks` slice, or custom sections outside the
   * current view (e.g. Cancelled, Scope Creep) drop out of the dropdowns.
   */
  moveSections: string[];
};

export const TaskListView: FC<ListProps> = (
  {
    tasks,
    sort,
    order,
    peopleOptions,
    archived,
    pageSize,
    state,
    moveSections,
  },
) => {
  if (tasks.length === 0) {
    return <EmptyState message="No tasks match the current filters." />;
  }

  const grouped = groupBy(tasks, (t) => t.section, [...getSectionOrder()]);
  const sectionNames = Object.keys(grouped);

  return (
    <div class="task-list" data-column-table="tasks" data-sort={sort ?? ""}>
      <div class="task-list__sticky-header">
        <div class="task-list__header-controls">
          <SectionJumpBar sections={sectionNames} />
          <details class="column-toggle" data-column-toggle="tasks">
            <summary class="btn btn--secondary btn--sm">Columns</summary>
            <div class="column-toggle__panel">
              {[
                { key: "assignee", label: "Assignee" },
                { key: "milestone", label: "Milestone" },
                { key: "project", label: "Project" },
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
        const limit = pageSize && pageSize > 0 ? pageSize : sorted.length;
        const shown = sorted.slice(0, limit);
        const remaining = sorted.length - shown.length;
        return (
          <div key={name} class="task-list__section">
            <SectionHeader name={name} count={sorted.length} />
            <div
              class="task-list__rows"
              data-section={name}
              data-sortable
              data-sortable-group="task-list"
              data-sortable-item=".task-list__row"
              hx-post="/tasks/reorder"
              hx-trigger="end"
              hx-include="this"
              hx-params="sid,reorderSection"
              hx-swap="none"
            >
              <input type="hidden" name="reorderSection" value={name} />
              {shown.map((t, i) => (
                <TaskRow
                  key={t.id}
                  task={t}
                  peopleOptions={peopleOptions}
                  moveSections={moveSections}
                  index={i}
                  archived={archived}
                />
              ))}
              {remaining > 0 && state && (
                <SectionLoadMore
                  state={state}
                  section={name}
                  view="list"
                  offset={shown.length}
                  remaining={remaining}
                  pageSize={limit}
                />
              )}
            </div>
          </div>
        );
      })}
      <div
        id="task-bulk-bar"
        class="task-list__bulk-bar is-hidden"
        aria-live="polite"
      >
        <span class="task-list__bulk-count" id="task-bulk-count">
          0 selected
        </span>
        <select
          class="form__select form__select--sm"
          id="task-bulk-section"
          name="section"
          aria-label="Move selected to section"
        >
          <option value="">Move to…</option>
          {moveSections.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <button
          type="button"
          class="btn btn--secondary btn--sm"
          id="task-bulk-move"
          hx-post="/tasks/batch-move"
          hx-include=".task-list__select:checked, #task-bulk-section"
          hx-swap="none"
        >
          Move
        </button>
        <button
          type="button"
          class="btn btn--secondary btn--sm"
          id="task-bulk-complete"
          hx-post="/tasks/batch-complete"
          hx-include=".task-list__select:checked"
          hx-swap="none"
        >
          Mark complete
        </button>
        <button
          type="button"
          class="btn btn--danger btn--sm"
          id="task-bulk-delete"
          hx-post="/tasks/batch-delete"
          hx-include=".task-list__select:checked"
          hx-swap="none"
          hx-confirm="Delete the selected tasks? They can be restored from the archive."
        >
          Delete
        </button>
        <div class="task-list__bulk-tag-group">
          <input
            type="text"
            class="form__input form__input--sm"
            id="task-bulk-tag"
            name="tag"
            placeholder="Tag…"
            aria-label="Tag to add or remove"
            autocomplete="off"
          />
          <button
            type="button"
            class="btn btn--secondary btn--sm"
            id="task-bulk-tag-add"
            hx-post="/tasks/batch-tag"
            hx-include=".task-list__select:checked, #task-bulk-tag"
            hx-vals='{"mode": "add"}'
            hx-swap="none"
          >
            Add tag
          </button>
          <button
            type="button"
            class="btn btn--secondary btn--sm"
            id="task-bulk-tag-remove"
            hx-post="/tasks/batch-tag"
            hx-include=".task-list__select:checked, #task-bulk-tag"
            hx-vals='{"mode": "remove"}'
            hx-swap="none"
          >
            Remove tag
          </button>
        </div>
        <button
          type="button"
          class="btn btn--ghost btn--sm"
          id="task-bulk-clear"
          aria-label="Clear selection"
        >
          ✕
        </button>
      </div>
    </div>
  );
};
