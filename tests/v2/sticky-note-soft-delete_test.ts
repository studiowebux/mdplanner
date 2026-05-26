/**
 * Soft-delete acceptance suite — Sticky Note.
 * Pattern: `[architecture] MD Planner — Soft-delete (archive) pattern`.
 *
 * Sticky Note is per-board — the repository is instantiated with a boardId
 * and reads/writes under `sticky-notes/<boardId>/`. The suite seeds via the
 * default board.
 */

import {
  registerStickyNoteEntity,
  STICKY_NOTE_TABLE,
} from "../../v2/domains/sticky-note/cache.ts";
import { StickyNoteRepository } from "../../v2/repositories/sticky-note.repository.ts";
import { runSoftDeleteSuite } from "./helpers/soft-delete-suite.ts";

runSoftDeleteSuite({
  name: "StickyNote",
  table: STICKY_NOTE_TABLE,
  filePath: (dir, id) => `${dir}/sticky-notes/default/${id}.md`,
  makeRepo: (dir) => new StickyNoteRepository(dir, "default"),
  registerEntity: (repo) =>
    registerStickyNoteEntity(repo as StickyNoteRepository),
  seedTarget: () => ({ content: "Note to archive", color: "yellow" }),
  seedControl: () => ({ content: "Note stays", color: "blue" }),
});
