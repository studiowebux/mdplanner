// SWOT MCP tools — thin wrappers over the service layer.

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { getSwotService } from "../../singletons/services.ts";
import {
  CreateSwotSchema,
  ListSwotOptionsSchema,
  SwotSchema,
  UpdateSwotSchema,
} from "../../types/swot.types.ts";
import { err, ok } from "../utils.ts";

export function registerSwotTools(server: McpServer): void {
  const service = getSwotService();

  server.registerTool("list_swot", {
    description:
      "List all SWOT analyses. Optionally filter by project or search query.",
    inputSchema: ListSwotOptionsSchema.shape,
  }, async ({ project, q }) => {
    const items = await service.list({ project, q });
    return ok(items);
  });

  server.registerTool("get_swot", {
    description: "Get a single SWOT analysis by its ID.",
    inputSchema: {
      id: SwotSchema.shape.id.describe("SWOT ID"),
    },
  }, async ({ id }) => {
    const swot = await service.getById(id);
    if (!swot) return err(`SWOT '${id}' not found`);
    return ok(swot);
  });

  server.registerTool("get_swot_by_name", {
    description:
      "Get a SWOT analysis by its title (case-insensitive). Prefer this over list when the name is known.",
    inputSchema: {
      name: SwotSchema.shape.title.describe("SWOT title"),
    },
  }, async ({ name }) => {
    const swot = await service.getByName(name);
    if (!swot) return err(`SWOT '${name}' not found`);
    return ok(swot);
  });

  server.registerTool("create_swot", {
    description:
      "Create a new SWOT analysis. Provide title and optionally date, quadrant items, and project.",
    inputSchema: CreateSwotSchema.shape,
  }, async (data) => {
    const swot = await service.create(data);
    return ok({ id: swot.id });
  });

  server.registerTool("update_swot", {
    description: "Update an existing SWOT analysis's fields.",
    inputSchema: {
      id: SwotSchema.shape.id.describe("SWOT ID"),
      ...UpdateSwotSchema.shape,
    },
  }, async ({ id, ...fields }) => {
    const swot = await service.update(id, fields);
    if (!swot) return err(`SWOT '${id}' not found`);
    return ok({ success: true });
  });

  server.registerTool("delete_swot", {
    description: "Delete a SWOT analysis by its ID.",
    inputSchema: {
      id: SwotSchema.shape.id.describe("SWOT ID"),
    },
  }, async ({ id }) => {
    const success = await service.delete(id);
    if (!success) return err(`SWOT '${id}' not found`);
    return ok({ success: true });
  });
}
