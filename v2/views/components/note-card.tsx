import type { FC } from "hono/jsx";
import type { Note } from "../../types/note.types.ts";
import { DomainCard } from "../../components/ui/domain-card.tsx";
import { Highlight, highlightHtml } from "../../utils/highlight.tsx";
import { markdownToHtml } from "../../utils/markdown.ts";
import { timeAgo } from "../../utils/time.ts";
import { toKebab } from "../../utils/slug.ts";

type Props = { note: Note; q?: string };

export const NoteCard: FC<Props> = ({ note, q }) => {
  const sectionCount = note.customSections?.length ?? 0;
  const paragraphCount = note.paragraphs?.length ?? 0;
  const contentHtml = markdownToHtml(note.content?.slice(0, 300));

  return (
    <DomainCard
      href={`/notes/${note.id}`}
      name={note.title}
      q={q}
      domain="notes"
      id={note.id}
      customActions={
        <div class="domain-card__actions">
          <button
            class="btn btn--secondary btn--sm"
            type="button"
            hx-get={`/notes/${note.id}/preview`}
            hx-target="#notes-form-container"
            hx-swap="innerHTML"
            data-sidenav-open
          >
            View
          </button>
          <a class="btn btn--secondary btn--sm" href={`/notes/${note.id}`}>
            Edit
          </a>
          <button
            class="btn btn--danger btn--sm"
            type="button"
            hx-delete={`/notes/${note.id}`}
            hx-confirm={`Delete "${note.title}"? This cannot be undone.`}
            hx-swap="none"
          >
            Delete
          </button>
        </div>
      }
    >
      <dl class="domain-card__meta">
        {note.project && (
          <>
            <dt class="domain-card__meta-label">Project</dt>
            <dd class="domain-card__meta-value">
              <a href={`/portfolio/${toKebab(note.project)}`}>
                <Highlight text={note.project} q={q} />
              </a>
            </dd>
          </>
        )}
        <dt class="domain-card__meta-label">Updated</dt>
        <dd class="domain-card__meta-value">{timeAgo(note.updatedAt)}</dd>
        {(paragraphCount > 0 || sectionCount > 0) && (
          <>
            <dt class="domain-card__meta-label">Content</dt>
            <dd class="domain-card__meta-value">
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
    </DomainCard>
  );
};
