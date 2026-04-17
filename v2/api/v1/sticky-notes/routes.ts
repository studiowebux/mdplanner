// Sticky Note + Sticky Board CRUD routes — OpenAPIHono router consumed by api/mod.ts.
// Board routes: /boards, /boards/:boardId
// Note routes (board-scoped): /:boardId/notes, /:boardId/notes/:id, /:boardId/notes/:id/position, /:boardId/notes/:id/size
// Legacy compat: GET / redirects to /default/notes

import { createRoute, OpenAPIHono, z } from "@hono/zod-openapi";
import {
  getStickyBoardService,
  getStickyNoteServiceForBoard,
} from "../../../singletons/services.ts";
import { publish } from "../../../singletons/event-bus.ts";
import {
  CreateStickyBoardSchema,
  CreateStickyNoteSchema,
  ListStickyBoardOptionsSchema,
  ListStickyNoteOptionsSchema,
  StickyBoardSchema,
  StickyNoteSchema,
  UpdatePositionSchema,
  UpdateSizeSchema,
  UpdateStickyBoardSchema,
  UpdateStickyNoteSchema,
} from "../../../types/sticky-note.types.ts";
import { ErrorSchema, IdParam, notFound } from "../../../types/api.ts";

export const stickyNotesRouter = new OpenAPIHono();

const BoardIdParam = z.object({
  boardId: z.string().openapi({ param: { name: "boardId", in: "path" } }),
});

const BoardNoteIdParam = z.object({
  boardId: z.string().openapi({ param: { name: "boardId", in: "path" } }),
  id: z.string().openapi({ param: { name: "id", in: "path" } }),
});

// ---------------------------------------------------------------------------
// Legacy compat: GET / → redirect to /default/notes
// ---------------------------------------------------------------------------

stickyNotesRouter.get("/", (c) => {
  return c.redirect("/api/v1/sticky-notes/default/notes", 302);
});

// ---------------------------------------------------------------------------
// Board routes
// ---------------------------------------------------------------------------

const listBoardsRoute = createRoute({
  method: "get",
  path: "/boards",
  tags: ["Sticky Boards"],
  summary: "List all sticky note boards",
  operationId: "listStickyBoards",
  request: { query: ListStickyBoardOptionsSchema },
  responses: {
    200: {
      content: { "application/json": { schema: z.array(StickyBoardSchema) } },
      description: "List of boards",
    },
  },
});

stickyNotesRouter.openapi(listBoardsRoute, async (c) => {
  const { q } = c.req.valid("query");
  const boards = await getStickyBoardService().list({ q });
  return c.json(boards, 200);
});

const getBoardRoute = createRoute({
  method: "get",
  path: "/boards/{boardId}",
  tags: ["Sticky Boards"],
  summary: "Get board by ID",
  operationId: "getStickyBoard",
  request: { params: BoardIdParam },
  responses: {
    200: {
      content: { "application/json": { schema: StickyBoardSchema } },
      description: "Board",
    },
    404: {
      content: { "application/json": { schema: ErrorSchema } },
      description: "Not found",
    },
  },
});

stickyNotesRouter.openapi(getBoardRoute, async (c) => {
  const { boardId } = c.req.valid("param");
  const board = await getStickyBoardService().getById(boardId);
  if (!board) return c.json(notFound("STICKY_BOARD", boardId), 404);
  return c.json(board, 200);
});

const createBoardRoute = createRoute({
  method: "post",
  path: "/boards",
  tags: ["Sticky Boards"],
  summary: "Create a board",
  operationId: "createStickyBoard",
  request: {
    body: {
      content: { "application/json": { schema: CreateStickyBoardSchema } },
      required: true,
    },
  },
  responses: {
    201: {
      content: { "application/json": { schema: StickyBoardSchema } },
      description: "Created board",
    },
  },
});

stickyNotesRouter.openapi(createBoardRoute, async (c) => {
  const data = c.req.valid("json");
  const board = await getStickyBoardService().create(data);
  publish("sticky_note.board.created");
  return c.json(board, 201);
});

