/**
 * MCP tools for milestone operations.
 * Tools: list_milestones, get_milestone, create_milestone, update_milestone, delete_milestone
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { ProjectManager } from "../../lib/project-manager.ts";
import { err, ok } from "./utils.ts";

export function registerMilestoneTools(
  server: McpServer,
  pm: ProjectManager,
): void {
  const parser = pm.getActiveParser();

  server.registerTool(
    "list_milestones",
    {
      description: "List all milestones in the project.",
      inputSchema: {},
    },
    async () => ok(await parser.readMilestones()),
  );

  server.registerTool(
    "get_milestone",
    {
      description: "Get a single milestone by its ID.",
      inputSchema: { id: z.string().describe("Milestone ID") },
    },
    async ({ id }) => {
      const milestones = await parser.readMilestones();
      const m = milestones.find((m) => m.id === id);
      if (!m) return err(`Milestone '${id}' not found`);
      return ok(m);
    },
  );

  server.registerTool(
    "create_milestone",
    {
      description: "Create a new milestone.",
      inputSchema: {
        name: z.string().describe("Milestone name"),
        description: z.string().optional(),
        target: z.string().optional().describe("Target date (YYYY-MM-DD)"),
        status: z.enum(["open", "completed"]).optional(),
      },
    },
    async ({ name, description, target, status }) => {
      const m = await parser.addMilestone({
        name,
        ...(description && { description }),
        ...(target && { target }),
        status: status ?? "open",
      });
      return ok({ id: m.id });
    },
  );

  server.registerTool(
    "update_milestone",
    {
      description: "Update an existing milestone's fields.",
      inputSchema: {
        id: z.string().describe("Milestone ID"),
        name: z.string().optional(),
        description: z.string().optional(),
        target: z.string().optional().describe("Target date (YYYY-MM-DD)"),
        status: z.enum(["open", "completed"]).optional(),
      },
    },
    async ({ id, name, description, target, status }) => {
      const success = await parser.updateMilestone(id, {
        ...(name !== undefined && { name }),
        ...(description !== undefined && { description }),
        ...(target !== undefined && { target }),
        ...(status !== undefined && { status }),
      });
      if (!success) return err(`Milestone '${id}' not found`);
      return ok({ success: true });
    },
  );

  server.registerTool(
    "delete_milestone",
    {
      description: "Delete a milestone by its ID.",
      inputSchema: { id: z.string().describe("Milestone ID") },
    },
    async ({ id }) => {
      const success = await parser.deleteMilestone(id);
      if (!success) return err(`Milestone '${id}' not found`);
      return ok({ success: true });
    },
  );
}
