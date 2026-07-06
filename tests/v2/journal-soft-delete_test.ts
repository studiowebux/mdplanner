/**
 * Soft-delete acceptance suite — Journal.
 * Pattern: `[architecture] MD Planner — Soft-delete (archive) pattern`.
 * Custom serialize() — archive guard preserves archived/_at/_by.
 */

import { registerJournalEntity } from "../../src/domains/journal/cache.ts";
import { JournalRepository } from "../../src/repositories/journal.repository.ts";
import { runSoftDeleteSuite } from "./helpers/soft-delete-suite.ts";

runSoftDeleteSuite({
  name: "Journal",
  table: "journal_entry",
  filePath: (dir, id) => `${dir}/journal/${id}.md`,
  makeRepo: (dir) => new JournalRepository(dir),
  registerEntity: (repo) => registerJournalEntity(repo as JournalRepository),
  seedTarget: () => ({ title: "To Be Archived", date: "2026-05-25" }),
  seedControl: () => ({ title: "Stays Visible", date: "2026-05-25" }),
});
