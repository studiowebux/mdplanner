// MCP tools for investor operations — registered via the shared CRUD factory.

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { getInvestorService } from "../../singletons/services.ts";
import {
  CreateInvestorSchema,
  InvestorSchema,
  ListInvestorOptionsSchema,
  UpdateInvestorSchema,
} from "../../types/investor.types.ts";
import { registerCrudTools } from "../crud-tools.ts";

export function registerInvestorTools(server: McpServer): void {
  registerCrudTools(server, {
    service: getInvestorService(),
    notFoundLabel: "Investor",
    idParam: InvestorSchema.shape.id.describe("Investor ID"),
    nameParam: InvestorSchema.shape.name.describe("Investor name"),
    listSchema: ListInvestorOptionsSchema,
    createSchema: CreateInvestorSchema,
    updateSchema: UpdateInvestorSchema,
    mutationReturn: "id-success",
    slimFields: ["name", "type", "stage", "status"],
    tools: {
      list: {
        name: "list_investors",
        description:
          "List all investors. Optionally filter by type, stage, or status. Pass slim: true to browse with a compact projection.",
      },
      get: {
        name: "get_investor",
        description: "Get a single investor by its ID.",
      },
      getByName: {
        name: "get_investor_by_name",
        description:
          "Get an investor by name (case-insensitive). Prefer this over list_investors when the name is known.",
      },
      create: {
        name: "create_investor",
        description: "Create a new investor record.",
      },
      update: {
        name: "update_investor",
        description: "Update an existing investor's fields.",
      },
      delete: {
        name: "delete_investor",
        description: "Delete an investor by its ID.",
      },
    },
  });
}
