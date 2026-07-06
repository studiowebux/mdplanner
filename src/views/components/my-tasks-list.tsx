// My Work "My Tasks" card pagination. The card renders only `pageSize` tasks and
// emits a MyTasksLoadMore control (GET /me/tasks/more) while more remain. The
// control targets itself and swaps outerHTML, so the fragment's rows append in
// place of the button (it is always the last child). Sorting is single-sourced
// in `sortMyTasks` so the initial render and the fragment never drift.

import type { FC } from "hono/jsx";
import type { Task } from "../../types/task.types.ts";
import { PRIORITY_LABELS } from "../../constants/mod.ts";

/** Sections surfaced on My Work — actionable work only, no Backlog/Done. */
export const MY_ACTIVE_SECTIONS = ["Todo", "In Progress", "Pending Review"];

/**
 * Quick-scan order: priority ascending (1 = highest, null → 5), then due_date
 * ascending (null → last), then title. Used by both the initial render and the
 * /me/tasks/more fragment so pagination slices a stable list.
 */
export function sortMyTasks(tasks: Task[]): Task[] {
  return [...tasks].sort((a, b) => {
    if ((a.priority ?? 5) !== (b.priority ?? 5)) {
      return (a.priority ?? 5) - (b.priority ?? 5);
    }
    const ad = a.due_date ?? "9999-12-31";
    const bd = b.due_date ?? "9999-12-31";
    if (ad !== bd) return ad.localeCompare(bd);
    return a.title.localeCompare(b.title);
  });
}

const MyTasksItem: FC<{ task: Task }> = ({ task }) => (
  <li class="me-dashboard__item">
    <a href={`/tasks/${task.id}`} class="me-dashboard__item-link">
      {task.title}
    </a>
    <div class="me-dashboard__item-meta">
      <span class="badge">{task.section}</span>
      {task.priority && (
        <span class={`badge priority--${task.priority}`}>
          {PRIORITY_LABELS[String(task.priority)] ?? `P${task.priority}`}
        </span>
      )}
      {task.due_date && <span class="badge">Due {task.due_date}</span>}
    </div>
  </li>
);

/**
 * "Load more" control for the My Tasks card. `hx-params="none"` keeps the GET
 * clean — `offset` is the only parameter and it is already in the URL.
 */
const MyTasksLoadMore: FC<{
  offset: number;
  remaining: number;
  pageSize: number;
}> = ({ offset, remaining, pageSize }) => (
  <button
    type="button"
    class="task-load-more task-load-more--list"
    hx-get={`/me/tasks/more?offset=${offset}`}
    hx-target="this"
    hx-swap="outerHTML"
    hx-params="none"
  >
    Load {Math.min(remaining, pageSize)} more
  </button>
);

/**
 * One page of My Tasks: the `pageSize` items starting at `offset`, plus a fresh
 * load-more control while more remain. `tasks` must be pre-sorted via
 * `sortMyTasks`. Rendered inside the card's `<ul>` for the initial page and
 * returned standalone by the /me/tasks/more fragment.
 */
export const MyTasksChunk: FC<{
  tasks: Task[];
  offset: number;
  pageSize: number;
}> = ({ tasks, offset, pageSize }) => {
  const chunk = tasks.slice(offset, offset + pageSize);
  const nextOffset = offset + chunk.length;
  const remaining = tasks.length - nextOffset;
  return (
    <>
      {chunk.map((t) => <MyTasksItem key={t.id} task={t} />)}
      {remaining > 0 && (
        <MyTasksLoadMore
          offset={nextOffset}
          remaining={remaining}
          pageSize={pageSize}
        />
      )}
    </>
  );
};
