// Mindmap MCP tools — thin wrappers over the service layer.

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { getMindmapService } from "../../singletons/services.ts";
import {
  CreateMindmapSchema,
  ListMindmapOptionsSchema,
  MindmapSchema,
  UpdateMindmapSchema,
} from "../../types/mindmap.types.ts";
import { err, ok, projectSlim, slimParam } from "../utils.ts";

export function registerMindmapTools(server: McpServer): void {
  const service = getMindmapService();

  server.registerTool("list_mindmaps", {
    description:
      "List all mindmaps. Optionally filter by project (name) or search query (matches title and node text).",
    inputSchema: { ...ListMindmapOptionsSchema.shape, slim: slimParam },
  }, async ({ project, q, slim }) => {
    const items = await service.list({ project, q });
    return slim ? ok(projectSlim(items, ["title", "project"])) : ok(items);
  });

  server.registerTool("get_mindmap", {
    description: "Get a single mindmap by its ID.",
    inputSchema: {
      id: MindmapSchema.shape.id.describe("Mindmap ID"),
    },
  }, async ({ id }) => {
    const item = await service.getById(id);
    if (!item) return err(`Mindmap '${id}' not found`);
    return ok(item);
  });

  server.registerTool("create_mindmap", {
    description:
      "Create a new mindmap linked to a project. Provide title, project (required), and optionally an indented-bullet tree of nodes and notes.",
    inputSchema: CreateMindmapSchema.shape,
  }, async (data) => {
    const item = await service.create(data);
    return ok({ id: item.id });
  });

  server.registerTool("update_mindmap", {
    description: "Update an existing mindmap's fields.",
    inputSchema: {
      id: MindmapSchema.shape.id.describe("Mindmap ID"),
      ...UpdateMindmapSchema.shape,
    },
  }, async ({ id, ...fields }) => {
    const item = await service.update(id, fields);
    if (!item) return err(`Mindmap '${id}' not found`);
    return ok({ success: true });
  });

  server.registerTool("delete_mindmap", {
    description: "Delete a mindmap by its ID.",
    inputSchema: {
      id: MindmapSchema.shape.id.describe("Mindmap ID"),
    },
  }, async ({ id }) => {
    const success = await service.delete(id);
    if (!success) return err(`Mindmap '${id}' not found`);
    return ok({ success: true });
  });
}
