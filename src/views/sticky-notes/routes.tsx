// Sticky Note view routes — board list + per-board canvas.
// GET /sticky-notes              — board browser
// GET /sticky-notes/boards/list  — board card grid partial (SSE refresh target)
// GET /sticky-notes/forms/new-board — sidenav form fragment
// POST /sticky-notes/boards      — create board, return HX-Trigger toast + close
// GET /sticky-notes/:boardId     — canvas for that board

import { Hono } from "hono";
import type { FC } from "hono/jsx";
import type { AppVariables } from "../../types/app.ts";
import {
  getStickyBoardService,
  getStickyNoteServiceForBoard,
} from "../../singletons/services.ts";
import { viewProps } from "../../middleware/view-props.ts";
import { StickyNoteCanvas } from "../components/sticky-note-canvas.tsx";
import { MainLayout } from "../../components/layout/main.tsx";
import { Sidenav } from "../../components/ui/sidenav.tsx";
import { stickyNoteConfig } from "../../domains/sticky-note/config.tsx";
import { hxTrigger } from "../../utils/hx-trigger.ts";
import { publish } from "../../singletons/event-bus.ts";
import { FormTextarea } from "../../components/ui/form-textarea.tsx";

export const stickyNotesRouter = new Hono<{ Variables: AppVariables }>();

// ── Board card grid partial ──────────────────────────────────────────────────
// Returns just the card grid so SSE events can refresh it in-place.
async function boardCardGrid() {
  const boardService = getStickyBoardService();
  const boards = await boardService.list();
  const boardsWithCounts = await Promise.all(
    boards.map(async (board) => {
      const noteCount = await getStickyNoteServiceForBoard(board.id).count();
      return { board, noteCount };
    }),
  );

  if (boardsWithCounts.length === 0) {
    return (
      <div id="board-card-grid" class="empty-state">
        <p class="empty-state__message">No boards yet.</p>
      </div>
    );
  }

  return (
    <div id="board-card-grid" class="card-grid">
      {boardsWithCounts.map(({ board, noteCount }) => (
        <a
          key={board.id}
          href={`/sticky-notes/${board.id}`}
          class="board-card"
        >
          <div class="board-card__title">{board.title}</div>
          {board.description && (
            <div class="board-card__description">{board.description}</div>
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
  );
}

// GET /sticky-notes — board list
stickyNotesRouter.get("/", async (c) => {
  const boardService = getStickyBoardService();
  await boardService.ensureDefaultBoard();
  const props = viewProps(c, "/sticky-notes");
  const grid = await boardCardGrid();

  return c.html(
    <MainLayout
      {...props}
      title="Sticky Notes"
      styles={stickyNoteConfig.styles}
      scripts={stickyNoteConfig.scripts}
    >
      <main
        id="sticky-notes-board-list"
        class="domain-page"
        hx-ext="sse, morph"
        sse-connect="/sse"
        hx-trigger="sse:sticky-note.board.created"
        hx-get="/sticky-notes/boards/list"
        hx-target="#board-card-grid"
        hx-swap="morph:outerHTML"
      >
        <header class="domain-page__header">
          <h1 class="domain-page__title">Sticky Notes</h1>
          <button
            type="button"
            class="btn btn--primary"
            hx-get="/sticky-notes/forms/new-board"
            hx-target="#sticky-notes-form-container"
            hx-swap="innerHTML"
          >
            + New Board
          </button>
        </header>

        {grid}

        <div id="sticky-notes-form-container" />
      </main>
    </MainLayout>,
  );
});

// GET /sticky-notes/boards/list — board card grid partial for SSE refresh
stickyNotesRouter.get("/boards/list", async (c) => {
  const grid = await boardCardGrid();
  return c.html(grid);
});

// New Board sidenav form fragment.
export const NewBoardForm: FC = () => (
  <form hx-post="/sticky-notes/boards" hx-swap="none" class="form">
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
      <FormTextarea
        id="sboard-description"
        name="description"
        placeholder="Optional description"
      />
    </div>
    <div class="form__actions">
      <button type="submit" class="btn btn--primary">Create Board</button>
      <button type="button" class="btn" data-sidenav-close>Cancel</button>
    </div>
  </form>
);

// GET /sticky-notes/forms/new-board — sidenav form fragment
stickyNotesRouter.get("/forms/new-board", (c) => {
  return c.html(
    <Sidenav id="sticky-notes-board-form" title="New Board" open>
      <NewBoardForm />
    </Sidenav>,
  );
});

// POST /sticky-notes/boards — create board
stickyNotesRouter.post("/boards", async (c) => {
  const body = await c.req.parseBody();
  try {
    const title = String(body.title || "").trim();
    const description = String(body.description || "").trim();
    if (!title) {
      return new Response(null, {
        status: 422,
        headers: { "HX-Trigger": hxTrigger("error", "Title is required") },
      });
    }
    await getStickyBoardService().create({ title, description, projects: [] });
    publish("sticky-note.board.created");
    return new Response(null, {
      status: 204,
      headers: { "HX-Trigger": hxTrigger("success", "Board created") },
    });
  } catch (err) {
    const message = err instanceof Error
      ? err.message
      : "Failed to create board";
    return new Response(null, {
      status: 422,
      headers: { "HX-Trigger": hxTrigger("error", message) },
    });
  }
});

// GET /sticky-notes/:boardId — canvas (must be last — wildcard)
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
        boardDescription={board.description}
        nonce={props.nonce}
      />
    </MainLayout>,
  );
});
