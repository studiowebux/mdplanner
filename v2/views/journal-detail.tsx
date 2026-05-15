import type { FC } from "hono/jsx";
import { MainLayout } from "../components/layout/main.tsx";
import { BackButton } from "./components/back-button.tsx";
import type { JournalEntry } from "../types/journal.types.ts";
import { JOURNAL_MOOD_LABELS, JOURNAL_MOODS } from "../types/journal.types.ts";
import type { ViewProps } from "../types/app.ts";
import { MarkdownSection } from "./components/markdown-section.tsx";
import { SseRefresh } from "./components/sse-refresh.tsx";
import { InfoItem } from "./components/info-item.tsx";
import { AuditMeta } from "./components/audit-meta.tsx";
import { badgeClass } from "../components/ui/status-badge.tsx";
import { JOURNAL_MOOD_VARIANTS } from "../domains/journal/constants.tsx";

// ---------------------------------------------------------------------------
// Read mode
// ---------------------------------------------------------------------------

const JournalReadView: FC<{ entry: JournalEntry }> = ({ entry }) => (
  <main id="journal-detail-root" class="detail-view journal-detail">
    <BackButton href="/journal" label="Back to Journal" />

    <header class="detail-section journal-detail__header">
      <div>
        <h1 class="detail-title">{entry.title}</h1>
        <div class="journal-detail__badges">
          {entry.mood && (
            <span class={badgeClass(JOURNAL_MOOD_VARIANTS, entry.mood)}>
              {JOURNAL_MOOD_LABELS[entry.mood]}
            </span>
          )}
          {entry.tags &&
            entry.tags.map((tag) => <span key={tag} class="badge">{tag}</span>)}
        </div>
      </div>
      <div class="journal-detail__actions">
        <a href={`/journal/${entry.id}?edit=1`} class="btn btn--secondary">
          Edit
        </a>
        <button
          type="button"
          class="btn btn--danger"
          hx-delete={`/api/v1/journal/${entry.id}`}
          hx-confirm={`Delete "${entry.title}"?`}
          hx-target="body"
          hx-push-url="/journal"
        >
          Delete
        </button>
      </div>
    </header>

    <div class="detail-section detail-info-row">
      <InfoItem label="Date">{entry.date ?? "—"}</InfoItem>
      {entry.mood && (
        <InfoItem label="Mood">{JOURNAL_MOOD_LABELS[entry.mood]}</InfoItem>
      )}
    </div>

    <MarkdownSection title="Content" markdown={entry.content} />

    <AuditMeta
      createdAt={entry.createdAt}
      updatedAt={entry.updatedAt}
      createdBy={entry.createdBy}
      updatedBy={entry.updatedBy}
    />
  </main>
);

// ---------------------------------------------------------------------------
// Edit mode
// ---------------------------------------------------------------------------

const JournalEditView: FC<{ entry: JournalEntry }> = ({ entry }) => (
  <main id="journal-detail-root" class="detail-view journal-detail">
    <BackButton href="/journal" label="Back to Journal" />

    <form
      method="post"
      action={`/journal/${entry.id}/save`}
      class="journal-edit"
    >
      <div class="detail-section">
        <input
          type="text"
          name="title"
          value={entry.title}
          class="journal-edit__title form-control"
          required
        />
      </div>

      <div class="detail-section detail-info-row">
        <div class="form-group">
          <label class="form-label">Date</label>
          <input
            type="date"
            name="date"
            value={entry.date ?? ""}
            class="form-control"
          />
        </div>
        <div class="form-group">
          <label class="form-label">Mood</label>
          <select name="mood" class="form-control">
            <option value="">— none —</option>
            {JOURNAL_MOODS.map((m) => (
              <option key={m} value={m} selected={entry.mood === m}>
                {JOURNAL_MOOD_LABELS[m]}
              </option>
            ))}
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">Tags (comma-separated)</label>
          <input
            type="text"
            name="tags"
            value={(entry.tags ?? []).join(", ")}
            class="form-control"
            placeholder="work, personal, ideas"
          />
        </div>
      </div>

      <div class="detail-section">
        <label class="form-label">Content</label>
        <textarea
          name="content"
          rows={20}
          class="journal-edit__content form-control"
        >
          {entry.content ?? ""}
        </textarea>
      </div>

      <div class="journal-edit__actions">
        <button type="submit" class="btn btn--primary">Save</button>
        <a href={`/journal/${entry.id}`} class="btn btn--secondary">Cancel</a>
      </div>
    </form>
  </main>
);

// ---------------------------------------------------------------------------
// Main export
// ---------------------------------------------------------------------------

export const JournalDetailView: FC<
  ViewProps & { item: JournalEntry; editMode?: boolean }
> = ({ item: entry, editMode, ...viewProps }) => (
  <MainLayout
    title={editMode ? `Edit: ${entry.title}` : entry.title}
    {...viewProps}
    styles={["/css/views/journal.css"]}
  >
    {!editMode && (
      <SseRefresh
        getUrl={"/journal/" + entry.id}
        trigger="sse:journal.updated"
        targetId="journal-detail-root"
      />
    )}
    {editMode
      ? <JournalEditView entry={entry} />
      : <JournalReadView entry={entry} />}
  </MainLayout>
);
