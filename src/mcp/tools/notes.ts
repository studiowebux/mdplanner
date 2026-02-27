/**
 * MCP tools for note operations.
 * Tools: list_notes, get_note, create_note, update_note, delete_note
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { ProjectManager } from "../../lib/project-manager.ts";
import { err, ok } from "./utils.ts";

export function registerNoteTools(server: McpServer, pm: ProjectManager): void {
  const parser = pm.getActiveParser();

  server.registerTool(
    "list_notes",
    {
      description: "List all notes in the project.",
      inputSchema: {},
    },
    async () => {
      const notes = await parser.readNotes();
      return ok(notes.map((n) => ({
        id: n.id,
        title: n.title,
        createdAt: n.createdAt,
        updatedAt: n.updatedAt,
      })));
    },
  );

  server.registerTool(
    "get_note",
    {
      description: "Get a single note by its ID, including full content.",
      inputSchema: { id: z.string().describe("Note ID") },
    },
    async ({ id }) => {
      const notes = await parser.readNotes();
      const note = notes.find((n) => n.id === id);
      if (!note) return err(`Note '${id}' not found`);
      return ok(note);
    },
  );

  server.registerTool(
    "create_note",
    {
      description: "Create a new note.",
      inputSchema: {
        title: z.string().describe("Note title"),
        content: z.string().optional().describe("Note body (markdown)"),
      },
    },
    async ({ title, content }) => {
      const id = await parser.addNote({ title, content: content ?? "" });
      return ok({ id });
    },
  );

  server.registerTool(
    "update_note",
    {
      description: "Update an existing note's title or content.",
      inputSchema: {
        id: z.string().describe("Note ID"),
        title: z.string().optional(),
        content: z.string().optional().describe(
          "Full replacement content (markdown)",
        ),
      },
    },
    async ({ id, title, content }) => {
      const success = await parser.updateNote(id, {
        ...(title !== undefined && { title }),
        ...(content !== undefined && { content }),
      });
      if (!success) return err(`Note '${id}' not found`);
      return ok({ success: true });
    },
  );

  server.registerTool(
    "delete_note",
    {
      description: "Delete a note by its ID.",
      inputSchema: { id: z.string().describe("Note ID") },
    },
    async ({ id }) => {
      const success = await parser.deleteNote(id);
      if (!success) return err(`Note '${id}' not found`);
      return ok({ success: true });
    },
  );
}