const updateBoardRoute = createRoute({
  method: "put",
  path: "/boards/{boardId}",
  tags: ["Sticky Boards"],
  summary: "Update a board",
  operationId: "updateStickyBoard",
  request: {
    params: BoardIdParam,
    body: {
      content: { "application/json": { schema: UpdateStickyBoardSchema } },
      required: true,
    },
  },
  responses: {
    200: {
      content: { "application/json": { schema: StickyBoardSchema } },
      description: "Updated board",
    },
    404: {
      content: { "application/json": { schema: ErrorSchema } },
      description: "Not found",
    },
  },
});

stickyNotesRouter.openapi(updateBoardRoute, async (c) => {
  const { boardId } = c.req.valid("param");
  const data = c.req.valid("json");
  const board = await getStickyBoardService().update(boardId, data);
  if (!board) return c.json(notFound("STICKY_BOARD", boardId), 404);
  publish("sticky_note.board.updated");
  return c.json(board, 200);
});

const deleteBoardRoute = createRoute({
  method: "delete",
  path: "/boards/{boardId}",
  tags: ["Sticky Boards"],
  summary: "Delete a board",
  operationId: "deleteStickyBoard",
  request: { params: BoardIdParam },
  responses: {
    204: { description: "Deleted" },
    404: {
      content: { "application/json": { schema: ErrorSchema } },
      description: "Not found",
    },
    409: {
      content: { "application/json": { schema: ErrorSchema } },
      description: "Board has notes — delete them first",
    },
  },
});

stickyNotesRouter.openapi(deleteBoardRoute, async (c) => {
  const { boardId } = c.req.valid("param");
  const notes = await getStickyNoteServiceForBoard(boardId).list();
  if (notes.length > 0) {
    return c.json({
      error: "BOARD_NOT_EMPTY",
      message: "Delete all notes on this board first",
    }, 409);
  }
  const ok = await getStickyBoardService().delete(boardId);
  if (!ok) return c.json(notFound("STICKY_BOARD", boardId), 404);
  publish("sticky_note.board.deleted");
  return new Response(null, { status: 204 });
});

// ---------------------------------------------------------------------------
// Note routes (board-scoped)
// ---------------------------------------------------------------------------

const listNotesRoute = createRoute({
  method: "get",
  path: "/{boardId}/notes",
  tags: ["Sticky Notes"],
  summary: "List sticky notes on a board",
  operationId: "listStickyNotes",
  request: { params: BoardIdParam, query: ListStickyNoteOptionsSchema },
  responses: {
    200: {
      content: { "application/json": { schema: z.array(StickyNoteSchema) } },
      description: "List of sticky notes",
    },
  },
});

stickyNotesRouter.openapi(listNotesRoute, async (c) => {
  const { boardId } = c.req.valid("param");
  const { color, q, project } = c.req.valid("query");
  const notes = await getStickyNoteServiceForBoard(boardId).list({
    color,
    q,
    project,
  });
  return c.json(notes, 200);
});

const getNoteRoute = createRoute({
  method: "get",
  path: "/{boardId}/notes/{id}",
  tags: ["Sticky Notes"],
  summary: "Get sticky note by ID",
  operationId: "getStickyNote",
  request: { params: BoardNoteIdParam },
  responses: {
    200: {
      content: { "application/json": { schema: StickyNoteSchema } },
      description: "Sticky note",
    },
    404: {
      content: { "application/json": { schema: ErrorSchema } },
      description: "Not found",
    },
  },
});

stickyNotesRouter.openapi(getNoteRoute, async (c) => {
  const { boardId, id } = c.req.valid("param");
  const note = await getStickyNoteServiceForBoard(boardId).getById(id);
  if (!note) return c.json(notFound("STICKY_NOTE", id), 404);
  return c.json(note, 200);
});

const createNoteRoute = createRoute({
  method: "post",
  path: "/{boardId}/notes",
  tags: ["Sticky Notes"],
  summary: "Create a sticky note",
  operationId: "createStickyNote",
  request: {
    params: BoardIdParam,
    body: {
      content: { "application/json": { schema: CreateStickyNoteSchema } },
      required: true,
    },
  },
  responses: {
    201: {
      content: { "application/json": { schema: StickyNoteSchema } },
      description: "Created sticky note",
    },
  },
});

