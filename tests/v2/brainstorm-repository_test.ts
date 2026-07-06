/**
 * Unit tests for v2 BrainstormRepository (CRUD on disk).
 *
 * Regression guard for the apply-template 404: BRAINSTORM_BODY_KEYS once listed
 * `id`+`title`, but serializeStandard excludes body keys from frontmatter and
 * buildBody() never writes `id` — so the first update() (apply-template calls
 * update()) dropped id+title from frontmatter and parse()'s
 * `if (!fm.id && !fm.title) return null` guard made findById() 404.
 */

import { assertEquals, assertExists } from "@std/assert";
import { BrainstormRepository } from "../../src/repositories/brainstorm.repository.ts";

async function setup(): Promise<{ repo: BrainstormRepository; dir: string }> {
  const dir = await Deno.makeTempDir({ prefix: "mdplanner-brainstorm-test-" });
  const repo = new BrainstormRepository(dir);
  return { repo, dir };
}

async function cleanup(dir: string): Promise<void> {
  try {
    await Deno.remove(dir, { recursive: true });
  } catch {
    // ignore
  }
}

Deno.test("BrainstormRepository - questions survive create round-trip", async () => {
  const { repo, dir } = await setup();
  try {
    const questions = [
      {
        question: "What problem are we solving?",
        answer: "Onboarding drop-off",
      },
      { question: "Who is the user?", answer: null },
    ];
    const created = await repo.create({ title: "Session A", questions });
    assertEquals(created.questions, questions);

    const found = await repo.findById(created.id);
    assertExists(found);
    assertEquals(found!.title, "Session A");
    // An empty answer round-trips to `undefined` (buildBody skips falsy answers).
    assertEquals(found!.questions, [
      {
        question: "What problem are we solving?",
        answer: "Onboarding drop-off",
      },
      { question: "Who is the user?", answer: undefined },
    ]);
  } finally {
    await cleanup(dir);
  }
});

Deno.test("BrainstormRepository - findById survives an update (no 404)", async () => {
  const { repo, dir } = await setup();
  try {
    const created = await repo.create({
      title: "Session B",
      questions: [{ question: "Original question?", answer: "yes" }],
    });

    const updated = await repo.update(created.id, {
      questions: [{ question: "Edited question?", answer: "no" }],
    });
    assertExists(updated);
    assertEquals(updated!.id, created.id);
    assertEquals(updated!.title, "Session B");

    // The regression: a dropped id/title made this return null.
    const found = await repo.findById(created.id);
    assertExists(found);
    assertEquals(found!.id, created.id);
    assertEquals(found!.title, "Session B");
    assertEquals(found!.questions, [
      { question: "Edited question?", answer: "no" },
    ]);
  } finally {
    await cleanup(dir);
  }
});

Deno.test("BrainstormRepository - apply-template append shape survives update", async () => {
  const { repo, dir } = await setup();
  try {
    const created = await repo.create({
      title: "Session C",
      questions: [{ question: "Existing?", answer: "kept" }],
    });

    // Mirrors the apply-template route: existing questions + new template
    // questions (answer: null) merged via update().
    const appended = [
      { question: "Existing?", answer: "kept" },
      { question: "Template Q1?", answer: null },
      { question: "Template Q2?", answer: null },
    ];
    await repo.update(created.id, { questions: appended });

    const found = await repo.findById(created.id);
    assertExists(found);
    assertEquals(found!.questions.map((q) => q.question), [
      "Existing?",
      "Template Q1?",
      "Template Q2?",
    ]);
  } finally {
    await cleanup(dir);
  }
});

Deno.test("BrainstormRepository - findAll returns brainstorms after update", async () => {
  const { repo, dir } = await setup();
  try {
    const a = await repo.create({ title: "S1", questions: [] });
    await repo.create({ title: "S2", questions: [] });
    await repo.update(a.id, {
      questions: [{ question: "Added?", answer: null }],
    });

    const all = await repo.findAll();
    assertEquals(all.length, 2);
    const s1 = all.find((b) => b.title === "S1");
    assertExists(s1);
    assertEquals(s1!.questions, [{ question: "Added?", answer: undefined }]);
  } finally {
    await cleanup(dir);
  }
});
