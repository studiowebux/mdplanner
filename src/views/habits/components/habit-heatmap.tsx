// Habit tracker — BuJo-style monthly grid.
// Header row: day numbers above each column. Habit rows: plain squares.

import type { FC } from "hono/jsx";
import type { CompletionEntry, Habit } from "../../../types/habit.types.ts";
import { FormTextarea } from "../../components/form-textarea.tsx";

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

function currentMonthDays(): { date: string; day: number }[] {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const mm = String(month + 1).padStart(2, "0");
  return Array.from({ length: daysInMonth }, (_, i) => {
    const d = i + 1;
    return { date: `${year}-${mm}-${String(d).padStart(2, "0")}`, day: d };
  });
}

function todayStr(): string {
  return new Date().toLocaleDateString("en-CA");
}

function isDone(completedDates: CompletionEntry[], date: string): boolean {
  return completedDates.some((e) => e.date === date);
}

function noteFor(
  completedDates: CompletionEntry[],
  date: string,
): string | undefined {
  return completedDates.find((e) => e.date === date)?.note;
}

export const HabitHeatmapRow: FC<{
  habit: Habit;
  days: { date: string; day: number }[];
  today: string;
}> = ({ habit, days, today }) => (
  <div
    class="habit-heatmap__row"
    id={`hrow-${habit.id}`}
    data-habit-id={habit.id}
  >
    <a
      class="habit-heatmap__label"
      href={`/habits/${habit.id}`}
      title={habit.title}
    >
      {habit.title}
    </a>
    <div class="habit-heatmap__cells">
      {days.map(({ date }) => {
        const done = isDone(habit.completedDates, date);
        const note = noteFor(habit.completedDates, date);
        const isToday = date === today;
        const tooltip = note ? `${date} — ${note}` : date;
        return (
          <span
            key={date}
            class={`habit-heatmap__cell${
              isToday ? " habit-heatmap__cell--today" : ""
            }`}
            data-done={done ? "true" : "false"}
            data-date={date}
            title={tooltip}
            {...(done
              ? {
                "hx-post": `/habits/${habit.id}/toggle-date/${date}`,
                "hx-target": `#hrow-${habit.id}`,
                "hx-swap": "outerHTML",
              }
              : {})}
          />
        );
      })}
    </div>
  </div>
);

export const HabitHeatmap: FC<{ habits: Habit[] }> = ({ habits }) => {
  const days = currentMonthDays();
  const today = todayStr();
  const now = new Date();
  const monthLabel = `${
    MONTH_NAMES[now.getUTCMonth()]
  } ${now.getUTCFullYear()}`;

  return (
    <section class="habit-heatmap">
      <dialog id="habit-note-dialog" class="habit-note-dialog">
        <form
          id="habit-note-form"
          class="habit-note-form"
          hx-swap="outerHTML"
        >
          <p class="habit-note-form__title">Add a note (optional)</p>
          <FormTextarea
            id="habit-note-input"
            name="note"
            class="habit-note-form__textarea"
            placeholder="What did you do?"
            rows={3}
          />
          <div class="habit-note-form__actions">
            <button type="submit" class="btn btn--primary btn--sm">Save</button>
            <button
              type="button"
              id="habit-note-cancel"
              class="btn btn--ghost btn--sm"
            >
              Cancel
            </button>
          </div>
        </form>
      </dialog>
      <p class="habit-heatmap__month-title">{monthLabel}</p>

      {/* Day-number header — numbers sit above each column */}
      <div class="habit-heatmap__row habit-heatmap__row--header">
        <span class="habit-heatmap__label" />
        <div class="habit-heatmap__cells">
          {days.map(({ date, day }) => (
            <span
              key={date}
              class={`habit-heatmap__cell-num${
                date === today ? " habit-heatmap__cell-num--today" : ""
              }`}
            >
              {day}
            </span>
          ))}
        </div>
      </div>

      {habits.map((habit) => (
        <HabitHeatmapRow
          key={habit.id}
          habit={habit}
          days={days}
          today={today}
        />
      ))}
    </section>
  );
};
