// Task board view — kanban columns grouped by section.

import type { FC } from "hono/jsx";
import type { Task, TaskViewProps } from "../../types/task.types.ts";
import { getSectionOrder } from "../../constants/mod.ts";
import { groupBy } from "../../utils/group.ts";
import { EmptyState } from "../../components/ui/empty-state.tsx";
import {
  sortTasks,
  TASK_PRIORITY_LABELS,
} from "../../domains/task/constants.tsx";
import {
  taskMilestoneByName,
  taskPersonById,
} from "../../domains/task/config.tsx";
import { toKebab } from "../../utils/slug.ts";
import { dueIn } from "../../utils/time.ts";

// ---------------------------------------------------------------------------
// Board card
// ---------------------------------------------------------------------------

const BoardCard: FC<{ task: Task }> = ({ task }) => {
  const deadline = task.due_date ? dueIn(task.due_date) : "";
  const isOverdue = deadline.includes("overdue");
  const assigneeName = task.assignee
    ? (taskPersonById[task.assignee] ?? task.assignee)
    : "";
  const initials = assigneeName
    ? assigneeName.split(/\s+/).map((w) => w[0]).slice(0, 2).join("")
      .toUpperCase()
    : "";
  const childCount = task.children?.length ?? 0;

  return (
    <div
      class={`task-board__card${
        task.completed ? " task-board__card--completed" : ""
      }`}
      data-task-id={task.id}
    >
      <a class="task-board__card-title" href={`/tasks/${task.id}`}>
        {task.title}
      </a>

      <div class="task-board__card-meta">
        {task.project && (
          <a
            class="task-board__card-project"
            href={`/portfolio/${toKebab(task.project)}`}
          >
            {task.project}
          </a>
        )}
        <span
          class={`task-board__card-due${
            isOverdue ? " task-board__card-due--overdue" : ""
          }`}
        >
          {deadline || "no deadline"}
        </span>
      </div>

      <div class="task-board__card-footer">
        <div class="task-board__card-left">
          {task.priority && (
            <span class={`badge priority--${task.priority}`}>
              {TASK_PRIORITY_LABELS[String(task.priority)] ??
                `P${task.priority}`}
            </span>
          )}
          {task.milestone && (
            <a
              class="badge task-board__card-indicator"
              href={taskMilestoneByName[task.milestone]
                ? `/milestones/${taskMilestoneByName[task.milestone]}`
                : `/milestones?q=${encodeURIComponent(task.milestone)}`}
              title={task.milestone}
            >
              M
            </a>
          )}
          {childCount > 0 && (
            <span
              class="badge task-board__card-indicator"
              title={`${childCount} subtask${childCount !== 1 ? "s" : ""}`}
            >
              {childCount}
            </span>
          )}
        </div>
        {initials
          ? (
            <a
              class="badge task-board__card-avatar"
              href={`/people/${task.assignee}`}
              title={assigneeName}
            >
              {initials}
            </a>
          )
          : <span class="task-board__card-unassigned">--</span>}
      </div>
    </div>
  );
};

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
    return <EmptyState message="No tasks match the current filters." />;
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
