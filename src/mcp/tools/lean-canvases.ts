// MCP tools for Lean Canvas operations — registered via the shared CRUD factory.

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { getLeanCanvasService } from "../../singletons/services.ts";
import {
  CreateLeanCanvasSchema,
  LeanCanvasSchema,
  ListLeanCanvasOptionsSchema,
  UpdateLeanCanvasSchema,
} from "../../types/lean-canvas.types.ts";
import { registerCrudTools } from "../crud-tools.ts";

export function registerLeanCanvasTools(server: McpServer): void {
  registerCrudTools(server, {
    service: getLeanCanvasService(),
    notFoundLabel: "Lean Canvas",
    idParam: LeanCanvasSchema.shape.id.describe("Lean Canvas ID"),
    nameParam: LeanCanvasSchema.shape.title.describe("Lean Canvas title"),
    listSchema: ListLeanCanvasOptionsSchema,
    createSchema: CreateLeanCanvasSchema,
    updateSchema: UpdateLeanCanvasSchema,
    mutationReturn: "id-success",
    slimFields: ["title", "project", "date"],
    tools: {
      list: {
        name: "list_lean_canvases",
        description:
          "List all Lean Canvases. Optionally filter by project or search query. Pass slim: true to browse with a compact projection.",
      },
      get: {
        name: "get_lean_canvas",
        description: "Get a single Lean Canvas by its ID.",
      },
      getByName: {
        name: "get_lean_canvas_by_name",
        description:
          "Get a Lean Canvas by its title (case-insensitive). Prefer this over list when the name is known.",
      },
      create: {
        name: "create_lean_canvas",
        description:
          "Create a new Lean Canvas. Provide title and optionally date, project, and the 12 section arrays.",
      },
      update: {
        name: "update_lean_canvas",
        description: "Update an existing Lean Canvas's fields.",
      },
      delete: {
        name: "delete_lean_canvas",
        description: "Delete a Lean Canvas by its ID.",
      },
    },
  });
}
