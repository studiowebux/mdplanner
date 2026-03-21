// MCP tools for note operations — thin wrappers over NoteService.
// All Zod schemas derived from types/note.types.ts — single source of truth.

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { getNoteService } from "../../singletons/services.ts";
import {
  CreateNoteSchema,
  ListNoteOptionsSchema,
  NoteSchema,
  UpdateNoteSchema,
} from "../../types/note.types.ts";
import { err, ok } from "../utils.ts";

export function registerNoteTools(server: McpServer): void {
  const service = getNoteService();

  // ── list_notes ──────────────────────────────────────────────────────────
  server.registerTool(
    "list_notes",
    {
      description:
        "List all notes in the project. Returns stubs (id, title, project, dates) — use get_note for full content.",
      inputSchema: ListNoteOptionsSchema.shape,
    },
    async ({ search, project }) => {
      const notes = await service.list({ search, project });
      return ok(notes.map((n) => ({
        id: n.id,
        title: n.title,
        project: n.project,
        createdAt: n.createdAt,
        updatedAt: n.updatedAt,
      })));
    },
  );

  // ── get_note ────────────────────────────────────────────────────────────
  server.registerTool(
    "get_note",
    {
      description: "Get a single note by its ID, including full content.",
      inputSchema: { id: NoteSchema.shape.id.describe("Note ID") },
    },
    async ({ id }) => {
      const note = await service.getById(id);
      if (!note) return err(`Note '${id}' not found`);
      return ok(note);
    },
  );

  // ── get_note_by_name ────────────────────────────────────────────────────
  server.registerTool(
    "get_note_by_name",
    {
      description:
        "Get a note by its title (case-insensitive). Prefer this over list_notes when the exact title is known.",
      inputSchema: { name: z.string().describe("Note title") },
    },
    async ({ name }) => {
      const note = await service.getByName(name);
      if (!note) return err(`Note '${name}' not found`);
      return ok(note);
    },
  );

  // ── get_notes_batch ─────────────────────────────────────────────────────
  server.registerTool(
    "get_notes_batch",
    {
      description:
        "Fetch multiple notes by ID in one call. Returns full content for each found note and lists IDs that were not found. " +
        "Use this after get_context_pack returns note stubs to avoid N sequential get_note round-trips.",
      inputSchema: {
        ids: z.array(z.string()).min(1).describe(
          "Array of note IDs to fetch",
        ),
      },
    },
    async ({ ids }) => {
      const notes = await service.getBatch(ids);
      const foundIds = new Set(notes.map((n) => n.id));
      const notFound = ids.filter((id) => !foundIds.has(id));
      return ok({ notes, notFound });
    },
  );

  // ── create_note ─────────────────────────────────────────────────────────
  server.registerTool(
    "create_note",
    {
      description: "Create a new note.",
      inputSchema: CreateNoteSchema.shape,
    },
    async (data) => {
      const note = await service.create(data);
      return ok({ id: note.id });
    },
  );

  // ── update_note ─────────────────────────────────────────────────────────
  server.registerTool(
    "update_note",
    {
      description: "Update an existing note's title, content, or project.",
      inputSchema: {
        id: NoteSchema.shape.id.describe("Note ID"),
        ...UpdateNoteSchema.shape,
      },
    },
    async ({ id, ...fields }) => {
      const note = await service.update(id, fields);
      if (!note) return err(`Note '${id}' not found`);
      return ok({ success: true });
    },
  );

  // ── delete_note ─────────────────────────────────────────────────────────
  server.registerTool(
    "delete_note",
    {
      description: "Delete a note by its ID.",
      inputSchema: { id: NoteSchema.shape.id.describe("Note ID") },
    },
    async ({ id }) => {
      const success = await service.delete(id);
      if (!success) return err(`Note '${id}' not found`);
      return ok({ success: true });
    },
  );
}
