// MCP tools for investor operations — thin wrappers over InvestorService.

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { getInvestorService } from "../../singletons/services.ts";
import {
  CreateInvestorSchema,
  InvestorSchema,
  ListInvestorOptionsSchema,
  UpdateInvestorSchema,
} from "../../types/investor.types.ts";
import { err, ok } from "../utils.ts";

export function registerInvestorTools(server: McpServer): void {
  const service = getInvestorService();

  server.registerTool(
    "list_investors",
    {
      description:
        "List all investors. Optionally filter by type, stage, or status.",
      inputSchema: ListInvestorOptionsSchema.shape,
    },
    async (options) => {
      const items = await service.list(options);
      return ok(items);
    },
  );

  server.registerTool(
    "get_investor",
    {
      description: "Get a single investor by its ID.",
      inputSchema: { id: InvestorSchema.shape.id.describe("Investor ID") },
    },
    async ({ id }) => {
      const item = await service.getById(id);
      if (!item) return err(`Investor '${id}' not found`);
      return ok(item);
    },
  );

  server.registerTool(
    "get_investor_by_name",
    {
      description:
        "Get an investor by name (case-insensitive). Prefer this over list_investors when the name is known.",
      inputSchema: {
        name: InvestorSchema.shape.name.describe("Investor name"),
      },
    },
    async ({ name }) => {
      const item = await service.getByName(name);
      if (!item) return err(`Investor '${name}' not found`);
      return ok(item);
    },
  );

  server.registerTool(
    "create_investor",
    {
      description: "Create a new investor record.",
      inputSchema: CreateInvestorSchema.shape,
    },
    async (data) => {
      const item = await service.create(data);
      return ok({ id: item.id });
    },
  );

  server.registerTool(
    "update_investor",
    {
      description: "Update an existing investor's fields.",
      inputSchema: {
        id: InvestorSchema.shape.id.describe("Investor ID"),
        ...UpdateInvestorSchema.shape,
      },
    },
    async ({ id, ...fields }) => {
      const item = await service.update(id, fields);
      if (!item) return err(`Investor '${id}' not found`);
      return ok({ success: true });
    },
  );

  server.registerTool(
    "delete_investor",
    {
      description: "Delete an investor by its ID.",
      inputSchema: { id: InvestorSchema.shape.id.describe("Investor ID") },
    },
    async ({ id }) => {
      const success = await service.delete(id);
      if (!success) return err(`Investor '${id}' not found`);
      return ok({ success: true });
    },
  );
}
