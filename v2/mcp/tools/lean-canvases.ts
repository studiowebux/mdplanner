// Lean Canvas MCP tools — thin wrappers over the service layer.

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { getLeanCanvasService } from "../../singletons/services.ts";
import {
  CreateLeanCanvasSchema,
  LeanCanvasSchema,
  ListLeanCanvasOptionsSchema,
  UpdateLeanCanvasSchema,
} from "../../types/lean-canvas.types.ts";
import { err, ok } from "../utils.ts";

export function registerLeanCanvasTools(server: McpServer): void {
  const service = getLeanCanvasService();

  server.registerTool("list_lean_canvases", {
    description:
      "List all Lean Canvases. Optionally filter by project or search query.",
    inputSchema: ListLeanCanvasOptionsSchema.shape,
  }, async ({ project, q }) => {
    const items = await service.list({ project, q });
    return ok(items);
  });

  server.registerTool("get_lean_canvas", {
    description: "Get a single Lean Canvas by its ID.",
    inputSchema: {
      id: LeanCanvasSchema.shape.id.describe("Lean Canvas ID"),
    },
  }, async ({ id }) => {
    const canvas = await service.getById(id);
    if (!canvas) return err(`Lean Canvas '${id}' not found`);
    return ok(canvas);
  });

  server.registerTool("get_lean_canvas_by_name", {
    description:
      "Get a Lean Canvas by its title (case-insensitive). Prefer this over list when the name is known.",
    inputSchema: {
      name: LeanCanvasSchema.shape.title.describe("Lean Canvas title"),
    },
  }, async ({ name }) => {
    const canvas = await service.getByName(name);
    if (!canvas) return err(`Lean Canvas '${name}' not found`);
    return ok(canvas);
  });

  server.registerTool("create_lean_canvas", {
    description:
      "Create a new Lean Canvas. Provide title and optionally date, project, and the 12 section arrays.",
    inputSchema: CreateLeanCanvasSchema.shape,
  }, async (data) => {
    const canvas = await service.create(data);
    return ok({ id: canvas.id });
  });

  server.registerTool("update_lean_canvas", {
    description: "Update an existing Lean Canvas's fields.",
    inputSchema: {
      id: LeanCanvasSchema.shape.id.describe("Lean Canvas ID"),
      ...UpdateLeanCanvasSchema.shape,
    },
  }, async ({ id, ...fields }) => {
    const canvas = await service.update(id, fields);
    if (!canvas) return err(`Lean Canvas '${id}' not found`);
    return ok({ success: true });
  });

  server.registerTool("delete_lean_canvas", {
    description: "Delete a Lean Canvas by its ID.",
    inputSchema: {
      id: LeanCanvasSchema.shape.id.describe("Lean Canvas ID"),
    },
  }, async ({ id }) => {
    const success = await service.delete(id);
    if (!success) return err(`Lean Canvas '${id}' not found`);
    return ok({ success: true });
  });
}
