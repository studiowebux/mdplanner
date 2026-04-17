// Sticky Note canvas — renders all notes as absolutely positioned cards on an
// infinite-feeling workspace. Interactivity (drag, resize, pan, zoom, inline
// edit) is handled by sticky-note-canvas.js after hydration.

import type { FC } from "hono/jsx";
import type { StickyNote } from "../../types/sticky-note.types.ts";

type Props = {
  notes: StickyNote[];
  boardId: string;
  boardTitle: string;
  nonce?: string;
};

type NoteProps = {
  note: StickyNote;
};

const StickyNoteCard: FC<NoteProps> = ({ note }) => {
  const w = note.size?.width ?? 200;
  const h = note.size?.height ?? 160;

  return (
    <div
      class={`sticky-note sticky-note--${note.color}`}
      data-canvas-note
      data-sticky-id={note.id}
      data-sticky-x={note.position.x}
      data-sticky-y={note.position.y}
      data-sticky-w={w}
      data-sticky-h={h}
    >
      <div
        class="sticky-note__handle"
        data-sticky-handle
        aria-label="Drag to move"
      />
      <div
        class="sticky-note__content"
        contenteditable
        data-sticky-content
      >
        {note.content}
      </div>
      <div class="sticky-note__toolbar">
        <div class="sticky-note__colors">
          {(["yellow", "pink", "blue", "green", "purple", "orange"] as const)
            .map(
              (color) => (
                <button
                  type="button"
                  class={`sticky-note__color-dot sticky-note__color-dot--${color}${
                    note.color === color ? " is-active" : ""
                  }`}
                  data-sticky-color={color}
                  aria-label={`Change color to ${color}`}
                />
              ),
            )}
        </div>
        <button
          type="button"
          class="sticky-note__delete"
          data-sticky-delete
          aria-label="Delete note"
          title="Delete"
        >
          &#x2715;
        </button>
      </div>
      <div class="sticky-note__resize-handle" data-sticky-resize />
    </div>
  );
};

export const StickyNoteCanvas: FC<Props> = ({ notes, boardId, boardTitle }) => {
  return (
    <div class="sticky-canvas" data-canvas data-board-id={boardId}>
      <div class="sticky-canvas__toolbar">
        <a href="/sticky-notes" class="btn btn--sm" title="All boards">
          &#8592; Boards
        </a>
        <span class="sticky-canvas__board-title">{boardTitle}</span>
        <button
          type="button"
          class="btn btn--sm"
          data-canvas-zoom-in
          title="Zoom in"
        >
          +
        </button>
        <span class="sticky-canvas__zoom-display" data-canvas-zoom-display>
          100%
        </span>
        <button
          type="button"
          class="btn btn--sm"
          data-canvas-zoom-out
          title="Zoom out"
        >
          −
        </button>
        <button
          type="button"
          class="btn btn--sm"
          data-canvas-fit
          title="Fit all notes to screen"
        >
          &#x26F6;
        </button>
        <button
          type="button"
          class="btn btn--sm btn--primary"
          data-canvas-add
          title="Add sticky note"
        >
          + Add note
        </button>
      </div>
      <div class="sticky-canvas__viewport" data-canvas-viewport>
        <div class="sticky-canvas__board" data-canvas-board>
          {notes.length === 0
            ? (
              <div class="sticky-canvas__empty">
                <p>Double-click anywhere to add a note</p>
              </div>
            )
            : notes.map((note) => <StickyNoteCard key={note.id} note={note} />)}
        </div>
      </div>
    </div>
  );
};
