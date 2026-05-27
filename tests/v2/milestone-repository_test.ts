/**
 * Unit tests for v2 MilestoneRepository (CRUD on disk) and MilestoneService
 * (filters, summary, virtual surfacing, duplicate guard).
 *
 * Disk-only — no cache attached, no FTS entity registered. Service falls
 * through to repo.findAllFromDisk() when cache is null.
 */

import {
  assertEquals,
  assertExists,
  assertRejects,
  assertStrictEquals,
} from "@std/assert";
import { MilestoneRepository } from "../../v2/repositories/milestone.repository.ts";
import { TaskRepository } from "../../v2/repositories/task.repository.ts";
import {
  DuplicateMilestoneError,
  MilestoneService,
} from "../../v2/services/milestone.service.ts";

async function setupRepo(): Promise<
  { repo: MilestoneRepository; dir: string }
> {
  const dir = await Deno.makeTempDir({ prefix: "mdplanner-milestone-test-" });
  const repo = new MilestoneRepository(dir);
  return { repo, dir };
}

async function setupService(): Promise<{
  service: MilestoneService;
  milestoneRepo: MilestoneRepository;
  taskRepo: TaskRepository;
  dir: string;
}> {
  const dir = await Deno.makeTempDir({ prefix: "mdplanner-milestone-svc-" });
  const milestoneRepo = new MilestoneRepository(dir);
  const taskRepo = new TaskRepository(dir);
  const service = new MilestoneService(milestoneRepo, taskRepo);
  return { service, milestoneRepo, taskRepo, dir };
}

async function cleanup(dir: string): Promise<void> {
  try {
    await Deno.remove(dir, { recursive: true });
  } catch {
    // ignore
  }
}

// =============================================================================
// MilestoneRepository — CRUD round-trip
// =============================================================================

Deno.test("MilestoneRepository - create stores file and returns entity", async () => {
  const { repo, dir } = await setupRepo();
  try {
    const m = await repo.create({
      name: "v2.0.0",
      status: "open",
      target: "2026-06-01",
      description: "Full v2 rewrite",
      project: "MD Planner",
    });
    assertExists(m.id);
    assertEquals(m.name, "v2.0.0");
    assertEquals(m.status, "open");
    assertEquals(m.target, "2026-06-01");
    assertEquals(m.description, "Full v2 rewrite");
    assertEquals(m.project, "MD Planner");
  } finally {
    await cleanup(dir);
  }
});

Deno.test("MilestoneRepository - findById returns correct entity", async () => {
  const { repo, dir } = await setupRepo();
  try {
    const created = await repo.create({ name: "Findable", status: "open" });
    const found = await repo.findById(created.id);
    assertExists(found);
    assertEquals(found!.id, created.id);
    assertEquals(found!.name, "Findable");
  } finally {
    await cleanup(dir);
  }
});

Deno.test("MilestoneRepository - findById returns null for missing ID", async () => {
  const { repo, dir } = await setupRepo();
  try {
    const found = await repo.findById("milestone_nonexistent");
    assertStrictEquals(found, null);
  } finally {
    await cleanup(dir);
  }
});

Deno.test("MilestoneRepository - findAll returns all entities", async () => {
  const { repo, dir } = await setupRepo();
  try {
    await repo.create({ name: "Alpha", status: "open" });
    await repo.create({ name: "Beta", status: "open" });
    await repo.create({ name: "Gamma", status: "open" });
    const all = await repo.findAll();
    assertEquals(all.length, 3);
  } finally {
    await cleanup(dir);
  }
});

Deno.test("MilestoneRepository - update modifies existing entity", async () => {
  const { repo, dir } = await setupRepo();
  try {
    const m = await repo.create({ name: "Original", status: "open" });
    const updated = await repo.update(m.id, {
      name: "Renamed",
      description: "New description",
    });
    assertExists(updated);
    assertEquals(updated!.name, "Renamed");
    assertEquals(updated!.description, "New description");

    const found = await repo.findById(m.id);
    assertEquals(found!.name, "Renamed");
    assertEquals(found!.description, "New description");
  } finally {
    await cleanup(dir);
  }
});

Deno.test("MilestoneRepository - update leaves untouched fields intact", async () => {
  const { repo, dir } = await setupRepo();
  try {
    const m = await repo.create({
      name: "Stable",
      status: "open",
      target: "2026-09-01",
      project: "MD Planner",
      description: "Keep me",
    });
    await repo.update(m.id, { description: "Replaced" });
    const found = await repo.findById(m.id);
    assertEquals(found!.name, "Stable");
    assertEquals(found!.target, "2026-09-01");
    assertEquals(found!.project, "MD Planner");
    assertEquals(found!.description, "Replaced");
  } finally {
    await cleanup(dir);
  }
});

