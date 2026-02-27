/**
 * MCP tools for financial period operations.
 * Tools: list_finances, get_finance, create_finance, update_finance, delete_finance
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { ProjectManager } from "../../lib/project-manager.ts";
import { err, ok } from "./utils.ts";

export function registerFinanceTools(
  server: McpServer,
  pm: ProjectManager,
): void {
  const parser = pm.getActiveParser();

  server.registerTool(
    "list_finances",
    { description: "List all financial periods.", inputSchema: {} },
    async () => ok(await parser.readFinancialPeriods()),
  );

  server.registerTool(
    "get_finance",
    {
      description: "Get a single financial period by its ID.",
      inputSchema: { id: z.string().describe("Financial period ID") },
    },
    async ({ id }) => {
      const items = await parser.readFinancialPeriods();
      const item = items.find((i) => i.id === id);
      if (!item) return err(`Financial period '${id}' not found`);
      return ok(item);
    },
  );

  server.registerTool(
    "create_finance",
    {
      description:
        "Create a new financial period. Revenue and expenses are arrays of {category, amount} line items.",
      inputSchema: {
        period: z.string().describe("Period label (e.g. 2026-02 or Q1-2026)"),
        cash_on_hand: z.number().optional().describe(
          "End-of-period cash balance",
        ),
        revenue: z.array(z.object({
          category: z.string(),
          amount: z.number(),
        })).optional().describe("Revenue line items"),
        expenses: z.array(z.object({
          category: z.string(),
          amount: z.number(),
        })).optional().describe("Expense line items"),
        notes: z.string().optional(),
      },
    },
    async ({ period, cash_on_hand, revenue, expenses, notes }) => {
      const item = await parser.addFinancialPeriod({
        period,
        cash_on_hand: cash_on_hand ?? 0,
        revenue: revenue ?? [],
        expenses: expenses ?? [],
        ...(notes !== undefined && { notes }),
      });
      return ok({ id: item.id });
    },
  );

  server.registerTool(
    "update_finance",
    {
      description: "Update a financial period.",
      inputSchema: {
        id: z.string().describe("Financial period ID"),
        period: z.string().optional(),
        cash_on_hand: z.number().optional(),
        revenue: z.array(z.object({
          category: z.string(),
          amount: z.number(),
        })).optional(),
        expenses: z.array(z.object({
          category: z.string(),
          amount: z.number(),
        })).optional(),
        notes: z.string().optional(),
      },
    },
    async ({ id, period, cash_on_hand, revenue, expenses, notes }) => {
      const success = await parser.updateFinancialPeriod(id, {
        ...(period !== undefined && { period }),
        ...(cash_on_hand !== undefined && { cash_on_hand }),
        ...(revenue !== undefined && { revenue }),
        ...(expenses !== undefined && { expenses }),
        ...(notes !== undefined && { notes }),
      });
      if (!success) return err(`Financial period '${id}' not found`);
      return ok({ success: true });
    },
  );

  server.registerTool(
    "delete_finance",
    {
      description: "Delete a financial period by its ID.",
      inputSchema: { id: z.string().describe("Financial period ID") },
    },
    async ({ id }) => {
      const success = await parser.deleteFinancialPeriod(id);
      if (!success) return err(`Financial period '${id}' not found`);
      return ok({ success: true });
    },
  );
}
