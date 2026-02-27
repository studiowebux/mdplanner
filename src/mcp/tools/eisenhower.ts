/**
 * MCP tools for Eisenhower matrix operations.
 * Tools: list_eisenhower, get_eisenhower, create_eisenhower, update_eisenhower, delete_eisenhower
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { ProjectManager } from "../../lib/project-manager.ts";
import { err, ok } from "./utils.ts";

export function registerEisenhowerTools(
  server: McpServer,
  pm: ProjectManager,
): void {
  const parser = pm.getActiveParser();

  server.registerTool(
    "list_eisenhower",
    {
      description: "List all Eisenhower matrices in the project.",
      inputSchema: {},
    },
    async () => ok(await parser.readEisenhowerMatrices()),
  );

  server.registerTool(
    "get_eisenhower",
    {
      description: "Get a single Eisenhower matrix by its ID.",
      inputSchema: { id: z.string().describe("Eisenhower matrix ID") },
    },
    async ({ id }) => {
      const matrices = await parser.readEisenhowerMatrices();
      const m = matrices.find((m) => m.id === id);
      if (!m) return err(`Eisenhower matrix '${id}' not found`);
      return ok(m);
    },
  );

  server.registerTool(
    "create_eisenhower",
    {
      description: "Create a new Eisenhower matrix.",
      inputSchema: {
        title: z.string().describe("Matrix title"),
        date: z.string().optional().describe("Date (YYYY-MM-DD)"),
      },
    },
    async ({ title, date }) => {
      const m = await parser.addEisenhowerMatrix({
        title,
        date: date ?? new Date().toISOString().slice(0, 10),
        urgentImportant: [],
        notUrgentImportant: [],
        urgentNotImportant: [],
        notUrgentNotImportant: [],
      });
      return ok({ id: m.id });
    },
  );

  server.registerTool(
    "update_eisenhower",
    {
      description: "Update an Eisenhower matrix (title or quadrant items).",
      inputSchema: {
        id: z.string().describe("Eisenhower matrix ID"),
        title: z.string().optional(),
        urgentImportant: z.array(z.string()).optional().describe(
          "Urgent + Important items",
        ),
        notUrgentImportant: z.array(z.string()).optional().describe(
          "Not Urgent + Important items",
        ),
        urgentNotImportant: z.array(z.string()).optional().describe(
          "Urgent + Not Important items",
        ),
        notUrgentNotImportant: z.array(z.string()).optional().describe(
          "Not Urgent + Not Important items",
        ),
      },
    },
    async (
      {
        id,
        title,
        urgentImportant,
        notUrgentImportant,
        urgentNotImportant,
        notUrgentNotImportant,
      },
    ) => {
      const success = await parser.updateEisenhowerMatrix(id, {
        ...(title !== undefined && { title }),
        ...(urgentImportant !== undefined && { urgentImportant }),
        ...(notUrgentImportant !== undefined && { notUrgentImportant }),
        ...(urgentNotImportant !== undefined && { urgentNotImportant }),
        ...(notUrgentNotImportant !== undefined && { notUrgentNotImportant }),
      });
      if (!success) return err(`Eisenhower matrix '${id}' not found`);
      return ok({ success: true });
    },
  );

  server.registerTool(
    "delete_eisenhower",
    {
      description: "Delete an Eisenhower matrix by its ID.",
      inputSchema: { id: z.string().describe("Eisenhower matrix ID") },
    },
    async ({ id }) => {
      const success = await parser.deleteEisenhowerMatrix(id);
      if (!success) return err(`Eisenhower matrix '${id}' not found`);
      return ok({ success: true });
    },
  );
}
