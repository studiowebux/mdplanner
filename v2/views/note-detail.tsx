// Note detail view — enhanced content with inline editing for title/project
// and JS-driven content block editing.

import type { FC } from "hono/jsx";
import { MainLayout } from "../components/layout/main.tsx";
import type { Note } from "../types/note.types.ts";
import type { ViewProps } from "../types/app.ts";
import { timeAgo } from "../utils/time.ts";
import { NoteBlocks } from "./components/note-blocks.tsx";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

type Props = ViewProps & { note: Note };

// ---------------------------------------------------------------------------
// Main view
// ---------------------------------------------------------------------------

export const NoteDetailView: FC<Props> = (props) => {
  const { note, ...layoutProps } = props;

  return (
    <MainLayout
      {...layoutProps}
      title={note.title}
      activePath="/notes"
      styles={[
        "/css/vendor/highlight-github-11.11.1.min.css",
        "/css/vendor/highlight-github-dark-scoped-11.11.1.css",
        "/css/views/note.css",
      ]}
      scripts={[
        "/js/vendor/highlight-11.11.1.min.js",
        "/js/note-highlight.js",
        "/js/note-tabs.js",
        "/js/note-editor.js",
      ]}
    >
      <main
        class="detail-view note-detail"
        id="note-detail-root"
        data-note-id={note.id}
      >
        <div class="note-detail__top-bar">
          <a href="/notes" class="btn btn--secondary">Back to notes</a>
          <button
            type="button"
            class="btn btn--secondary"
            data-note-edit-toggle
          >
            Edit
          </button>
        </div>

        <header class="note-detail__header" id="note-detail-header">
          <div class="detail-title-row note-detail__title-row">
            <input
              type="text"
              class="note-detail__title-input"
              name="title"
              value={note.title}
              hx-post={`/notes/${note.id}/title`}
              hx-trigger="change"
              hx-target="#note-detail-root"
              hx-select="#note-detail-root"
              hx-swap="outerHTML"
              hx-include="this"
            />
          </div>
          <div class="note-detail__meta">
            <div class="note-detail__action-group">
              <label class="note-detail__action-label">Project</label>
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
                <ul class="form__autocomplete-list" id="note-project-results" />
              </div>
            </div>
            <span class="note-detail__updated">
              Updated {timeAgo(note.updatedAt)}
            </span>
          </div>
        </header>

        <NoteBlocks note={note} />
      </main>
    </MainLayout>
  );
};
