/**
 * MCP tools for investor pipeline operations.
 * Tools: list_investors, get_investor, create_investor, update_investor, delete_investor
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { ProjectManager } from "../../lib/project-manager.ts";
import { err, ok } from "./utils.ts";

const InvestorType = z.enum([
  "vc",
  "angel",
  "family_office",
  "corporate",
  "accelerator",
]);
const InvestorStage = z.enum(["lead", "associate", "partner", "passed"]);
const InvestorStatus = z.enum([
  "not_started",
  "in_progress",
  "term_sheet",
  "passed",
  "invested",
]);

export function registerInvestorTools(
  server: McpServer,
  pm: ProjectManager,
): void {
  const parser = pm.getActiveParser();

  server.registerTool(
    "list_investors",
    {
      description: "List all investors in the pipeline.",
      inputSchema: {
        status: InvestorStatus.optional().describe("Filter by status"),
      },
    },
    async ({ status }) => {
      const investors = await parser.readInvestors();
      return ok(
        status ? investors.filter((i) => i.status === status) : investors,
      );
    },
  );

  server.registerTool(
    "get_investor",
    {
      description: "Get a single investor by its ID.",
      inputSchema: { id: z.string().describe("Investor ID") },
    },
    async ({ id }) => {
      const investors = await parser.readInvestors();
      const investor = investors.find((i) => i.id === id);
      if (!investor) return err(`Investor '${id}' not found`);
      return ok(investor);
    },
  );

  server.registerTool(
    "create_investor",
    {
      description: "Add an investor to the pipeline.",
      inputSchema: {
        name: z.string().describe("Investor or firm name"),
        type: InvestorType.optional().describe(
          "Investor type (default: vc)",
        ),
        stage: InvestorStage.optional().describe(
          "Contact stage (default: lead)",
        ),
        status: InvestorStatus.optional().describe(
          "Pipeline status (default: not_started)",
        ),
        amount_target: z.number().optional().describe(
          "Target investment amount (USD)",
        ),
        contact: z.string().optional().describe("Contact person name or email"),
        intro_date: z.string().optional().describe(
          "Date of first introduction (YYYY-MM-DD)",
        ),
        last_contact: z.string().optional().describe(
          "Date of last contact (YYYY-MM-DD)",
        ),
        notes: z.string().optional(),
      },
    },
    async ({
      name,
      type = "vc",
      stage = "lead",
      status = "not_started",
      amount_target = 0,
      contact = "",
      intro_date = "",
      last_contact = "",
      notes = "",
    }) => {
      const investor = await parser.addInvestor({
        name,
        type,
        stage,
        status,
        amount_target,
        contact,
        intro_date,
        last_contact,
        notes,
      });
      return ok({ id: investor.id });
    },
  );

  server.registerTool(
    "update_investor",
    {
      description: "Update an existing investor record.",
      inputSchema: {
        id: z.string().describe("Investor ID"),
        name: z.string().optional(),
        type: InvestorType.optional(),
        stage: InvestorStage.optional(),
        status: InvestorStatus.optional(),
        amount_target: z.number().optional(),
        contact: z.string().optional(),
        intro_date: z.string().optional(),
        last_contact: z.string().optional(),
        notes: z.string().optional(),
      },
    },
    async ({ id, ...updates }) => {
      const updated = await parser.updateInvestor(id, updates);
      if (!updated) return err(`Investor '${id}' not found`);
      return ok({ success: true });
    },
  );

  server.registerTool(
    "delete_investor",
    {
      description: "Delete an investor record by its ID.",
      inputSchema: { id: z.string().describe("Investor ID") },
    },
    async ({ id }) => {
      const success = await parser.deleteInvestor(id);
      if (!success) return err(`Investor '${id}' not found`);
      return ok({ success: true });
    },
  );
}
