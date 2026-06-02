/**
 * Unit tests for v2 ReflectionRepository (CRUD on disk).
 *
 * Covers the frontmatter key-mapping boundary: templateId and audit fields are
 * stored snake_case on disk but mapKeysFromFm camelCases them before parse().
 * Regression guard for parse() reading snake_case keys (fm.template_id,
 * fm.created_at, ...) that had already been camelCased — which silently
 * dropped templateId/createdAt/createdBy/updatedAt/updatedBy on every read.
 */

import { assertEquals, assertExists } from "@std/assert";
import { join } from "@std/path";
import { ReflectionRepository } from "../../src/repositories/reflection.repository.ts";

async function setup(): Promise<{ repo: ReflectionRepository; dir: string }> {
  const dir = await Deno.makeTempDir({ prefix: "mdplanner-reflection-test-" });
  const repo = new ReflectionRepository(dir);
  return { repo, dir };
}

async function cleanup(dir: string): Promise<void> {
  try {
    await Deno.remove(dir, { recursive: true });
  } catch {
    // ignore
  }
}

Deno.test("ReflectionRepository - templateId survives create round-trip", async () => {
  const { repo, dir } = await setup();
  try {
    const created = await repo.create({
      title: "Week 1",
      date: "2026-03-01",
      period: "weekly",
      templateId: "rtemplate_weekly_review",
      content: "Reflected on the week.",
    });
    const found = await repo.findById(created.id);
    assertExists(found);
    assertEquals(found!.templateId, "rtemplate_weekly_review");
  } finally {
    await cleanup(dir);
  }
});

Deno.test("ReflectionRepository - templateId survives update", async () => {
  const { repo, dir } = await setup();
  try {
    const created = await repo.create({
      title: "Week 2",
      date: "2026-03-08",
    });
    const updated = await repo.update(created.id, {
      templateId: "rtemplate_monthly",
    });
    assertExists(updated);
    const found = await repo.findById(created.id);
    assertEquals(found!.templateId, "rtemplate_monthly");
  } finally {
    await cleanup(dir);
  }
});

Deno.test("ReflectionRepository - content and tags survive round-trip", async () => {
  const { repo, dir } = await setup();
  try {
    const created = await repo.create({
      title: "Tagged",
      date: "2026-03-15",
      content: "Some reflection body.",
      tags: ["growth", "focus"],
    });
    const found = await repo.findById(created.id);
    assertExists(found);
    assertEquals(found!.content, "Some reflection body.");
    assertEquals(found!.tags, ["growth", "focus"]);
  } finally {
    await cleanup(dir);
  }
});

Deno.test("ReflectionRepository - snake_case frontmatter audit fields parse to camelCase", async () => {
  const { repo, dir } = await setup();
  try {
    const reflectionsDir = join(dir, "reflections");
    await Deno.mkdir(reflectionsDir, { recursive: true });
    const md = [
      "---",
      'id: "reflection_audit1"',
      'title: "Audit Test"',
      'period: "weekly"',
      'date: "2026-03-01"',
      'template_id: "rtemplate_seed"',
      'created_at: "2026-01-01T00:00:00.000Z"',
      'created_by: "person_creator"',
      'updated_at: "2026-01-02T00:00:00.000Z"',
      'updated_by: "person_editor"',
      "---",
      "Body content.",
    ].join("\n");
    await Deno.writeTextFile(
      join(reflectionsDir, "reflection_audit1.md"),
      md,
    );

    const found = await repo.findById("reflection_audit1");
    assertExists(found);
    assertEquals(found!.templateId, "rtemplate_seed");
    assertEquals(found!.createdAt, "2026-01-01T00:00:00.000Z");
    assertEquals(found!.createdBy, "person_creator");
    assertEquals(found!.updatedAt, "2026-01-02T00:00:00.000Z");
    assertEquals(found!.updatedBy, "person_editor");
  } finally {
    await cleanup(dir);
  }
});
