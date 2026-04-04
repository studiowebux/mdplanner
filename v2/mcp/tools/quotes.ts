// MCP tools for quote operations — thin wrappers over QuoteService.

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { getQuoteService } from "../../singletons/services.ts";
import {
  CreateQuoteSchema,
  ListQuoteOptionsSchema,
  QuoteSchema,
  UpdateQuoteSchema,
} from "../../types/quote.types.ts";
import { err, ok } from "../utils.ts";

export function registerQuoteTools(server: McpServer): void {
  const service = getQuoteService();

  server.registerTool(
    "list_quotes",
    {
      description:
        "List all quotes. Optionally filter by status, customerId, or search query.",
      inputSchema: ListQuoteOptionsSchema.shape,
    },
    async ({ status, customerId, q }) => {
      const quotes = await service.list({ status, customerId, q });
      return ok(quotes);
    },
  );

  server.registerTool(
    "get_quote",
    {
      description: "Get a single quote by its ID.",
      inputSchema: { id: QuoteSchema.shape.id.describe("Quote ID") },
    },
    async ({ id }) => {
      const quote = await service.getById(id);
      if (!quote) return err(`Quote '${id}' not found`);
      return ok(quote);
    },
  );

  server.registerTool(
    "get_quote_by_name",
    {
      description:
        "Get a quote by its title (case-insensitive). Prefer this over list when the title is known.",
      inputSchema: {
        name: QuoteSchema.shape.title.describe("Quote title"),
      },
    },
    async ({ name }) => {
      const quote = await service.getByName(name);
      if (!quote) return err(`Quote '${name}' not found`);
      return ok(quote);
    },
  );

  server.registerTool(
    "create_quote",
    {
      description:
        "Create a new quote. Number auto-generated if not specified. Status defaults to 'draft'.",
      inputSchema: CreateQuoteSchema.shape,
    },
    async (data) => {
      const quote = await service.create(data);
      return ok({ id: quote.id });
    },
  );

  server.registerTool(
    "update_quote",
    {
      description: "Update an existing quote's fields.",
      inputSchema: {
        id: QuoteSchema.shape.id.describe("Quote ID"),
        ...UpdateQuoteSchema.shape,
      },
    },
    async ({ id, ...fields }) => {
      const quote = await service.update(id, fields);
      if (!quote) return err(`Quote '${id}' not found`);
      return ok({ success: true });
    },
  );

  server.registerTool(
    "delete_quote",
    {
      description: "Delete a quote by its ID.",
      inputSchema: { id: QuoteSchema.shape.id.describe("Quote ID") },
    },
    async ({ id }) => {
      const success = await service.delete(id);
      if (!success) return err(`Quote '${id}' not found`);
      return ok({ success: true });
    },
  );
}
