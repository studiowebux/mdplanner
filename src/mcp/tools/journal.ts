// MCP tools for journal entry operations — registered via the shared CRUD factory.

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { getJournalService } from "../../singletons/services.ts";
import {
  CreateJournalEntrySchema,
  JournalEntrySchema,
  ListJournalOptionsSchema,
  UpdateJournalEntrySchema,
} from "../../types/journal.types.ts";
import { registerCrudTools } from "../crud-tools.ts";

export function registerJournalTools(server: McpServer): void {
  registerCrudTools(server, {
    service: getJournalService(),
    notFoundLabel: "Journal entry",
    idParam: JournalEntrySchema.shape.id.describe("Journal entry ID"),
    nameParam: JournalEntrySchema.shape.title.describe("Journal entry title"),
    listSchema: ListJournalOptionsSchema,
    createSchema: CreateJournalEntrySchema,
    updateSchema: UpdateJournalEntrySchema,
    mutationReturn: "id-success",
    tools: {
      list: {
        name: "list_journal_entries",
        description:
          "List all journal entries. Optionally filter by project, mood, or date range.",
      },
      get: {
        name: "get_journal_entry",
        description: "Get a single journal entry by its ID.",
      },
      getByName: {
        name: "get_journal_entry_by_name",
        description:
          "Get a journal entry by its title (case-insensitive). Prefer this over list_journal_entries when the title is known.",
      },
      create: {
        name: "create_journal_entry",
        description: "Create a new journal entry.",
      },
      update: {
        name: "update_journal_entry",
        description: "Update an existing journal entry's fields.",
      },
      delete: {
        name: "delete_journal_entry",
        description: "Delete a journal entry by its ID.",
      },
    },
  });
}
