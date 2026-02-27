/**
 * MCP tools for journal operations.
 * Tools: list_journal_entries, get_journal_entry, create_journal_entry,
 *        update_journal_entry, delete_journal_entry
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { ProjectManager } from "../../lib/project-manager.ts";
import { err, ok } from "./utils.ts";

export function registerJournalTools(
  server: McpServer,
  pm: ProjectManager,
): void {
  const parser = pm.getActiveParser();

  server.registerTool(
    "list_journal_entries",
    {
      description: "List all journal entries sorted by date descending.",
      inputSchema: {},
    },
    async () => {
      const entries = await parser.readJournalEntries();
      return ok(entries.map((e) => ({
        id: e.id,
        date: e.date,
        title: e.title,
        mood: e.mood,
        tags: e.tags,
      })));
    },
  );

  server.registerTool(
    "get_journal_entry",
    {
      description: "Get a single journal entry by its ID, including full body.",
      inputSchema: { id: z.string().describe("Journal entry ID") },
    },
    async ({ id }) => {
      const entries = await parser.readJournalEntries();
      const entry = entries.find((e) => e.id === id);
      if (!entry) return err(`Journal entry '${id}' not found`);
      return ok(entry);
    },
  );

  server.registerTool(
    "create_journal_entry",
    {
      description: "Create a new journal entry.",
      inputSchema: {
        date: z.string().describe("Entry date (YYYY-MM-DD)"),
        title: z.string().optional().describe("Optional title"),
        mood: z.enum(["great", "good", "neutral", "bad", "terrible"]).optional()
          .describe("Optional mood"),
        tags: z.array(z.string()).optional().describe("Optional tags"),
        body: z.string().optional().describe("Entry body (markdown)"),
      },
    },
    async ({ date, title, mood, tags, body }) => {
      const entry = await parser.addJournalEntry({
        date,
        title,
        mood,
        tags,
        body: body ?? "",
      });
      return ok({ id: entry.id });
    },
  );

  server.registerTool(
    "update_journal_entry",
    {
      description: "Update an existing journal entry's fields.",
      inputSchema: {
        id: z.string().describe("Journal entry ID"),
        date: z.string().optional(),
        title: z.string().optional(),
        mood: z.enum(["great", "good", "neutral", "bad", "terrible"])
          .optional(),
        tags: z.array(z.string()).optional(),
        body: z.string().optional(),
      },
    },
    async ({ id, date, title, mood, tags, body }) => {
      const success = await parser.updateJournalEntry(id, {
        ...(date !== undefined && { date }),
        ...(title !== undefined && { title }),
        ...(mood !== undefined && { mood }),
        ...(tags !== undefined && { tags }),
        ...(body !== undefined && { body }),
      });
      if (!success) return err(`Journal entry '${id}' not found`);
      return ok({ success: true });
    },
  );

  server.registerTool(
    "delete_journal_entry",
    {
      description: "Delete a journal entry by its ID.",
      inputSchema: { id: z.string().describe("Journal entry ID") },
    },
    async ({ id }) => {
      const success = await parser.deleteJournalEntry(id);
      if (!success) return err(`Journal entry '${id}' not found`);
      return ok({ success: true });
    },
  );
}
