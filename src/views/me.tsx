import type { FC } from "hono/jsx";
import { MainLayout } from "../components/layout/main.tsx";
import type { ViewProps } from "../types/app.ts";
import type { Person } from "../types/person.types.ts";
import type { Task } from "../types/task.types.ts";
import type { Goal } from "../types/goal.types.ts";
import type { Habit } from "../types/habit.types.ts";
import type { JournalEntry } from "../types/journal.types.ts";
import type { Meeting } from "../types/meeting.types.ts";
import { computeStreak, isDoneToday } from "../domains/habit/constants.tsx";
import { MyTasksChunk } from "./components/my-tasks-list.tsx";

type TimeEntryRow = {
  taskId: string;
  taskTitle: string;
  hours: number;
  date: string;
  description?: string;
};

type MeDashboardProps = ViewProps & {
  person: Person | null;
  tasks: Task[];
  goals: Goal[];
  habits: Habit[];
  todayJournal: JournalEntry | null;
  timeRows: TimeEntryRow[];
  meetings: Meeting[];
  pageSize: number;
};

export const MeDashboard: FC<MeDashboardProps> = ({
  person,
  tasks,
  goals,
  habits,
  todayJournal,
  timeRows,
  meetings,
  pageSize,
  ...viewProps
}) => {
  return (
    <MainLayout
      title="My Work"
      {...viewProps}
      styles={["/css/views/me.css"]}
    >
      <main class="me-dashboard">
        <h1 class="me-dashboard__title">My Work</h1>

        {!person
          ? (
            <div class="me-dashboard__no-person detail-section">
              <p>You're not linked to a person record yet.</p>
              <a href="/people" class="btn btn--primary">Go to People</a>
            </div>
          )
          : (
            <div class="me-dashboard__grid">
              {
                /* Git — my PRs, review-requested, assigned issues, CI.
                  Lazy-loaded so the page render is not blocked on the APIs. */
              }
              <section class="me-dashboard__card detail-section">
                <h2 class="me-dashboard__card-title">Git</h2>
                <div
                  id="me-git-section"
                  hx-get="/me/git"
                  hx-trigger="load"
                  hx-swap="innerHTML"
                >
                  <div class="loading-spinner" aria-label="Loading">
                    <div class="loading-spinner__ring" />
                  </div>
                </div>
              </section>

              {/* My Tasks */}
              {tasks.length > 0 && (
                <section class="me-dashboard__card detail-section">
                  <h2 class="me-dashboard__card-title">
                    My Tasks ({tasks.length})
                  </h2>
                  <ul class="me-dashboard__list">
                    <MyTasksChunk
                      tasks={tasks}
                      offset={0}
                      pageSize={pageSize}
                    />
                  </ul>
                </section>
              )}

              {/* My Goals */}
              {goals.length > 0 && (
                <section class="me-dashboard__card detail-section">
                  <h2 class="me-dashboard__card-title">My Goals</h2>
                  <ul class="me-dashboard__list">
                    {goals.map((g) => (
                      <li key={g.id} class="me-dashboard__item">
                        <a
                          href={`/goals/${g.id}`}
                          class="me-dashboard__item-link"
                        >
                          {g.title}
                        </a>
                        <span class="badge">{g.status}</span>
                      </li>
                    ))}
                  </ul>
                </section>
              )}

              {/* My Habits */}
              {habits.length > 0 && (
                <section class="me-dashboard__card detail-section">
                  <h2 class="me-dashboard__card-title">Habits</h2>
                  <ul class="me-dashboard__list">
                    {habits.map((h) => (
                      <li key={h.id} class="me-dashboard__item">
                        <a
                          href={`/habits/${h.id}`}
                          class="me-dashboard__item-link"
                        >
                          {h.title}
                        </a>
                        <div class="me-dashboard__item-meta">
                          <span class="badge">
                            {computeStreak(h.completedDates, h.frequency)}{" "}
                            streak
                          </span>
                          <span class="badge">
                            {isDoneToday(h.completedDates) ? "Done" : "Pending"}
                          </span>
                        </div>
                      </li>
                    ))}
                  </ul>
                </section>
              )}

              {/* Today's Journal */}
              <section class="me-dashboard__card detail-section">
                <h2 class="me-dashboard__card-title">Today's Journal</h2>
                {todayJournal
                  ? (
                    <a
                      href={`/journal/${todayJournal.id}`}
                      class="me-dashboard__item-link"
                    >
                      {todayJournal.title}
                    </a>
                  )
                  : (
                    <button
                      type="button"
                      class="btn btn--secondary btn--sm"
                      hx-get="/journal/new"
                      hx-target="#journal-form-container"
                      hx-swap="innerHTML"
                    >
                      Write today's entry
                    </button>
                  )}
              </section>

              {/* Time This Week */}
              {timeRows.length > 0 && (
                <section class="me-dashboard__card detail-section">
                  <h2 class="me-dashboard__card-title">Time This Week</h2>
                  <p class="me-dashboard__total">
                    {Math.round(
                      timeRows.reduce((s, r) => s + r.hours, 0) * 100,
                    ) / 100} hrs total
                  </p>
                  <ul class="me-dashboard__list">
                    {timeRows.map((r) => (
                      <li key={r.taskId + r.date} class="me-dashboard__item">
                        <a
                          href={`/tasks/${r.taskId}`}
                          class="me-dashboard__item-link"
                        >
                          {r.taskTitle}
                        </a>
                        <span class="me-dashboard__item-meta">
                          {r.hours}h · {r.date}
                        </span>
                      </li>
                    ))}
                  </ul>
                </section>
              )}

              {/* Upcoming Meetings */}
              {meetings.length > 0 && (
                <section class="me-dashboard__card detail-section">
                  <h2 class="me-dashboard__card-title">Upcoming Meetings</h2>
                  <ul class="me-dashboard__list">
                    {meetings.map((m) => (
                      <li key={m.id} class="me-dashboard__item">
                        <a
                          href={`/meetings/${m.id}`}
                          class="me-dashboard__item-link"
                        >
                          {m.title}
                        </a>
                        <span class="badge">{m.date}</span>
                      </li>
                    ))}
                  </ul>
                </section>
              )}
            </div>
          )}
      </main>
      <div id="journal-form-container" />
    </MainLayout>
  );
};
