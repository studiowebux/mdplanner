// MCP tools for risk operations — thin wrappers over RiskService.

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { getRiskService } from "../../singletons/services.ts";
import {
  CreateRiskSchema,
  ListRiskOptionsSchema,
  RiskSchema,
  UpdateRiskSchema,
} from "../../types/risk.types.ts";
import { err, ok } from "../utils.ts";

export function registerRiskTools(server: McpServer): void {
  const service = getRiskService();

  server.registerTool(
    "list_risks",
    {
      description:
        "List all risks. Optionally filter by category, status, or project.",
      inputSchema: ListRiskOptionsSchema.shape,
    },
    async (options) => {
      const items = await service.list(options);
      return ok(items);
    },
  );

  server.registerTool(
    "get_risk",
    {
      description: "Get a single risk by its ID.",
      inputSchema: { id: RiskSchema.shape.id.describe("Risk ID") },
    },
    async ({ id }) => {
      const item = await service.getById(id);
      if (!item) return err(`Risk '${id}' not found`);
      return ok(item);
    },
  );

  server.registerTool(
    "get_risk_by_name",
    {
      description:
        "Get a risk by its title (case-insensitive). Prefer this over list_risks when the title is known.",
      inputSchema: { name: RiskSchema.shape.title.describe("Risk title") },
    },
    async ({ name }) => {
      const item = await service.getByName(name);
      if (!item) return err(`Risk '${name}' not found`);
      return ok(item);
    },
  );

  server.registerTool(
    "create_risk",
    {
      description: "Create a new risk entry.",
      inputSchema: CreateRiskSchema.shape,
    },
    async (data) => {
      const item = await service.create(data);
      return ok({ id: item.id });
    },
  );

  server.registerTool(
    "update_risk",
    {
      description: "Update an existing risk's fields.",
      inputSchema: {
        id: RiskSchema.shape.id.describe("Risk ID"),
        ...UpdateRiskSchema.shape,
      },
    },
    async ({ id, ...fields }) => {
      const item = await service.update(id, fields);
      if (!item) return err(`Risk '${id}' not found`);
      return ok({ success: true });
    },
  );

  server.registerTool(
    "delete_risk",
    {
      description: "Delete a risk by its ID.",
      inputSchema: { id: RiskSchema.shape.id.describe("Risk ID") },
    },
    async ({ id }) => {
      const success = await service.delete(id);
      if (!success) return err(`Risk '${id}' not found`);
      return ok({ success: true });
    },
  );
}
