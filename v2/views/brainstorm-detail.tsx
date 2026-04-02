import type { FC } from "hono/jsx";
import { MainLayout } from "../components/layout/main.tsx";
import { BackButton } from "./components/back-button.tsx";
import type { Brainstorm } from "../types/brainstorm.types.ts";
import type { ViewProps } from "../types/app.ts";
import { formatDate } from "../utils/time.ts";
import { DetailActions } from "./components/detail-actions.tsx";
import { SseRefresh } from "./components/sse-refresh.tsx";

// ---------------------------------------------------------------------------
// Main view
// ---------------------------------------------------------------------------

export const BrainstormDetailView: FC<
  ViewProps & { item: Brainstorm }
> = (
  { item: brainstorm, ...viewProps },
) => {
  const hasTags = brainstorm.tags && brainstorm.tags.length > 0;
  const hasLinks = (brainstorm.linkedProjects?.length ?? 0) > 0 ||
    (brainstorm.linkedTasks?.length ?? 0) > 0 ||
    (brainstorm.linkedGoals?.length ?? 0) > 0;

  return (
    <MainLayout
      title={brainstorm.title}
      {...viewProps}
      styles={["/css/views/brainstorms.css"]}
    >
      <SseRefresh
        getUrl={"/brainstorms/" + brainstorm.id}
        trigger="sse:brainstorm.updated"
        targetId="brainstorm-detail-root"
      />
      <main id="brainstorm-detail-root" class="detail-view brainstorm-detail">
        <BackButton href="/brainstorms" label="Back to Brainstorms" />

        {/* -- Header ---------------------------------------------------- */}
        <header class="detail-section brainstorm-detail__header">
          <div class="detail-title-row brainstorm-detail__title-row">
            <h1 class="detail-title brainstorm-detail__title">
              {brainstorm.title}
            </h1>
          </div>
          <DetailActions
            entity="brainstorms"
            id={brainstorm.id}
            title={brainstorm.title}
            formContainerId="brainstorms-form-container"
          />
        </header>

        {/* -- Tags ------------------------------------------------------ */}
        {hasTags && (
          <div class="detail-section brainstorm-detail__tags">
            {brainstorm.tags!.map((tag) => (
              <span key={tag} class="badge badge--sm badge--neutral">
                {tag}
              </span>
            ))}
          </div>
        )}

        {/* -- Links ----------------------------------------------------- */}
        {hasLinks && (
          <div class="detail-section brainstorm-detail__links">
            {brainstorm.linkedProjects?.map((p) => (
              <span key={p} class="brainstorm-detail__link">
                <span class="brainstorm-detail__link-type">Project</span>
                {p}
              </span>
            ))}
            {brainstorm.linkedTasks?.map((t) => (
              <a key={t} href={`/tasks/${t}`} class="brainstorm-detail__link">
                <span class="brainstorm-detail__link-type">Task</span>
                {t}
              </a>
            ))}
            {brainstorm.linkedGoals?.map((g) => (
              <a key={g} href={`/goals/${g}`} class="brainstorm-detail__link">
                <span class="brainstorm-detail__link-type">Goal</span>
                {g}
              </a>
            ))}
          </div>
        )}

        {/* -- Questions ------------------------------------------------- */}
        <section class="detail-section brainstorm-detail__questions">
          <h2 class="section-heading">
            Questions ({brainstorm.questions.length})
          </h2>
          {brainstorm.questions.length === 0 && (
            <p class="brainstorm-detail__empty">No questions yet.</p>
          )}
          {brainstorm.questions.map((q, i) => (
            <div key={i} class="brainstorm-detail__question">
              <h3 class="brainstorm-detail__question-text">{q.question}</h3>
              {q.answer
                ? <div class="brainstorm-detail__answer">{q.answer}</div>
                : (
                  <p class="brainstorm-detail__no-answer">
                    No answer yet.
                  </p>
                )}
            </div>
          ))}
        </section>

        {/* -- Meta ------------------------------------------------------- */}
        <div class="detail-section brainstorm-detail__meta">
          <span>Created {formatDate(brainstorm.createdAt)}</span>
          {brainstorm.updatedAt &&
            brainstorm.updatedAt !== brainstorm.createdAt && (
            <span>&middot; Updated {formatDate(brainstorm.updatedAt)}</span>
          )}
        </div>
      </main>

      <div id="brainstorms-form-container" />
    </MainLayout>
  );
};
