/**
 * Unit tests for v2 BrainstormTemplateRepository (CRUD on disk).
 *
 * Covers the `## Questions` body round-trip: questions written via create/update
 * must survive the serialize → parse cycle. Regression guard for the broken
 * parseQuestions() regex whose trailing `$` (under /m) terminated the capture at
 * the end of the "## Questions" line, returning [] for every template.
 */

import { assertEquals, assertExists } from "@std/assert";
import { BrainstormTemplateRepository } from "../../v2/repositories/brainstorm-template.repository.ts";

async function setup(): Promise<
  { repo: BrainstormTemplateRepository; dir: string }
> {
  const dir = await Deno.makeTempDir({ prefix: "mdplanner-btemplate-test-" });
  const repo = new BrainstormTemplateRepository(dir);
  return { repo, dir };
}

async function cleanup(dir: string): Promise<void> {
  try {
    await Deno.remove(dir, { recursive: true });
  } catch {
    // ignore
  }
}

Deno.test("BrainstormTemplateRepository - questions survive create round-trip", async () => {
  const { repo, dir } = await setup();
  try {
    const questions = [
      "What sparked this idea?",
      "What does success look like?",
      "What is the smallest version to start with?",
    ];
    const created = await repo.create({ name: "Feature Ideation", questions });
    assertEquals(created.questions, questions);

    const found = await repo.findById(created.id);
    assertExists(found);
    assertEquals(found!.questions, questions);
  } finally {
    await cleanup(dir);
  }
});

Deno.test("BrainstormTemplateRepository - single question round-trip", async () => {
  const { repo, dir } = await setup();
  try {
    const created = await repo.create({
      name: "One Question",
      questions: ["Only one question."],
    });
    const found = await repo.findById(created.id);
    assertExists(found);
    assertEquals(found!.questions, ["Only one question."]);
  } finally {
    await cleanup(dir);
  }
});

Deno.test("BrainstormTemplateRepository - empty questions round-trip", async () => {
  const { repo, dir } = await setup();
  try {
    const created = await repo.create({ name: "No Questions", questions: [] });
    const found = await repo.findById(created.id);
    assertExists(found);
    assertEquals(found!.questions, []);
  } finally {
    await cleanup(dir);
  }
});

Deno.test("BrainstormTemplateRepository - update replaces questions", async () => {
  const { repo, dir } = await setup();
  try {
    const created = await repo.create({
      name: "Editable",
      questions: ["old one", "old two"],
    });
    const updated = await repo.update(created.id, { questions: ["new one"] });
    assertExists(updated);
    assertEquals(updated!.questions, ["new one"]);

    const found = await repo.findById(created.id);
    assertEquals(found!.questions, ["new one"]);
  } finally {
    await cleanup(dir);
  }
});

Deno.test("BrainstormTemplateRepository - findAll returns templates with questions", async () => {
  const { repo, dir } = await setup();
  try {
    await repo.create({ name: "T1", questions: ["a", "b"] });
    await repo.create({ name: "T2", questions: ["c"] });
    const all = await repo.findAll();
    assertEquals(all.length, 2);
    const t1 = all.find((t) => t.name === "T1");
    assertExists(t1);
    assertEquals(t1!.questions, ["a", "b"]);
  } finally {
    await cleanup(dir);
  }
});
