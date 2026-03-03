/**
 * MCP tools for KPI snapshot operations.
 * Tools: list_kpis, create_kpi, update_kpi, delete_kpi
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { ProjectManager } from "../../lib/project-manager.ts";
import { err, ok } from "./utils.ts";

export function registerKpiTools(
  server: McpServer,
  pm: ProjectManager,
): void {
  const parser = pm.getActiveParser();

  server.registerTool(
    "list_kpis",
    {
      description: "List all KPI snapshots.",
      inputSchema: {},
    },
    async () => ok(await parser.readKpiSnapshots()),
  );

  server.registerTool(
    "create_kpi",
    {
      description: "Create a new KPI snapshot for a reporting period.",
      inputSchema: {
        period: z.string().describe(
          "Reporting period label (e.g. '2026-Q1', '2026-03')",
        ),
        mrr: z.number().optional().describe("Monthly Recurring Revenue (USD)"),
        churn_rate: z.number().optional().describe(
          "Monthly churn rate (percentage)",
        ),
        ltv: z.number().optional().describe("Customer Lifetime Value (USD)"),
        cac: z.number().optional().describe(
          "Customer Acquisition Cost (USD)",
        ),
        growth_rate: z.number().optional().describe(
          "Month-over-month growth rate (percentage)",
        ),
        active_users: z.number().optional().describe(
          "Active user count at end of period",
        ),
        nrr: z.number().optional().describe(
          "Net Revenue Retention (percentage)",
        ),
        gross_margin: z.number().optional().describe(
          "Gross margin (percentage)",
        ),
        notes: z.string().optional(),
      },
    },
    async ({
      period,
      mrr = 0,
      churn_rate = 0,
      ltv = 0,
      cac = 0,
      growth_rate = 0,
      active_users = 0,
      nrr = 0,
      gross_margin = 0,
      notes = "",
    }) => {
      const snapshot = await parser.addKpiSnapshot({
        period,
        mrr,
        arr: mrr * 12,
        churn_rate,
        ltv,
        cac,
        growth_rate,
        active_users,
        nrr,
        gross_margin,
        notes,
      });
      return ok({ id: snapshot.id });
    },
  );

  server.registerTool(
    "update_kpi",
    {
      description: "Update an existing KPI snapshot.",
      inputSchema: {
        id: z.string().describe("KPI snapshot ID"),
        period: z.string().optional(),
        mrr: z.number().optional(),
        churn_rate: z.number().optional(),
        ltv: z.number().optional(),
        cac: z.number().optional(),
        growth_rate: z.number().optional(),
        active_users: z.number().optional(),
        nrr: z.number().optional(),
        gross_margin: z.number().optional(),
        notes: z.string().optional(),
      },
    },
    async ({ id, ...updates }) => {
      // Recalculate arr if mrr is being updated
      const updatePayload = updates.mrr !== undefined
        ? { ...updates, arr: updates.mrr * 12 }
        : updates;
      const updated = await parser.updateKpiSnapshot(id, updatePayload);
      if (!updated) return err(`KPI snapshot '${id}' not found`);
      return ok({ success: true });
    },
  );

  server.registerTool(
    "delete_kpi",
    {
      description: "Delete a KPI snapshot by its ID.",
      inputSchema: { id: z.string().describe("KPI snapshot ID") },
    },
    async ({ id }) => {
      const success = await parser.deleteKpiSnapshot(id);
      if (!success) return err(`KPI snapshot '${id}' not found`);
      return ok({ success: true });
    },
  );
}
