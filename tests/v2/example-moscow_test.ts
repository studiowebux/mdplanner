/**
 * Validates the committed example/ MoSCoW demo data.
 *
 * Guards the hqi5 enrichment: every board must have a real title, populated
 * priority quadrants with no junk items (the old "tetst" stray bullet), and
 * any linked project must resolve to a real portfolio item. Also asserts >= 2
 * distinct projects so the data-derived project filter has options. Files are
 * copied into a temp dir so the cached repository never writes back.
 */

import { assert } from "@std/assert";
import { join } from "@std/path";
import { MoscowRepository } from "../../src/repositories/moscow.repository.ts";
import { PortfolioRepository } from "../../src/repositories/portfolio.repository.ts";

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
  return t.length < 4 || /^te?st\d*$/.test(t);
}

Deno.test("example moscow — populated quadrants, clean items, valid projects", async () => {
  const dir = await Deno.makeTempDir({ prefix: "mdplanner-example-moscow-" });
  await copyDir(join(EXAMPLE_DIR, "moscow"), join(dir, "moscow"));
  await copyDir(join(EXAMPLE_DIR, "portfolio"), join(dir, "portfolio"));
  try {
    const all = await new MoscowRepository(dir).findAll();
    const projectNames = new Set(
      (await new PortfolioRepository(dir).findAll()).map((p) => p.name),
    );

    assert(all.length >= 4, `expected >= 4 moscow boards, got ${all.length}`);

    const projects = new Set<string>();

    for (const m of all) {
      assert(!isJunk(m.title), `moscow board "${m.title}" has a junk title`);

      const quadrants = {
        must: m.must,
        should: m.should,
        could: m.could,
        wont: m.wont,
      };
      const total = m.must.length + m.should.length + m.could.length +
        m.wont.length;
      assert(
        total > 0,
        `moscow board "${m.title}" has no items in any quadrant`,
      );
      assert(
        m.must.length > 0,
        `moscow board "${m.title}" has an empty Must Have quadrant`,
      );

      for (const [name, items] of Object.entries(quadrants)) {
        for (const item of items) {
          assert(
            !isJunk(item),
            `moscow board "${m.title}" / ${name} has junk item "${item}"`,
          );
        }
      }

      if (m.project) {
        assert(
          projectNames.has(m.project),
          `moscow board "${m.title}" references unknown project "${m.project}"`,
        );
        projects.add(m.project);
      }
    }

    assert(
      projects.size >= 2,
      `expected >= 2 distinct projects for filter variety, got ${projects.size}`,
    );
  } finally {
    await Deno.remove(dir, { recursive: true });
  }
});
