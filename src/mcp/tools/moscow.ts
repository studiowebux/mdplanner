/**
 * MCP tools for MoSCoW analysis operations.
 * Tools: list_moscow, get_moscow, create_moscow, update_moscow, delete_moscow
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { ProjectManager } from "../../lib/project-manager.ts";
import { err, ok } from "./utils.ts";

export function registerMoscowTools(
  server: McpServer,
  pm: ProjectManager,
): void {
  const parser = pm.getActiveParser();

  server.registerTool(
    "list_moscow",
    {
      description: "List all MoSCoW analyses in the project.",
      inputSchema: {},
    },
    async () => ok(await parser.readMoscowAnalyses()),
  );

  server.registerTool(
    "get_moscow",
    {
      description: "Get a single MoSCoW analysis by its ID.",
      inputSchema: { id: z.string().describe("MoSCoW analysis ID") },
    },
    async ({ id }) => {
      const analyses = await parser.readMoscowAnalyses();
      const a = analyses.find((a) => a.id === id);
      if (!a) return err(`MoSCoW analysis '${id}' not found`);
      return ok(a);
    },
  );

  server.registerTool(
    "create_moscow",
    {
      description: "Create a new MoSCoW analysis.",
      inputSchema: {
        title: z.string().describe("Analysis title"),
        date: z.string().optional().describe("Date (YYYY-MM-DD)"),
      },
    },
    async ({ title, date }) => {
      const a = await parser.addMoscowAnalysis({
        title,
        date: date ?? new Date().toISOString().slice(0, 10),
        must: [],
        should: [],
        could: [],
        wont: [],
      });
      return ok({ id: a.id });
    },
  );

  server.registerTool(
    "update_moscow",
    {
      description:
        "Update a MoSCoW analysis (title, description, or item lists).",
      inputSchema: {
        id: z.string().describe("MoSCoW analysis ID"),
        title: z.string().optional(),
        description: z.string().optional(),
        must: z.array(z.string()).optional().describe("Must-have items"),
        should: z.array(z.string()).optional().describe("Should-have items"),
        could: z.array(z.string()).optional().describe("Could-have items"),
        wont: z.array(z.string()).optional().describe("Won't-have items"),
      },
    },
    async ({ id, title, description, must, should, could, wont }) => {
      const success = await parser.updateMoscowAnalysis(id, {
        ...(title !== undefined && { title }),
        ...(description !== undefined && { description }),
        ...(must !== undefined && { must }),
        ...(should !== undefined && { should }),
        ...(could !== undefined && { could }),
        ...(wont !== undefined && { wont }),
      });
      if (!success) return err(`MoSCoW analysis '${id}' not found`);
      return ok({ success: true });
    },
  );

  server.registerTool(
    "delete_moscow",
    {
      description: "Delete a MoSCoW analysis by its ID.",
      inputSchema: { id: z.string().describe("MoSCoW analysis ID") },
    },
    async ({ id }) => {
      const success = await parser.deleteMoscowAnalysis(id);
      if (!success) return err(`MoSCoW analysis '${id}' not found`);
      return ok({ success: true });
    },
  );
}
