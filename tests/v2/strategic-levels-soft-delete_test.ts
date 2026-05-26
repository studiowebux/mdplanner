/**
 * Soft-delete acceptance suite — Strategic Levels.
 * Pattern: `[architecture] MD Planner — Soft-delete (archive) pattern`.
 *
 * Standard 8-step suite via `runSoftDeleteSuite`, plus an extra step that
 * verifies the archived flag is reachable to drive the sub-route + MCP-tool
 * 422 guards (`if (builder.archived === true)` in
 * `v2/views/strategic-levels/routes.tsx` and `v2/mcp/tools/strategic-levels.ts`).
 */

import { assert, assertEquals } from "@std/assert";
import {
  registerStrategicLevelsEntity,
  STRATEGIC_LEVELS_TABLE,
} from "../../v2/domains/strategic-levels/cache.ts";
import { StrategicLevelsRepository } from "../../v2/repositories/strategic-levels.repository.ts";
import { runSoftDeleteSuite } from "./helpers/soft-delete-suite.ts";

runSoftDeleteSuite({
  name: "StrategicLevels",
  table: STRATEGIC_LEVELS_TABLE,
  filePath: (dir, id) => `${dir}/strategiclevels/${id}.md`,
  makeRepo: (dir) => new StrategicLevelsRepository(dir),
  registerEntity: (repo) =>
    registerStrategicLevelsEntity(repo as StrategicLevelsRepository),
  seedTarget: () => ({ title: "Strategy To Archive", date: "2026-01-01" }),
  seedControl: () => ({ title: "Strategy Stays", date: "2026-02-01" }),
});

Deno.test(
  "Strategic Levels — archived flag is the signal sub-route + MCP guards check",
  async () => {
    const dir = await Deno.makeTempDir({
      prefix: "mdplanner-strategic-levels-guard-",
    });
    try {
      const repo = new StrategicLevelsRepository(dir);
      const builder = await repo.create({
        title: "Guarded Strategy",
        date: "2026-01-01",
        levels: [],
      });

      const before = await repo.findById(builder.id);
      assert(before, "fresh builder must be findable");
      assertEquals(
        before.archived,
        undefined,
        "fresh builder must not be archived — sub-routes should accept",
      );

      const ok = await repo.archive(builder.id, "tester");
      assertEquals(ok, true);

      const after = await repo.findById(builder.id);
      assert(after, "archived builder must still resolve via findById");
      assertEquals(
        after.archived,
        true,
        "archived builder must surface `archived === true` so " +
          "`if (builder.archived === true) return 422` triggers in " +
          "v2/views/strategic-levels/routes.tsx and " +
          "v2/mcp/tools/strategic-levels.ts",
      );
    } finally {
      await Deno.remove(dir, { recursive: true });
    }
  },
);
