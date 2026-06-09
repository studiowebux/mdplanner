// MCP tools for quote operations — thin wrappers over QuoteService.

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { getQuoteService } from "../../singletons/services.ts";
import {
  CreateQuoteSchema,
  ListQuoteOptionsSchema,
  QuoteSchema,
  UpdateQuoteSchema,
} from "../../types/quote.types.ts";
import { registerCrudTools } from "../crud-tools.ts";

export function registerQuoteTools(server: McpServer): void {
  registerCrudTools(server, {
    service: getQuoteService(),
    notFoundLabel: "Quote",
    idParam: QuoteSchema.shape.id.describe("Quote ID"),
    nameParam: QuoteSchema.shape.title.describe("Quote title"),
    listSchema: ListQuoteOptionsSchema,
    createSchema: CreateQuoteSchema,
    updateSchema: UpdateQuoteSchema,
    mutationReturn: "id-success",
    tools: {
      list: {
        name: "list_quotes",
        description:
          "List all quotes. Optionally filter by status, customerId, or search query.",
      },
      get: {
        name: "get_quote",
        description: "Get a single quote by its ID.",
      },
      getByName: {
        name: "get_quote_by_name",
        description:
          "Get a quote by its title (case-insensitive). Prefer this over list when the title is known.",
      },
      create: {
        name: "create_quote",
        description:
          "Create a new quote. Number auto-generated if not specified. Status defaults to 'draft'.",
      },
      update: {
        name: "update_quote",
        description: "Update an existing quote's fields.",
      },
      delete: {
        name: "delete_quote",
        description: "Delete a quote by its ID.",
      },
    },
  });
}
