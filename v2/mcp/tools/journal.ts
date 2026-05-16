// MCP tools for journal entry operations — thin wrappers over JournalService.

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { getJournalService } from "../../singletons/services.ts";
import {
  CreateJournalEntrySchema,
  JournalEntrySchema,
  ListJournalOptionsSchema,
  UpdateJournalEntrySchema,
} from "../../types/journal.types.ts";
import { err, ok } from "../utils.ts";

export function registerJournalTools(server: McpServer): void {
  const service = getJournalService();

  server.registerTool(
    "list_journal_entries",
    {
      description:
        "List all journal entries. Optionally filter by project, mood, or date range.",
      inputSchema: ListJournalOptionsSchema.shape,
    },
    async (options) => {
      const items = await service.list(options);
      return ok(items);
    },
  );

  server.registerTool(
    "get_journal_entry",
    {
      description: "Get a single journal entry by its ID.",
      inputSchema: {
        id: JournalEntrySchema.shape.id.describe("Journal entry ID"),
      },
    },
    async ({ id }) => {
      const item = await service.getById(id);
      if (!item) return err(`Journal entry '${id}' not found`);
      return ok(item);
    },
  );

  server.registerTool(
    "get_journal_entry_by_name",
    {
      description:
        "Get a journal entry by its title (case-insensitive). Prefer this over list_journal_entries when the title is known.",
      inputSchema: {
        name: JournalEntrySchema.shape.title.describe("Journal entry title"),
      },
    },
    async ({ name }) => {
      const item = await service.getByName(name);
      if (!item) return err(`Journal entry '${name}' not found`);
      return ok(item);
    },
  );

  server.registerTool(
    "create_journal_entry",
    {
      description: "Create a new journal entry.",
      inputSchema: CreateJournalEntrySchema.shape,
    },
    async (data) => {
      const item = await service.create(data);
      return ok({ id: item.id });
    },
  );

  server.registerTool(
    "update_journal_entry",
    {
      description: "Update an existing journal entry's fields.",
      inputSchema: {
        id: JournalEntrySchema.shape.id.describe("Journal entry ID"),
        ...UpdateJournalEntrySchema.shape,
      },
    },
    async ({ id, ...fields }) => {
      const item = await service.update(id, fields);
      if (!item) return err(`Journal entry '${id}' not found`);
      return ok({ success: true });
    },
  );

  server.registerTool(
    "delete_journal_entry",
    {
      description: "Delete a journal entry by its ID.",
      inputSchema: {
        id: JournalEntrySchema.shape.id.describe("Journal entry ID"),
      },
    },
    async ({ id }) => {
      const success = await service.delete(id);
      if (!success) return err(`Journal entry '${id}' not found`);
      return ok({ success: true });
    },
  );
}
