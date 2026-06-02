// MCP tools for retrospective operations — thin wrappers over RetrospectiveService.

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { getRetrospectiveService } from "../../singletons/services.ts";
import {
  CreateRetrospectiveSchema,
  ListRetrospectiveOptionsSchema,
  RetrospectiveSchema,
  UpdateRetrospectiveSchema,
} from "../../types/retrospective.types.ts";
import { err, ok } from "../utils.ts";

export function registerRetrospectiveTools(server: McpServer): void {
  const service = getRetrospectiveService();

  server.registerTool(
    "list_retrospectives",
    {
      description:
        "List all retrospectives. Optionally filter by search query or status.",
      inputSchema: ListRetrospectiveOptionsSchema.shape,
    },
    async ({ q, status }) => {
      const items = await service.list({ q, status });
      return ok(items);
    },
  );

  server.registerTool(
    "get_retrospective",
    {
      description: "Get a single retrospective by its ID.",
      inputSchema: {
        id: RetrospectiveSchema.shape.id.describe("Retrospective ID"),
      },
    },
    async ({ id }) => {
      const item = await service.getById(id);
      if (!item) return err(`Retrospective '${id}' not found`);
      return ok(item);
    },
  );

  server.registerTool(
    "get_retrospective_by_name",
    {
      description:
        "Get a retrospective by its title (case-insensitive). Prefer this over list_retrospectives when the title is known.",
      inputSchema: {
        name: RetrospectiveSchema.shape.title.describe("Retrospective title"),
      },
    },
    async ({ name }) => {
      const item = await service.getByName(name);
      if (!item) return err(`Retrospective '${name}' not found`);
      return ok(item);
    },
  );

  server.registerTool(
    "create_retrospective",
    {
      description: "Create a new retrospective.",
      inputSchema: CreateRetrospectiveSchema.shape,
    },
    async (input) => {
      const item = await service.create(input);
      return ok(item);
    },
  );

  server.registerTool(
    "update_retrospective",
    {
      description: "Update an existing retrospective.",
      inputSchema: {
        id: RetrospectiveSchema.shape.id.describe("Retrospective ID"),
        ...UpdateRetrospectiveSchema.shape,
      },
    },
    async ({ id, ...data }) => {
      const item = await service.update(id, data);
      if (!item) return err(`Retrospective '${id}' not found`);
      return ok(item);
    },
  );

  server.registerTool(
    "delete_retrospective",
    {
      description: "Delete a retrospective by ID.",
      inputSchema: {
        id: RetrospectiveSchema.shape.id.describe("Retrospective ID"),
      },
    },
    async ({ id }) => {
      const deleted = await service.delete(id);
      if (!deleted) return err(`Retrospective '${id}' not found`);
      return ok({ success: true });
    },
  );
}
