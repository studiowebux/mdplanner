/**
 * MCP tools for Lean Canvas operations.
 * Tools: list_lean_canvases, get_lean_canvas,
 *        create_lean_canvas, update_lean_canvas,
 *        delete_lean_canvas
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { ProjectManager } from "../../lib/project-manager.ts";
import { err, ok } from "./utils.ts";

const STRING_ARRAY = z.array(z.string()).optional();

export function registerLeanCanvasTools(
  server: McpServer,
  pm: ProjectManager,
): void {
  const parser = pm.getActiveParser();

  server.registerTool(
    "list_lean_canvases",
    {
      description: "List all Lean Canvases.",
      inputSchema: {},
    },
    async () => ok(await parser.readLeanCanvases()),
  );

  server.registerTool(
    "get_lean_canvas",
    {
      description: "Get a single Lean Canvas by its ID.",
      inputSchema: { id: z.string().describe("Canvas ID") },
    },
    async ({ id }) => {
      const canvases = await parser.readLeanCanvases();
      const canvas = canvases.find((c) => c.id === id);
      if (!canvas) return err(`Lean Canvas '${id}' not found`);
      return ok(canvas);
    },
  );

  server.registerTool(
    "create_lean_canvas",
    {
      description: "Create a new Lean Canvas.",
      inputSchema: {
        title: z.string().describe("Canvas title"),
        date: z.string().optional().describe("Date (YYYY-MM-DD)"),
        problem: STRING_ARRAY.describe("Top 1-3 problems"),
        solution: STRING_ARRAY.describe("Top 3 features"),
        uniqueValueProp: STRING_ARRAY.describe(
          "Single, clear, compelling message",
        ),
        unfairAdvantage: STRING_ARRAY.describe(
          "Cannot be easily copied or bought",
        ),
        customerSegments: STRING_ARRAY.describe("Target customers"),
        existingAlternatives: STRING_ARRAY.describe(
          "How problems are solved today",
        ),
        keyMetrics: STRING_ARRAY.describe("Key activities to measure"),
        highLevelConcept: STRING_ARRAY.describe(
          "X for Y analogy (e.g. YouTube for pets)",
        ),
        channels: STRING_ARRAY.describe("Path to customers"),
        earlyAdopters: STRING_ARRAY.describe(
          "Characteristics of the ideal customer",
        ),
        costStructure: STRING_ARRAY.describe("Fixed and variable costs"),
        revenueStreams: STRING_ARRAY.describe("Revenue model and sources"),
      },
    },
    async ({ title, date, ...fields }) => {
      const canvas = await parser.addLeanCanvas({
        title,
        date: date ?? new Date().toISOString().slice(0, 10),
        problem: fields.problem ?? [],
        solution: fields.solution ?? [],
        uniqueValueProp: fields.uniqueValueProp ?? [],
        unfairAdvantage: fields.unfairAdvantage ?? [],
        customerSegments: fields.customerSegments ?? [],
        existingAlternatives: fields.existingAlternatives ?? [],
        keyMetrics: fields.keyMetrics ?? [],
        highLevelConcept: fields.highLevelConcept ?? [],
        channels: fields.channels ?? [],
        earlyAdopters: fields.earlyAdopters ?? [],
        costStructure: fields.costStructure ?? [],
        revenueStreams: fields.revenueStreams ?? [],
      });
      return ok({ id: canvas.id });
    },
  );

  server.registerTool(
    "update_lean_canvas",
    {
      description: "Update an existing Lean Canvas.",
      inputSchema: {
        id: z.string().describe("Canvas ID"),
        title: z.string().optional(),
        date: z.string().optional(),
        problem: STRING_ARRAY,
        solution: STRING_ARRAY,
        uniqueValueProp: STRING_ARRAY,
        unfairAdvantage: STRING_ARRAY,
        customerSegments: STRING_ARRAY,
        existingAlternatives: STRING_ARRAY,
        keyMetrics: STRING_ARRAY,
        highLevelConcept: STRING_ARRAY,
        channels: STRING_ARRAY,
        earlyAdopters: STRING_ARRAY,
        costStructure: STRING_ARRAY,
        revenueStreams: STRING_ARRAY,
      },
    },
    async ({ id, ...updates }) => {
      const updated = await parser.updateLeanCanvas(id, updates);
      if (!updated) return err(`Lean Canvas '${id}' not found`);
      return ok({ success: true });
    },
  );

  server.registerTool(
    "delete_lean_canvas",
    {
      description: "Delete a Lean Canvas by its ID.",
      inputSchema: { id: z.string().describe("Canvas ID") },
    },
    async ({ id }) => {
      const success = await parser.deleteLeanCanvas(id);
      if (!success) return err(`Lean Canvas '${id}' not found`);
      return ok({ success: true });
    },
  );
}
