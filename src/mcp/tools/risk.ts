/**
 * MCP tools for risk analysis operations.
 * Tools: list_risks, get_risk, create_risk, update_risk, delete_risk
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { ProjectManager } from "../../lib/project-manager.ts";
import { err, ok } from "./utils.ts";

export function registerRiskTools(server: McpServer, pm: ProjectManager): void {
  const parser = pm.getActiveParser();

  server.registerTool(
    "list_risks",
    {
      description: "List all risk analyses in the project.",
      inputSchema: {},
    },
    async () => ok(await parser.readRiskAnalyses()),
  );

  server.registerTool(
    "get_risk",
    {
      description: "Get a single risk analysis by its ID.",
      inputSchema: { id: z.string().describe("Risk analysis ID") },
    },
    async ({ id }) => {
      const analyses = await parser.readRiskAnalyses();
      const a = analyses.find((a) => a.id === id);
      if (!a) return err(`Risk analysis '${id}' not found`);
      return ok(a);
    },
  );

  server.registerTool(
    "create_risk",
    {
      description: "Create a new risk analysis.",
      inputSchema: {
        title: z.string().describe("Risk analysis title"),
        date: z.string().optional().describe("Date (YYYY-MM-DD)"),
      },
    },
    async ({ title, date }) => {
      const a = await parser.addRiskAnalysis({
        title,
        date: date ?? new Date().toISOString().slice(0, 10),
        highImpactHighProb: [],
        highImpactLowProb: [],
        lowImpactHighProb: [],
        lowImpactLowProb: [],
      });
      return ok({ id: a.id });
    },
  );

  server.registerTool(
    "update_risk",
    {
      description: "Update a risk analysis title or quadrant items.",
      inputSchema: {
        id: z.string().describe("Risk analysis ID"),
        title: z.string().optional(),
        highImpactHighProb: z.array(z.string()).optional().describe(
          "High impact, high probability risks",
        ),
        highImpactLowProb: z.array(z.string()).optional().describe(
          "High impact, low probability risks",
        ),
        lowImpactHighProb: z.array(z.string()).optional().describe(
          "Low impact, high probability risks",
        ),
        lowImpactLowProb: z.array(z.string()).optional().describe(
          "Low impact, low probability risks",
        ),
      },
    },
    async (
      {
        id,
        title,
        highImpactHighProb,
        highImpactLowProb,
        lowImpactHighProb,
        lowImpactLowProb,
      },
    ) => {
      const success = await parser.updateRiskAnalysis(id, {
        ...(title !== undefined && { title }),
        ...(highImpactHighProb !== undefined && { highImpactHighProb }),
        ...(highImpactLowProb !== undefined && { highImpactLowProb }),
        ...(lowImpactHighProb !== undefined && { lowImpactHighProb }),
        ...(lowImpactLowProb !== undefined && { lowImpactLowProb }),
      });
      if (!success) return err(`Risk analysis '${id}' not found`);
      return ok({ success: true });
    },
  );

  server.registerTool(
    "delete_risk",
    {
      description: "Delete a risk analysis by its ID.",
      inputSchema: { id: z.string().describe("Risk analysis ID") },
    },
    async ({ id }) => {
      const success = await parser.deleteRiskAnalysis(id);
      if (!success) return err(`Risk analysis '${id}' not found`);
      return ok({ success: true });
    },
  );
}
