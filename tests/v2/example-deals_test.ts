/**
 * Validates the committed example/ deals demo data and guards against real
 * owner-name leaks across the whole example dataset.
 *
 * Regression guard for the privacy bug where example deals hard-coded the
 * product owner's real name ("Tommy") as the assignee. Every deal assignee
 * must resolve to a real demo persona, and no example file anywhere may
 * mention the owner's real name. Repository-backed checks copy the data into a
 * temp dir first so the cached repository never writes its cache back into the
 * source tree.
 */

import { assert } from "@std/assert";
import { join } from "@std/path";
import { DealRepository } from "../../src/repositories/deal.repository.ts";
import { PeopleRepository } from "../../src/repositories/people.repository.ts";

const EXAMPLE_DIR = new URL("../../example", import.meta.url).pathname;
const OWNER_NAME_RE = /\b(tommy|gingras)\b/i;

async function copyDir(src: string, dest: string): Promise<void> {
  await Deno.mkdir(dest, { recursive: true });
  for await (const entry of Deno.readDir(src)) {
    if (entry.isFile && entry.name.endsWith(".md")) {
      await Deno.copyFile(join(src, entry.name), join(dest, entry.name));
    }
  }
}

Deno.test("example deals — assignees resolve to demo personas, no owner name", async () => {
  const dir = await Deno.makeTempDir({ prefix: "mdplanner-example-deals-" });
  await copyDir(join(EXAMPLE_DIR, "deals"), join(dir, "deals"));
  await copyDir(join(EXAMPLE_DIR, "people"), join(dir, "people"));
  try {
    const deals = await new DealRepository(dir).findAll();
    const personNames = new Set(
      (await new PeopleRepository(dir).findAll()).map((p) => p.name),
    );

    assert(
      deals.length >= 3,
      `expected >= 3 example deals, got ${deals.length}`,
    );

    const assignees = new Set<string>();
    for (const d of deals) {
      assert(
        d.assignee != null && d.assignee.trim().length > 0,
        `deal "${d.title}" has no assignee`,
      );
      const name = d.assignee as string;
      assert(
        !OWNER_NAME_RE.test(name),
        `deal "${d.title}" assignee "${name}" leaks the real owner name`,
      );
      assert(
        personNames.has(name),
        `deal "${d.title}" assignee "${name}" does not resolve to a demo person`,
      );
      assignees.add(name);
    }

    assert(
      assignees.size >= 2,
      `expected >= 2 distinct deal assignees for filter variety, got ${assignees.size}`,
    );
  } finally {
    await Deno.remove(dir, { recursive: true });
  }
});

Deno.test("example data — no real owner name leaks anywhere", async () => {
  const offenders: string[] = [];

  async function scan(dirPath: string): Promise<void> {
    for await (const entry of Deno.readDir(dirPath)) {
      const full = join(dirPath, entry.name);
      if (entry.isDirectory) {
        await scan(full);
      } else if (entry.isFile && entry.name.endsWith(".md")) {
        const text = await Deno.readTextFile(full);
        if (OWNER_NAME_RE.test(text)) {
          offenders.push(full.slice(EXAMPLE_DIR.length + 1));
        }
      }
    }
  }

  await scan(EXAMPLE_DIR);

  assert(
    offenders.length === 0,
    `example files leak the real owner name (tommy/gingras): ${
      offenders.join(", ")
    }`,
  );
});
