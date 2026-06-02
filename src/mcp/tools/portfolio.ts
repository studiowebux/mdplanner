// MCP tools for portfolio operations — thin wrappers over PortfolioService.
// All Zod schemas derived from types/portfolio.types.ts — single source of truth.

import { z } from "@hono/zod-openapi";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { getPortfolioService } from "../../singletons/services.ts";
import {
  AddStatusUpdateSchema,
  CreatePortfolioItemSchema,
  PORTFOLIO_STATUSES,
  PortfolioItemSchema,
  UpdatePortfolioItemSchema,
} from "../../types/portfolio.types.ts";
import { err, ok } from "../utils.ts";

export function registerPortfolioTools(server: McpServer): void {
  const service = getPortfolioService();

  server.registerTool(
    "list_portfolio",
    {
      description:
        "List all portfolio projects, optionally filtered by status.",
      inputSchema: {
        status: z.enum(PORTFOLIO_STATUSES).optional().describe(
          "Filter by status",
        ),
      },
    },
    async ({ status }) => {
      let items = await service.list();
      if (status) items = items.filter((i) => i.status === status);
      return ok(items);
    },
  );

  server.registerTool(
    "get_portfolio_item",
    {
      description: "Get a single portfolio project by its ID.",
      inputSchema: {
        id: PortfolioItemSchema.shape.id.describe("Portfolio item ID"),
      },
    },
    async ({ id }) => {
      const item = await service.getById(id);
      if (!item) return err(`Portfolio item '${id}' not found`);
      return ok(item);
    },
  );

  server.registerTool(
    "get_portfolio_by_name",
    {
      description:
        "Get a portfolio project by name (case-insensitive). Prefer this over list_portfolio when the name is known.",
      inputSchema: {
        name: PortfolioItemSchema.shape.name.describe("Portfolio item name"),
      },
    },
    async ({ name }) => {
      const item = await service.getByName(name);
      if (!item) return err(`Portfolio item '${name}' not found`);
      return ok(item);
    },
  );

  server.registerTool(
    "get_portfolio_summary",
    {
      description:
        "Get aggregated portfolio statistics: total count, breakdown by status and category, average progress, total revenue, total expenses.",
      inputSchema: {},
    },
    async () => {
      const items = await service.list();
      const byStatus: Record<string, number> = {};
      const byCategory: Record<string, number> = {};
      let totalRevenue = 0;
      let totalExpenses = 0;
      let progressSum = 0;

      for (const item of items) {
        byStatus[item.status] = (byStatus[item.status] ?? 0) + 1;
        byCategory[item.category] = (byCategory[item.category] ?? 0) + 1;
        totalRevenue += item.revenue ?? 0;
        totalExpenses += item.expenses ?? 0;
        progressSum += item.progress ?? 0;
      }

      return ok({
        total: items.length,
        byStatus,
        byCategory,
        avgProgress: items.length > 0
          ? Math.round(progressSum / items.length)
          : 0,
        totalRevenue,
        totalExpenses,
      });
    },
  );

  server.registerTool(
    "create_portfolio_item",
    {
      description: "Create a new portfolio project.",
      inputSchema: CreatePortfolioItemSchema.shape,
    },
    async (args) => {
      const existing = await service.getByName(args.name);
      if (existing) {
        return err(`Portfolio item '${args.name}' already exists`);
      }
      const item = await service.create(args);
      return ok({ id: item.id });
    },
  );

  server.registerTool(
    "update_portfolio_item",
    {
      description: "Update an existing portfolio project's fields.",
      inputSchema: {
        id: PortfolioItemSchema.shape.id.describe("Portfolio item ID"),
        ...UpdatePortfolioItemSchema.shape,
      },
    },
    async ({ id, ...fields }) => {
      const item = await service.update(id, fields);
      if (!item) return err(`Portfolio item '${id}' not found`);
      return ok({ success: true });
    },
  );

  server.registerTool(
    "delete_portfolio_item",
    {
      description: "Delete a portfolio project by ID.",
      inputSchema: {
        id: PortfolioItemSchema.shape.id.describe("Portfolio item ID"),
      },
    },
    async ({ id }) => {
      const success = await service.delete(id);
      if (!success) return err(`Portfolio item '${id}' not found`);
      return ok({ success: true });
    },
  );

  server.registerTool(
    "add_portfolio_status_update",
    {
      description:
        "Add a status update entry to a portfolio project's timeline.",
      inputSchema: {
        id: PortfolioItemSchema.shape.id.describe("Portfolio item ID"),
        ...AddStatusUpdateSchema.shape,
      },
    },
    async ({ id, message }) => {
      const update = await service.addStatusUpdate(id, message);
      if (!update) return err(`Portfolio item '${id}' not found`);
      return ok(update);
    },
  );

  server.registerTool(
    "delete_portfolio_status_update",
    {
      description: "Delete a status update entry from a portfolio project.",
      inputSchema: {
        id: PortfolioItemSchema.shape.id.describe("Portfolio item ID"),
        updateId: z.string().describe("Status update ID to delete"),
      },
    },
    async ({ id, updateId }) => {
      const success = await service.deleteStatusUpdate(id, updateId);
      if (!success) {
        return err(`Status update '${updateId}' not found on item '${id}'`);
      }
      return ok({ success: true });
    },
  );
}
