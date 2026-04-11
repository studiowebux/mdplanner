// MCP tools for sticky note operations — thin wrappers over StickyNoteService.

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { getStickyNoteService } from "../../singletons/services.ts";
import {
  CreateStickyNoteSchema,
  ListStickyNoteOptionsSchema,
  StickyNoteSchema,
  UpdatePositionSchema,
  UpdateSizeSchema,
  UpdateStickyNoteSchema,
} from "../../types/sticky-note.types.ts";
import { err, ok } from "../utils.ts";

export function registerStickyNoteTools(server: McpServer): void {
  const service = getStickyNoteService();

  server.registerTool(
    "list_sticky_notes",
    {
      description:
        "List all sticky notes on the canvas. Optionally filter by color or search content.",
      inputSchema: ListStickyNoteOptionsSchema.shape,
    },
    async ({ color, q, project }) => {
      const notes = await service.list({ color, q, project });
      return ok(notes);
    },
  );

  server.registerTool(
    "get_sticky_note",
    {
      description: "Get a single sticky note by its ID.",
      inputSchema: { id: StickyNoteSchema.shape.id.describe("Sticky note ID") },
    },
    async ({ id }) => {
      const note = await service.getById(id);
      if (!note) return err(`Sticky note '${id}' not found`);
      return ok(note);
    },
  );

  server.registerTool(
    "create_sticky_note",
    {
      description:
        "Create a new sticky note on the canvas. Color defaults to 'yellow'. Position defaults to {x:100, y:100} if omitted.",
      inputSchema: CreateStickyNoteSchema.shape,
    },
    async (data) => {
      const note = await service.create(data);
      return ok({ id: note.id });
    },
  );

  server.registerTool(
    "update_sticky_note",
    {
      description: "Update a sticky note's content, color, position, or size.",
      inputSchema: {
        id: StickyNoteSchema.shape.id.describe("Sticky note ID"),
        ...UpdateStickyNoteSchema.shape,
      },
    },
    async ({ id, ...fields }) => {
      const note = await service.update(id, fields);
      if (!note) return err(`Sticky note '${id}' not found`);
      return ok({ success: true });
    },
  );

  server.registerTool(
    "update_sticky_note_position",
    {
      description: "Move a sticky note to a new canvas position.",
      inputSchema: {
        id: StickyNoteSchema.shape.id.describe("Sticky note ID"),
        ...UpdatePositionSchema.shape,
      },
    },
    async ({ id, x, y }) => {
      const note = await service.updatePosition(id, { x, y });
      if (!note) return err(`Sticky note '${id}' not found`);
      return ok({ success: true });
    },
  );

  server.registerTool(
    "update_sticky_note_size",
    {
      description: "Resize a sticky note on the canvas.",
      inputSchema: {
        id: StickyNoteSchema.shape.id.describe("Sticky note ID"),
        ...UpdateSizeSchema.shape,
      },
    },
    async ({ id, width, height }) => {
      const note = await service.updateSize(id, { width, height });
      if (!note) return err(`Sticky note '${id}' not found`);
      return ok({ success: true });
    },
  );

  server.registerTool(
    "delete_sticky_note",
    {
      description: "Delete a sticky note by its ID.",
      inputSchema: { id: StickyNoteSchema.shape.id.describe("Sticky note ID") },
    },
    async ({ id }) => {
      const success = await service.delete(id);
      if (!success) return err(`Sticky note '${id}' not found`);
      return ok({ success: true });
    },
  );
}
