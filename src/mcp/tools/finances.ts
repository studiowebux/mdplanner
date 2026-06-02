// MCP tools for finance operations — thin wrappers over FinanceService.

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { getFinanceService } from "../../singletons/services.ts";
import {
  CreateFinanceSchema,
  FinanceSchema,
  ListFinanceOptionsSchema,
  UpdateFinanceSchema,
} from "../../types/finance.types.ts";
import { err, ok } from "../utils.ts";

export function registerFinanceTools(server: McpServer): void {
  const service = getFinanceService();

  server.registerTool(
    "list_finances",
    {
      description:
        "List all finance entries. Optionally filter by type, project, or date range.",
      inputSchema: ListFinanceOptionsSchema.shape,
    },
    async (options) => {
      const items = await service.list(options);
      return ok(items);
    },
  );

  server.registerTool(
    "get_finance",
    {
      description: "Get a single finance entry by its ID.",
      inputSchema: { id: FinanceSchema.shape.id.describe("Finance entry ID") },
    },
    async ({ id }) => {
      const item = await service.getById(id);
      if (!item) return err(`Finance entry '${id}' not found`);
      return ok(item);
    },
  );

  server.registerTool(
    "get_finance_by_name",
    {
      description:
        "Get a finance entry by its title (case-insensitive). Prefer this over list_finances when the title is known.",
      inputSchema: {
        name: FinanceSchema.shape.title.describe("Finance entry title"),
      },
    },
    async ({ name }) => {
      const item = await service.getByName(name);
      if (!item) return err(`Finance entry '${name}' not found`);
      return ok(item);
    },
  );

  server.registerTool(
    "get_finance_summary",
    {
      description:
        "Get an income/expense summary for a project, optionally scoped to a date range.",
      inputSchema: {
        from: z.string().optional().describe("Start date (YYYY-MM-DD)"),
        to: z.string().optional().describe("End date (YYYY-MM-DD)"),
      },
    },
    async ({ from, to }) => {
      const summary = await service.getSummary({ from, to });
      return ok(summary);
    },
  );

  server.registerTool(
    "create_finance",
    {
      description: "Create a new finance entry (income or expense).",
      inputSchema: CreateFinanceSchema.shape,
    },
    async (data) => {
      const item = await service.create(data);
      return ok({ id: item.id });
    },
  );

  server.registerTool(
    "update_finance",
    {
      description: "Update an existing finance entry's fields.",
      inputSchema: {
        id: FinanceSchema.shape.id.describe("Finance entry ID"),
        ...UpdateFinanceSchema.shape,
      },
    },
    async ({ id, ...fields }) => {
      const item = await service.update(id, fields);
      if (!item) return err(`Finance entry '${id}' not found`);
      return ok({ success: true });
    },
  );

  server.registerTool(
    "delete_finance",
    {
      description: "Delete a finance entry by its ID.",
      inputSchema: {
        id: FinanceSchema.shape.id.describe("Finance entry ID"),
      },
    },
    async ({ id }) => {
      const success = await service.delete(id);
      if (!success) return err(`Finance entry '${id}' not found`);
      return ok({ success: true });
    },
  );
}
