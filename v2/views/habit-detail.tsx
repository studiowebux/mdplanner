import type { FC } from "hono/jsx";
import { MainLayout } from "../components/layout/main.tsx";
import { BackButton } from "./components/back-button.tsx";
import type { Habit } from "../types/habit.types.ts";
import { HABIT_FREQUENCY_LABELS } from "../types/habit.types.ts";
import type { ViewProps } from "../types/app.ts";
import { MarkdownSection } from "./components/markdown-section.tsx";
import { SseRefresh } from "./components/sse-refresh.tsx";
import { InfoItem } from "./components/info-item.tsx";
import { AuditMeta } from "./components/audit-meta.tsx";
import { badgeClass } from "../components/ui/status-badge.tsx";
import {
  computeLongestStreak,
  computeStreak,
  computeThisMonth,
  HABIT_FREQUENCY_VARIANTS,
  lastCompleted,
} from "../domains/habit/constants.tsx";
import { HabitHeatmap } from "./habits/components/habit-heatmap.tsx";
import { DetailActions } from "./components/detail-actions.tsx";
import { periodDenominator } from "../domains/habit/constants.tsx";

export const HabitDetailView: FC<ViewProps & { item: Habit }> = (
  { item: habit, ...viewProps },
) => {
  const streak = computeStreak(habit.completedDates, habit.frequency);
  const longestStreak = computeLongestStreak(
    habit.completedDates,
    habit.frequency,
  );
  const thisMonth = computeThisMonth(habit.completedDates);
  const allTime = habit.completedDates.length;
  const lastDone = lastCompleted(habit.completedDates);
  const completionsSorted = [...habit.completedDates].sort((a, b) =>
    b.date.localeCompare(a.date)
  );

  return (
    <MainLayout
      title={habit.title}
      {...viewProps}
      styles={["/css/views/habits.css"]}
      scripts={["/js/habits-heatmap.js", "/js/habits-toggle.js"]}
    >
      <SseRefresh
        getUrl={"/habits/" + habit.id}
        trigger="sse:habit.updated"
        targetId="habit-detail-root"
      />
      <main id="habit-detail-root" class="detail-view habit-detail">
        <BackButton href="/habits" label="Back to Habits" />

        <header class="detail-section detail-header habit-detail__header">
          <div>
            <h1 class="detail-title">{habit.title}</h1>
            <div class="habit-detail__badges">
              <span
                class={badgeClass(HABIT_FREQUENCY_VARIANTS, habit.frequency)}
              >
                {HABIT_FREQUENCY_LABELS[habit.frequency]}
              </span>
              {habit.tags &&
                habit.tags.map((tag) => (
                  <span key={tag} class="badge">{tag}</span>
                ))}
            </div>
          </div>
          <DetailActions
            entity="habits"
            id={habit.id}
            title={habit.title}
            formContainerId="habits-form-container"
            onDeleteRedirect="/habits"
          />
        </header>

        {/* Stats row */}
        <div class="detail-section detail-info-row">
          <InfoItem label="Streak">
            <span class="habit-streak">{streak}</span>
          </InfoItem>
          <InfoItem label="Longest streak">
            <span class="habit-streak">{longestStreak}</span>
          </InfoItem>
          <InfoItem label="This month">
            {thisMonth} / {periodDenominator(habit.frequency)}
          </InfoItem>
          <InfoItem label="All time">{String(allTime)}</InfoItem>
          <InfoItem label="Last completed">{lastDone}</InfoItem>
          <InfoItem label="Frequency">
            {HABIT_FREQUENCY_LABELS[habit.frequency]}
          </InfoItem>
        </div>

        {/* Current month heatmap — shared component, includes day header + note dialog */}
        <HabitHeatmap habits={[habit]} />

        {/* Completion log */}
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
                    hx-target="#habit-detail-root"
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

        <MarkdownSection title="Notes" markdown={habit.description} />

        <AuditMeta
          createdAt={habit.createdAt}
          updatedAt={habit.updatedAt}
          createdBy={habit.createdBy}
          updatedBy={habit.updatedBy}
        />
      </main>

      <div id="habits-form-container" />
    </MainLayout>
  );
};
