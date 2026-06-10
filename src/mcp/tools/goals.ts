// MCP tools for goal operations — registered via the shared CRUD factory.

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { getGoalService } from "../../singletons/services.ts";
import {
  CreateGoalSchema,
  GoalSchema,
  ListGoalOptionsSchema,
  UpdateGoalSchema,
} from "../../types/goal.types.ts";
import { registerCrudTools } from "../crud-tools.ts";

export function registerGoalTools(server: McpServer): void {
  registerCrudTools(server, {
    service: getGoalService(),
    notFoundLabel: "Goal",
    idParam: GoalSchema.shape.id.describe("Goal ID"),
    nameParam: GoalSchema.shape.title.describe("Goal title"),
    listSchema: ListGoalOptionsSchema,
    createSchema: CreateGoalSchema,
    updateSchema: UpdateGoalSchema,
    mutationReturn: "id-success",
    slimFields: ["title", "status", "type", "progress", "project"],
    tools: {
      list: {
        name: "list_goals",
        description:
          "List all goals in the project. Optionally filter by status, type, or project. Pass slim: true to browse with a compact projection.",
      },
      get: { name: "get_goal", description: "Get a single goal by its ID." },
      getByName: {
        name: "get_goal_by_name",
        description:
          "Get a goal by its title (case-insensitive). Prefer this over list_goals when the title is known.",
      },
      create: {
        name: "create_goal",
        description: "Create a new goal in the project.",
      },
      update: {
        name: "update_goal",
        description: "Update an existing goal's fields.",
      },
      delete: { name: "delete_goal", description: "Delete a goal by its ID." },
    },
  });
}
