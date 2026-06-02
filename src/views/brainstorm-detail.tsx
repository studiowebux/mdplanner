import type { FC } from "hono/jsx";
import { MainLayout } from "../components/layout/main.tsx";
import { BackButton } from "./components/back-button.tsx";
import { Breadcrumb } from "../components/ui/breadcrumb.tsx";
import type {
  Brainstorm,
  BrainstormQuestion,
} from "../types/brainstorm.types.ts";
import type { ViewProps } from "../types/app.ts";
import { DetailActions } from "./components/detail-actions.tsx";
import { ArchivedBanner } from "./components/archived-banner.tsx";
import { SseRefresh } from "./components/sse-refresh.tsx";
import { AuditMeta } from "./components/audit-meta.tsx";
import { EditModeToggle } from "./components/edit-mode-toggle.tsx";
import { InlineEditable } from "./components/inline-editable.tsx";
import { toKebab } from "../utils/slug.ts";

// ---------------------------------------------------------------------------
// Q&A pair — read or in-place editable (contenteditable + Save per field).
// Each question and answer is an independent inline editable: it syncs its own
// hidden input and shows its own Save button only when dirty (inline-edit.js).
// ---------------------------------------------------------------------------

const EditableQA: FC<{ id: string; q: BrainstormQuestion; index: number }> = ({
  id,
  q,
  index,
}) => {
  const hxPut = `/brainstorms/${id}/qa/${index}?editing=true`;
  return (
    <div class="brainstorm-detail__question">
      <InlineEditable
        fieldId={`bq-${index}-question`}
        name="question"
        value={q.question}
        hxPut={hxPut}
        rootId="brainstorm-detail-root"
        class="brainstorm-detail__question-text"
      />
      <InlineEditable
        fieldId={`bq-${index}-answer`}
        name="answer"
        value={q.answer ?? ""}
        hxPut={hxPut}
        rootId="brainstorm-detail-root"
        class="brainstorm-detail__answer"
      />
    </div>
  );
};

// ---------------------------------------------------------------------------
// Main view
// ---------------------------------------------------------------------------

export const BrainstormDetailView: FC<
  ViewProps & {
    item: Brainstorm;
    editing?: boolean;
    taskInfo?: Map<string, { title: string } | null>;
    goalInfo?: Map<string, { title: string } | null>;
  }
> = (
  { item: brainstorm, editing = false, taskInfo, goalInfo, ...viewProps },
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
      scripts={["/js/inline-edit.js"]}
    >
      <SseRefresh
        getUrl={"/brainstorms/" + brainstorm.id +
          (editing ? "?editing=true" : "")}
        trigger="sse:brainstorm.updated"
        targetId="brainstorm-detail-root"
      />
      <main
        id="brainstorm-detail-root"
        class={`detail-view brainstorm-detail${
          editing ? " brainstorm-detail--editing" : ""
        }`}
      >
        <Breadcrumb
          items={[
            { label: "Brainstorms", href: "/brainstorms" },
            { label: brainstorm.title },
          ]}
        />
        <BackButton href="/brainstorms" label="Back to Brainstorms" />

        {/* -- Header ---------------------------------------------------- */}
        <header class="detail-section detail-header brainstorm-detail__header">
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
            archived={brainstorm.archived === true}
          >
            <EditModeToggle
              href={`/brainstorms/${brainstorm.id}`}
              editing={editing}
            />
          </DetailActions>
        </header>

        <ArchivedBanner entity={brainstorm} />

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
              <a
                key={p}
                href={`/portfolio/${toKebab(p)}`}
                class="brainstorm-detail__link"
              >
                <span class="brainstorm-detail__link-type">Project</span>
                {p}
              </a>
            ))}
            {brainstorm.linkedTasks?.map((t) => {
              const info = taskInfo?.get(t) ?? null;
              if (!info) {
                return (
                  <span
                    key={t}
                    class="brainstorm-detail__link brainstorm-detail__link--deleted"
                  >
                    <span class="brainstorm-detail__link-type">Task</span>
                    [Deleted task]
                  </span>
                );
              }
              return (
                <a key={t} href={`/tasks/${t}`} class="brainstorm-detail__link">
                  <span class="brainstorm-detail__link-type">Task</span>
                  {info.title}
                </a>
              );
            })}
            {brainstorm.linkedGoals?.map((g) => {
              const info = goalInfo?.get(g) ?? null;
              if (!info) {
                return (
                  <span
                    key={g}
                    class="brainstorm-detail__link brainstorm-detail__link--deleted"
                  >
                    <span class="brainstorm-detail__link-type">Goal</span>
                    [Deleted goal]
                  </span>
                );
              }
              return (
                <a key={g} href={`/goals/${g}`} class="brainstorm-detail__link">
                  <span class="brainstorm-detail__link-type">Goal</span>
                  {info.title}
                </a>
              );
            })}
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
          {brainstorm.questions.map((q, i) =>
            editing
              ? <EditableQA key={i} id={brainstorm.id} q={q} index={i} />
              : (
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
              )
          )}
        </section>

        {/* -- Meta ------------------------------------------------------- */}
        <AuditMeta
          createdAt={brainstorm.createdAt}
          updatedAt={brainstorm.updatedAt}
          createdBy={brainstorm.createdBy}
          updatedBy={brainstorm.updatedBy}
        />
      </main>

      <div id="brainstorms-form-container" />
    </MainLayout>
  );
};
