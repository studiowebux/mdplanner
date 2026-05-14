// MCP tools for SAFe agreement operations — thin wrappers over SafeService.

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { getSafeService } from "../../singletons/services.ts";
import { SAFE_STATUSES, SAFE_TYPES } from "../../types/safe.types.ts";
import { err, ok } from "../utils.ts";

export function registerSafeTools(server: McpServer): void {
  const service = getSafeService();

  server.registerTool(
    "list_safe",
    {
      description: "List all SAFE agreements.",
      inputSchema: {
        status: z.enum(SAFE_STATUSES).optional().describe(
          "Filter by status: draft, signed, converted",
        ),
        type: z.enum(SAFE_TYPES).optional().describe(
          "Filter by type: pre-money, post-money, mfn",
        ),
        q: z.string().optional().describe(
          "Search query (matches investor, notes)",
        ),
      },
    },
    async ({ status, type, q }) => {
      const items = await service.list({ status, type, q });
      return ok(items);
    },
  );

  server.registerTool(
    "get_safe",
    {
      description: "Get a single SAFE agreement by its ID.",
      inputSchema: {
        id: z.string().describe("SAFE agreement ID"),
      },
    },
    async ({ id }) => {
      const item = await service.getById(id);
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
        amount: z.number().describe("Investment amount (USD)"),
        valuation_cap: z.number().optional().describe(
          "Valuation cap (USD, 0 if none)",
        ),
        discount: z.number().optional().describe(
          "Discount rate 0–100 (e.g. 20 for 20%)",
        ),
        type: z.enum(SAFE_TYPES).optional().describe(
          "SAFE type (default: post-money)",
        ),
        status: z.enum(SAFE_STATUSES).optional().describe(
          "Agreement status (default: draft)",
        ),
        date: z.string().optional().describe("Agreement date (YYYY-MM-DD)"),
        notes: z.string().optional().describe("Additional notes"),
      },
    },
    async (
      { investor, amount, valuation_cap, discount, type, status, date, notes },
    ) => {
      const item = await service.create({
        investor,
        amount,
        valuation_cap: valuation_cap ?? 0,
        discount: discount ?? 0,
        type: type ?? "post-money",
        status: status ?? "draft",
        date: date ?? new Date().toISOString().slice(0, 10),
        notes,
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
        amount: z.number().optional().describe("Investment amount (USD)"),
        valuation_cap: z.number().optional().describe("Valuation cap (USD)"),
        discount: z.number().optional().describe("Discount rate 0–100"),
        type: z.enum(SAFE_TYPES).optional(),
        status: z.enum(SAFE_STATUSES).optional(),
        date: z.string().optional().describe("Agreement date (YYYY-MM-DD)"),
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
      const updated = await service.update(id, {
        ...(investor !== undefined && { investor }),
        ...(amount !== undefined && { amount }),
        ...(valuation_cap !== undefined && { valuation_cap }),
        ...(discount !== undefined && { discount }),
        ...(type !== undefined && { type }),
        ...(status !== undefined && { status }),
        ...(date !== undefined && { date }),
        ...(notes !== undefined && { notes }),
      });
      if (!updated) return err(`SAFE agreement '${id}' not found`);
      return ok({ success: true });
    },
  );

  server.registerTool(
    "delete_safe",
    {
      description: "Delete a SAFE agreement by its ID.",
      inputSchema: {
        id: z.string().describe("SAFE agreement ID"),
      },
    },
    async ({ id }) => {
      const success = await service.delete(id);
      if (!success) return err(`SAFE agreement '${id}' not found`);
      return ok({ success: true });
    },
  );
}
