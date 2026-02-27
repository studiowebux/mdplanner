/**
 * MCP tools for portfolio operations.
 * Tools: list_portfolio, get_portfolio_item, create_portfolio_item, update_portfolio_item, delete_portfolio_item
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { ProjectManager } from "../../lib/project-manager.ts";
import { err, ok } from "./utils.ts";

export function registerPortfolioTools(
  server: McpServer,
  pm: ProjectManager,
): void {
  const parser = pm.getActiveParser();

  server.registerTool(
    "list_portfolio",
    {
      description: "List all portfolio projects.",
      inputSchema: {
        status: z.string().optional().describe(
          "Filter by status (e.g. active, completed, archived)",
        ),
      },
    },
    async ({ status }) => {
      const items = await parser.readPortfolioItems();
      return ok(status ? items.filter((i) => i.status === status) : items);
    },
  );

  server.registerTool(
    "get_portfolio_item",
    {
      description: "Get a single portfolio project by its ID.",
      inputSchema: { id: z.string().describe("Portfolio item ID") },
    },
    async ({ id }) => {
      const item = await parser.readPortfolioItem(id);
      if (!item) return err(`Portfolio item '${id}' not found`);
      return ok(item);
    },
  );

  server.registerTool(
    "create_portfolio_item",
    {
      description: "Create a new portfolio project.",
      inputSchema: {
        name: z.string().describe("Project name"),
        description: z.string().optional(),
        status: z.string().optional().describe(
          "Status (e.g. active, completed, archived, production, maintenance, cancelled)",
        ),
        category: z.string().optional(),
        license: z.string().optional(),
        start_date: z.string().optional().describe("YYYY-MM-DD"),
        end_date: z.string().optional().describe("YYYY-MM-DD"),
        team: z.array(z.string()).optional().describe(
          "Team member names or person IDs",
        ),
        tech_stack: z.array(z.string()).optional(),
      },
    },
    async (
      {
        name,
        description,
        status,
        category,
        license,
        start_date,
        end_date,
        team,
        tech_stack,
      },
    ) => {
      const item = await parser.createPortfolioItem({
        name,
        status: status ?? "active",
        category: category ?? "",
        ...(description && { description }),
        ...(license && { license }),
        ...(start_date && { startDate: start_date }),
        ...(end_date && { endDate: end_date }),
        ...(team?.length && { team }),
      });
      return ok({ id: item.id });
    },
  );

  server.registerTool(
    "update_portfolio_item",
    {
      description: "Update an existing portfolio project's fields.",
      inputSchema: {
        id: z.string().describe("Portfolio item ID"),
        name: z.string().optional(),
        description: z.string().optional(),
        status: z.string().optional(),
        category: z.string().optional(),
        license: z.string().optional(),
        start_date: z.string().optional(),
        end_date: z.string().optional(),
        team: z.array(z.string()).optional(),
        tech_stack: z.array(z.string()).optional(),
      },
    },
    async ({ id, ...updates }) => {
      const result = await parser.updatePortfolioItem(id, updates);
      if (!result) return err(`Portfolio item '${id}' not found`);
      return ok({ success: true });
    },
  );

  server.registerTool(
    "delete_portfolio_item",
    {
      description: "Delete a portfolio project by its ID.",
      inputSchema: { id: z.string().describe("Portfolio item ID") },
    },
    async ({ id }) => {
      const success = await parser.deletePortfolioItem(id);
      if (!success) return err(`Portfolio item '${id}' not found`);
      return ok({ success: true });
    },
  );
}