Deno.test("MilestoneRepository - update returns null for non-existent ID", async () => {
  const { repo, dir } = await setupRepo();
  try {
    const result = await repo.update("milestone_missing", { name: "Ghost" });
    assertStrictEquals(result, null);
  } finally {
    await cleanup(dir);
  }
});

Deno.test("MilestoneRepository - parse-guard: findById resolves after update", async () => {
  const { repo, dir } = await setupRepo();
  try {
    const m = await repo.create({
      name: "Round-trip",
      status: "open",
      target: "2026-07-01",
      project: "MD Planner",
      description: "Initial",
    });
    await repo.update(m.id, { description: "Edited" });
    const found = await repo.findById(m.id);
    assertExists(found);
    assertEquals(found!.id, m.id);
    assertEquals(found!.name, "Round-trip");
    assertEquals(found!.description, "Edited");
  } finally {
    await cleanup(dir);
  }
});

Deno.test("MilestoneRepository - delete soft-archives entity", async () => {
  const { repo, dir } = await setupRepo();
  try {
    const m = await repo.create({ name: "To Archive", status: "open" });
    const deleted = await repo.delete(m.id);
    assertEquals(deleted, true);
    // delete() aliases archive() — file stays on disk, findById still resolves.
    const found = await repo.findById(m.id);
    assertExists(found);
    const all = await repo.findAll();
    assertStrictEquals(all.find((x) => x.id === m.id), undefined);
  } finally {
    await cleanup(dir);
  }
});

Deno.test("MilestoneRepository - hardDelete removes the file", async () => {
  const { repo, dir } = await setupRepo();
  try {
    const m = await repo.create({ name: "Truly gone", status: "open" });
    const ok = await repo.hardDelete(m.id);
    assertEquals(ok, true);
    const found = await repo.findById(m.id);
    assertStrictEquals(found, null);
  } finally {
    await cleanup(dir);
  }
});

Deno.test("MilestoneRepository - delete returns false for non-existent ID", async () => {
  const { repo, dir } = await setupRepo();
  try {
    const result = await repo.delete("milestone_ghost");
    assertEquals(result, false);
  } finally {
    await cleanup(dir);
  }
});

// =============================================================================
// MilestoneRepository — field persistence + status transitions
// =============================================================================

Deno.test("MilestoneRepository - persists links array round-trip", async () => {
  const { repo, dir } = await setupRepo();
  try {
    const m = await repo.create({
      name: "Linked",
      status: "open",
      links: [
        "https://github.com/org/repo/milestone/1",
        "https://example.com/spec",
      ],
    });
    const found = await repo.findById(m.id);
    assertEquals(found!.links, [
      "https://github.com/org/repo/milestone/1",
      "https://example.com/spec",
    ]);
  } finally {
    await cleanup(dir);
  }
});

Deno.test("MilestoneRepository - status open→completed sets completedAt", async () => {
  const { repo, dir } = await setupRepo();
  try {
    const m = await repo.create({ name: "Ship it", status: "open" });
    assertStrictEquals(m.completedAt, undefined);

    const updated = await repo.update(m.id, { status: "completed" });
    assertExists(updated);
    assertEquals(updated!.status, "completed");
    assertExists(updated!.completedAt);

    const found = await repo.findById(m.id);
    assertEquals(found!.status, "completed");
    assertExists(found!.completedAt);
  } finally {
    await cleanup(dir);
  }
});

Deno.test("MilestoneRepository - status completed→open clears completedAt", async () => {
  const { repo, dir } = await setupRepo();
  try {
    const m = await repo.create({ name: "Reopened", status: "open" });
    await repo.update(m.id, { status: "completed" });
    const completed = await repo.findById(m.id);
    assertExists(completed!.completedAt);

    await repo.update(m.id, { status: "open" });
    const reopened = await repo.findById(m.id);
    assertEquals(reopened!.status, "open");
    assertStrictEquals(reopened!.completedAt, undefined);
  } finally {
    await cleanup(dir);
  }
});

// =============================================================================
// MilestoneService — filters
// =============================================================================

