// MCP tools for brief operations — thin wrappers over BriefService.

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { getBriefService } from "../../singletons/services.ts";
import {
  BriefSchema,
  CreateBriefSchema,
  ListBriefOptionsSchema,
  UpdateBriefSchema,
} from "../../types/brief.types.ts";
import { err, ok } from "../utils.ts";

export function registerBriefTools(server: McpServer): void {
  const service = getBriefService();

  server.registerTool(
    "list_briefs",
    {
      description: "List all briefs. Optionally filter by search query.",
      inputSchema: ListBriefOptionsSchema.shape,
    },
    async ({ q }) => {
      const items = await service.list({ q });
      return ok(items);
    },
  );

  server.registerTool(
    "get_brief",
    {
      description: "Get a single brief by its ID.",
      inputSchema: { id: BriefSchema.shape.id.describe("Brief ID") },
    },
    async ({ id }) => {
      const item = await service.getById(id);
      if (!item) return err(`Brief '${id}' not found`);
      return ok(item);
    },
  );

  server.registerTool(
    "get_brief_by_name",
    {
      description:
        "Get a brief by its title (case-insensitive). Prefer this over list_briefs when the title is known.",
      inputSchema: {
        name: BriefSchema.shape.title.describe("Brief title"),
      },
    },
    async ({ name }) => {
      const item = await service.getByName(name);
      if (!item) return err(`Brief '${name}' not found`);
      return ok(item);
    },
  );

  server.registerTool(
    "create_brief",
    {
      description: "Create a new brief.",
      inputSchema: CreateBriefSchema.shape,
    },
    async (input) => {
      const item = await service.create(input);
      return ok(item);
    },
  );

  server.registerTool(
    "update_brief",
    {
      description: "Update an existing brief.",
      inputSchema: {
        id: BriefSchema.shape.id.describe("Brief ID"),
        ...UpdateBriefSchema.shape,
      },
    },
    async ({ id, ...data }) => {
      const item = await service.update(id, data);
      if (!item) return err(`Brief '${id}' not found`);
      return ok(item);
    },
  );

  server.registerTool(
    "delete_brief",
    {
      description: "Delete a brief by ID.",
      inputSchema: { id: BriefSchema.shape.id.describe("Brief ID") },
    },
    async ({ id }) => {
      const deleted = await service.delete(id);
      if (!deleted) return err(`Brief '${id}' not found`);
      return ok({ success: true });
    },
  );
}
