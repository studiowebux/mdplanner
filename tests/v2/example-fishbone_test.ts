/**
 * Validates the committed example/ fishbone demo data.
 *
 * Guards the hqi5 enrichment: every diagram must have a real title, cause
 * categories with non-empty items, and any linked project must resolve to a
 * real portfolio item. Also asserts >= 2 distinct projects so the data-derived
 * project filter has options. Files are copied into a temp dir so the cached
 * repository never writes its cache back into the source tree.
 */

import { assert } from "@std/assert";
import { join } from "@std/path";
import { FishboneRepository } from "../../src/repositories/fishbone.repository.ts";
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

Deno.test("example fishbone — valid causes and project refs", async () => {
  const dir = await Deno.makeTempDir({ prefix: "mdplanner-example-fish-" });
  await copyDir(join(EXAMPLE_DIR, "fishbone"), join(dir, "fishbone"));
  await copyDir(join(EXAMPLE_DIR, "portfolio"), join(dir, "portfolio"));
  try {
    const all = await new FishboneRepository(dir).findAll();
    const projectNames = new Set(
      (await new PortfolioRepository(dir).findAll()).map((p) => p.name),
    );

    assert(all.length >= 4, `expected >= 4 fishbones, got ${all.length}`);

    const projects = new Set<string>();

    for (const f of all) {
      assert(f.title.trim().length > 0, "fishbone has an empty title");

      const filled = f.causes.filter((c) => c.items.length > 0);
      assert(
        filled.length >= 3,
        `fishbone "${f.title}" has only ${filled.length} non-empty categories`,
      );

      for (const c of f.causes) {
        assert(
          c.section.trim().length > 0,
          `fishbone "${f.title}" has a category with no section name`,
        );
        for (const item of c.items) {
          assert(
            item.trim().length > 0,
            `fishbone "${f.title}" / "${c.section}" has an empty cause item`,
          );
        }
      }

      if (f.project) {
        assert(
          projectNames.has(f.project),
          `fishbone "${f.title}" references unknown project "${f.project}"`,
        );
        projects.add(f.project);
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
