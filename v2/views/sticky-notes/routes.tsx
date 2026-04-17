// Sticky Note view routes — board list + per-board canvas.
// GET /sticky-notes          — board browser
// GET /sticky-notes/:boardId — canvas for that board

import { Hono } from "hono";
import type { AppVariables } from "../../types/app.ts";
import {
  getStickyBoardService,
  getStickyNoteServiceForBoard,
} from "../../singletons/services.ts";
import { viewProps } from "../../middleware/view-props.ts";
import { StickyNoteCanvas } from "../components/sticky-note-canvas.tsx";
import { MainLayout } from "../../components/layout/main.tsx";
import { stickyNoteConfig } from "../../domains/sticky-note/config.tsx";

export const stickyNotesRouter = new Hono<{ Variables: AppVariables }>();

// GET /sticky-notes — board list
stickyNotesRouter.get("/", async (c) => {
  const boardService = getStickyBoardService();
  await boardService.ensureDefaultBoard();
  const boards = await boardService.list();

  const boardsWithCounts = await Promise.all(
    boards.map(async (board) => {
      const notes = await getStickyNoteServiceForBoard(board.id).list();
      return { board, noteCount: notes.length };
    }),
  );

  const props = viewProps(c, "/sticky-notes");

  return c.html(
    <MainLayout
      {...props}
      title="Sticky Notes"
      styles={stickyNoteConfig.styles}
      scripts={stickyNoteConfig.scripts}
    >
      <main id="sticky-notes-board-list" class="content-area">
        <div class="content-area__header">
          <h1 class="content-area__title">Sticky Notes</h1>
          <button
            type="button"
            class="btn btn--primary"
            data-sidenav-open="sticky-notes-form-container"
            hx-get="/sticky-notes/forms/new-board"
            hx-target="#sticky-notes-form-container"
            hx-swap="innerHTML"
          >
            + New Board
          </button>
        </div>

        {boardsWithCounts.length === 0
          ? (
            <div class="empty-state">
              <p class="empty-state__message">No boards yet.</p>
            </div>
          )
          : (
            <div class="card-grid">
              {boardsWithCounts.map(({ board, noteCount }) => (
                <a
                  key={board.id}
                  href={`/sticky-notes/${board.id}`}
                  class="board-card"
                >
                  <div class="board-card__title">{board.title}</div>
                  {board.description && (
                    <div class="board-card__description">
                      {board.description}
                    </div>
                  )}
                  <div class="board-card__meta">
                    <span class="board-card__count">
                      {noteCount} note{noteCount !== 1 ? "s" : ""}
                    </span>
                    {board.projects.length > 0 && (
                      <span class="badge badge--neutral board-card__projects">
                        {board.projects.length}{" "}
                        project{board.projects.length !== 1 ? "s" : ""}
                      </span>
                    )}
                  </div>
                </a>
              ))}
            </div>
          )}

        <div id="sticky-notes-form-container" />
      </main>
    </MainLayout>,
  );
});

// GET /sticky-notes/:boardId — canvas
stickyNotesRouter.get("/:boardId", async (c) => {
  const boardId = c.req.param("boardId");
  const board = await getStickyBoardService().getById(boardId);
  if (!board) return c.notFound();

  const notes = await getStickyNoteServiceForBoard(boardId).list();
  const props = viewProps(c, "/sticky-notes");

  return c.html(
    <MainLayout
      {...props}
      title={`${board.title} — Sticky Notes`}
      styles={stickyNoteConfig.styles}
      scripts={stickyNoteConfig.scripts}
    >
      <StickyNoteCanvas
        notes={notes}
        boardId={board.id}
        boardTitle={board.title}
        nonce={props.nonce}
      />
    </MainLayout>,
  );
});

// GET /sticky-notes/forms/new-board — sidenav form fragment
stickyNotesRouter.get("/forms/new-board", (c) => {
  return c.html(
    <form
      hx-post="/api/v1/sticky-notes/boards"
      hx-ext="json-enc"
      hx-swap="none"
      hx-on--htmx-after-request="if(event.detail.successful){ htmx.trigger(document.body, 'sticky_note.board.created'); closeSidenav(); }"
      class="form"
    >
      <div class="form__field">
        <label class="form__label" for="sboard-title">Title</label>
        <input
          id="sboard-title"
          name="title"
          type="text"
          class="form__input"
          required
          placeholder="e.g. Work, Personal"
        />
      </div>
      <div class="form__field">
        <label class="form__label" for="sboard-description">
          Description
        </label>
        <textarea
          id="sboard-description"
          name="description"
          class="form__input form__textarea"
          placeholder="Optional description"
        />
      </div>
      <div class="form__actions">
        <button type="submit" class="btn btn--primary">Create Board</button>
        <button
          type="button"
          class="btn"
          data-sidenav-close
        >
          Cancel
        </button>
      </div>
    </form>,
  );
});
