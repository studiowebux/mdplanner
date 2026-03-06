/**
 * MCP tools for marketing plan builder operations.
 * Tools: list_marketing_plans, get_marketing_plan, create_marketing_plan,
 *        update_marketing_plan, delete_marketing_plan
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { ProjectManager } from "../../lib/project-manager.ts";
import { err, ok } from "./utils.ts";

const TargetAudienceSchema = z.object({
  name: z.string(),
  description: z.string().optional(),
  size: z.string().optional(),
});

const ChannelSchema = z.object({
  name: z.string(),
  budget: z.number().optional(),
  goals: z.string().optional(),
  status: z.enum(["planned", "active", "paused", "completed"]).optional(),
});

const CampaignSchema = z.object({
  name: z.string(),
  channel: z.string().optional(),
  budget: z.number().optional(),
  start_date: z.string().optional(),
  end_date: z.string().optional(),
  status: z.enum(["planned", "active", "paused", "completed"]).optional(),
  goals: z.string().optional(),
});

const KPITargetSchema = z.object({
  metric: z.string(),
  target: z.number(),
  current: z.number().optional(),
});

export function registerMarketingPlanTools(
  server: McpServer,
  pm: ProjectManager,
): void {
  const parser = pm.getActiveParser();

  server.registerTool(
    "list_marketing_plans",
    {
      description: "List all marketing plans in the project.",
      inputSchema: {},
    },
    async () => ok(await parser.readMarketingPlans()),
  );

  server.registerTool(
    "get_marketing_plan",
    {
      description: "Get a single marketing plan by its ID.",
      inputSchema: { id: z.string().describe("Marketing plan ID") },
    },
    async ({ id }) => {
      const plans = await parser.readMarketingPlans();
      const plan = plans.find((p) => p.id === id);
      if (!plan) return err(`Marketing plan '${id}' not found`);
      return ok(plan);
    },
  );

  server.registerTool(
    "create_marketing_plan",
    {
      description:
        "Create a new marketing plan with strategy, channels, campaigns, and KPI targets.",
      inputSchema: {
        name: z.string().describe("Plan name"),
        description: z.string().optional().describe(
          "Plan description / summary",
        ),
        status: z.enum(["draft", "active", "completed", "archived"]).optional()
          .describe("Plan status (default: draft)"),
        budget_total: z.number().optional().describe("Total budget amount"),
        budget_currency: z.string().optional().describe(
          "Currency code (e.g. USD)",
        ),
        start_date: z.string().optional().describe("Start date (YYYY-MM-DD)"),
        end_date: z.string().optional().describe("End date (YYYY-MM-DD)"),
        target_audiences: z.array(TargetAudienceSchema).optional().describe(
          "Target audience segments",
        ),
        channels: z.array(ChannelSchema).optional().describe(
          "Marketing channels with budget allocation",
        ),
        campaigns: z.array(CampaignSchema).optional().describe(
          "Marketing campaigns",
        ),
        kpi_targets: z.array(KPITargetSchema).optional().describe(
          "KPI targets to track",
        ),
        notes: z.string().optional().describe("Markdown body notes"),
      },
    },
    async ({
      name,
      description,
      status,
      budget_total,
      budget_currency,
      start_date,
      end_date,
      target_audiences,
      channels,
      campaigns,
      kpi_targets,
      notes,
    }) => {
      const plan = await parser.addMarketingPlan({
        name,
        status: status ?? "draft",
        ...(description && { description }),
        ...(budget_total !== undefined && { budgetTotal: budget_total }),
        ...(budget_currency && { budgetCurrency: budget_currency }),
        ...(start_date && { startDate: start_date }),
        ...(end_date && { endDate: end_date }),
        ...(target_audiences?.length && { targetAudiences: target_audiences }),
        ...(channels?.length && { channels }),
        ...(campaigns?.length && { campaigns }),
        ...(kpi_targets?.length && { kpiTargets: kpi_targets }),
        ...(notes && { notes }),
      });
      return ok({ id: plan.id });
    },
  );

  server.registerTool(
    "update_marketing_plan",
    {
      description: "Update an existing marketing plan.",
      inputSchema: {
        id: z.string().describe("Marketing plan ID"),
        name: z.string().optional(),
        description: z.string().optional(),
        status: z.enum(["draft", "active", "completed", "archived"]).optional(),
        budget_total: z.number().optional(),
        budget_currency: z.string().optional(),
        start_date: z.string().optional(),
        end_date: z.string().optional(),
        target_audiences: z.array(TargetAudienceSchema).optional(),
        channels: z.array(ChannelSchema).optional(),
        campaigns: z.array(CampaignSchema).optional(),
        kpi_targets: z.array(KPITargetSchema).optional(),
        notes: z.string().optional(),
      },
    },
    async ({
      id,
      budget_total,
      budget_currency,
      start_date,
      end_date,
      target_audiences,
      kpi_targets,
      ...rest
    }) => {
      const updated = await parser.updateMarketingPlan(id, {
        ...rest,
        ...(budget_total !== undefined && { budgetTotal: budget_total }),
        ...(budget_currency !== undefined && {
          budgetCurrency: budget_currency,
        }),
        ...(start_date !== undefined && { startDate: start_date }),
        ...(end_date !== undefined && { endDate: end_date }),
        ...(target_audiences !== undefined && {
          targetAudiences: target_audiences,
        }),
        ...(kpi_targets !== undefined && { kpiTargets: kpi_targets }),
      });
      if (!updated) return err(`Marketing plan '${id}' not found`);
      return ok({ success: true });
    },
  );

  server.registerTool(
    "delete_marketing_plan",
    {
      description: "Delete a marketing plan by its ID.",
      inputSchema: { id: z.string().describe("Marketing plan ID") },
    },
    async ({ id }) => {
      const success = await parser.deleteMarketingPlan(id);
      if (!success) return err(`Marketing plan '${id}' not found`);
      return ok({ success: true });
    },
  );
}
