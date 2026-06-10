// MCP tools for risk operations — registered via the shared CRUD factory.

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { getRiskService } from "../../singletons/services.ts";
import {
  CreateRiskSchema,
  ListRiskOptionsSchema,
  RiskSchema,
  UpdateRiskSchema,
} from "../../types/risk.types.ts";
import { registerCrudTools } from "../crud-tools.ts";

export function registerRiskTools(server: McpServer): void {
  registerCrudTools(server, {
    service: getRiskService(),
    notFoundLabel: "Risk",
    idParam: RiskSchema.shape.id.describe("Risk ID"),
    nameParam: RiskSchema.shape.title.describe("Risk title"),
    listSchema: ListRiskOptionsSchema,
    createSchema: CreateRiskSchema,
    updateSchema: UpdateRiskSchema,
    mutationReturn: "id-success",
    tools: {
      list: {
        name: "list_risks",
        description:
          "List all risks. Optionally filter by category, status, or project.",
      },
      get: {
        name: "get_risk",
        description: "Get a single risk by its ID.",
      },
      getByName: {
        name: "get_risk_by_name",
        description:
          "Get a risk by its title (case-insensitive). Prefer this over list_risks when the title is known.",
      },
      create: {
        name: "create_risk",
        description: "Create a new risk entry.",
      },
      update: {
        name: "update_risk",
        description: "Update an existing risk's fields.",
      },
      delete: {
        name: "delete_risk",
        description: "Delete a risk by its ID.",
      },
    },
  });
}
