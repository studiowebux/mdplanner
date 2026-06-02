// MCP tools for sticky note + board operations — thin wrappers over services.

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "@hono/zod-openapi";
import {
  getStickyBoardService,
  getStickyNoteServiceForBoard,
} from "../../singletons/services.ts";
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
} from "../../types/sticky-note.types.ts";
import { err, ok } from "../utils.ts";

const boardIdField = z.string().default("default").describe(
  "Board ID to scope the note to (default: 'default')",
);

export function registerStickyNoteTools(server: McpServer): void {
  // ── Board tools ─────────────────────────────────────────────────────────

  server.registerTool(
    "list_sticky_note_boards",
    {
      description: "List all sticky note boards.",
      inputSchema: ListStickyBoardOptionsSchema.shape,
    },
    async ({ q }) => {
      const boards = await getStickyBoardService().list({ q });
      return ok(boards);
    },
  );

  server.registerTool(
    "get_sticky_note_board",
    {
      description: "Get a sticky note board by its ID.",
      inputSchema: {
        id: StickyBoardSchema.shape.id.describe("Board ID"),
      },
    },
    async ({ id }) => {
      const board = await getStickyBoardService().getById(id);
      if (!board) return err(`Board '${id}' not found`);
      return ok(board);
    },
  );

  server.registerTool(
    "create_sticky_note_board",
    {
      description:
        "Create a new sticky note board. Title is required. Projects is an array of portfolio item IDs.",
      inputSchema: CreateStickyBoardSchema.shape,
    },
    async (data) => {
      const board = await getStickyBoardService().create(data);
      return ok({ id: board.id });
    },
  );

  server.registerTool(
    "update_sticky_note_board",
    {
      description:
        "Update a sticky note board's title, description, or linked projects.",
      inputSchema: {
        id: StickyBoardSchema.shape.id.describe("Board ID"),
        ...UpdateStickyBoardSchema.shape,
      },
    },
    async ({ id, ...fields }) => {
      const board = await getStickyBoardService().update(id, fields);
      if (!board) return err(`Board '${id}' not found`);
      return ok({ success: true });
    },
  );

  server.registerTool(
    "delete_sticky_note_board",
    {
      description:
        "Delete a sticky note board by ID. Returns an error if the board has notes — delete them first.",
      inputSchema: { id: StickyBoardSchema.shape.id.describe("Board ID") },
    },
    async ({ id }) => {
      const notes = await getStickyNoteServiceForBoard(id).list();
      if (notes.length > 0) {
        return err(
          `Board '${id}' has ${notes.length} note(s) — delete them first`,
        );
      }
      const success = await getStickyBoardService().delete(id);
      if (!success) return err(`Board '${id}' not found`);
      return ok({ success: true });
    },
  );

  // ── Note tools ──────────────────────────────────────────────────────────

  server.registerTool(
    "list_sticky_notes",
    {
      description:
        "List sticky notes on a board. Optionally filter by color or search content.",
      inputSchema: {
        board_id: boardIdField,
        ...ListStickyNoteOptionsSchema.shape,
      },
    },
    async ({ board_id, color, q, project }) => {
      const notes = await getStickyNoteServiceForBoard(board_id).list({
        color,
        q,
        project,
      });
      return ok(notes);
    },
  );

  server.registerTool(
    "get_sticky_note",
    {
      description: "Get a single sticky note by its ID.",
      inputSchema: {
        board_id: boardIdField,
        id: StickyNoteSchema.shape.id.describe("Sticky note ID"),
      },
    },
    async ({ board_id, id }) => {
      const note = await getStickyNoteServiceForBoard(board_id).getById(id);
      if (!note) return err(`Sticky note '${id}' not found`);
      return ok(note);
    },
  );

  server.registerTool(
    "create_sticky_note",
    {
      description:
        "Create a new sticky note on a board. Color defaults to 'yellow'. Position defaults to {x:100, y:100} if omitted.",
      inputSchema: {
        board_id: boardIdField,
        ...CreateStickyNoteSchema.shape,
      },
    },
    async ({ board_id, ...data }) => {
      const note = await getStickyNoteServiceForBoard(board_id).create(data);
      return ok({ id: note.id });
    },
  );

  server.registerTool(
    "update_sticky_note",
    {
      description: "Update a sticky note's content, color, position, or size.",
      inputSchema: {
        board_id: boardIdField,
        id: StickyNoteSchema.shape.id.describe("Sticky note ID"),
        ...UpdateStickyNoteSchema.shape,
      },
    },
    async ({ board_id, id, ...fields }) => {
      const note = await getStickyNoteServiceForBoard(board_id).update(
        id,
        fields,
      );
      if (!note) return err(`Sticky note '${id}' not found`);
      return ok({ success: true });
    },
  );

  server.registerTool(
    "update_sticky_note_position",
    {
      description: "Move a sticky note to a new canvas position.",
      inputSchema: {
        board_id: boardIdField,
        id: StickyNoteSchema.shape.id.describe("Sticky note ID"),
        ...UpdatePositionSchema.shape,
      },
    },
    async ({ board_id, id, x, y }) => {
      const note = await getStickyNoteServiceForBoard(board_id).updatePosition(
        id,
        { x, y },
      );
      if (!note) return err(`Sticky note '${id}' not found`);
      return ok({ success: true });
    },
  );

  server.registerTool(
    "update_sticky_note_size",
    {
      description: "Resize a sticky note on the canvas.",
      inputSchema: {
        board_id: boardIdField,
        id: StickyNoteSchema.shape.id.describe("Sticky note ID"),
        ...UpdateSizeSchema.shape,
      },
    },
    async ({ board_id, id, width, height }) => {
      const note = await getStickyNoteServiceForBoard(board_id).updateSize(
        id,
        { width, height },
      );
      if (!note) return err(`Sticky note '${id}' not found`);
      return ok({ success: true });
    },
  );

  server.registerTool(
    "delete_sticky_note",
    {
      description: "Delete a sticky note by its ID.",
      inputSchema: {
        board_id: boardIdField,
        id: StickyNoteSchema.shape.id.describe("Sticky note ID"),
      },
    },
    async ({ board_id, id }) => {
      const success = await getStickyNoteServiceForBoard(board_id).delete(id);
      if (!success) return err(`Sticky note '${id}' not found`);
      return ok({ success: true });
    },
  );
}
