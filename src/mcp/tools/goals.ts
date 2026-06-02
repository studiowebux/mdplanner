// MCP tools for goal operations — thin wrappers over GoalService.

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { getGoalService } from "../../singletons/services.ts";
import {
  CreateGoalSchema,
  GoalSchema,
  ListGoalOptionsSchema,
  UpdateGoalSchema,
} from "../../types/goal.types.ts";
import { err, ok } from "../utils.ts";

export function registerGoalTools(server: McpServer): void {
  const service = getGoalService();

  server.registerTool(
    "list_goals",
    {
      description:
        "List all goals in the project. Optionally filter by status, type, or project.",
      inputSchema: ListGoalOptionsSchema.shape,
    },
    async ({ status, type, project }) => {
      const goals = await service.list({ status, type, project });
      return ok(goals);
    },
  );

  server.registerTool(
    "get_goal",
    {
      description: "Get a single goal by its ID.",
      inputSchema: { id: GoalSchema.shape.id.describe("Goal ID") },
    },
    async ({ id }) => {
      const goal = await service.getById(id);
      if (!goal) return err(`Goal '${id}' not found`);
      return ok(goal);
    },
  );

  server.registerTool(
    "get_goal_by_name",
    {
      description:
        "Get a goal by its title (case-insensitive). Prefer this over list_goals when the title is known.",
      inputSchema: {
        name: GoalSchema.shape.title.describe("Goal title"),
      },
    },
    async ({ name }) => {
      const goal = await service.getByName(name);
      if (!goal) return err(`Goal '${name}' not found`);
      return ok(goal);
    },
  );

  server.registerTool(
    "create_goal",
    {
      description: "Create a new goal in the project.",
      inputSchema: CreateGoalSchema.shape,
    },
    async (data) => {
      const goal = await service.create(data);
      return ok({ id: goal.id });
    },
  );

  server.registerTool(
    "update_goal",
    {
      description: "Update an existing goal's fields.",
      inputSchema: {
        id: GoalSchema.shape.id.describe("Goal ID"),
        ...UpdateGoalSchema.shape,
      },
    },
    async ({ id, ...fields }) => {
      const goal = await service.update(id, fields);
      if (!goal) return err(`Goal '${id}' not found`);
      return ok({ success: true });
    },
  );

  server.registerTool(
    "delete_goal",
    {
      description: "Delete a goal by its ID.",
      inputSchema: { id: GoalSchema.shape.id.describe("Goal ID") },
    },
    async ({ id }) => {
      const success = await service.delete(id);
      if (!success) return err(`Goal '${id}' not found`);
      return ok({ success: true });
    },
  );
}
