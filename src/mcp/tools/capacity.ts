/**
 * MCP tools for capacity planning operations.
 * Tools: list_capacity_plans, get_capacity_plan, create_capacity_plan, delete_capacity_plan
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { ProjectManager } from "../../lib/project-manager.ts";
import { err, ok } from "./utils.ts";

export function registerCapacityTools(
  server: McpServer,
  pm: ProjectManager,
): void {
  const parser = pm.getActiveParser();

  server.registerTool(
    "list_capacity_plans",
    { description: "List all capacity plans.", inputSchema: {} },
    async () => ok(await parser.readCapacityPlans()),
  );

  server.registerTool(
    "get_capacity_plan",
    {
      description: "Get a single capacity plan by its ID.",
      inputSchema: { id: z.string().describe("Capacity plan ID") },
    },
    async ({ id }) => {
      const items = await parser.readCapacityPlans();
      const item = items.find((i) => i.id === id);
      if (!item) return err(`Capacity plan '${id}' not found`);
      return ok(item);
    },
  );

  server.registerTool(
    "create_capacity_plan",
    {
      description: "Create a new capacity plan.",
      inputSchema: {
        title: z.string().describe("Plan title"),
        date: z.string().optional().describe("Date (YYYY-MM-DD)"),
        budgetHours: z.number().optional().describe("Total budget hours"),
      },
    },
    async ({ title, date, budgetHours }) => {
      const item = await parser.addCapacityPlan({
        title,
        date: date ?? new Date().toISOString().slice(0, 10),
        ...(budgetHours !== undefined && { budgetHours }),
        teamMembers: [],
        allocations: [],
      });
      return ok({ id: item.id });
    },
  );

  server.registerTool(
    "delete_capacity_plan",
    {
      description: "Delete a capacity plan by its ID.",
      inputSchema: { id: z.string().describe("Capacity plan ID") },
    },
    async ({ id }) => {
      const success = await parser.deleteCapacityPlan(id);
      if (!success) return err(`Capacity plan '${id}' not found`);
      return ok({ success: true });
    },
  );
}
