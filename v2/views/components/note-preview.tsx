// Note preview — read-only rendered markdown for the sidenav.

import type { FC } from "hono/jsx";
import type { Note } from "../../types/note.types.ts";
import { markdownToHtml } from "../../utils/markdown.ts";
import { timeAgo } from "../../utils/time.ts";

type Props = { note: Note };

export const NotePreview: FC<Props> = ({ note }) => {
  const contentHtml = markdownToHtml(note.content);

  return (
    <div class="note-preview">
      <header class="note-preview__header">
        <h2 class="note-preview__title">{note.title}</h2>
        <div class="note-preview__meta">
          {note.project && (
            <span class="note-preview__project">{note.project}</span>
          )}
          <span class="note-preview__updated">
            Updated {timeAgo(note.updatedAt)}
          </span>
        </div>
      </header>

      {contentHtml && (
        <div
          class="note-preview__body markdown-body"
          dangerouslySetInnerHTML={{ __html: contentHtml }}
        />
      )}
    </div>
  );
};
