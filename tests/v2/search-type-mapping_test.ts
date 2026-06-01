/**
 * Regression test for v2 global-search entity type → label/route mapping.
 *
 * Bug ticket task_1778999671486_3jjn ("recently added modules not indexed in
 * global search"). The audit found indexing was fine — every domain with an
 * `fts` config is searched. The real defect was a key mismatch: six domains
 * tagged their FTS results with a `type` string that had no matching key in
 * `ENTITY_TYPE_LABELS` / `ENTITY_TYPE_ROUTES`. Such results still render in the
 * search dialog, but with a raw-type badge label and an empty `href`
 * (`route ? `${route}/${id}` : ""`) — found, but not navigable.
 *
 * This test registers the six previously-drifted entities and asserts each
 * one's `fts.type` resolves to BOTH a label and a route, i.e. produces a
 * working search result. Registration pushes to the shared `ENTITIES` array
 * (register once per file — see habit-search_test.ts), so the assertions read
 * the real `EntityDef.fts.type` straight from the registry. No DB is created,
 * so there is no CacheDatabase SQLite handle to leak.
 */

import { assert, assertEquals, assertExists } from "@std/assert";
import { ENTITIES } from "../../v2/database/sqlite/entities.ts";
import {
  ENTITY_TYPE_LABELS,
  ENTITY_TYPE_ROUTES,
  SEARCH_TYPE_LABELS,
  SEARCH_TYPE_ROUTES,
} from "../../v2/constants/mod.ts";
import { registerBillingRateEntity } from "../../v2/domains/billing-rate/cache.ts";
import { registerC4Entity } from "../../v2/domains/c4/cache.ts";
import { registerJournalEntity } from "../../v2/domains/journal/cache.ts";
import { registerLeanCanvasEntity } from "../../v2/domains/lean-canvas/cache.ts";
import { registerProjectValueBoardEntity } from "../../v2/domains/project-value-board/cache.ts";
import {
  registerStickyBoardEntity,
  registerStickyNoteEntity,
} from "../../v2/domains/sticky-note/cache.ts";
import { registerStrategicLevelsEntity } from "../../v2/domains/strategic-levels/cache.ts";
import { BillingRateRepository } from "../../v2/repositories/billing-rate.repository.ts";
import { C4Repository } from "../../v2/repositories/c4.repository.ts";
import { JournalRepository } from "../../v2/repositories/journal.repository.ts";
import { LeanCanvasRepository } from "../../v2/repositories/lean-canvas.repository.ts";
import { ProjectValueBoardRepository } from "../../v2/repositories/project-value-board.repository.ts";
import { StickyBoardRepository } from "../../v2/repositories/sticky-board.repository.ts";
import { StickyNoteRepository } from "../../v2/repositories/sticky-note.repository.ts";
import { StrategicLevelsRepository } from "../../v2/repositories/strategic-levels.repository.ts";

Deno.test("search entity type mapping", async (t) => {
  const dir = await Deno.makeTempDir({ prefix: "mdplanner-search-type-" });

  // The canonical FTS type each domain must emit — the key already present in
  // ENTITY_TYPE_LABELS / ENTITY_TYPE_ROUTES (feature/nav/route key).
  const expected: Record<string, string> = {
    "billing-rate": "rate",
    "c4": "c4_component",
    "journal": "journal",
    "lean-canvas": "lean_canvas",
    "project-value-board": "project_value",
    "strategic-levels": "strategic_builder",
  };

  registerBillingRateEntity(new BillingRateRepository(dir));
  registerC4Entity(new C4Repository(dir));
  registerJournalEntity(new JournalRepository(dir));
  registerLeanCanvasEntity(new LeanCanvasRepository(dir));
  registerProjectValueBoardEntity(new ProjectValueBoardRepository(dir));
  registerStickyNoteEntity(new StickyNoteRepository(dir));
  registerStickyBoardEntity(() =>
    new StickyBoardRepository(dir).findAllFromDisk()
  );
  registerStrategicLevelsEntity(new StrategicLevelsRepository(dir));

  try {
    const ftsTypes = new Set(
      ENTITIES.map((e) => e.fts?.type).filter((t): t is string => !!t),
    );

    for (const [domain, type] of Object.entries(expected)) {
      await t.step(`${domain} emits a navigable FTS type`, () => {
        assert(
          ftsTypes.has(type),
          `${domain} cache.ts must register fts.type "${type}"`,
        );
        assertExists(
          ENTITY_TYPE_LABELS[type],
          `ENTITY_TYPE_LABELS missing key "${type}" (badge would show raw type)`,
        );
        assertExists(
          ENTITY_TYPE_ROUTES[type],
          `ENTITY_TYPE_ROUTES missing key "${type}" (search result href would be empty)`,
        );
      });
    }

    // sticky-note registers TWO fts.types: sticky_note (per-note) and
    // sticky_board (per-board). sticky_board is searchable-but-not-a-feature
    // — it must resolve via SEARCH_TYPE_* (the search dialog's map) but stay
    // out of ENTITY_TYPE_LABELS, which settings.tsx renders as the feature
    // toggle list. Bug: task_1779431472589_ahze.
    await t.step("sticky-note emits both sticky_note and sticky_board", () => {
      assert(ftsTypes.has("sticky_note"));
      assert(ftsTypes.has("sticky_board"));
    });

    await t.step("sticky_board resolves via SEARCH_TYPE_* maps", () => {
      assertEquals(SEARCH_TYPE_LABELS["sticky_board"], "Sticky Board");
      assertEquals(SEARCH_TYPE_ROUTES["sticky_board"], "/sticky-notes");
    });

    await t.step(
      "sticky_board stays out of ENTITY_TYPE_* (no bogus feature toggle)",
      () => {
        assertEquals(
          ENTITY_TYPE_LABELS["sticky_board"],
          undefined,
          "Adding sticky_board to ENTITY_TYPE_LABELS would render a bogus toggle in Settings",
        );
        assertEquals(
          ENTITY_TYPE_ROUTES["sticky_board"],
          undefined,
          "Adding sticky_board to ENTITY_TYPE_ROUTES would route to the feature index",
        );
      },
    );
  } finally {
    await Deno.remove(dir, { recursive: true });
  }
});
