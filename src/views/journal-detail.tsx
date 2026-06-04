import type { FC } from "hono/jsx";
import { MainLayout } from "../components/layout/main.tsx";
import { BackButton } from "./components/back-button.tsx";
import { Breadcrumb } from "../components/ui/breadcrumb.tsx";
import type { JournalEntry } from "../types/journal.types.ts";
import { JOURNAL_MOOD_LABELS } from "../types/journal.types.ts";
import type { ViewProps } from "../types/app.ts";
import { MarkdownSection } from "./components/markdown-section.tsx";
import { SseRefresh } from "./components/sse-refresh.tsx";
import { InfoItem } from "./components/info-item.tsx";
import { AuditMeta } from "./components/audit-meta.tsx";
import { badgeClass } from "../components/ui/status-badge.tsx";
import { JOURNAL_MOOD_VARIANTS } from "../domains/journal/constants.tsx";
import { DetailActions } from "./components/detail-actions.tsx";
import { ArchivedBanner } from "./components/archived-banner.tsx";
import { EditModeToggle } from "./components/edit-mode-toggle.tsx";
import { InlineEditable } from "./components/inline-editable.tsx";

// ---------------------------------------------------------------------------
// Content — read (markdown) or in-place editable (contenteditable + Save).
// ---------------------------------------------------------------------------

const ContentSection: FC<{ entry: JournalEntry }> = ({ entry }) => (
  <section class="detail-section">
    <h2 class="section-heading">Content</h2>
    <InlineEditable
      fieldId="journal-content"
      name="content"
      value={entry.content ?? ""}
      hxPut={`/journal/${entry.id}/content?editing=true`}
      rootId="journal-detail-root"
    />
  </section>
);

// ---------------------------------------------------------------------------
// Main export
// ---------------------------------------------------------------------------

export const JournalDetailView: FC<
  ViewProps & { item: JournalEntry; editing?: boolean }
> = ({ item: entry, editing = false, ...viewProps }) => (
  <MainLayout
    title={entry.title}
    {...viewProps}
    styles={["/css/views/journal.css"]}
    scripts={["/js/inline-edit.js"]}
  >
    <SseRefresh
      getUrl={"/journal/" + entry.id + (editing ? "?editing=true" : "")}
      trigger="sse:journal.updated"
      targetId="journal-detail-root"
    />
    <main
      id="journal-detail-root"
      class={`detail-view journal-detail${
        editing ? " journal-detail--editing" : ""
      }`}
    >
      <Breadcrumb
        items={[
          { label: "Journal", href: "/journal" },
          { label: entry.title },
        ]}
      />
      <BackButton href="/journal" label="Back to Journal" />

      <header class="detail-section detail-header journal-detail__header">
        <div>
          <h1 class="detail-title">{entry.title}</h1>
          <div class="journal-detail__badges">
            {entry.mood && (
              <span class={badgeClass(JOURNAL_MOOD_VARIANTS, entry.mood)}>
                {JOURNAL_MOOD_LABELS[entry.mood]}
              </span>
            )}
            {entry.tags &&
              entry.tags.map((tag) => <span key={tag} class="badge">{tag}
              </span>)}
          </div>
        </div>
        <DetailActions
          entity="journal"
          id={entry.id}
          title={entry.title}
          formContainerId="journal-form-container"
          onDeleteRedirect="/journal"
          archived={entry.archived === true}
        >
          <EditModeToggle href={`/journal/${entry.id}`} editing={editing} />
        </DetailActions>
      </header>

      <ArchivedBanner entity={entry} />

      <div class="detail-section detail-info-row">
        <InfoItem label="Date">{entry.date ?? "—"}</InfoItem>
        {entry.mood && (
          <InfoItem label="Mood">{JOURNAL_MOOD_LABELS[entry.mood]}</InfoItem>
        )}
      </div>

      {editing
        ? <ContentSection entry={entry} />
        : <MarkdownSection title="Content" markdown={entry.content} />}

      <AuditMeta
        createdAt={entry.createdAt}
        updatedAt={entry.updatedAt}
        createdBy={entry.createdBy}
        updatedBy={entry.updatedBy}
      />
    </main>
    <div id="journal-form-container" />
  </MainLayout>
);
