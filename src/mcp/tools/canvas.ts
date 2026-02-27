/**
 * MCP tools for canvas (sticky notes) and mindmap operations.
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { ProjectManager } from "../../lib/project-manager.ts";
import { err, ok } from "./utils.ts";

export function registerCanvasTools(
  server: McpServer,
  pm: ProjectManager,
): void {
  const parser = pm.getActiveParser();

  // --- Sticky Notes (Canvas) ---

  server.registerTool(
    "list_sticky_notes",
    { description: "List all sticky notes on the canvas.", inputSchema: {} },
    async () => ok(await parser.readStickyNotes()),
  );

  server.registerTool(
    "create_sticky_note",
    {
      description: "Add a new sticky note to the canvas.",
      inputSchema: {
        content: z.string().describe("Note content"),
        color: z.enum(["yellow", "pink", "blue", "green", "purple", "orange"])
          .optional().describe("Note color"),
        x: z.number().optional().describe("X position"),
        y: z.number().optional().describe("Y position"),
      },
    },
    async ({ content, color, x, y }) => {
      const id = await parser.addStickyNote({
        content,
        color: color ?? "yellow",
        position: { x: x ?? 100, y: y ?? 100 },
      });
      return ok({ id });
    },
  );

  server.registerTool(
    "delete_sticky_note",
    {
      description: "Delete a sticky note by its ID.",
      inputSchema: { id: z.string().describe("Sticky note ID") },
    },
    async ({ id }) => {
      const success = await parser.deleteStickyNote(id);
      if (!success) return err(`Sticky note '${id}' not found`);
      return ok({ success: true });
    },
  );

  // --- Mindmaps ---

  server.registerTool(
    "list_mindmaps",
    { description: "List all mindmaps in the project.", inputSchema: {} },
    async () =>
      ok((await parser.readMindmaps()).map((m) => ({
        id: m.id,
        title: m.title,
        nodeCount: m.nodes?.length ?? 0,
      }))),
  );

  server.registerTool(
    "get_mindmap",
    {
      description: "Get a single mindmap by its ID, including all nodes.",
      inputSchema: { id: z.string().describe("Mindmap ID") },
    },
    async ({ id }) => {
      const mindmaps = await parser.readMindmaps();
      const m = mindmaps.find((m) => m.id === id);
      if (!m) return err(`Mindmap '${id}' not found`);
      return ok(m);
    },
  );

  server.registerTool(
    "create_mindmap",
    {
      description: "Create a new mindmap.",
      inputSchema: {
        title: z.string().describe("Mindmap title"),
      },
    },
    async ({ title }) => {
      const id = await parser.addMindmap({ title, nodes: [] });
      return ok({ id });
    },
  );

  server.registerTool(
    "delete_mindmap",
    {
      description: "Delete a mindmap by its ID.",
      inputSchema: { id: z.string().describe("Mindmap ID") },
    },
    async ({ id }) => {
      const success = await parser.deleteMindmap(id);
      if (!success) return err(`Mindmap '${id}' not found`);
      return ok({ success: true });
    },
  );
}
