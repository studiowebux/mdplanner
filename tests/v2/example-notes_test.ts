/**
 * Validates the committed example/ note demo data.
 *
 * Regression guard for the "invalid project name" bug: example notes had
 * `project:` values (MDPlanner, Infrastructure, Website) that match no
 * portfolio item, so they rendered unresolved / no-project in the UI. Every
 * note that declares a project must resolve to a real PortfolioRepository
 * name. The demo files are copied into a temp dir first so the cached
 * repository never writes its cache back into the source tree.
 */

import { assert } from "@std/assert";
import { join } from "@std/path";
import { NoteRepository } from "../../src/repositories/note.repository.ts";
import { PortfolioRepository } from "../../src/repositories/portfolio.repository.ts";

const EXAMPLE_DIR = new URL("../../example", import.meta.url).pathname;

/** Copy one example subdirectory into the temp project dir. */
async function copyDir(src: string, dest: string): Promise<void> {
  await Deno.mkdir(dest, { recursive: true });
  for await (const entry of Deno.readDir(src)) {
    if (entry.isFile && entry.name.endsWith(".md")) {
      await Deno.copyFile(join(src, entry.name), join(dest, entry.name));
    }
  }
}

async function setup(): Promise<{
  notes: NoteRepository;
  portfolio: PortfolioRepository;
  dir: string;
}> {
  const dir = await Deno.makeTempDir({ prefix: "mdplanner-example-notes-" });
  await copyDir(join(EXAMPLE_DIR, "notes"), join(dir, "notes"));
  await copyDir(join(EXAMPLE_DIR, "portfolio"), join(dir, "portfolio"));
  return {
    notes: new NoteRepository(dir),
    portfolio: new PortfolioRepository(dir),
    dir,
  };
}

Deno.test("example notes — every declared project resolves to a portfolio item", async () => {
  const { notes, portfolio, dir } = await setup();
  try {
    const all = await notes.findAll();
    const portfolioNames = new Set(
      (await portfolio.findAll()).map((p) => p.name),
    );

    assert(all.length >= 20, `expected >= 20 example notes, got ${all.length}`);
    assert(portfolioNames.size > 0, "no portfolio items found for ref check");

    let withProject = 0;
    for (const n of all) {
      const project = n.project?.trim();
      if (!project) continue; // a missing project is allowed (unassigned note)
      withProject++;
      assert(
        portfolioNames.has(project),
        `note "${n.title}" has unknown project "${project}" ` +
          `(not in portfolio: ${[...portfolioNames].join(", ")})`,
      );
    }

    // Demo variety: the notes must exercise more than one project.
    const distinct = new Set(
      all.map((n) => n.project?.trim()).filter((p): p is string => !!p),
    );
    assert(
      withProject >= 10,
      `expected >= 10 project-bearing example notes, got ${withProject}`,
    );
    assert(
      distinct.size >= 3,
      `expected >= 3 distinct projects across example notes, got ${distinct.size}`,
    );
  } finally {
    await Deno.remove(dir, { recursive: true });
  }
});
