// MCP tools for brainstorm operations — thin wrappers over BrainstormService.

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { getBrainstormService } from "../../singletons/services.ts";
import {
  BrainstormSchema,
  CreateBrainstormSchema,
  ListBrainstormOptionsSchema,
  UpdateBrainstormSchema,
} from "../../types/brainstorm.types.ts";
import { err, ok } from "../utils.ts";

export function registerBrainstormTools(server: McpServer): void {
  const service = getBrainstormService();

  server.registerTool(
    "list_brainstorms",
    {
      description:
        "List all brainstorms. Optionally filter by tag or search query.",
      inputSchema: ListBrainstormOptionsSchema.shape,
    },
    async ({ tag, q }) => {
      const items = await service.list({ tag, q });
      return ok(items);
    },
  );

  server.registerTool(
    "get_brainstorm",
    {
      description: "Get a single brainstorm by its ID.",
      inputSchema: { id: BrainstormSchema.shape.id.describe("Brainstorm ID") },
    },
    async ({ id }) => {
      const item = await service.getById(id);
      if (!item) return err(`Brainstorm '${id}' not found`);
      return ok(item);
    },
  );

  server.registerTool(
    "get_brainstorm_by_name",
    {
      description:
        "Get a brainstorm by its title (case-insensitive). Prefer this over list_brainstorms when the title is known.",
      inputSchema: {
        name: BrainstormSchema.shape.title.describe("Brainstorm title"),
      },
    },
    async ({ name }) => {
      const item = await service.getByName(name);
      if (!item) return err(`Brainstorm '${name}' not found`);
      return ok(item);
    },
  );

  server.registerTool(
    "create_brainstorm",
    {
      description: "Create a new brainstorm session.",
      inputSchema: CreateBrainstormSchema.shape,
    },
    async (input) => {
      const item = await service.create(input);
      return ok(item);
    },
  );

  server.registerTool(
    "update_brainstorm",
    {
      description: "Update an existing brainstorm.",
      inputSchema: {
        id: BrainstormSchema.shape.id.describe("Brainstorm ID"),
        ...UpdateBrainstormSchema.shape,
      },
    },
    async ({ id, ...data }) => {
      const item = await service.update(id, data);
      if (!item) return err(`Brainstorm '${id}' not found`);
      return ok(item);
    },
  );

  server.registerTool(
    "delete_brainstorm",
    {
      description: "Delete a brainstorm by ID.",
      inputSchema: { id: BrainstormSchema.shape.id.describe("Brainstorm ID") },
    },
    async ({ id }) => {
      const deleted = await service.delete(id);
      if (!deleted) return err(`Brainstorm '${id}' not found`);
      return ok({ success: true });
    },
  );
}
