/**
 * MCP tools for portfolio operations.
 * Tools: list_portfolio, get_portfolio_item, get_portfolio_summary,
 *        create_portfolio_item, update_portfolio_item, delete_portfolio_item,
 *        add_portfolio_status_update, delete_portfolio_status_update
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
    "get_portfolio_summary",
    {
      description:
        "Get aggregated portfolio statistics: total count, breakdown by status, breakdown by category, average progress, total revenue, total expenses.",
      inputSchema: {},
    },
    async () => ok(await parser.getPortfolioSummary()),
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
        client: z.string().optional().describe("Client name"),
        revenue: z.number().optional().describe("Total revenue"),
        expenses: z.number().optional().describe("Total expenses"),
        progress: z.number().min(0).max(100).optional().describe(
          "Completion percentage (0–100)",
        ),
        kpis: z.array(z.object({
          name: z.string(),
          value: z.union([z.string(), z.number()]),
          target: z.union([z.string(), z.number()]).optional(),
        })).optional().describe("Key performance indicators"),
        urls: z.array(z.object({
          label: z.string(),
          href: z.string(),
        })).optional().describe("Project URLs (website, repo, docs, etc.)"),
        logo: z.string().optional().describe(
          "Logo path (relative to project dir) or external URL",
        ),
        billing_customer_id: z.string().optional().describe(
          "Billing customer ID linking this project to a billing customer",
        ),
        github_repo: z.string().optional().describe(
          "GitHub repository in owner/repo format",
        ),
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
        client,
        revenue,
        expenses,
        progress,
        kpis,
        urls,
        logo,
        billing_customer_id,
        github_repo,
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
        ...(tech_stack?.length && { techStack: tech_stack }),
        ...(client && { client }),
        ...(revenue !== undefined && { revenue }),
        ...(expenses !== undefined && { expenses }),
        ...(progress !== undefined && { progress }),
        ...(kpis?.length && { kpis }),
        ...(urls?.length && { urls }),
        ...(logo && { logo }),
        ...(billing_customer_id && { billingCustomerId: billing_customer_id }),
        ...(github_repo && { githubRepo: github_repo }),
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
        client: z.string().optional(),
        revenue: z.number().optional(),
        expenses: z.number().optional(),
        progress: z.number().min(0).max(100).optional(),
        kpis: z.array(z.object({
          name: z.string(),
          value: z.union([z.string(), z.number()]),
          target: z.union([z.string(), z.number()]).optional(),
        })).optional(),
        urls: z.array(z.object({
          label: z.string(),
          href: z.string(),
        })).optional(),
        logo: z.string().optional(),
        billing_customer_id: z.string().optional(),
        github_repo: z.string().optional(),
      },
    },
    async (
      {
        id,
        tech_stack,
        start_date,
        end_date,
        billing_customer_id,
        github_repo,
        ...rest
      },
    ) => {
      const result = await parser.updatePortfolioItem(id, {
        ...rest,
        ...(tech_stack !== undefined && { techStack: tech_stack }),
        ...(start_date !== undefined && { startDate: start_date }),
        ...(end_date !== undefined && { endDate: end_date }),
        ...(billing_customer_id !== undefined && {
          billingCustomerId: billing_customer_id,
        }),
        ...(github_repo !== undefined && { githubRepo: github_repo }),
      });
      if (!result) return err(`Portfolio item '${id}' not found`);
      return ok({ success: true });
    },
  );

  server.registerTool(
    "add_portfolio_status_update",
    {
      description:
        "Add a status update entry to a portfolio project's timeline.",
      inputSchema: {
        id: z.string().describe("Portfolio item ID"),
        message: z.string().describe("Status update message"),
      },
    },
    async ({ id, message }) => {
      if (!message.trim()) return err("message must not be empty");
      const update = await parser.addPortfolioStatusUpdate(id, message.trim());
      if (!update) return err(`Portfolio item '${id}' not found`);
      return ok({ success: true, update });
    },
  );

  server.registerTool(
    "delete_portfolio_status_update",
    {
      description: "Delete a status update entry from a portfolio project.",
      inputSchema: {
        id: z.string().describe("Portfolio item ID"),
        update_id: z.string().describe("Status update ID to delete"),
      },
    },
    async ({ id, update_id }) => {
      const success = await parser.deletePortfolioStatusUpdate(id, update_id);
      if (!success) return err(`Portfolio item or status update not found`);
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
