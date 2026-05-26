/**
 * Soft-delete acceptance suite — Sticky Board.
 * Pattern: `[architecture] MD Planner — Soft-delete (archive) pattern`.
 *
 * Sticky Board shares its types + cache with Sticky Note (paired domain in
 * v2/domains/sticky-note/). This test registers ONLY the board entity via
 * the local helper to satisfy the suite contract.
 */

import {
  registerStickyBoardEntity,
  STICKY_BOARD_TABLE,
} from "../../v2/domains/sticky-note/cache.ts";
import { StickyBoardRepository } from "../../v2/repositories/sticky-board.repository.ts";
import { runSoftDeleteSuite } from "./helpers/soft-delete-suite.ts";

runSoftDeleteSuite({
  name: "StickyBoard",
  table: STICKY_BOARD_TABLE,
  filePath: (dir, id) => `${dir}/sticky-notes/${id}.md`,
  makeRepo: (dir) => new StickyBoardRepository(dir),
  registerEntity: (repo) =>
    registerStickyBoardEntity(() =>
      (repo as StickyBoardRepository).findAllFromDisk()
    ),
  seedTarget: () => ({ title: "Board To Archive" }),
  seedControl: () => ({ title: "Board Stays Visible" }),
});
