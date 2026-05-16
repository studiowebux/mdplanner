// MCP tools for vacation request operations — thin wrappers over VacationService.

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { getVacationService } from "../../singletons/services.ts";
import {
  CreateVacationRequestSchema,
  ListVacationOptionsSchema,
  UpdateVacationRequestSchema,
  VacationRequestSchema,
} from "../../types/vacation.types.ts";
import { err, ok } from "../utils.ts";

export function registerVacationTools(server: McpServer): void {
  const service = getVacationService();

  server.registerTool(
    "list_vacations",
    {
      description:
        "List all vacation requests. Optionally filter by person, status, or type.",
      inputSchema: ListVacationOptionsSchema.shape,
    },
    async (options) => {
      const items = await service.list(options);
      return ok(items);
    },
  );

  server.registerTool(
    "get_vacation",
    {
      description: "Get a single vacation request by its ID.",
      inputSchema: {
        id: VacationRequestSchema.shape.id.describe("Vacation request ID"),
      },
    },
    async ({ id }) => {
      const item = await service.getById(id);
      if (!item) return err(`Vacation request '${id}' not found`);
      return ok(item);
    },
  );

  server.registerTool(
    "create_vacation",
    {
      description: "Create a new vacation request.",
      inputSchema: CreateVacationRequestSchema.shape,
    },
    async (data) => {
      const item = await service.create(data);
      return ok({ id: item.id });
    },
  );

  server.registerTool(
    "update_vacation",
    {
      description: "Update an existing vacation request's fields.",
      inputSchema: {
        id: VacationRequestSchema.shape.id.describe("Vacation request ID"),
        ...UpdateVacationRequestSchema.shape,
      },
    },
    async ({ id, ...fields }) => {
      const item = await service.update(id, fields);
      if (!item) return err(`Vacation request '${id}' not found`);
      return ok({ success: true });
    },
  );

  server.registerTool(
    "delete_vacation",
    {
      description: "Delete a vacation request by its ID.",
      inputSchema: {
        id: VacationRequestSchema.shape.id.describe("Vacation request ID"),
      },
    },
    async ({ id }) => {
      const success = await service.delete(id);
      if (!success) return err(`Vacation request '${id}' not found`);
      return ok({ success: true });
    },
  );
}
