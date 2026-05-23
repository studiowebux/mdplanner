import type { FC } from "hono/jsx";
import { MainLayout } from "../components/layout/main.tsx";
import { BackButton } from "./components/back-button.tsx";
import { Breadcrumb } from "../components/ui/breadcrumb.tsx";
import type { Habit } from "../types/habit.types.ts";
import { HABIT_FREQUENCY_LABELS } from "../types/habit.types.ts";
import type { ViewProps } from "../types/app.ts";
import { MarkdownSection } from "./components/markdown-section.tsx";
import { SseRefresh } from "./components/sse-refresh.tsx";
import { AuditMeta } from "./components/audit-meta.tsx";
import { badgeClass } from "../components/ui/status-badge.tsx";
import { HABIT_FREQUENCY_VARIANTS } from "../domains/habit/constants.tsx";
import { HabitHeatmap } from "./habits/components/habit-heatmap.tsx";
import { HabitStats } from "./habits/components/habit-stats.tsx";
import { HabitCompletionLog } from "./habits/components/habit-completion-log.tsx";
import { DetailActions } from "./components/detail-actions.tsx";

export const HabitDetailView: FC<ViewProps & { item: Habit }> = (
  { item: habit, ...viewProps },
) => {
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
        <Breadcrumb
          items={[
            { label: "Habits", href: "/habits" },
            { label: habit.title },
          ]}
        />
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
        <HabitStats habit={habit} />

        {/* Current month heatmap — shared component, includes day header + note dialog */}
        <HabitHeatmap habits={[habit]} />

        {/* Completion log */}
        <HabitCompletionLog habit={habit} />

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