Deno.test("MilestoneService - list filters by status", async () => {
  const { service, dir } = await setupService();
  try {
    await service.create({ name: "Open one", status: "open" });
    await service.create({ name: "Open two", status: "open" });
    await service.create({ name: "Closed one", status: "completed" });

    const open = await service.list({ status: "open" });
    assertEquals(open.length, 2);
    assertEquals(open.every((m) => m.status === "open"), true);

    const completed = await service.list({ status: "completed" });
    assertEquals(completed.length, 1);
    assertEquals(completed[0].name, "Closed one");
  } finally {
    await cleanup(dir);
  }
});

Deno.test("MilestoneService - list filters by project (case-insensitive)", async () => {
  const { service, dir } = await setupService();
  try {
    await service.create({ name: "A", status: "open", project: "MD Planner" });
    await service.create({ name: "B", status: "open", project: "Other" });
    await service.create({ name: "C", status: "open", project: "MD Planner" });

    const mdp = await service.list({ project: "md planner" });
    assertEquals(mdp.length, 2);
    assertEquals(
      mdp.map((m) => m.name).sort(),
      ["A", "C"],
    );
  } finally {
    await cleanup(dir);
  }
});

// =============================================================================
// MilestoneService — getSummary
// =============================================================================

Deno.test("MilestoneService - getSummary aggregates linked task counts", async () => {
  const { service, taskRepo, dir } = await setupService();
  try {
    const milestoneName = "v9.9.9";
    await service.create({
      name: milestoneName,
      status: "open",
      project: "MD Planner",
    });

    // 2 Done, 1 In Progress, 1 Todo. getSummary derives totalDone from
    // section bucket length — `completed` flag is not part of CreateTask.
    await taskRepo.create({
      title: "Done A",
      section: "Done",
      milestone: milestoneName,
    });
    await taskRepo.create({
      title: "Done B",
      section: "Done",
      milestone: milestoneName,
    });
    await taskRepo.create({
      title: "In Progress A",
      section: "In Progress",
      milestone: milestoneName,
    });
    await taskRepo.create({
      title: "Todo A",
      section: "Todo",
      milestone: milestoneName,
    });
    // Unrelated milestone — must not leak into the summary
    await taskRepo.create({
      title: "Other",
      section: "Done",
      milestone: "other",
    });

    const summary = await service.getSummary(milestoneName);
    assertExists(summary);
    assertEquals(summary!.milestone, milestoneName);
    assertEquals(summary!.totalDone, 2);
    assertEquals(summary!.totalOpen, 2);
    assertEquals(summary!.completionPct, 50);
    assertEquals(summary!.sections.Done.length, 2);
    assertEquals(summary!.sections["In Progress"].length, 1);
    assertEquals(summary!.sections.Todo.length, 1);
  } finally {
    await cleanup(dir);
  }
});

Deno.test("MilestoneService - getSummary returns null for missing milestone", async () => {
  const { service, dir } = await setupService();
  try {
    const summary = await service.getSummary("Does Not Exist");
    assertStrictEquals(summary, null);
  } finally {
    await cleanup(dir);
  }
});

// =============================================================================
// MilestoneService — virtual milestone surfacing
// =============================================================================

Deno.test("MilestoneService - list surfaces virtual milestones referenced only by tasks", async () => {
  const { service, taskRepo, dir } = await setupService();
  try {
    // No backing milestone file — only a task referencing the name.
    await taskRepo.create({
      title: "Orphan task",
      section: "Todo",
      milestone: "Virtual Only",
    });

    const all = await service.list();
    const virtual = all.find((m) => m.name === "Virtual Only");
    assertExists(virtual);
    assertEquals(virtual!.status, "open");
    assertEquals(virtual!.taskCount, 1);
    assertEquals(virtual!.completedCount, 0);
  } finally {
    await cleanup(dir);
  }
});

// =============================================================================
// MilestoneService — duplicate guard
// =============================================================================

Deno.test("MilestoneService - create throws DuplicateMilestoneError on (name, project) collision", async () => {
  const { service, dir } = await setupService();
  try {
    await service.create({
      name: "v3.0.0",
      status: "open",
      project: "MD Planner",
    });
    await assertRejects(
      () =>
        service.create({
          name: "v3.0.0",
          status: "open",
          project: "MD Planner",
        }),
      DuplicateMilestoneError,
    );
  } finally {
    await cleanup(dir);
  }
});

Deno.test("MilestoneService - create allows same name in different projects", async () => {
  const { service, dir } = await setupService();
  try {
    await service.create({
      name: "shared name",
      status: "open",
      project: "Alpha",
    });
    const second = await service.create({
      name: "shared name",
      status: "open",
      project: "Beta",
    });
    assertEquals(second.name, "shared name");
    assertEquals(second.project, "Beta");
  } finally {
    await cleanup(dir);
  }
});
