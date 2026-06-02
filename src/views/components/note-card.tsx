import type { FC } from "hono/jsx";
import type { Note } from "../../types/note.types.ts";
import { DomainCard } from "../../components/ui/domain-card.tsx";
import { CardMeta, CardMetaItem } from "./card-meta.tsx";
import { Highlight } from "../../utils/highlight.tsx";
import { markdownToText } from "../../utils/markdown-jsx.tsx";
import { timeAgo } from "../../utils/time.ts";
import { toKebab } from "../../utils/slug.ts";

type Props = { note: Note; q?: string };

export const NoteCard: FC<Props> = ({ note, q }) => {
  const sectionCount = note.customSections?.length ?? 0;
  const paragraphCount = note.paragraphs?.length ?? 0;
  const contentText = markdownToText(note.content?.slice(0, 300));

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
      <CardMeta>
        {note.project && (
          <CardMetaItem label="Project">
            <a href={`/portfolio/${toKebab(note.project)}`}>
              <Highlight text={note.project} q={q} />
            </a>
          </CardMetaItem>
        )}
        <CardMetaItem label="Updated">{timeAgo(note.updatedAt)}</CardMetaItem>
        {(paragraphCount > 0 || sectionCount > 0) && (
          <CardMetaItem label="Content">
            {paragraphCount} block{paragraphCount !== 1 ? "s" : ""}
            {sectionCount > 0 &&
              `, ${sectionCount} section${sectionCount !== 1 ? "s" : ""}`}
          </CardMetaItem>
        )}
      </CardMeta>

      {contentText && (
        <p class="note-card__excerpt">
          <Highlight text={contentText} q={q} />
        </p>
      )}
    </DomainCard>
  );
};
