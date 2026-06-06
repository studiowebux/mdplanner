// Note detail view — enhanced content with inline editing for title/project
// and JS-driven content block editing.

import type { FC } from "hono/jsx";
import { MainLayout } from "../components/layout/main.tsx";
import type { Note } from "../types/note.types.ts";
import type { ViewProps } from "../types/app.ts";
import { NoteBlocks } from "./components/note-blocks.tsx";
import { AuditMeta } from "./components/audit-meta.tsx";
import { ArchivedBanner } from "./components/archived-banner.tsx";
import { SseRefresh } from "./components/sse-refresh.tsx";
import { Breadcrumb } from "../components/ui/breadcrumb.tsx";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

type Props = ViewProps & { note: Note };

// ---------------------------------------------------------------------------
// Main view
// ---------------------------------------------------------------------------

export const NoteDetailView: FC<Props> = (props) => {
  const { note, ...layoutProps } = props;
  const isArchived = note.archived === true;

  return (
    <MainLayout
      {...layoutProps}
      title={note.title}
      activePath="/notes"
      styles={[
        "/css/vendor/highlight-github-11.11.1.min.css",
        "/css/vendor/highlight-github-dark-scoped-11.11.1.css",
        "/css/views/notes.css",
      ]}
      scripts={[
        "/js/vendor/highlight-11.11.1.min.js",
        "/js/note-highlight.js",
        "/js/note-tabs.js",
        "/js/note-markdown.js",
        "/js/note-editor.js",
        "/js/note-undo.js",
      ]}
    >
      <main
        class="detail-view note-detail"
        id="note-detail-root"
        data-note-id={note.id}
      >
        <Breadcrumb
          items={[
            { label: "Notes", href: "/notes" },
            { label: note.title },
          ]}
        />
        <div class="note-detail__top-bar">
          <a href="/notes" class="btn btn--secondary">Back to notes</a>
          {
            /* Deliberately NOT the shared <DetailActions>: the note Edit is an
              inline-editor toggle (data-note-edit-toggle), not an hx-get to a
              form container, so DetailActions' Edit can't represent it. Full-size
              Edit pairs with the full-size "Back to notes" anchor — justified
              exception (cz1i). */
          }
          <div class="note-detail__top-bar-actions">
            {isArchived
              ? (
                <>
                  <button
                    type="button"
                    class="btn btn--secondary"
                    hx-post={`/notes/${note.id}/restore`}
                    hx-swap="none"
                  >
                    Restore
                  </button>
                  <button
                    type="button"
                    class="btn btn--danger btn--sm"
                    hx-post={`/notes/${note.id}/destroy`}
                    hx-confirm={`Permanently delete "${note.title}"? This cannot be undone.`}
                    hx-swap="none"
                    data-confirm-title="Delete permanently?"
                    data-confirm-label="Delete permanently"
                  >
                    Delete permanently
                  </button>
                </>
              )
              : (
                <>
                  <button
                    type="button"
                    class="btn btn--secondary"
                    data-note-edit-toggle
                  >
                    Edit
                  </button>
                  <button
                    class="btn btn--danger btn--sm"
                    type="button"
                    hx-delete={`/notes/${note.id}`}
                    hx-confirm={`Archive "${note.title}"? Archived notes can be restored from the archived view.`}
                    hx-swap="none"
                    data-confirm-title="Archive note?"
                    data-confirm-label="Archive"
                  >
                    Archive
                  </button>
                </>
              )}
          </div>
        </div>

        <ArchivedBanner entity={note} />

        <header
          class="detail-section detail-header note-detail__header"
          id="note-detail-header"
        >
          <div class="detail-title-row note-detail__title-row">
            {isArchived
              ? <h1 class="note-detail__title-input">{note.title}</h1>
              : (
                <>
                  <input
                    type="text"
                    id="note-title-input"
                    class="note-detail__title-input"
                    name="title"
                    value={note.title}
                    data-note-title-input
                    data-note-title-original={note.title}
                  />
                  <button
                    type="button"
                    id="note-title-save"
                    class="btn btn--primary btn--sm is-hidden"
                    hx-post={`/notes/${note.id}/title`}
                    hx-include="#note-title-input"
                    hx-target="#note-detail-root"
                    hx-select="#note-detail-root"
                    hx-swap="outerHTML"
                  >
                    Save
                  </button>
                </>
              )}
          </div>
          <div class="note-detail__meta">
            <div class="note-detail__action-group">
              <label class="note-detail__action-label">Project</label>
              {isArchived
                ? (
                  <span class="note-detail__project-readonly">
                    {note.project ?? "—"}
                  </span>
                )
                : (
                  <div class="form__autocomplete">
                    <input
                      type="text"
                      class="form__input"
                      placeholder="Search projects..."
                      value={note.project ?? ""}
                      autocomplete="off"
                      name="q"
                      data-autocomplete-target="note-project-hidden"
                      data-freetext="true"
                      hx-get="/autocomplete/portfolio"
                      hx-trigger="input changed delay:150ms, focus"
                      hx-target="#note-project-results"
                      hx-include="this"
                      hx-swap="innerHTML"
                    />
                    <input
                      type="hidden"
                      id="note-project-hidden"
                      name="project"
                      value={note.project ?? ""}
                      hx-post={`/notes/${note.id}/project`}
                      hx-target="#note-detail-root"
                      hx-select="#note-detail-root"
                      hx-swap="outerHTML"
                      hx-trigger="input"
                      hx-include="this"
                    />
                    <ul
                      class="form__autocomplete-list"
                      id="note-project-results"
                    />
                  </div>
                )}
            </div>
          </div>
        </header>

        <section class="detail-section">
          <NoteBlocks note={note} />
        </section>
        <AuditMeta
          createdAt={note.createdAt}
          updatedAt={note.updatedAt}
          createdBy={note.createdBy}
          updatedBy={note.updatedBy}
        />
      </main>
      {
        /* Sibling of <main> but inside MainLayout so it renders in <body> and
            htmx opens the /sse EventSource. Rendering it outside MainLayout
            placed it after </html>, so SSE never connected. */
      }
      <SseRefresh
        getUrl={`/notes/${note.id}`}
        trigger="sse:note.updated, sse:note.deleted"
        targetId="note-detail-root"
        clientTrigger="note:refresh from:body"
      />
    </MainLayout>
  );
};
