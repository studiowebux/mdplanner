/**
 * Validates the committed example/ habits demo data.
 *
 * Guards the hqi5 enrichment: every habit must have a real title, a valid
 * frequency, a positive target, and well-formed completion dates (YYYY-MM-DD).
 * Also asserts all three frequencies are represented so the data-derived
 * frequency filter shows every option. Files are copied into a temp dir so the
 * cached repository never writes its cache back into the source tree.
 */

import { assert } from "@std/assert";
import { join } from "@std/path";
import { HabitRepository } from "../../src/repositories/habit.repository.ts";
import { HABIT_FREQUENCIES } from "../../src/types/habit.types.ts";

const EXAMPLE_DIR = new URL("../../example", import.meta.url).pathname;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

async function copyDir(src: string, dest: string): Promise<void> {
  await Deno.mkdir(dest, { recursive: true });
  for await (const entry of Deno.readDir(src)) {
    if (entry.isFile && entry.name.endsWith(".md")) {
      await Deno.copyFile(join(src, entry.name), join(dest, entry.name));
    }
  }
}

Deno.test("example habits — valid frequencies, targets, completion dates", async () => {
  const dir = await Deno.makeTempDir({ prefix: "mdplanner-example-habit-" });
  await copyDir(join(EXAMPLE_DIR, "habits"), join(dir, "habits"));
  try {
    const all = await new HabitRepository(dir).findAll();
    const validFreqs = new Set<string>(HABIT_FREQUENCIES);

    assert(all.length >= 4, `expected >= 4 habits, got ${all.length}`);

    const freqs = new Set<string>();

    for (const h of all) {
      assert(h.title.trim().length > 0, "habit has an empty title");
      assert(
        validFreqs.has(h.frequency),
        `habit "${h.title}" has invalid frequency "${h.frequency}"`,
      );
      freqs.add(h.frequency);

      assert(
        h.targetPerPeriod >= 1,
        `habit "${h.title}" has target ${h.targetPerPeriod} (< 1)`,
      );

      for (const entry of h.completedDates) {
        assert(
          DATE_RE.test(entry.date),
          `habit "${h.title}" has malformed completion date "${entry.date}"`,
        );
      }
    }

    assert(
      freqs.size === HABIT_FREQUENCIES.length,
      `expected all ${HABIT_FREQUENCIES.length} frequencies represented, got ${freqs.size}`,
    );
  } finally {
    await Deno.remove(dir, { recursive: true });
  }
});
