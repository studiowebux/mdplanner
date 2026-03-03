/**
 * MCP tools for mindmap operations.
 * Tools: list_mindmaps, get_mindmap, create_mindmap, update_mindmap, delete_mindmap
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { ProjectManager } from "../../lib/project-manager.ts";
import { MindmapNode } from "../../lib/types.ts";
import { err, ok } from "./utils.ts";

export function registerMindmapTools(
  server: McpServer,
  pm: ProjectManager,
): void {
  const parser = pm.getActiveParser();

  server.registerTool(
    "list_mindmaps",
    {
      description: "List all mindmaps in the project.",
      inputSchema: {},
    },
    async () => {
      const info = await parser.readProjectInfo();
      return ok(info.mindmaps);
    },
  );

  server.registerTool(
    "get_mindmap",
    {
      description: "Get a single mindmap by its ID.",
      inputSchema: { id: z.string().describe("Mindmap ID") },
    },
    async ({ id }) => {
      const info = await parser.readProjectInfo();
      const mindmap = info.mindmaps.find((m) => m.id === id);
      if (!mindmap) return err(`Mindmap '${id}' not found`);
      return ok(mindmap);
    },
  );

  server.registerTool(
    "create_mindmap",
    {
      description: "Create a new mindmap.",
      inputSchema: {
        title: z.string().describe("Mindmap title"),
        nodes: z.array(z.any()).optional().describe(
          "Initial node tree. Each node: { id, text, level, children: [], parent? }",
        ),
      },
    },
    async ({ title, nodes }) => {
      const id = await parser.addMindmap({
        title,
        nodes: (nodes ?? []) as MindmapNode[],
      });
      return ok({ id });
    },
  );

  server.registerTool(
    "update_mindmap",
    {
      description: "Update an existing mindmap's title or node tree.",
      inputSchema: {
        id: z.string().describe("Mindmap ID"),
        title: z.string().optional(),
        nodes: z.array(z.any()).optional().describe(
          "Full replacement node tree",
        ),
      },
    },
    async ({ id, title, nodes }) => {
      const success = await parser.updateMindmap(id, {
        ...(title !== undefined && { title }),
        ...(nodes !== undefined && { nodes: nodes as MindmapNode[] }),
      });
      if (!success) return err(`Mindmap '${id}' not found`);
      return ok({ success: true });
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