stickyNotesRouter.openapi(createNoteRoute, async (c) => {
  const { boardId } = c.req.valid("param");
  const data = c.req.valid("json");
  const note = await getStickyNoteServiceForBoard(boardId).create(data);
  publish("sticky_note.created");
  return c.json(note, 201);
});

const updateNoteRoute = createRoute({
  method: "put",
  path: "/{boardId}/notes/{id}",
  tags: ["Sticky Notes"],
  summary: "Update a sticky note",
  operationId: "updateStickyNote",
  request: {
    params: BoardNoteIdParam,
    body: {
      content: { "application/json": { schema: UpdateStickyNoteSchema } },
      required: true,
    },
  },
  responses: {
    200: {
      content: { "application/json": { schema: StickyNoteSchema } },
      description: "Updated sticky note",
    },
    404: {
      content: { "application/json": { schema: ErrorSchema } },
      description: "Not found",
    },
  },
});

stickyNotesRouter.openapi(updateNoteRoute, async (c) => {
  const { boardId, id } = c.req.valid("param");
  const data = c.req.valid("json");
  const note = await getStickyNoteServiceForBoard(boardId).update(id, data);
  if (!note) return c.json(notFound("STICKY_NOTE", id), 404);
  publish("sticky_note.updated");
  return c.json(note, 200);
});

const updatePositionRoute = createRoute({
  method: "patch",
  path: "/{boardId}/notes/{id}/position",
  tags: ["Sticky Notes"],
  summary: "Update sticky note canvas position",
  operationId: "updateStickyNotePosition",
  request: {
    params: BoardNoteIdParam,
    body: {
      content: { "application/json": { schema: UpdatePositionSchema } },
      required: true,
    },
  },
  responses: {
    200: {
      content: { "application/json": { schema: StickyNoteSchema } },
      description: "Updated sticky note",
    },
    404: {
      content: { "application/json": { schema: ErrorSchema } },
      description: "Not found",
    },
  },
});

stickyNotesRouter.openapi(updatePositionRoute, async (c) => {
  const { boardId, id } = c.req.valid("param");
  const position = c.req.valid("json");
  const note = await getStickyNoteServiceForBoard(boardId).updatePosition(
    id,
    position,
  );
  if (!note) return c.json(notFound("STICKY_NOTE", id), 404);
  publish("sticky_note.moved", { id, x: note.position.x, y: note.position.y });
  return c.json(note, 200);
});

const updateSizeRoute = createRoute({
  method: "patch",
  path: "/{boardId}/notes/{id}/size",
  tags: ["Sticky Notes"],
  summary: "Update sticky note canvas size",
  operationId: "updateStickyNoteSize",
  request: {
    params: BoardNoteIdParam,
    body: {
      content: { "application/json": { schema: UpdateSizeSchema } },
      required: true,
    },
  },
  responses: {
    200: {
      content: { "application/json": { schema: StickyNoteSchema } },
      description: "Updated sticky note",
    },
    404: {
      content: { "application/json": { schema: ErrorSchema } },
      description: "Not found",
    },
  },
});

stickyNotesRouter.openapi(updateSizeRoute, async (c) => {
  const { boardId, id } = c.req.valid("param");
  const size = c.req.valid("json");
  const note = await getStickyNoteServiceForBoard(boardId).updateSize(id, size);
  if (!note) return c.json(notFound("STICKY_NOTE", id), 404);
  publish("sticky_note.moved", {
    id,
    width: note.size?.width,
    height: note.size?.height,
  });
  return c.json(note, 200);
});

const deleteNoteRoute = createRoute({
  method: "delete",
  path: "/{boardId}/notes/{id}",
  tags: ["Sticky Notes"],
  summary: "Delete a sticky note",
  operationId: "deleteStickyNote",
  request: { params: BoardNoteIdParam },
  responses: {
    204: { description: "Deleted" },
    404: {
      content: { "application/json": { schema: ErrorSchema } },
      description: "Not found",
    },
  },
});

stickyNotesRouter.openapi(deleteNoteRoute, async (c) => {
  const { boardId, id } = c.req.valid("param");
  const ok = await getStickyNoteServiceForBoard(boardId).delete(id);
  if (!ok) return c.json(notFound("STICKY_NOTE", id), 404);
  publish("sticky_note.deleted");
  return new Response(null, { status: 204 });
});
