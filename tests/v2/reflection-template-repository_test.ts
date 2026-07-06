/**
 * Unit tests for v2 ReflectionTemplateRepository (CRUD on disk).
 *
 * Covers the `## Prompts` body round-trip: prompts written via create/update
 * must survive the serialize → parse cycle. Regression guard for the broken
 * parsePrompts() regex whose trailing `$` (under /m) terminated the capture at
 * the end of the "## Prompts" line, returning [] for every template.
 */

import { assertEquals, assertExists } from "@std/assert";
import { ReflectionTemplateRepository } from "../../src/repositories/reflection-template.repository.ts";

async function setup(): Promise<
  { repo: ReflectionTemplateRepository; dir: string }
> {
  const dir = await Deno.makeTempDir({ prefix: "mdplanner-rtemplate-test-" });
  const repo = new ReflectionTemplateRepository(dir);
  return { repo, dir };
}

async function cleanup(dir: string): Promise<void> {
  try {
    await Deno.remove(dir, { recursive: true });
  } catch {
    // ignore
  }
}

Deno.test("ReflectionTemplateRepository - prompts survive create round-trip", async () => {
  const { repo, dir } = await setup();
  try {
    const prompts = ["What went well?", "What could improve?", "Next focus?"];
    const created = await repo.create({ name: "Weekly Review", prompts });
    assertEquals(created.prompts, prompts);

    const found = await repo.findById(created.id);
    assertExists(found);
    assertEquals(found!.prompts, prompts);
  } finally {
    await cleanup(dir);
  }
});

Deno.test("ReflectionTemplateRepository - single prompt round-trip", async () => {
  const { repo, dir } = await setup();
  try {
    const created = await repo.create({
      name: "One Prompt",
      prompts: ["Only one question."],
    });
    const found = await repo.findById(created.id);
    assertExists(found);
    assertEquals(found!.prompts, ["Only one question."]);
  } finally {
    await cleanup(dir);
  }
});

Deno.test("ReflectionTemplateRepository - empty prompts round-trip", async () => {
  const { repo, dir } = await setup();
  try {
    const created = await repo.create({ name: "No Prompts", prompts: [] });
    const found = await repo.findById(created.id);
    assertExists(found);
    assertEquals(found!.prompts, []);
  } finally {
    await cleanup(dir);
  }
});

Deno.test("ReflectionTemplateRepository - update replaces prompts", async () => {
  const { repo, dir } = await setup();
  try {
    const created = await repo.create({
      name: "Editable",
      prompts: ["old one", "old two"],
    });
    const updated = await repo.update(created.id, { prompts: ["new one"] });
    assertExists(updated);
    assertEquals(updated!.prompts, ["new one"]);

    const found = await repo.findById(created.id);
    assertEquals(found!.prompts, ["new one"]);
  } finally {
    await cleanup(dir);
  }
});

Deno.test("ReflectionTemplateRepository - findAll returns templates with prompts", async () => {
  const { repo, dir } = await setup();
  try {
    await repo.create({ name: "T1", prompts: ["a", "b"] });
    await repo.create({ name: "T2", prompts: ["c"] });
    const all = await repo.findAll();
    assertEquals(all.length, 2);
    const t1 = all.find((t) => t.name === "T1");
    assertExists(t1);
    assertEquals(t1!.prompts, ["a", "b"]);
  } finally {
    await cleanup(dir);
  }
});
