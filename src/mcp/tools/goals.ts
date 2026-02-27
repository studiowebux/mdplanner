/**
 * MCP tools for goal operations.
 * Tools: list_goals, get_goal, create_goal, update_goal, delete_goal
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { ProjectManager } from "../../lib/project-manager.ts";
import { err, ok } from "./utils.ts";

const STATUS = [
  "planning",
  "on-track",
  "at-risk",
  "late",
  "success",
  "failed",
] as const;

export function registerGoalTools(server: McpServer, pm: ProjectManager): void {
  const parser = pm.getActiveParser();

  server.registerTool(
    "list_goals",
    {
      description:
        "List all goals in the project. Optionally filter by status.",
      inputSchema: {
        status: z.enum(STATUS).optional().describe("Filter by goal status"),
      },
    },
    async ({ status }) => {
      const goals = await parser.readGoals();
      return ok(status ? goals.filter((g) => g.status === status) : goals);
    },
  );

  server.registerTool(
    "get_goal",
    {
      description: "Get a single goal by its ID.",
      inputSchema: { id: z.string().describe("Goal ID") },
    },
    async ({ id }) => {
      const goals = await parser.readGoals();
      const goal = goals.find((g) => g.id === id);
      if (!goal) return err(`Goal '${id}' not found`);
      return ok(goal);
    },
  );

  server.registerTool(
    "create_goal",
    {
      description: "Create a new goal in the project.",
      inputSchema: {
        title: z.string().describe("Goal title"),
        description: z.string().optional().describe(
          "Goal description (markdown)",
        ),
        status: z.enum(STATUS).optional().describe(
          "Goal status (default: planning)",
        ),
        type: z.enum(["enterprise", "project"]).optional().describe(
          "Goal type (default: project)",
        ),
        kpi: z.string().optional().describe("Key performance indicator"),
        startDate: z.string().optional().describe("Start date (YYYY-MM-DD)"),
        endDate: z.string().optional().describe("End date (YYYY-MM-DD)"),
      },
    },
    async ({ title, description, status, type, kpi, startDate, endDate }) => {
      const id = await parser.addGoal({
        title,
        description: description ?? "",
        status: status ?? "planning",
        type: type ?? "project",
        kpi: kpi ?? "",
        startDate: startDate ?? "",
        endDate: endDate ?? "",
      });
      return ok({ id });
    },
  );

  server.registerTool(
    "update_goal",
    {
      description: "Update an existing goal's fields.",
      inputSchema: {
        id: z.string().describe("Goal ID"),
        title: z.string().optional(),
        description: z.string().optional(),
        status: z.enum(STATUS).optional(),
        type: z.enum(["enterprise", "project"]).optional(),
        kpi: z.string().optional(),
        startDate: z.string().optional(),
        endDate: z.string().optional(),
      },
    },
    async (
      { id, title, description, status, type, kpi, startDate, endDate },
    ) => {
      const success = await parser.updateGoal(id, {
        ...(title !== undefined && { title }),
        ...(description !== undefined && { description }),
        ...(status !== undefined && { status }),
        ...(type !== undefined && { type }),
        ...(kpi !== undefined && { kpi }),
        ...(startDate !== undefined && { startDate }),
        ...(endDate !== undefined && { endDate }),
      });
      if (!success) return err(`Goal '${id}' not found`);
      return ok({ success: true });
    },
  );

  server.registerTool(
    "delete_goal",
    {
      description: "Delete a goal by its ID.",
      inputSchema: { id: z.string().describe("Goal ID") },
    },
    async ({ id }) => {
      const success = await parser.deleteGoal(id);
      if (!success) return err(`Goal '${id}' not found`);
      return ok({ success: true });
    },
  );
}
