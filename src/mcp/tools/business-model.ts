/**
 * MCP tools for Business Model Canvas operations.
 * Tools: list_business_models, get_business_model,
 *        create_business_model, update_business_model,
 *        delete_business_model
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { ProjectManager } from "../../lib/project-manager.ts";
import { err, ok } from "./utils.ts";

const STRING_ARRAY = z.array(z.string()).optional();

export function registerBusinessModelTools(
  server: McpServer,
  pm: ProjectManager,
): void {
  const parser = pm.getActiveParser();

  server.registerTool(
    "list_business_models",
    {
      description: "List all Business Model Canvases.",
      inputSchema: {},
    },
    async () => ok(await parser.readBusinessModelCanvases()),
  );

  server.registerTool(
    "get_business_model",
    {
      description: "Get a single Business Model Canvas by its ID.",
      inputSchema: { id: z.string().describe("Canvas ID") },
    },
    async ({ id }) => {
      const canvases = await parser.readBusinessModelCanvases();
      const canvas = canvases.find((c) => c.id === id);
      if (!canvas) return err(`Business Model Canvas '${id}' not found`);
      return ok(canvas);
    },
  );

  server.registerTool(
    "create_business_model",
    {
      description: "Create a new Business Model Canvas.",
      inputSchema: {
        title: z.string().describe("Canvas title"),
        date: z.string().optional().describe("Date (YYYY-MM-DD)"),
        keyPartners: STRING_ARRAY.describe("Key Partners"),
        keyActivities: STRING_ARRAY.describe("Key Activities"),
        keyResources: STRING_ARRAY.describe("Key Resources"),
        valueProposition: STRING_ARRAY.describe("Value Propositions"),
        customerRelationships: STRING_ARRAY.describe("Customer Relationships"),
        channels: STRING_ARRAY.describe("Channels"),
        customerSegments: STRING_ARRAY.describe("Customer Segments"),
        costStructure: STRING_ARRAY.describe("Cost Structure"),
        revenueStreams: STRING_ARRAY.describe("Revenue Streams"),
      },
    },
    async ({ title, date, ...fields }) => {
      const canvas = await parser.addBusinessModelCanvas({
        title,
        date: date ?? new Date().toISOString().slice(0, 10),
        keyPartners: fields.keyPartners ?? [],
        keyActivities: fields.keyActivities ?? [],
        keyResources: fields.keyResources ?? [],
        valueProposition: fields.valueProposition ?? [],
        customerRelationships: fields.customerRelationships ?? [],
        channels: fields.channels ?? [],
        customerSegments: fields.customerSegments ?? [],
        costStructure: fields.costStructure ?? [],
        revenueStreams: fields.revenueStreams ?? [],
      });
      return ok({ id: canvas.id });
    },
  );

  server.registerTool(
    "update_business_model",
    {
      description: "Update an existing Business Model Canvas.",
      inputSchema: {
        id: z.string().describe("Canvas ID"),
        title: z.string().optional(),
        date: z.string().optional(),
        keyPartners: STRING_ARRAY,
        keyActivities: STRING_ARRAY,
        keyResources: STRING_ARRAY,
        valueProposition: STRING_ARRAY,
        customerRelationships: STRING_ARRAY,
        channels: STRING_ARRAY,
        customerSegments: STRING_ARRAY,
        costStructure: STRING_ARRAY,
        revenueStreams: STRING_ARRAY,
      },
    },
    async ({ id, ...updates }) => {
      const updated = await parser.updateBusinessModelCanvas(id, updates);
      if (!updated) return err(`Business Model Canvas '${id}' not found`);
      return ok({ success: true });
    },
  );

  server.registerTool(
    "delete_business_model",
    {
      description: "Delete a Business Model Canvas by its ID.",
      inputSchema: { id: z.string().describe("Canvas ID") },
    },
    async ({ id }) => {
      const success = await parser.deleteBusinessModelCanvas(id);
      if (!success) return err(`Business Model Canvas '${id}' not found`);
      return ok({ success: true });
    },
  );
}
