// MCP tools for retrospective operations — thin wrappers over RetrospectiveService.

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { defineMcpModule } from "../module.ts";
import { getRetrospectiveService } from "../../singletons/services.ts";
import {
  CreateRetrospectiveSchema,
  ListRetrospectiveOptionsSchema,
  RetrospectiveSchema,
  UpdateRetrospectiveSchema,
} from "../../types/retrospective.types.ts";
import { registerCrudTools } from "../crud-tools.ts";

export function registerRetrospectiveTools(server: McpServer): void {
  registerCrudTools(server, {
    service: getRetrospectiveService(),
    notFoundLabel: "Retrospective",
    idParam: RetrospectiveSchema.shape.id.describe("Retrospective ID"),
    nameParam: RetrospectiveSchema.shape.title.describe("Retrospective title"),
    listSchema: ListRetrospectiveOptionsSchema,
    createSchema: CreateRetrospectiveSchema,
    updateSchema: UpdateRetrospectiveSchema,
    mutationReturn: "entity",
    slimFields: ["title", "status", "date"],
    tools: {
      list: {
        name: "list_retrospectives",
        description:
          "List all retrospectives. Optionally filter by search query or status.",
      },
      get: {
        name: "get_retrospective",
        description: "Get a single retrospective by its ID.",
      },
      getByName: {
        name: "get_retrospective_by_name",
        description:
          "Get a retrospective by its title (case-insensitive). Prefer this over list_retrospectives when the title is known.",
      },
      create: {
        name: "create_retrospective",
        description: "Create a new retrospective.",
      },
      update: {
        name: "update_retrospective",
        description: "Update an existing retrospective.",
      },
      delete: {
        name: "delete_retrospective",
        description: "Delete a retrospective by ID.",
      },
    },
  });
}

export const retrospectiveModule = defineMcpModule({
  feature: "retrospective",
  register: registerRetrospectiveTools,
});
