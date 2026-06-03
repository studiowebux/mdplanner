/**
 * Validates the committed example/ reflection demo data.
 *
 * Regression guard for the "empty test stub + literal None tag" bug: every
 * shipped example reflection must have real content, a valid period, a clean
 * tag list (no "None" artifact), and a templateId that resolves to an existing
 * reflection template. The demo files are copied into a temp dir first so the
 * cached repository never writes its cache back into the source tree.
 */

import { assert } from "@std/assert";
import { join } from "@std/path";
import { ReflectionRepository } from "../../src/repositories/reflection.repository.ts";
import { ReflectionTemplateRepository } from "../../src/repositories/reflection-template.repository.ts";
import { REFLECTION_PERIODS } from "../../src/types/reflection.types.ts";

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
  reflections: ReflectionRepository;
  templates: ReflectionTemplateRepository;
  dir: string;
}> {
  const dir = await Deno.makeTempDir({ prefix: "mdplanner-example-refl-" });
  await copyDir(join(EXAMPLE_DIR, "reflections"), join(dir, "reflections"));
  await copyDir(
    join(EXAMPLE_DIR, "reflection-templates"),
    join(dir, "reflection-templates"),
  );
  return {
    reflections: new ReflectionRepository(dir),
    templates: new ReflectionTemplateRepository(dir),
    dir,
  };
}

Deno.test("example reflections — at least 3 filled, valid demo records", async () => {
  const { reflections, templates, dir } = await setup();
  try {
    const all = await reflections.findAll();
    const templateIds = new Set((await templates.findAll()).map((t) => t.id));

    assert(
      all.length >= 3,
      `expected >= 3 example reflections, got ${all.length}`,
    );

    for (const r of all) {
      const body = (r.content ?? "").trim();

      // Non-empty body with real prompt sections (not the empty stub).
      assert(body.length > 0, `reflection "${r.title}" has an empty body`);
      const sectionCount = body.split("\n").filter((l) =>
        l.startsWith("## ")
      ).length;
      assert(
        sectionCount >= 3,
        `reflection "${r.title}" has only ${sectionCount} section(s)`,
      );

      // Title is real, not the "test" stub.
      assert(r.title.trim().length > 0, "reflection has an empty title");
      assert(
        r.title.trim().toLowerCase() !== "test",
        `reflection "${r.title}" is the placeholder stub`,
      );

      // Valid period.
      assert(
        (REFLECTION_PERIODS as readonly string[]).includes(r.period),
        `reflection "${r.title}" has invalid period "${r.period}"`,
      );

      // Clean tags — no literal "None" serialization artifact.
      for (const tag of r.tags ?? []) {
        assert(
          tag !== "None",
          `reflection "${r.title}" carries the literal None tag artifact`,
        );
      }

      // templateId resolves to an existing template.
      assert(
        r.templateId != null && r.templateId.length > 0,
        `reflection "${r.title}" has no templateId`,
      );
      assert(
        templateIds.has(r.templateId),
        `reflection "${r.title}" references unknown template "${r.templateId}"`,
      );
    }
  } finally {
    await Deno.remove(dir, { recursive: true });
  }
});
