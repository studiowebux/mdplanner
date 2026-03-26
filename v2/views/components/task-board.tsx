// Task board view — kanban columns grouped by section.
// Uses shared groupBy + sortTasks from constants.

import type { FC } from "hono/jsx";
import type { Task, TaskViewProps } from "../../types/task.types.ts";
import { getSectionOrder } from "../../constants/mod.ts";
import { groupBy } from "../../utils/group.ts";
import {
  sortTasks,
  TASK_PRIORITY_LABELS,
} from "../../domains/task/constants.tsx";

// ---------------------------------------------------------------------------
// Board card
// ---------------------------------------------------------------------------

const BoardCard: FC<{ task: Task }> = ({ task }) => (
  <div
    class={`task-board__card${
      task.completed ? " task-board__card--completed" : ""
    }`}
    data-task-id={task.id}
  >
    <div class="task-board__card-header">
      {task.priority && (
        <span class={`badge task-priority task-priority--${task.priority}`}>
          {TASK_PRIORITY_LABELS[String(task.priority)] ?? `P${task.priority}`}
        </span>
      )}
      <a class="task-board__card-title" href={`/tasks/${task.id}`}>
        {task.title}
      </a>
    </div>
    <div class="task-board__card-meta">
      {task.assignee
        ? (
          <a
            class="task-board__card-assignee"
            href={`/people?q=${encodeURIComponent(task.assignee)}`}
            target="_blank"
          >
            {task.assignee}
          </a>
        )
        : <span class="task-board__card-unassigned">Unassigned</span>}
      {task.due_date && (
        <span class="task-board__card-due">{task.due_date}</span>
      )}
    </div>
    {task.tags && task.tags.length > 0 && (
      <div class="task-board__card-tags">
        {task.tags.map((tag) => (
          <span key={tag} class="task-list__tag">{tag}</span>
        ))}
      </div>
    )}
  </div>
);

// ---------------------------------------------------------------------------
// Board column
// ---------------------------------------------------------------------------

const BoardColumn: FC<{ name: string; tasks: Task[] }> = ({ name, tasks }) => (
  <div class="task-board__column" data-section={name}>
    <div class="task-board__column-header">
      <h3 class="task-board__column-title">{name}</h3>
      <span class="task-board__column-count">{tasks.length}</span>
    </div>
    <div class="task-board__column-body">
      {tasks.map((t) => <BoardCard key={t.id} task={t} />)}
      {tasks.length === 0 && (
        <div class="task-board__column-empty">No tasks</div>
      )}
    </div>
  </div>
);

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export const TaskBoardView: FC<TaskViewProps> = ({ tasks }) => {
  if (tasks.length === 0) {
    return (
      <div class="task-board__empty">
        No tasks match the current filters.
      </div>
    );
  }

  const grouped = groupBy(tasks, (t) => t.section, [...getSectionOrder()]);

  return (
    <div class="task-board">
      {Object.entries(grouped).map(([name, items]) => (
        <BoardColumn key={name} name={name} tasks={sortTasks(items)} />
      ))}
    </div>
  );
};
