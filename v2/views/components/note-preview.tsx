// Note preview — read-only rendered content for the sidenav.
// Uses shared NoteBlocks for full enhanced rendering.

import type { FC } from "hono/jsx";
import type { Note } from "../../types/note.types.ts";
import { timeAgo } from "../../utils/time.ts";
import { NoteBlocks } from "./note-blocks.tsx";

type Props = { note: Note };

export const NotePreview: FC<Props> = ({ note }) => {
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
      <NoteBlocks note={note} />
    </div>
  );
};
