import type { FC } from "hono/jsx";
import { MainLayout } from "../components/layout/main.tsx";
import { BackButton } from "./components/back-button.tsx";
import type { Idea } from "../types/idea.types.ts";
import { IDEA_COMPLETED_STATUSES } from "../types/idea.types.ts";
import type { ViewProps } from "../types/app.ts";
import { formatDate } from "../utils/time.ts";
import { toKebab } from "../utils/slug.ts";
import { MarkdownSection } from "./components/markdown-section.tsx";
import { DetailActions } from "./components/detail-actions.tsx";
import { SseRefresh } from "./components/sse-refresh.tsx";
import { InfoItem } from "./components/info-item.tsx";
import {
  IDEA_PRIORITY_VARIANTS,
  IDEA_STATUS_VARIANTS,
} from "../domains/idea/constants.tsx";
import { AuditMeta } from "./components/audit-meta.tsx";

// ---------------------------------------------------------------------------
// Main view
// ---------------------------------------------------------------------------

export const IdeaDetailView: FC<
  ViewProps & {
    item: Idea;
    linkedIdeas?: { id: string; title: string }[];
    backlinks?: { id: string; title: string }[];
  }
> = (
  {
    item: idea,
    linkedIdeas = [],
    backlinks = [],
    ...viewProps
  },
) => {
  const isCompleted = IDEA_COMPLETED_STATUSES.has(idea.status);

  const hasOverview = idea.category || idea.priority || idea.project ||
    idea.resources;
  const hasTimeline = idea.startDate || idea.endDate || idea.implementedAt ||
    idea.cancelledAt;
  const hasSubtasks = (idea.subtasks?.length ?? 0) > 0;
  const hasLinks = linkedIdeas.length > 0;
  const hasBacklinks = backlinks.length > 0;

  return (
    <MainLayout
      title={idea.title}
      {...viewProps}
      styles={["/css/views/ideas.css"]}
    >
      <SseRefresh
        getUrl={"/ideas/" + idea.id}
        trigger="sse:idea.updated"
        targetId="idea-detail-root"
      />
      <main id="idea-detail-root" class="detail-view idea-detail">
        <BackButton href="/ideas" label="Back to Ideas" />

        {/* -- Header ---------------------------------------------------- */}
        <header class="detail-section idea-detail__header">
          <div class="detail-title-row idea-detail__title-row">
            <h1 class="detail-title idea-detail__title">{idea.title}</h1>
            <span
              class={`badge badge--${
                IDEA_STATUS_VARIANTS[idea.status] ?? "neutral"
              }`}
            >
              {idea.status}
            </span>
            {idea.priority && (
              <span
                class={`badge badge--${
                  IDEA_PRIORITY_VARIANTS[idea.priority] ?? "neutral"
                }`}
              >
                {idea.priority}
              </span>
            )}
          </div>
          <DetailActions
            entity="ideas"
            id={idea.id}
            title={idea.title}
            formContainerId="ideas-form-container"
          />
        </header>

        {/* -- Overview row ---------------------------------------------- */}
        {hasOverview && (
          <div class="detail-section detail-info-row">
            {idea.category && (
              <InfoItem label="Category">{idea.category}</InfoItem>
            )}
            {idea.priority && (
              <InfoItem label="Priority">
                <span
                  class={`badge badge--${
                    IDEA_PRIORITY_VARIANTS[idea.priority] ?? "neutral"
                  }`}
                >
                  {idea.priority}
                </span>
              </InfoItem>
            )}
            {idea.project && (
              <InfoItem label="Project">
                <a href={`/portfolio/${toKebab(idea.project)}`}>
                  {idea.project}
                </a>
              </InfoItem>
            )}
            {idea.resources && (
              <InfoItem label="Resources">{idea.resources}</InfoItem>
            )}
          </div>
        )}

        {/* -- Timeline row ---------------------------------------------- */}
        {hasTimeline && (
          <div class="detail-section detail-info-row">
            {idea.startDate && (
              <InfoItem label="Start">{formatDate(idea.startDate)}</InfoItem>
            )}
            {idea.endDate && (
              <InfoItem label="End">{formatDate(idea.endDate)}</InfoItem>
            )}
            {idea.implementedAt && (
              <InfoItem label="Implemented">
                {formatDate(idea.implementedAt)}
              </InfoItem>
            )}
            {idea.cancelledAt && (
              <InfoItem label="Cancelled">
                {formatDate(idea.cancelledAt)}
              </InfoItem>
            )}
          </div>
        )}

        {/* -- Subtasks -------------------------------------------------- */}
        {hasSubtasks && (
          <section class="detail-section idea-detail__section">
            <h2 class="section-heading">
              Subtasks ({(idea.subtasks ?? []).length})
            </h2>
            <ul class="idea-detail__subtasks">
              {(idea.subtasks ?? []).map((s, idx) => <li key={idx}>{s}</li>)}
            </ul>
          </section>
        )}

        {/* -- Linked Ideas ---------------------------------------------- */}
        {hasLinks && (
          <section class="detail-section idea-detail__section">
            <h2 class="section-heading">
              Linked Ideas ({linkedIdeas.length})
            </h2>
            <span class="idea-detail__links">
              {linkedIdeas.map((l) => (
                <a href={`/ideas/${l.id}`} class="badge">{l.title}</a>
              ))}
            </span>
          </section>
        )}

        {/* -- Backlinks ------------------------------------------------- */}
        {hasBacklinks && (
          <section class="detail-section idea-detail__section">
            <h2 class="section-heading">
              Referenced By ({backlinks.length})
            </h2>
            <span class="idea-detail__links">
              {backlinks.map((b) => (
                <a href={`/ideas/${b.id}`} class="badge">{b.title}</a>
              ))}
            </span>
          </section>
        )}

        {/* -- Description ----------------------------------------------- */}
        <MarkdownSection title="Description" markdown={idea.description} />

        {/* -- Meta ------------------------------------------------------ */}
        <div class="detail-section idea-detail__meta">
          <span>Created {formatDate(idea.createdAt)}</span>
          {idea.updatedAt && idea.updatedAt !== idea.createdAt && (
            <span>&middot; Updated {formatDate(idea.updatedAt)}</span>
          )}
        </div>
        <AuditMeta
          createdAt={idea.createdAt}
          updatedAt={idea.updatedAt}
          createdBy={idea.createdBy}
          updatedBy={idea.updatedBy}
        />
      </main>

      <div id="ideas-form-container" />
    </MainLayout>
  );
};
