/**
 * MCP tools for SWOT analysis operations.
 * Tools: list_swot, get_swot, create_swot, update_swot, delete_swot
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { ProjectManager } from "../../lib/project-manager.ts";
import { err, ok } from "./utils.ts";

export function registerSwotTools(server: McpServer, pm: ProjectManager): void {
  const parser = pm.getActiveParser();

  server.registerTool(
    "list_swot",
    {
      description: "List all SWOT analyses in the project.",
      inputSchema: {},
    },
    async () => ok(await parser.readSwotAnalyses()),
  );

  server.registerTool(
    "get_swot",
    {
      description: "Get a single SWOT analysis by its ID.",
      inputSchema: { id: z.string().describe("SWOT analysis ID") },
    },
    async ({ id }) => {
      const analyses = await parser.readSwotAnalyses();
      const a = analyses.find((a) => a.id === id);
      if (!a) return err(`SWOT analysis '${id}' not found`);
      return ok(a);
    },
  );

  server.registerTool(
    "create_swot",
    {
      description: "Create a new SWOT analysis.",
      inputSchema: {
        title: z.string().describe("SWOT analysis title"),
        date: z.string().optional().describe("Date (YYYY-MM-DD)"),
      },
    },
    async ({ title, date }) => {
      const a = await parser.addSwotAnalysis({
        title,
        date: date ?? new Date().toISOString().slice(0, 10),
        strengths: [],
        weaknesses: [],
        opportunities: [],
        threats: [],
      });
      return ok({ id: a.id });
    },
  );

  server.registerTool(
    "update_swot",
    {
      description: "Update a SWOT analysis.",
      inputSchema: {
        id: z.string().describe("SWOT analysis ID"),
        title: z.string().optional(),
        strengths: z.array(z.string()).optional(),
        weaknesses: z.array(z.string()).optional(),
        opportunities: z.array(z.string()).optional(),
        threats: z.array(z.string()).optional(),
      },
    },
    async ({ id, title, strengths, weaknesses, opportunities, threats }) => {
      const success = await parser.updateSwotAnalysis(id, {
        ...(title !== undefined && { title }),
        ...(strengths !== undefined && { strengths }),
        ...(weaknesses !== undefined && { weaknesses }),
        ...(opportunities !== undefined && { opportunities }),
        ...(threats !== undefined && { threats }),
      });
      if (!success) return err(`SWOT analysis '${id}' not found`);
      return ok({ success: true });
    },
  );

  server.registerTool(
    "delete_swot",
    {
      description: "Delete a SWOT analysis by its ID.",
      inputSchema: { id: z.string().describe("SWOT analysis ID") },
    },
    async ({ id }) => {
      const success = await parser.deleteSwotAnalysis(id);
      if (!success) return err(`SWOT analysis '${id}' not found`);
      return ok({ success: true });
    },
  );
}
