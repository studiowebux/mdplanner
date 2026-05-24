/**
 * Unit tests for v2 GoalRepository (CRUD on disk).
 */

import { assertEquals, assertExists, assertStrictEquals } from "@std/assert";
import { GoalRepository } from "../../v2/repositories/goal.repository.ts";

async function setup(): Promise<{ repo: GoalRepository; dir: string }> {
  const dir = await Deno.makeTempDir({ prefix: "mdplanner-goal-test-" });
  const repo = new GoalRepository(dir);
  return { repo, dir };
}

async function cleanup(dir: string): Promise<void> {
  try {
    await Deno.remove(dir, { recursive: true });
  } catch {
    // ignore
  }
}

// === create + findById ===

Deno.test("GoalRepository - create stores file and returns entity", async () => {
  const { repo, dir } = await setup();
  try {
    const goal = await repo.create({
      title: "Launch v2",
      type: "project",
      status: "planning",
    });
    assertExists(goal.id);
    assertEquals(goal.title, "Launch v2");
    assertEquals(goal.status, "planning");
  } finally {
    await cleanup(dir);
  }
});

Deno.test("GoalRepository - findById returns correct entity", async () => {
  const { repo, dir } = await setup();
  try {
    const created = await repo.create({
      title: "Findable goal",
      type: "project",
    });
    const found = await repo.findById(created.id);
    assertExists(found);
    assertEquals(found!.id, created.id);
    assertEquals(found!.title, "Findable goal");
  } finally {
    await cleanup(dir);
  }
});

Deno.test("GoalRepository - findById returns null for missing ID", async () => {
  const { repo, dir } = await setup();
  try {
    const found = await repo.findById("goal_nonexistent");
    assertStrictEquals(found, null);
  } finally {
    await cleanup(dir);
  }
});

// === findAll ===

Deno.test("GoalRepository - findAll returns all entities", async () => {
  const { repo, dir } = await setup();
  try {
    await repo.create({ title: "Goal A", type: "project" });
    await repo.create({ title: "Goal B", type: "project" });
    const all = await repo.findAllFromDisk();
    assertEquals(all.length, 2);
  } finally {
    await cleanup(dir);
  }
});

// === update ===

Deno.test("GoalRepository - update modifies existing entity", async () => {
  const { repo, dir } = await setup();
  try {
    const goal = await repo.create({
      title: "Original title",
      type: "project",
    });
    const updated = await repo.update(goal.id, { title: "Updated title" });
    assertExists(updated);
    assertEquals(updated!.title, "Updated title");

    const found = await repo.findById(goal.id);
    assertEquals(found!.title, "Updated title");
  } finally {
    await cleanup(dir);
  }
});

Deno.test("GoalRepository - update returns null for non-existent ID", async () => {
  const { repo, dir } = await setup();
  try {
    const result = await repo.update("goal_missing", { title: "Nope" });
    assertStrictEquals(result, null);
  } finally {
    await cleanup(dir);
  }
});

// === delete ===

Deno.test("GoalRepository - delete soft-archives entity", async () => {
  const { repo, dir } = await setup();
  try {
    const goal = await repo.create({ title: "To be deleted", type: "project" });
    const deleted = await repo.delete(goal.id);
    assertEquals(deleted, true);
    // delete() now aliases archive() — file stays on disk, findById still
    // resolves it. findAll filters it out.
    const found = await repo.findById(goal.id);
    assertExists(found);
    const all = await repo.findAll();
    assertStrictEquals(all.find((g) => g.id === goal.id), undefined);
  } finally {
    await cleanup(dir);
  }
});

Deno.test("GoalRepository - hardDelete removes the file", async () => {
  const { repo, dir } = await setup();
  try {
    const goal = await repo.create({ title: "Truly gone", type: "project" });
    const ok = await repo.hardDelete(goal.id);
    assertEquals(ok, true);
    const found = await repo.findById(goal.id);
    assertStrictEquals(found, null);
  } finally {
    await cleanup(dir);
  }
});

Deno.test("GoalRepository - delete returns false for non-existent ID", async () => {
  const { repo, dir } = await setup();
  try {
    const result = await repo.delete("goal_ghost");
    assertEquals(result, false);
  } finally {
    await cleanup(dir);
  }
});

// === field persistence ===

Deno.test("GoalRepository - persists status and type fields", async () => {
  const { repo, dir } = await setup();
  try {
    const goal = await repo.create({
      title: "Typed goal",
      type: "enterprise",
      status: "on-track",
    });
    const found = await repo.findById(goal.id);
    assertEquals(found!.type, "enterprise");
    assertEquals(found!.status, "on-track");
  } finally {
    await cleanup(dir);
  }
});

Deno.test("GoalRepository - persists project field", async () => {
  const { repo, dir } = await setup();
  try {
    const goal = await repo.create({
      title: "Project goal",
      type: "project",
      project: "MD Planner",
    });
    const found = await repo.findById(goal.id);
    assertEquals(found!.project, "MD Planner");
  } finally {
    await cleanup(dir);
  }
});
