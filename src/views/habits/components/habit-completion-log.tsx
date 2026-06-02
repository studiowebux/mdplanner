// Habit completion log — sorted list of completed dates with per-entry notes
// and a Remove action. Wrapped in a stable #habit-log container so it can be
// OOB-swapped from the toggle/completion endpoints (target exists even when
// the habit has no completions yet).

import type { FC } from "hono/jsx";
import type { Habit } from "../../../types/habit.types.ts";

export const HabitCompletionLog: FC<{ habit: Habit; oob?: boolean }> = (
  { habit, oob },
) => {
  const completionsSorted = [...habit.completedDates].sort((a, b) =>
    b.date.localeCompare(a.date)
  );

  return (
    <div id="habit-log" {...(oob ? { "hx-swap-oob": "true" } : {})}>
      {completionsSorted.length > 0 && (
        <section class="detail-section">
          <h2 class="detail-section-title">Completion Log</h2>
          <div class="habit-completion-log">
            {completionsSorted.map((entry) => (
              <div key={entry.date} class="habit-completion-log__entry">
                <span class="habit-completion-log__date">{entry.date}</span>
                {entry.note && (
                  <span class="habit-completion-log__note">{entry.note}</span>
                )}
                <button
                  type="button"
                  class="btn btn--danger btn--sm"
                  hx-delete={`/habits/${habit.id}/completion/${entry.date}`}
                  hx-target={`#hrow-${habit.id}`}
                  hx-swap="outerHTML"
                  hx-confirm={`Remove completion for ${entry.date}?`}
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
};
