/**
 * MCP tools for C4 architecture diagram operations.
 * Tools: list_c4_components, get_c4_component, create_c4_component,
 *        update_c4_component, delete_c4_component,
 *        add_c4_connection, remove_c4_connection, get_c4_by_level
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { ProjectManager } from "../../lib/project-manager.ts";
import { err, ok } from "./utils.ts";

const C4_LEVEL = ["context", "container", "component", "code"] as const;

export function registerC4Tools(
  server: McpServer,
  pm: ProjectManager,
): void {
  const parser = pm.getActiveParser();

  server.registerTool(
    "list_c4_components",
    {
      description:
        "List all C4 architecture components across all diagram levels.",
      inputSchema: {},
    },
    async () => ok(await parser.readC4Components()),
  );

  server.registerTool(
    "get_c4_component",
    {
      description: "Get a single C4 component by its ID.",
      inputSchema: { id: z.string().describe("Component ID") },
    },
    async ({ id }) => {
      const components = await parser.readC4Components();
      const component = components.find((c) => c.id === id);
      if (!component) return err(`C4 component '${id}' not found`);
      return ok(component);
    },
  );

  server.registerTool(
    "get_c4_by_level",
    {
      description:
        "Get all C4 components at a specific diagram level (context, container, component, code).",
      inputSchema: {
        level: z.enum(C4_LEVEL).describe("C4 diagram level"),
      },
    },
    async ({ level }) => ok(await parser.getC4ByLevel(level)),
  );

  server.registerTool(
    "create_c4_component",
    {
      description: "Create a new C4 architecture component.",
      inputSchema: {
        name: z.string().describe("Component name"),
        level: z.enum(C4_LEVEL).describe("C4 diagram level"),
        type: z.string().describe(
          "Component type (e.g. 'Person', 'System', 'Service', 'Database')",
        ),
        description: z.string().describe("What this component does"),
        technology: z.string().optional().describe(
          "Technology stack (e.g. 'Deno, TypeScript, SQLite')",
        ),
        parent: z.string().optional().describe(
          "Parent component ID (for nesting)",
        ),
        position: z.object({
          x: z.number(),
          y: z.number(),
        }).optional().describe("Canvas position (defaults to 0,0)"),
      },
    },
    async (
      { name, level, type, description, technology, parent, position },
    ) => {
      const component = await parser.addC4Component({
        name,
        level,
        type,
        description,
        ...(technology && { technology }),
        ...(parent && { parent }),
        position: position ?? { x: 0, y: 0 },
      });
      return ok({ id: component.id });
    },
  );

  server.registerTool(
    "update_c4_component",
    {
      description: "Update an existing C4 component's fields.",
      inputSchema: {
        id: z.string().describe("Component ID"),
        name: z.string().optional(),
        level: z.enum(C4_LEVEL).optional(),
        type: z.string().optional(),
        description: z.string().optional(),
        technology: z.string().optional(),
        parent: z.string().optional(),
      },
    },
    async ({ id, ...updates }) => {
      const updated = await parser.updateC4Component(id, updates);
      if (!updated) return err(`C4 component '${id}' not found`);
      return ok({ success: true });
    },
  );

  server.registerTool(
    "delete_c4_component",
    {
      description: "Delete a C4 component by its ID.",
      inputSchema: { id: z.string().describe("Component ID") },
    },
    async ({ id }) => {
      const success = await parser.deleteC4Component(id);
      if (!success) return err(`C4 component '${id}' not found`);
      return ok({ success: true });
    },
  );

  server.registerTool(
    "add_c4_connection",
    {
      description: "Add a connection (dependency) between two C4 components.",
      inputSchema: {
        source_id: z.string().describe("Source component ID"),
        target_id: z.string().describe("Target component ID"),
        label: z.string().describe(
          "Connection label (e.g. 'Uses', 'Reads from', 'Sends events to')",
        ),
      },
    },
    async ({ source_id, target_id, label }) => {
      const updated = await parser.addC4Connection(
        source_id,
        target_id,
        label,
      );
      if (!updated) return err(`C4 component '${source_id}' not found`);
      return ok({ success: true });
    },
  );

  server.registerTool(
    "remove_c4_connection",
    {
      description: "Remove a connection between two C4 components.",
      inputSchema: {
        source_id: z.string().describe("Source component ID"),
        target_id: z.string().describe("Target component ID"),
      },
    },
    async ({ source_id, target_id }) => {
      const updated = await parser.removeC4Connection(source_id, target_id);
      if (!updated) return err(`C4 component '${source_id}' not found`);
      return ok({ success: true });
    },
  );
}
