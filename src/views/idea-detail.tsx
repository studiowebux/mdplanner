import type { FC } from "hono/jsx";
import { MainLayout } from "../components/layout/main.tsx";
import { BackButton } from "./components/back-button.tsx";
import { Breadcrumb } from "../components/ui/breadcrumb.tsx";
import type { Idea } from "../types/idea.types.ts";
import type { ViewProps } from "../types/app.ts";
import { formatDate } from "../utils/time.ts";
import { toKebab } from "../utils/slug.ts";
import { MarkdownSection } from "./components/markdown-section.tsx";
import { DetailActions } from "./components/detail-actions.tsx";
import { ArchivedBanner } from "./components/archived-banner.tsx";
import { SseRefresh } from "./components/sse-refresh.tsx";
import { InfoItem } from "./components/info-item.tsx";
import {
  IDEA_PRIORITY_VARIANTS,
  IDEA_STATUS_VARIANTS,
} from "../domains/idea/constants.tsx";
import { badgeClass } from "../components/ui/status-badge.tsx";
import { AuditMeta } from "./components/audit-meta.tsx";
import { EditModeToggle } from "./components/edit-mode-toggle.tsx";
import { InlineEditable } from "./components/inline-editable.tsx";

const DescriptionSection: FC<{ idea: Idea }> = ({ idea }) => (
  <section class="detail-section">
    <h2 class="section-heading">Description</h2>
    <InlineEditable
      fieldId="idea-description"
      name="description"
      value={idea.description ?? ""}
      hxPut={`/ideas/${idea.id}/description?editing=true`}
      rootId="idea-detail-root"
    />
  </section>
);

// ---------------------------------------------------------------------------
// Body sections
// ---------------------------------------------------------------------------

/** Title + status/priority badges + actions. */
const IdeaHeader: FC<{ idea: Idea; editing: boolean }> = (
  { idea, editing },
) => (
  <header class="detail-section detail-header idea-detail__header">
    <div class="detail-title-row idea-detail__title-row">
      <h1 class="detail-title idea-detail__title">{idea.title}</h1>
      <span class={badgeClass(IDEA_STATUS_VARIANTS, idea.status)}>
        {idea.status}
      </span>
      {idea.priority && (
        <span class={badgeClass(IDEA_PRIORITY_VARIANTS, idea.priority)}>
          {idea.priority}
        </span>
      )}
    </div>
    <DetailActions
      entity="ideas"
      id={idea.id}
      title={idea.title}
      formContainerId="ideas-form-container"
      archived={idea.archived === true}
    >
      <EditModeToggle href={`/ideas/${idea.id}`} editing={editing} />
    </DetailActions>
  </header>
);

/** Category / priority / project / submitter / resources row. */
const OverviewRow: FC<{
  idea: Idea;
  submittedByPerson: { id: string; name: string } | null;
}> = ({ idea, submittedByPerson }) => {
  if (
    !idea.category && !idea.priority && !idea.project && !idea.resources &&
    !idea.submittedBy
  ) {
    return null;
  }
  return (
    <div class="detail-section detail-info-row">
      {idea.category && <InfoItem label="Category">{idea.category}</InfoItem>}
      {idea.priority && (
        <InfoItem label="Priority">
          <span class={badgeClass(IDEA_PRIORITY_VARIANTS, idea.priority)}>
            {idea.priority}
          </span>
        </InfoItem>
      )}
      {idea.project && (
        <InfoItem label="Project">
          <a href={`/portfolio/${toKebab(idea.project)}`}>{idea.project}</a>
        </InfoItem>
      )}
      {idea.submittedBy && (
        <InfoItem label="Idea by">
          {submittedByPerson
            ? (
              <a href={`/people/${submittedByPerson.id}`}>
                {idea.submittedBy}
              </a>
            )
            : idea.submittedBy}
        </InfoItem>
      )}
      {idea.resources && <InfoItem label="Resources">{idea.resources}
      </InfoItem>}
    </div>
  );
};

/** Start / end / implemented / cancelled dates row. */
const TimelineRow: FC<{ idea: Idea }> = ({ idea }) => {
  if (
    !idea.startDate && !idea.endDate && !idea.implementedAt && !idea.cancelledAt
  ) {
    return null;
  }
  return (
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
        <InfoItem label="Cancelled">{formatDate(idea.cancelledAt)}</InfoItem>
      )}
    </div>
  );
};

/** Subtasks list. */
const SubtasksSection: FC<{ idea: Idea }> = ({ idea }) => {
  if ((idea.subtasks?.length ?? 0) === 0) return null;
  return (
    <section class="detail-section idea-detail__section">
      <h2 class="section-heading">
        Subtasks ({(idea.subtasks ?? []).length})
      </h2>
      <ul class="idea-detail__subtasks">
        {(idea.subtasks ?? []).map((s, idx) => <li key={idx}>{s}</li>)}
      </ul>
    </section>
  );
};

/** Badge list of related ideas under a heading. */
const IdeaLinksSection: FC<{
  heading: string;
  ideas: { id: string; title: string }[];
}> = ({ heading, ideas }) => {
  if (ideas.length === 0) return null;
  return (
    <section class="detail-section idea-detail__section">
      <h2 class="section-heading">{heading} ({ideas.length})</h2>
      <span class="idea-detail__links">
        {ideas.map((l) => (
          <a key={l.id} href={`/ideas/${l.id}`} class="badge">{l.title}</a>
        ))}
      </span>
    </section>
  );
};

/** Description — editable form or rendered markdown. */
const DescriptionBlock: FC<{ idea: Idea; editing: boolean }> = (
  { idea, editing },
) =>
  editing
    ? <DescriptionSection idea={idea} />
    : <MarkdownSection title="Description" markdown={idea.description} />;

// ---------------------------------------------------------------------------
// Main view
// ---------------------------------------------------------------------------

export const IdeaDetailView: FC<
  ViewProps & {
    item: Idea;
    linkedIdeas?: { id: string; title: string }[];
    backlinks?: { id: string; title: string }[];
    submittedByPerson?: { id: string; name: string } | null;
    editing?: boolean;
  }
> = (
  {
    item: idea,
    linkedIdeas = [],
    backlinks = [],
    submittedByPerson = null,
    editing = false,
    ...viewProps
  },
) => (
  <MainLayout
    title={idea.title}
    {...viewProps}
    styles={["/css/views/ideas.css"]}
    scripts={["/js/inline-edit.js"]}
  >
    <SseRefresh
      getUrl={"/ideas/" + idea.id + (editing ? "?editing=true" : "")}
      trigger="sse:idea.updated"
      targetId="idea-detail-root"
    />
    <main
      id="idea-detail-root"
      class={`detail-view idea-detail${editing ? " idea-detail--editing" : ""}`}
    >
      <Breadcrumb
        items={[
          { label: "Ideas", href: "/ideas" },
          { label: idea.title },
        ]}
      />
      <BackButton href="/ideas" label="Back to Ideas" />

      <IdeaHeader idea={idea} editing={editing} />
      <ArchivedBanner entity={idea} />
      <OverviewRow idea={idea} submittedByPerson={submittedByPerson} />
      <TimelineRow idea={idea} />
      <SubtasksSection idea={idea} />
      <IdeaLinksSection heading="Linked Ideas" ideas={linkedIdeas} />
      <IdeaLinksSection heading="Referenced By" ideas={backlinks} />
      <DescriptionBlock idea={idea} editing={editing} />
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
