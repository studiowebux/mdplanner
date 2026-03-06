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
      description:
        "List all notes in the project. Filter by title or project to stay focused.",
      inputSchema: {
        search: z.string().optional().describe(
          "Filter by title (case-insensitive substring match)",
        ),
        project: z.string().optional().describe(
          "Filter by portfolio project name (exact match, case-insensitive). Use this to scope notes to a specific codebase or project.",
        ),
      },
    },
    async ({ search, project }) => {
      let notes = await parser.readNotes();
      if (project) {
        const q = project.toLowerCase();
        notes = notes.filter((n) => (n.project || "").toLowerCase() === q);
      }
      if (search) {
        const q = search.toLowerCase();
        notes = notes.filter((n) => n.title.toLowerCase().includes(q));
      }
      return ok(notes.map((n) => ({
        id: n.id,
        title: n.title,
        project: n.project,
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
        project: z.string().optional().describe(
          "Portfolio project name to associate with this note",
        ),
      },
    },
    async ({ title, content, project }) => {
      const id = await parser.addNote({
        title,
        content: content ?? "",
        project,
      });
      return ok({ id });
    },
  );

  server.registerTool(
    "update_note",
    {
      description: "Update an existing note's title, content, or project.",
      inputSchema: {
        id: z.string().describe("Note ID"),
        title: z.string().optional(),
        content: z.string().optional().describe(
          "Full replacement content (markdown)",
        ),
        project: z.string().optional().describe(
          "Portfolio project name to associate with this note",
        ),
      },
    },
    async ({ id, title, content, project }) => {
      const success = await parser.updateNote(id, {
        ...(title !== undefined && { title }),
        ...(content !== undefined && { content }),
        ...(project !== undefined && { project }),
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
