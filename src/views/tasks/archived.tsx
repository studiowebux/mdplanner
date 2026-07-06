// Monthly task archive — browse board-archived Done tasks grouped by month,
// with a manual sweep form and per-task restore. Board-archived tasks are off
// the active board but still in search + analytics (decision note_1782350432340).

import type { FC } from "hono/jsx";
import { MainLayout } from "../../components/layout/main.tsx";
import type { ViewProps } from "../../types/app.ts";
import type { Task } from "../../types/task.types.ts";

type Props = ViewProps & {
  tasks: Task[];
  defaultMonth: string;
};

/** Group archived tasks by archivedMonth, newest month first. */
function byMonth(tasks: Task[]): [string, Task[]][] {
  const groups = new Map<string, Task[]>();
  for (const t of tasks) {
    const month = t.archivedMonth ?? "unknown";
    const list = groups.get(month) ?? [];
    list.push(t);
    groups.set(month, list);
  }
  return [...groups.entries()].sort((a, b) => b[0].localeCompare(a[0]));
}

export const TaskArchivedView: FC<Props> = ({
  tasks,
  defaultMonth,
  ...viewProps
}) => {
  const months = byMonth(tasks);
  return (
    <MainLayout
      title="Archived Tasks"
      {...viewProps}
      activePath="/tasks"
      styles={["/css/views/tasks.css"]}
    >
      <main class="task-archive">
        <div class="task-archive__head">
          <h1 class="task-archive__title">Archived Tasks ({tasks.length})</h1>
          <a class="btn btn--secondary btn--sm" href="/tasks">
            ← Back to board
          </a>
        </div>

        <form
          class="task-archive__sweep"
          hx-post="/tasks/sweep-done"
          hx-swap="none"
        >
          <label class="form__label" for="sweep-before">
            Archive all Done completed before
          </label>
          <input
            type="month"
            id="sweep-before"
            name="before"
            class="form__input"
            value={defaultMonth}
            required
          />
          <button
            type="submit"
            class="btn btn--primary btn--sm"
            data-confirm-title="Archive Done tasks"
            data-confirm-label="Archive"
            hx-confirm="Move every Done task completed before this month into the monthly archive?"
          >
            Sweep
          </button>
        </form>

        {months.length === 0
          ? <p class="task-archive__empty">No archived tasks yet.</p>
          : (
            months.map(([month, monthTasks]) => (
              <section key={month} class="task-archive__month">
                <h2 class="task-archive__month-title">
                  {month} ({monthTasks.length})
                </h2>
                <ul class="task-archive__list">
                  {monthTasks.map((t) => (
                    <li
                      key={t.id}
                      id={`archived-task-${t.id}`}
                      class="task-archive__item"
                    >
                      <a
                        class="task-archive__item-link"
                        href={`/tasks/${t.id}`}
                      >
                        {t.title}
                      </a>
                      <button
                        type="button"
                        class="btn btn--secondary btn--sm"
                        hx-post={`/tasks/${t.id}/board-restore`}
                        hx-target={`#archived-task-${t.id}`}
                        hx-swap="outerHTML"
                      >
                        Restore
                      </button>
                    </li>
                  ))}
                </ul>
              </section>
            ))
          )}
      </main>
    </MainLayout>
  );
};
