/**
 * Validates the committed example/ strategic-levels demo data.
 *
 * Guards the hqi5 enrichment: every shipped builder must have a real title,
 * level items spanning multiple tiers of the vision→tactics hierarchy, valid
 * level types, and no placeholder/junk content. The demo files are copied into
 * a temp dir first so the cached repository never writes its cache back into
 * the source tree.
 */

import { assert } from "@std/assert";
import { join } from "@std/path";
import { StrategicLevelsRepository } from "../../src/repositories/strategic-levels.repository.ts";
import { LEVEL_ORDER } from "../../src/types/strategic-levels.types.ts";

const EXAMPLE_DIR = new URL("../../example", import.meta.url).pathname;

async function copyDir(src: string, dest: string): Promise<void> {
  await Deno.mkdir(dest, { recursive: true });
  for await (const entry of Deno.readDir(src)) {
    if (entry.isFile && entry.name.endsWith(".md")) {
      await Deno.copyFile(join(src, entry.name), join(dest, entry.name));
    }
  }
}

function isJunk(s: string): boolean {
  const t = s.trim().toLowerCase();
  return t.length < 4 || /^te?st\d*$/.test(t) || t === "untitled";
}

Deno.test("example strategic-levels — filled, valid multi-tier builders", async () => {
  const dir = await Deno.makeTempDir({ prefix: "mdplanner-example-strat-" });
  await copyDir(
    join(EXAMPLE_DIR, "strategiclevels"),
    join(dir, "strategiclevels"),
  );
  try {
    const all = await new StrategicLevelsRepository(dir).findAll();
    const validTiers = new Set<string>(LEVEL_ORDER);

    assert(all.length >= 4, `expected >= 4 builders, got ${all.length}`);

    for (const b of all) {
      assert(
        !isJunk(b.title),
        `builder "${b.title}" has a junk/placeholder title`,
      );
      assert(b.levels.length > 0, `builder "${b.title}" has no level items`);

      const tiers = new Set(b.levels.map((l) => l.level));
      assert(
        tiers.size >= 3,
        `builder "${b.title}" spans only ${tiers.size} tier(s); expected >= 3`,
      );

      for (const lvl of b.levels) {
        assert(
          validTiers.has(lvl.level),
          `builder "${b.title}" has invalid level type "${lvl.level}"`,
        );
        assert(
          !isJunk(lvl.title),
          `builder "${b.title}" has a junk level item "${lvl.title}"`,
        );
      }
    }
  } finally {
    await Deno.remove(dir, { recursive: true });
  }
});
