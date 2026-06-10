// MCP tools for C4 Architecture — thin wrappers over C4Service.
// All Zod schemas derived from types/c4.types.ts — single source of truth.

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "@hono/zod-openapi";
import { getC4Service } from "../../singletons/services.ts";
import {
  C4_LEVELS,
  C4ComponentSchema,
  C4ConnectionSchema,
  CreateC4ComponentSchema,
  ListC4OptionsSchema,
  UpdateC4ComponentSchema,
} from "../../types/c4.types.ts";
import { err, ok, projectSlim, slimParam } from "../utils.ts";

export function registerC4Tools(server: McpServer): void {
  const service = getC4Service();

  server.registerTool(
    "list_c4_components",
    {
      description:
        "List C4 architecture components. Filter by diagram, level, parent, or full-text query.",
      inputSchema: { ...ListC4OptionsSchema.shape, slim: slimParam },
    },
    async ({ diagram, level, parent, q, slim }) => {
      const items = await service.list({ diagram, level, parent, q });
      return slim
        ? ok(projectSlim(items, ["name", "level", "type", "diagram", "parent"]))
        : ok(items);
    },
  );

  server.registerTool(
    "get_c4_component",
    {
      description: "Get a single C4 component by its ID.",
      inputSchema: {
        id: C4ComponentSchema.shape.id.describe("Component ID"),
      },
    },
    async ({ id }) => {
      const item = await service.getById(id);
      if (!item) return err(`C4 component '${id}' not found`);
      return ok(item);
    },
  );

  server.registerTool(
    "create_c4_component",
    {
      description:
        "Create a new C4 architecture component. diagram defaults to 'default'. position defaults to {x:0, y:0}.",
      inputSchema: CreateC4ComponentSchema.shape,
    },
    async (data) => {
      const item = await service.create(data);
      return ok({ id: item.id });
    },
  );

  server.registerTool(
    "update_c4_component",
    {
      description: "Update an existing C4 component's fields.",
      inputSchema: {
        id: C4ComponentSchema.shape.id.describe("Component ID"),
        ...UpdateC4ComponentSchema.shape,
      },
    },
    async ({ id, ...fields }) => {
      const item = await service.update(id, fields);
      if (!item) return err(`C4 component '${id}' not found`);
      return ok({ success: true });
    },
  );

  server.registerTool(
    "delete_c4_component",
    {
      description: "Delete a C4 component by its ID.",
      inputSchema: {
        id: C4ComponentSchema.shape.id.describe("Component ID"),
      },
    },
    async ({ id }) => {
      const success = await service.delete(id);
      if (!success) return err(`C4 component '${id}' not found`);
      return ok({ success: true });
    },
  );

  server.registerTool(
    "get_c4_by_level",
    {
      description:
        "Get all C4 components at a given level, optionally scoped to a parent component.",
      inputSchema: {
        level: z.enum(C4_LEVELS).describe("C4 level to fetch"),
        parent_id: z.string().optional().describe(
          "Parent component ID to scope results (optional)",
        ),
      },
    },
    async ({ level, parent_id }) => {
      const items = await service.findByLevel(level, parent_id);
      return ok(items);
    },
  );

  server.registerTool(
    "get_c4_by_parent",
    {
      description:
        "Get all direct children of a C4 component (one level down). " +
        "Returns components whose parent field matches the given ID.",
      inputSchema: {
        parent_id: z.string().describe("Parent component ID"),
        diagram: C4ComponentSchema.shape.diagram.optional().describe(
          "Diagram name to scope results (default: 'default')",
        ),
      },
    },
    async ({ parent_id, diagram }) => {
      const items = await service.list({
        parent: parent_id,
        ...(diagram ? { diagram } : {}),
      });
      return ok(items);
    },
  );

  server.registerTool(
    "add_c4_connection",
    {
      description:
        "Add a directed connection between two C4 components. Returns the new connection ID.",
      inputSchema: {
        source_id: C4ComponentSchema.shape.id.describe("Source component ID"),
        target_id: C4ComponentSchema.shape.id.describe("Target component ID"),
        label: C4ConnectionSchema.shape.label.describe("Connection label"),
        technology: C4ConnectionSchema.shape.technology.optional().describe(
          "Technology used on this connection (optional)",
        ),
      },
    },
    async ({ source_id, target_id, label, technology }) => {
      const result = await service.addConnection(
        source_id,
        target_id,
        label,
        technology ?? undefined,
      );
      if (!result) return err(`Source component '${source_id}' not found`);
      return ok({ connection_id: result.connectionId });
    },
  );

  server.registerTool(
    "remove_c4_connection",
    {
      description: "Remove a connection by its ID.",
      inputSchema: {
        connection_id: C4ConnectionSchema.shape.id.describe("Connection ID"),
      },
    },
    async ({ connection_id }) => {
      const success = await service.removeConnection(connection_id);
      if (!success) return err(`Connection '${connection_id}' not found`);
      return ok({ success: true });
    },
  );
}
