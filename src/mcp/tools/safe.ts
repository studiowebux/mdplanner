/**
 * MCP tools for SAFE agreement, investor, and KPI operations.
 * Tools: list_safe, get_safe, create_safe, update_safe, delete_safe,
 *        list_investors, get_investor, create_investor, update_investor, delete_investor,
 *        list_kpis, get_kpi, create_kpi, update_kpi, delete_kpi
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { ProjectManager } from "../../lib/project-manager.ts";
import { err, ok } from "./utils.ts";

const INVESTOR_TYPE = [
  "vc",
  "angel",
  "family_office",
  "corporate",
  "accelerator",
] as const;
const INVESTOR_STAGE = ["lead", "associate", "partner", "passed"] as const;
const INVESTOR_STATUS = [
  "not_started",
  "in_progress",
  "term_sheet",
  "passed",
  "invested",
] as const;
const SAFE_TYPE = ["pre-money", "post-money", "mfn"] as const;
const SAFE_STATUS = ["draft", "signed", "converted"] as const;

export function registerSafeTools(server: McpServer, pm: ProjectManager): void {
  const parser = pm.getActiveParser();

  // --- SAFE Agreements ---

  server.registerTool(
    "list_safe",
    { description: "List all SAFE agreements.", inputSchema: {} },
    async () => ok(await parser.readSafeAgreements()),
  );

  server.registerTool(
    "get_safe",
    {
      description: "Get a single SAFE agreement by its ID.",
      inputSchema: { id: z.string().describe("SAFE agreement ID") },
    },
    async ({ id }) => {
      const items = await parser.readSafeAgreements();
      const item = items.find((i) => i.id === id);
      if (!item) return err(`SAFE agreement '${id}' not found`);
      return ok(item);
    },
  );

  server.registerTool(
    "create_safe",
    {
      description: "Create a new SAFE agreement.",
      inputSchema: {
        investor: z.string().describe("Investor name"),
        amount: z.number().describe("Investment amount"),
        valuation_cap: z.number().optional().describe(
          "Valuation cap (0 if none)",
        ),
        discount: z.number().optional().describe(
          "Discount rate 0-100 (e.g. 20 for 20%)",
        ),
        type: z.enum(SAFE_TYPE).optional().describe(
          "SAFE type (default: post-money)",
        ),
        status: z.enum(SAFE_STATUS).optional().describe(
          "Agreement status (default: draft)",
        ),
        date: z.string().optional().describe("Agreement date (YYYY-MM-DD)"),
        notes: z.string().optional(),
      },
    },
    async (
      { investor, amount, valuation_cap, discount, type, status, date, notes },
    ) => {
      const item = await parser.addSafeAgreement({
        investor,
        amount,
        valuation_cap: valuation_cap ?? 0,
        discount: discount ?? 0,
        type: type ?? "post-money",
        status: status ?? "draft",
        date: date ?? new Date().toISOString().slice(0, 10),
        notes: notes ?? "",
      });
      return ok({ id: item.id });
    },
  );

  server.registerTool(
    "update_safe",
    {
      description: "Update a SAFE agreement.",
      inputSchema: {
        id: z.string().describe("SAFE agreement ID"),
        investor: z.string().optional(),
        amount: z.number().optional(),
        valuation_cap: z.number().optional(),
        discount: z.number().optional(),
        type: z.enum(SAFE_TYPE).optional(),
        status: z.enum(SAFE_STATUS).optional(),
        date: z.string().optional(),
        notes: z.string().optional(),
      },
    },
    async (
      {
        id,
        investor,
        amount,
        valuation_cap,
        discount,
        type,
        status,
        date,
        notes,
      },
    ) => {
      const success = await parser.updateSafeAgreement(id, {
        ...(investor !== undefined && { investor }),
        ...(amount !== undefined && { amount }),
        ...(valuation_cap !== undefined && { valuation_cap }),
        ...(discount !== undefined && { discount }),
        ...(type !== undefined && { type }),
        ...(status !== undefined && { status }),
        ...(date !== undefined && { date }),
        ...(notes !== undefined && { notes }),
      });
      if (!success) return err(`SAFE agreement '${id}' not found`);
      return ok({ success: true });
    },
  );

  server.registerTool(
    "delete_safe",
    {
      description: "Delete a SAFE agreement by its ID.",
      inputSchema: { id: z.string().describe("SAFE agreement ID") },
    },
    async ({ id }) => {
      const success = await parser.deleteSafeAgreement(id);
      if (!success) return err(`SAFE agreement '${id}' not found`);
      return ok({ success: true });
    },
  );

  // --- Investors ---

  server.registerTool(
    "list_investors",
    { description: "List all investors.", inputSchema: {} },
    async () => ok(await parser.readInvestors()),
  );

  server.registerTool(
    "get_investor",
    {
      description: "Get a single investor by their ID.",
      inputSchema: { id: z.string().describe("Investor ID") },
    },
    async ({ id }) => {
      const items = await parser.readInvestors();
      const item = items.find((i) => i.id === id);
      if (!item) return err(`Investor '${id}' not found`);
      return ok(item);
    },
  );

  server.registerTool(
    "create_investor",
    {
      description: "Add a new investor entry to the pipeline.",
      inputSchema: {
        name: z.string().describe("Investor or firm name"),
        type: z.enum(INVESTOR_TYPE).optional().describe(
          "Investor type (default: angel)",
        ),
        stage: z.enum(INVESTOR_STAGE).optional().describe(
          "Internal pipeline stage (default: lead)",
        ),
        status: z.enum(INVESTOR_STATUS).optional().describe(
          "Pipeline status (default: not_started)",
        ),
        amount_target: z.number().optional().describe(
          "Target investment amount",
        ),
        contact: z.string().optional().describe("Primary contact name"),
        intro_date: z.string().optional().describe(
          "Introduction date (YYYY-MM-DD)",
        ),
        last_contact: z.string().optional().describe(
          "Last contact date (YYYY-MM-DD)",
        ),
        notes: z.string().optional(),
      },
    },
    async (
      {
        name,
        type,
        stage,
        status,
        amount_target,
        contact,
        intro_date,
        last_contact,
        notes,
      },
    ) => {
      const today = new Date().toISOString().slice(0, 10);
      const item = await parser.addInvestor({
        name,
        type: type ?? "angel",
        stage: stage ?? "lead",
        status: status ?? "not_started",
        amount_target: amount_target ?? 0,
        contact: contact ?? "",
        intro_date: intro_date ?? today,
        last_contact: last_contact ?? today,
        notes: notes ?? "",
      });
      return ok({ id: item.id });
    },
  );

  server.registerTool(
    "update_investor",
    {
      description: "Update an investor entry.",
      inputSchema: {
        id: z.string().describe("Investor ID"),
        name: z.string().optional(),
        type: z.enum(INVESTOR_TYPE).optional(),
        stage: z.enum(INVESTOR_STAGE).optional(),
        status: z.enum(INVESTOR_STATUS).optional(),
        amount_target: z.number().optional(),
        contact: z.string().optional(),
        intro_date: z.string().optional(),
        last_contact: z.string().optional(),
        notes: z.string().optional(),
      },
    },
    async (
      {
        id,
        name,
        type,
        stage,
        status,
        amount_target,
        contact,
        intro_date,
        last_contact,
        notes,
      },
    ) => {
      const success = await parser.updateInvestor(id, {
        ...(name !== undefined && { name }),
        ...(type !== undefined && { type }),
        ...(stage !== undefined && { stage }),
        ...(status !== undefined && { status }),
        ...(amount_target !== undefined && { amount_target }),
        ...(contact !== undefined && { contact }),
        ...(intro_date !== undefined && { intro_date }),
        ...(last_contact !== undefined && { last_contact }),
        ...(notes !== undefined && { notes }),
      });
      if (!success) return err(`Investor '${id}' not found`);
      return ok({ success: true });
    },
  );

  server.registerTool(
    "delete_investor",
    {
      description: "Delete an investor entry by its ID.",
      inputSchema: { id: z.string().describe("Investor ID") },
    },
    async ({ id }) => {
      const success = await parser.deleteInvestor(id);
      if (!success) return err(`Investor '${id}' not found`);
      return ok({ success: true });
    },
  );

  // --- KPIs ---

  server.registerTool(
    "list_kpis",
    { description: "List all KPI snapshots.", inputSchema: {} },
    async () => ok(await parser.readKpiSnapshots()),
  );

  server.registerTool(
    "get_kpi",
    {
      description: "Get a single KPI snapshot by its ID.",
      inputSchema: { id: z.string().describe("KPI snapshot ID") },
    },
    async ({ id }) => {
      const items = await parser.readKpiSnapshots();
      const item = items.find((i) => i.id === id);
      if (!item) return err(`KPI snapshot '${id}' not found`);
      return ok(item);
    },
  );

  server.registerTool(
    "create_kpi",
    {
      description: "Record a new KPI snapshot.",
      inputSchema: {
        period: z.string().describe("Period label (e.g. 2026-02)"),
        mrr: z.number().optional().describe("Monthly Recurring Revenue"),
        arr: z.number().optional().describe("Annual Recurring Revenue"),
        churn_rate: z.number().optional().describe("Churn rate (0-1)"),
        cac: z.number().optional().describe("Customer Acquisition Cost"),
        ltv: z.number().optional().describe("Lifetime Value"),
        growth_rate: z.number().optional().describe("Growth rate (0-1)"),
        active_users: z.number().optional(),
        nrr: z.number().optional().describe("Net Revenue Retention"),
        gross_margin: z.number().optional().describe("Gross margin (0-1)"),
        notes: z.string().optional(),
      },
    },
    async (
      {
        period,
        mrr,
        arr,
        churn_rate,
        cac,
        ltv,
        growth_rate,
        active_users,
        nrr,
        gross_margin,
        notes,
      },
    ) => {
      const item = await parser.addKpiSnapshot({
        period,
        mrr: mrr ?? 0,
        arr: arr ?? 0,
        churn_rate: churn_rate ?? 0,
        cac: cac ?? 0,
        ltv: ltv ?? 0,
        growth_rate: growth_rate ?? 0,
        active_users: active_users ?? 0,
        nrr: nrr ?? 0,
        gross_margin: gross_margin ?? 0,
        notes: notes ?? "",
      });
      return ok({ id: item.id });
    },
  );

  server.registerTool(
    "update_kpi",
    {
      description: "Update a KPI snapshot.",
      inputSchema: {
        id: z.string().describe("KPI snapshot ID"),
        period: z.string().optional(),
        mrr: z.number().optional(),
        arr: z.number().optional(),
        churn_rate: z.number().optional(),
        cac: z.number().optional(),
        ltv: z.number().optional(),
        growth_rate: z.number().optional(),
        active_users: z.number().optional(),
        nrr: z.number().optional(),
        gross_margin: z.number().optional(),
        notes: z.string().optional(),
      },
    },
    async (
      {
        id,
        period,
        mrr,
        arr,
        churn_rate,
        cac,
        ltv,
        growth_rate,
        active_users,
        nrr,
        gross_margin,
        notes,
      },
    ) => {
      const success = await parser.updateKpiSnapshot(id, {
        ...(period !== undefined && { period }),
        ...(mrr !== undefined && { mrr }),
        ...(arr !== undefined && { arr }),
        ...(churn_rate !== undefined && { churn_rate }),
        ...(cac !== undefined && { cac }),
        ...(ltv !== undefined && { ltv }),
        ...(growth_rate !== undefined && { growth_rate }),
        ...(active_users !== undefined && { active_users }),
        ...(nrr !== undefined && { nrr }),
        ...(gross_margin !== undefined && { gross_margin }),
        ...(notes !== undefined && { notes }),
      });
      if (!success) return err(`KPI snapshot '${id}' not found`);
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
