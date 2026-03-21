import type { FC } from "hono/jsx";
import type { Note } from "../../types/note.types.ts";
import { Highlight, highlightHtml } from "../../utils/highlight.tsx";
import { markdownToHtml } from "../../utils/markdown.ts";
import { timeAgo } from "../../utils/time.ts";

type Props = { note: Note; q?: string };

export const NoteCard: FC<Props> = ({ note, q }) => {
  const sectionCount = note.customSections?.length ?? 0;
  const paragraphCount = note.paragraphs?.length ?? 0;
  const contentHtml = markdownToHtml(note.content?.slice(0, 300));

  return (
    <article class="note-card" data-filterable-card>
      <header class="note-card__header">
        <h2 class="note-card__title">
          <a href={`/notes/${note.id}`}>
            <Highlight text={note.title} q={q} />
          </a>
        </h2>
      </header>

      <dl class="note-card__meta">
        {note.project && (
          <>
            <dt class="note-card__meta-label">Project</dt>
            <dd class="note-card__meta-value">
              <Highlight text={note.project} q={q} />
            </dd>
          </>
        )}
        <dt class="note-card__meta-label">Updated</dt>
        <dd class="note-card__meta-value">{timeAgo(note.updatedAt)}</dd>
        {(paragraphCount > 0 || sectionCount > 0) && (
          <>
            <dt class="note-card__meta-label">Content</dt>
            <dd class="note-card__meta-value">
              {paragraphCount} block{paragraphCount !== 1 ? "s" : ""}
              {sectionCount > 0 &&
                `, ${sectionCount} section${sectionCount !== 1 ? "s" : ""}`}
            </dd>
          </>
        )}
      </dl>

      {contentHtml && (
        <div
          class="note-card__excerpt markdown-body"
          dangerouslySetInnerHTML={{
            __html: highlightHtml(contentHtml, q),
          }}
        />
      )}

      <div class="note-card__actions">
        <button
          class="btn btn--secondary"
          type="button"
          hx-get={`/notes/${note.id}/preview`}
          hx-target="#notes-form-container"
          hx-swap="innerHTML"
          data-sidenav-open
        >
          View
        </button>
        <a class="btn btn--secondary" href={`/notes/${note.id}`}>
          Edit
        </a>
        <button
          class="btn btn--danger"
          type="button"
          hx-delete={`/notes/${note.id}`}
          hx-swap="none"
          hx-confirm-dialog={`Delete "${note.title}"? This cannot be undone.`}
          data-confirm-name={note.title}
        >
          Delete
        </button>
      </div>
    </article>
  );
};
