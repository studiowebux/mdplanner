/**
 * MCP tools for SAFE agreement operations.
 * Tools: list_safe, get_safe, create_safe, update_safe, delete_safe
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { ProjectManager } from "../../lib/project-manager.ts";
import { err, ok } from "./utils.ts";

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
}
