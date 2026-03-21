// Task list view — section-grouped task rows with sticky headers.
// Uses shared groupBy + SECTION_DISPLAY_ORDER for ordering.

import type { FC } from "hono/jsx";
import type { Task, TaskViewProps } from "../../types/task.types.ts";
import { SECTION_DISPLAY_ORDER } from "../../constants/mod.ts";
import { groupBy } from "../../utils/group.ts";
import { formatDate } from "../../utils/time.ts";
import {
  sortTasks,
  TASK_PRIORITY_LABELS,
} from "../../domains/task/constants.tsx";

// ---------------------------------------------------------------------------
// Task row
// ---------------------------------------------------------------------------

const TaskRow: FC<{ task: Task }> = ({ task }) => (
  <div
    class={`task-list__row${
      task.completed ? " task-list__row--completed" : ""
    }`}
    data-task-id={task.id}
  >
    <div class="task-list__row-main">
      <div class="task-list__row-left">
        {task.priority && (
          <span class={`task-priority task-priority--${task.priority}`}>
            {TASK_PRIORITY_LABELS[String(task.priority)] ?? `P${task.priority}`}
          </span>
        )}
        <a class="task-list__row-title" href={`/tasks/${task.id}`}>
          {task.title}
        </a>
        {task.tags?.map((tag) => (
          <span key={tag} class="task-list__tag">{tag}</span>
        ))}
      </div>
      <div class="task-list__row-right">
        <span class="task-list__meta task-list__meta--assignee">
          {task.assignee
            ? (
              <a
                href={`/people?q=${encodeURIComponent(task.assignee)}`}
                target="_blank"
                class="task-list__assignee-link"
              >
                {task.assignee}
              </a>
            )
            : ""}
        </span>
        <span class="task-list__meta task-list__meta--milestone">
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
        <span class="task-list__meta task-list__meta--due">
          {task.due_date ? formatDate(task.due_date) : ""}
        </span>
        <span class="task-list__meta task-list__meta--effort">
          {task.effort != null ? `${task.effort}d` : ""}
        </span>
      </div>
    </div>
    <div class="task-list__row-actions">
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
        hx-swap="none"
        hx-confirm-dialog={`Delete "${task.title}"? This cannot be undone.`}
        data-confirm-name={task.title}
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

const ColumnHeader: FC = () => (
  <div class="task-list__row task-list__column-header" aria-hidden="true">
    <div class="task-list__row-main">
      <div class="task-list__row-left">
        <span class="task-list__column-label">Task</span>
      </div>
      <div class="task-list__row-right">
        <span class="task-list__meta task-list__meta--assignee">Assignee</span>
        <span class="task-list__meta task-list__meta--milestone">Milestone</span>
        <span class="task-list__meta task-list__meta--due">Due</span>
        <span class="task-list__meta task-list__meta--effort">Effort</span>
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

export const TaskListView: FC<TaskViewProps> = ({ tasks }) => {
  if (tasks.length === 0) {
    return (
      <div class="task-list__empty">
        No tasks match the current filters.
      </div>
    );
  }

  const grouped = groupBy(tasks, (t) => t.section, [...SECTION_DISPLAY_ORDER]);
  const sectionNames = Object.keys(grouped);

  return (
    <div class="task-list">
      <div class="task-list__sticky-header">
        {sectionNames.length > 1 && <SectionJumpBar sections={sectionNames} />}
        <ColumnHeader />
      </div>
      {sectionNames.map((name) => {
        const sorted = sortTasks(grouped[name]);
        return (
          <div key={name} class="task-list__section">
            <SectionHeader name={name} count={sorted.length} />
            <div class="task-list__rows">
              {sorted.map((t) => <TaskRow key={t.id} task={t} />)}
            </div>
          </div>
        );
      })}
    </div>
  );
};
