/**
 * MCP tools for note operations.
 * Tools: list_notes, get_note
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { ProjectManager } from "../../lib/project-manager.ts";

function ok(data: unknown) {
  return {
    content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }],
  };
}

function err(message: string) {
  return {
    content: [{ type: "text" as const, text: `Error: ${message}` }],
    isError: true as const,
  };
}

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
}
