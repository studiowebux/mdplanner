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
import { ArchivedBanner } from "./components/archived-banner.tsx";
import { EditModeToggle } from "./components/edit-mode-toggle.tsx";

const NotesSection: FC<{ habit: Habit }> = ({ habit }) => (
  <section class="detail-section">
    <h2 class="section-heading">Notes</h2>
    <div
      class="inline-editable"
      contenteditable
      data-inline-edit
      data-inline-original={habit.description ?? ""}
      data-inline-target="habit-description-value"
      data-inline-save-btn="habit-description-save"
    >
      {habit.description ?? ""}
    </div>
    <input
      type="hidden"
      id="habit-description-value"
      name="description"
      value={habit.description ?? ""}
    />
    <div class="inline-editable__actions">
      <button
        type="button"
        id="habit-description-save"
        class="btn btn--primary btn--sm is-hidden"
        hx-put={`/habits/${habit.id}/description?editing=true`}
        hx-include="#habit-description-value"
        hx-target="#habit-detail-root"
        hx-select="#habit-detail-root"
        hx-swap="outerHTML"
      >
        Save
      </button>
    </div>
  </section>
);

export const HabitDetailView: FC<
  ViewProps & { item: Habit; editing?: boolean }
> = (
  { item: habit, editing = false, ...viewProps },
) => {
  return (
    <MainLayout
      title={habit.title}
      {...viewProps}
      styles={["/css/views/habits.css"]}
      scripts={[
        "/js/habits-heatmap.js",
        "/js/habits-toggle.js",
        "/js/inline-edit.js",
      ]}
    >
      <SseRefresh
        getUrl={"/habits/" + habit.id + (editing ? "?editing=true" : "")}
        trigger="sse:habit.updated"
        targetId="habit-detail-root"
      />
      <main
        id="habit-detail-root"
        class={`detail-view habit-detail${
          editing ? " habit-detail--editing" : ""
        }`}
      >
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
            archived={habit.archived === true}
          >
            <EditModeToggle href={`/habits/${habit.id}`} editing={editing} />
          </DetailActions>
        </header>

        <ArchivedBanner entity={habit} />

        {/* Stats row */}
        <HabitStats habit={habit} />

        {/* Current month heatmap — shared component, includes day header + note dialog */}
        <HabitHeatmap habits={[habit]} />

        {/* Completion log */}
        <HabitCompletionLog habit={habit} />

        {editing
          ? <NotesSection habit={habit} />
          : <MarkdownSection title="Notes" markdown={habit.description} />}

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
