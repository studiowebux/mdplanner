// Eisenhower MCP tools — thin wrappers over the service layer.

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { defineMcpModule } from "../module.ts";
import { getEisenhowerService } from "../../singletons/services.ts";
import {
  CreateEisenhowerSchema,
  EisenhowerSchema,
  ListEisenhowerOptionsSchema,
  UpdateEisenhowerSchema,
} from "../../types/eisenhower.types.ts";
import { err, ok } from "../utils.ts";

export function registerEisenhowerTools(server: McpServer): void {
  const service = getEisenhowerService();

  server.registerTool("list_eisenhower", {
    description:
      "List all Eisenhower matrices. Optionally filter by project or search query.",
    inputSchema: ListEisenhowerOptionsSchema.shape,
  }, async ({ project, q }) => {
    const items = await service.list({ project, q });
    return ok(items);
  });

  server.registerTool("get_eisenhower", {
    description: "Get a single Eisenhower matrix by its ID.",
    inputSchema: {
      id: EisenhowerSchema.shape.id.describe("Eisenhower ID"),
    },
  }, async ({ id }) => {
    const item = await service.getById(id);
    if (!item) return err(`Eisenhower '${id}' not found`);
    return ok(item);
  });

  server.registerTool("create_eisenhower", {
    description:
      "Create a new Eisenhower matrix. Provide title and optionally date, quadrant items (urgentImportant, notUrgentImportant, urgentNotImportant, notUrgentNotImportant), and project.",
    inputSchema: CreateEisenhowerSchema.shape,
  }, async (data) => {
    const item = await service.create(data);
    return ok({ id: item.id });
  });

  server.registerTool("update_eisenhower", {
    description: "Update an existing Eisenhower matrix's fields.",
    inputSchema: {
      id: EisenhowerSchema.shape.id.describe("Eisenhower ID"),
      ...UpdateEisenhowerSchema.shape,
    },
  }, async ({ id, ...fields }) => {
    const item = await service.update(id, fields);
    if (!item) return err(`Eisenhower '${id}' not found`);
    return ok({ success: true });
  });

  server.registerTool("delete_eisenhower", {
    description: "Delete an Eisenhower matrix by its ID.",
    inputSchema: {
      id: EisenhowerSchema.shape.id.describe("Eisenhower ID"),
    },
  }, async ({ id }) => {
    const success = await service.delete(id);
    if (!success) return err(`Eisenhower '${id}' not found`);
    return ok({ success: true });
  });
}

export const eisenhowerModule = defineMcpModule({
  feature: "eisenhower",
  register: registerEisenhowerTools,
});
