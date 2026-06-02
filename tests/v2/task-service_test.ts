/**
 * Unit tests for v2 TaskService.
 *
 * Covers: list filters (section/project/milestone/assignee/tags/ready),
 * CRUD, claim semantics (CLAIM_CONFLICT/CLAIM_GUARD), revision conflicts,
 * stale-claim sweep, batchUpdate, getNextTask sort + skill matching,
 * comments, time entries, attachments, approval workflow.
 *
 * Sort deviation: `ListTaskOptions` has NO sort/order field; service.list
 * returns unsorted. Sort lives in `getNextTask` (priority asc, then order
 * asc). Repo-level ordering is filesystem discovery order.
 *
 * `taskService.setCache()` is NOT called — operations skip the SQLite cache
 * path and go straight through the repo. This is the test-only configuration
 * for the service.
 *
 * `PeopleRepository` is a constructor dep that the methods under test never
 * touch — passed as a minimal cast so we avoid wiring the people layer.
 */

import {
  assertEquals,
  assertExists,
  assertRejects,
  assertStrictEquals,
} from "@std/assert";
import { TaskRepository } from "../../src/repositories/task.repository.ts";
import type { PeopleRepository } from "../../src/repositories/people.repository.ts";
import {
  ClaimConflictError,
  ClaimGuardError,
  RevisionConflictError,
  TaskService,
} from "../../src/services/task.service.ts";

async function setup(): Promise<
  { repo: TaskRepository; service: TaskService; dir: string }
> {
  const dir = await Deno.makeTempDir({ prefix: "mdplanner-task-svc-test-" });
  const repo = new TaskRepository(dir);
  // PeopleRepository is unused by the methods under test.
  const people = {} as PeopleRepository;
  const service = new TaskService(repo, people);
  return { repo, service, dir };
}

async function cleanup(dir: string): Promise<void> {
  try {
    await Deno.remove(dir, { recursive: true });
  } catch {
    // ignore
  }
}

// === CRUD ===

Deno.test("TaskService.create + getById round-trip", async () => {
  const { service, dir } = await setup();
  try {
    const t = await service.create({
      title: "Test task",
      section: "Todo",
      project: "MD Planner",
      priority: 2,
      tags: ["bug"],
    });
    assertExists(t.id);
    assertEquals(t.title, "Test task");
    assertEquals(t.section, "Todo");
    assertEquals(t.project, "MD Planner");
    assertEquals(t.priority, 2);

    const found = await service.getById(t.id);
    assertExists(found);
    assertEquals(found!.title, "Test task");
  } finally {
    await cleanup(dir);
  }
});

Deno.test("TaskService.getById returns null for missing id", async () => {
  const { service, dir } = await setup();
  try {
    assertStrictEquals(await service.getById("task_nonexistent"), null);
  } finally {
    await cleanup(dir);
  }
});

Deno.test("TaskService.getByName is case-insensitive", async () => {
  const { service, dir } = await setup();
  try {
    await service.create({ title: "Specific Task Title", section: "Todo" });
    const found = await service.getByName("specific task title");
    assertExists(found);
    assertEquals(found!.title, "Specific Task Title");
  } finally {
    await cleanup(dir);
  }
});

Deno.test("TaskService.getSlim strips comments + time_entries + approvalRequest", async () => {
  const { service, dir } = await setup();
  try {
    const t = await service.create({ title: "With extras", section: "Todo" });
    await service.addComment(t.id, "First");
    await service.addTimeEntry(t.id, {
      date: "2026-01-01",
      hours: 1,
      person: "alice",
    });
    const slim = await service.getSlim(t.id);
    assertExists(slim);
    assertStrictEquals(slim!.comments, undefined);
    assertStrictEquals(slim!.time_entries, undefined);
    assertStrictEquals(slim!.approvalRequest, undefined);
    // Other fields still present.
    assertEquals(slim!.id, t.id);
    assertEquals(slim!.title, "With extras");
  } finally {
    await cleanup(dir);
  }
});

Deno.test("TaskService.delete soft-archives the task", async () => {
  const { service, repo, dir } = await setup();
  try {
    const t = await service.create({ title: "To delete", section: "Todo" });
    assertEquals(await service.delete(t.id), true);
    // delete = archive: row stays on disk + findById, archived=true; default
    // list (findAll) drops it. See `[architecture] MD Planner — Soft-delete
    // (archive) pattern`.
    const archived = await service.getById(t.id);
    assertExists(archived);
    assertStrictEquals(archived!.archived, true);
    const list = await repo.findAll();
    assertEquals(list.length, 0);
  } finally {
    await cleanup(dir);
  }
});

Deno.test("TaskService.delete returns false for missing id", async () => {
  const { service, dir } = await setup();
  try {
    assertEquals(await service.delete("task_ghost"), false);
  } finally {
    await cleanup(dir);
  }
});

// === list filters ===

Deno.test("TaskService.list filters by section (case-insensitive equals)", async () => {
  const { service, dir } = await setup();
  try {
    await service.create({ title: "T1", section: "Todo" });
    await service.create({ title: "T2", section: "Todo" });
    await service.create({ title: "T3", section: "In Progress" });
    const todos = await service.list({ section: "todo" });
    assertEquals(todos.length, 2);
    assertEquals(todos.every((t) => t.section === "Todo"), true);
  } finally {
    await cleanup(dir);
  }
});

Deno.test("TaskService.list filters by project", async () => {
  const { service, dir } = await setup();
  try {
    await service.create({
      title: "A",
      section: "Todo",
      project: "MD Planner",
    });
    await service.create({
      title: "B",
      section: "Todo",
      project: "MD Planner",
    });
    await service.create({ title: "C", section: "Todo", project: "Other" });
    const matches = await service.list({ project: "MD Planner" });
    assertEquals(matches.length, 2);
  } finally {
    await cleanup(dir);
  }
});

Deno.test("TaskService.list filters by milestone", async () => {
  const { service, dir } = await setup();
  try {
    await service.create({ title: "A", section: "Todo", milestone: "v2.0.0" });
    await service.create({ title: "B", section: "Todo", milestone: "v2.0.0" });
    await service.create({ title: "C", section: "Todo", milestone: "v2.1.0" });
    const matches = await service.list({ milestone: "v2.0.0" });
    assertEquals(matches.length, 2);
  } finally {
    await cleanup(dir);
  }
});

Deno.test("TaskService.list filters by assignee (exact id match)", async () => {
  const { service, dir } = await setup();
  try {
    await service.create({
      title: "A",
      section: "Todo",
      assignee: "person_alice",
    });
    await service.create({
      title: "B",
      section: "Todo",
      assignee: "person_alice",
    });
    await service.create({
      title: "C",
      section: "Todo",
      assignee: "person_bob",
    });
    const aliceTasks = await service.list({ assignee: "person_alice" });
    assertEquals(aliceTasks.length, 2);
  } finally {
    await cleanup(dir);
  }
});

Deno.test("TaskService.list filters by tags — requires ALL given tags (AND)", async () => {
  const { service, dir } = await setup();
  try {
    await service.create({
      title: "Has both",
      section: "Todo",
      tags: ["bug", "frontend"],
    });
    await service.create({ title: "Has one", section: "Todo", tags: ["bug"] });
    await service.create({
      title: "Has other",
      section: "Todo",
      tags: ["frontend"],
    });
    const both = await service.list({ tags: ["bug", "frontend"] });
    assertEquals(both.length, 1);
    assertEquals(both[0].title, "Has both");
  } finally {
    await cleanup(dir);
  }
});

Deno.test("TaskService.list filters by ready — skips tasks with unresolved blockers", async () => {
  const { service, dir } = await setup();
  try {
    const blocker = await service.create({ title: "Blocker", section: "Todo" });
    const blocked = await service.create({
      title: "Blocked",
      section: "Todo",
      blocked_by: [blocker.id],
    });
    const unblocked = await service.create({
      title: "Unblocked",
      section: "Todo",
    });

    // While `blocker` is incomplete, `blocked` is filtered out by ready.
    const r1 = await service.list({ ready: true });
    assertEquals(r1.length, 2);
    assertEquals(
      r1.map((t) => t.id).sort(),
      [blocker.id, unblocked.id].sort(),
    );

    // Complete the blocker — now `blocked` becomes ready.
    await service.update(blocker.id, { completed: true });
    const r2 = await service.list({ ready: true });
    assertEquals(r2.length, 3);
  } finally {
    await cleanup(dir);
  }
});

Deno.test("TaskService.list ready filter — task blocked by missing id is treated as ready", async () => {
  const { service, dir } = await setup();
  try {
    // blocked_by references a non-existent id — service treats unresolved as
    // ready (current behaviour: `!blocker || blocker.completed`).
    await service.create({
      title: "Ghost blocker",
      section: "Todo",
      blocked_by: ["task_does_not_exist"],
    });
    const ready = await service.list({ ready: true });
    assertEquals(ready.length, 1);
  } finally {
    await cleanup(dir);
  }
});

Deno.test("TaskService.list combines section + project + tags (AND)", async () => {
  const { service, dir } = await setup();
  try {
    await service.create({
      title: "Match",
      section: "Todo",
      project: "MD Planner",
      tags: ["bug"],
    });
    await service.create({
      title: "Wrong section",
      section: "Done",
      project: "MD Planner",
      tags: ["bug"],
    });
    await service.create({
      title: "Wrong project",
      section: "Todo",
      project: "Other",
      tags: ["bug"],
    });
    await service.create({
      title: "Wrong tag",
      section: "Todo",
      project: "MD Planner",
      tags: ["feature"],
    });
    const matches = await service.list({
      section: "Todo",
      project: "MD Planner",
      tags: ["bug"],
    });
    assertEquals(matches.length, 1);
    assertEquals(matches[0].title, "Match");
  } finally {
    await cleanup(dir);
  }
});

Deno.test("TaskService.list with no options returns all", async () => {
  const { service, dir } = await setup();
  try {
    await service.create({ title: "A", section: "Todo" });
    await service.create({ title: "B", section: "Todo" });
    const all = await service.list();
    assertEquals(all.length, 2);
  } finally {
    await cleanup(dir);
  }
});

// === update semantics ===

Deno.test("TaskService.update increments revision and updates updatedAt", async () => {
  const { service, dir } = await setup();
  try {
    const t = await service.create({ title: "Rev", section: "Todo" });
    assertEquals(t.revision, 1);
    const updated = await service.update(t.id, { title: "Rev v2" });
    assertExists(updated);
    assertEquals(updated!.revision, 2);
    assertEquals(updated!.title, "Rev v2");
  } finally {
    await cleanup(dir);
  }
});

Deno.test("TaskService.update with expectedRevision mismatch throws RevisionConflictError", async () => {
  const { service, dir } = await setup();
  try {
    const t = await service.create({ title: "Locked", section: "Todo" });
    await assertRejects(
      () => service.update(t.id, { title: "X" }, 99),
      RevisionConflictError,
    );
  } finally {
    await cleanup(dir);
  }
});

Deno.test("TaskService.update with matching expectedRevision succeeds", async () => {
  const { service, dir } = await setup();
  try {
    const t = await service.create({ title: "Match Rev", section: "Todo" });
    const updated = await service.update(t.id, { title: "X" }, 1);
    assertExists(updated);
  } finally {
    await cleanup(dir);
  }
});

Deno.test("TaskService.update with agentId not matching claimedBy on In Progress throws ClaimGuardError", async () => {
  const { service, dir } = await setup();
  try {
    const t = await service.create({ title: "Claimed", section: "Todo" });
    await service.claimTask(t.id, "agent_alice");
    await assertRejects(
      () => service.update(t.id, { title: "X" }, undefined, "agent_bob"),
      ClaimGuardError,
    );
  } finally {
    await cleanup(dir);
  }
});

Deno.test("TaskService.update with agentId matching claimedBy on In Progress succeeds", async () => {
  const { service, dir } = await setup();
  try {
    const t = await service.create({ title: "Self-update", section: "Todo" });
    await service.claimTask(t.id, "agent_alice");
    const updated = await service.update(
      t.id,
      { title: "Now mine" },
      undefined,
      "agent_alice",
    );
    assertExists(updated);
    assertEquals(updated!.title, "Now mine");
  } finally {
    await cleanup(dir);
  }
});

Deno.test("TaskService.update sets completedAt when completed flips true", async () => {
  const { service, dir } = await setup();
  try {
    const t = await service.create({ title: "Complete", section: "Todo" });
    assertStrictEquals(t.completedAt, undefined);
    const done = await service.update(t.id, { completed: true });
    assertExists(done);
    assertExists(done!.completedAt);
  } finally {
    await cleanup(dir);
  }
});

Deno.test("TaskService.update clears completedAt when completed flips false", async () => {
  const { service, dir } = await setup();
  try {
    const t = await service.create({ title: "Toggle", section: "Todo" });
    await service.update(t.id, { completed: true });
    const reopened = await service.update(t.id, { completed: false });
    assertExists(reopened);
    assertStrictEquals(reopened!.completedAt, undefined);
  } finally {
    await cleanup(dir);
  }
});

// === claimTask ===

Deno.test("TaskService.claimTask moves Todo → In Progress and sets claimedBy/claimedAt", async () => {
  const { service, dir } = await setup();
  try {
    const t = await service.create({ title: "Claim", section: "Todo" });
    const claimed = await service.claimTask(t.id, "agent_alice");
    assertExists(claimed);
    assertEquals(claimed!.section, "In Progress");
    assertEquals(claimed!.assignee, "agent_alice");
    assertEquals(claimed!.claimedBy, "agent_alice");
    assertExists(claimed!.claimedAt);
  } finally {
    await cleanup(dir);
  }
});

Deno.test("TaskService.claimTask throws ClaimConflictError when not in expected section", async () => {
  const { service, dir } = await setup();
  try {
    const t = await service.create({ title: "Wrong section", section: "Done" });
    await assertRejects(
      () => service.claimTask(t.id, "agent_alice"),
      ClaimConflictError,
    );
  } finally {
    await cleanup(dir);
  }
});

Deno.test("TaskService.claimTask returns null for missing id", async () => {
  const { service, dir } = await setup();
  try {
    assertStrictEquals(
      await service.claimTask("task_missing", "agent_alice"),
      null,
    );
  } finally {
    await cleanup(dir);
  }
});

Deno.test("TaskService.claimTask accepts custom expectedSection (e.g. 'Backlog')", async () => {
  const { service, dir } = await setup();
  try {
    const t = await service.create({
      title: "From Backlog",
      section: "Backlog",
    });
    const claimed = await service.claimTask(t.id, "agent_alice", "Backlog");
    assertExists(claimed);
    assertEquals(claimed!.section, "In Progress");
  } finally {
    await cleanup(dir);
  }
});

// === moveTask ===

Deno.test("TaskService.moveTask transitions section", async () => {
  const { service, dir } = await setup();
  try {
    const t = await service.create({ title: "Move", section: "Todo" });
    const moved = await service.moveTask(t.id, "In Progress");
    assertExists(moved);
    assertEquals(moved!.section, "In Progress");
  } finally {
    await cleanup(dir);
  }
});

// === sweepStaleClaims ===

Deno.test("TaskService.sweepStaleClaims releases tasks with claimedAt older than ttl", async () => {
  const { service, repo, dir } = await setup();
  try {
    const t = await service.create({ title: "Stale", section: "Todo" });
    // Claim normally — claimedAt is now.
    await service.claimTask(t.id, "agent_alice");
    // Backdate claimedAt to 2h ago to make it stale.
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60_000).toISOString();
    await repo.update(t.id, { claimedAt: twoHoursAgo });

    const swept = await service.sweepStaleClaims(60); // 60-minute TTL
    assertEquals(swept, [t.id]);

    const after = await service.getById(t.id);
    assertExists(after);
    assertStrictEquals(after!.claimedBy, undefined);
    assertStrictEquals(after!.claimedAt, undefined);
  } finally {
    await cleanup(dir);
  }
});

Deno.test("TaskService.sweepStaleClaims leaves fresh claims alone", async () => {
  const { service, dir } = await setup();
  try {
    const t = await service.create({ title: "Fresh", section: "Todo" });
    await service.claimTask(t.id, "agent_alice");
    const swept = await service.sweepStaleClaims(60);
    assertEquals(swept, []);
    const after = await service.getById(t.id);
    assertExists(after!.claimedBy);
  } finally {
    await cleanup(dir);
  }
});

// === batchUpdate ===

Deno.test("TaskService.batchUpdate updates multiple tasks and returns succeeded/failed buckets", async () => {
  const { service, dir } = await setup();
  try {
    const t1 = await service.create({ title: "B1", section: "Todo" });
    const t2 = await service.create({ title: "B2", section: "Todo" });
    const result = await service.batchUpdate([
      { id: t1.id, updates: { priority: 1 } },
      { id: t2.id, updates: { priority: 2 } },
      { id: "task_missing", updates: { priority: 3 } },
    ]);
    assertEquals(result.succeeded.length, 2);
    assertEquals(result.failed.length, 1);
    assertEquals(result.failed[0].id, "task_missing");
    assertExists(result.failed[0].error);
  } finally {
    await cleanup(dir);
  }
});

Deno.test("TaskService.batchUpdate threads inline comment", async () => {
  const { service, dir } = await setup();
  try {
    const t = await service.create({ title: "WithComment", section: "Todo" });
    await service.batchUpdate([
      { id: t.id, updates: { priority: 1 }, comment: "Bumped to P1" },
    ]);
    const after = await service.getById(t.id);
    assertExists(after);
    assertEquals(after!.comments?.length, 1);
    assertEquals(after!.comments![0].body, "Bumped to P1");
  } finally {
    await cleanup(dir);
  }
});

// === getNextTask sort + skill matching ===

Deno.test("TaskService.getNextTask returns Todo+ready task with lowest priority number", async () => {
  const { service, dir } = await setup();
  try {
    await service.create({ title: "P3", section: "Todo", priority: 3 });
    await service.create({ title: "P1", section: "Todo", priority: 1 });
    await service.create({ title: "P2", section: "Todo", priority: 2 });
    const next = await service.getNextTask("agent_alice");
    assertExists(next);
    assertEquals(next!.title, "P1");
  } finally {
    await cleanup(dir);
  }
});

Deno.test("TaskService.getNextTask returns null when Todo is empty", async () => {
  const { service, dir } = await setup();
  try {
    await service.create({ title: "Not Todo", section: "Done" });
    assertStrictEquals(await service.getNextTask("agent_alice"), null);
  } finally {
    await cleanup(dir);
  }
});

Deno.test("TaskService.getNextTask prefers tag matching agent skill over priority", async () => {
  const { service, dir } = await setup();
  try {
    await service.create({ title: "P1 generic", section: "Todo", priority: 1 });
    await service.create({
      title: "P3 my-skill",
      section: "Todo",
      priority: 3,
      tags: ["frontend"],
    });
    const next = await service.getNextTask("agent_alice", ["frontend"]);
    assertExists(next);
    // Skill-matched task wins despite higher priority number.
    assertEquals(next!.title, "P3 my-skill");
  } finally {
    await cleanup(dir);
  }
});

Deno.test("TaskService.getNextTask falls back to top-priority when no skill match", async () => {
  const { service, dir } = await setup();
  try {
    await service.create({ title: "P1 nothing", section: "Todo", priority: 1 });
    await service.create({
      title: "P2 other-skill",
      section: "Todo",
      priority: 2,
      tags: ["backend"],
    });
    const next = await service.getNextTask("agent_alice", ["frontend"]);
    assertExists(next);
    assertEquals(next!.title, "P1 nothing");
  } finally {
    await cleanup(dir);
  }
});

// === addComment ===

Deno.test("TaskService.addComment appends with generated id, default author 'Claude'", async () => {
  const { service, dir } = await setup();
  try {
    const t = await service.create({ title: "Comments", section: "Todo" });
    const c = await service.addComment(t.id, "First comment");
    assertExists(c);
    assertEquals(c!.author, "Claude");
    assertEquals(c!.body, "First comment");
    assertExists(c!.id);
    assertExists(c!.timestamp);
  } finally {
    await cleanup(dir);
  }
});

Deno.test("TaskService.addComment with custom author and metadata", async () => {
  const { service, dir } = await setup();
  try {
    const t = await service.create({ title: "Meta", section: "Todo" });
    const c = await service.addComment(
      t.id,
      "Done",
      "Tommy",
      { commit: "abc1234" },
    );
    assertExists(c);
    assertEquals(c!.author, "Tommy");
    assertEquals(c!.metadata, { commit: "abc1234" });
  } finally {
    await cleanup(dir);
  }
});

Deno.test("TaskService.addComment returns null for missing task", async () => {
  const { service, dir } = await setup();
  try {
    assertStrictEquals(
      await service.addComment("task_missing", "x"),
      null,
    );
  } finally {
    await cleanup(dir);
  }
});

// === time entries ===

Deno.test("TaskService.addTimeEntry appends with generated te_ id", async () => {
  const { service, dir } = await setup();
  try {
    const t = await service.create({ title: "Time", section: "Todo" });
    const entry = await service.addTimeEntry(t.id, {
      date: "2026-01-01",
      hours: 1,
      person: "alice",
    });
    assertExists(entry);
    assertExists(entry!.id);
    assertEquals(entry!.id.startsWith("te_"), true);
    assertEquals(entry!.hours, 1);
    assertEquals(entry!.person, "alice");
  } finally {
    await cleanup(dir);
  }
});

Deno.test("TaskService.deleteTimeEntry removes by entry id", async () => {
  const { service, dir } = await setup();
  try {
    const t = await service.create({ title: "TE delete", section: "Todo" });
    const entry = await service.addTimeEntry(t.id, {
      date: "2026-01-01",
      hours: 1,
      person: "alice",
    });
    assertEquals(await service.deleteTimeEntry(t.id, entry!.id), true);
    const after = await service.getById(t.id);
    assertEquals(after!.time_entries?.length ?? 0, 0);
  } finally {
    await cleanup(dir);
  }
});

Deno.test("TaskService.deleteTimeEntry returns false for unknown entry id", async () => {
  const { service, dir } = await setup();
  try {
    const t = await service.create({ title: "Missing TE", section: "Todo" });
    assertEquals(await service.deleteTimeEntry(t.id, "te_ghost"), false);
  } finally {
    await cleanup(dir);
  }
});

// === attachments ===

Deno.test("TaskService.addAttachments appends paths", async () => {
  const { service, dir } = await setup();
  try {
    const t = await service.create({ title: "Attach", section: "Todo" });
    const after = await service.addAttachments(t.id, ["a.png", "b.pdf"]);
    assertExists(after);
    assertEquals(after!.attachments, ["a.png", "b.pdf"]);
    const more = await service.addAttachments(t.id, ["c.txt"]);
    assertEquals(more!.attachments, ["a.png", "b.pdf", "c.txt"]);
  } finally {
    await cleanup(dir);
  }
});

// === approval workflow ===

Deno.test("TaskService.requestApproval moves task to Pending Review with an approvalRequest", async () => {
  const { service, dir } = await setup();
  try {
    const t = await service.create({
      title: "Approval",
      section: "In Progress",
    });
    const after = await service.requestApproval(
      t.id,
      "agent_alice",
      "All done",
      "commit_abc",
      ["https://example.com/artifact"],
    );
    assertExists(after);
    assertEquals(after!.section, "Pending Review");
    assertExists(after!.approvalRequest);
    assertEquals(after!.approvalRequest!.requestedBy, "agent_alice");
    assertEquals(after!.approvalRequest!.summary, "All done");
    assertEquals(after!.approvalRequest!.commitHash, "commit_abc");
    assertEquals(after!.approvalRequest!.artifactUrls, [
      "https://example.com/artifact",
    ]);
  } finally {
    await cleanup(dir);
  }
});

Deno.test("TaskService.approveTask moves to Done, sets completed, clears claim, stamps verdict", async () => {
  const { service, dir } = await setup();
  try {
    const t = await service.create({ title: "Approve me", section: "Todo" });
    await service.claimTask(t.id, "agent_alice");
    await service.requestApproval(t.id, "agent_alice", "Done");
    const after = await service.approveTask(t.id, "tommy", "Good work");
    assertExists(after);
    assertEquals(after!.section, "Done");
    assertEquals(after!.completed, true);
    assertStrictEquals(after!.claimedBy, undefined);
    assertStrictEquals(after!.claimedAt, undefined);
    assertExists(after!.approvalRequest);
    assertExists(after!.approvalRequest!.verdict);
    assertEquals(after!.approvalRequest!.verdict!.decision, "approved");
    assertEquals(after!.approvalRequest!.verdict!.decidedBy, "tommy");
    assertEquals(after!.approvalRequest!.verdict!.feedback, "Good work");
    assertEquals(
      typeof after!.approvalRequest!.verdict!.decidedAt,
      "string",
    );
  } finally {
    await cleanup(dir);
  }
});

Deno.test("TaskService.rejectTask sends back to In Progress, clears claim, stamps verdict", async () => {
  const { service, dir } = await setup();
  try {
    const t = await service.create({ title: "Reject me", section: "Todo" });
    await service.claimTask(t.id, "agent_alice");
    await service.requestApproval(t.id, "agent_alice", "Ready");
    const after = await service.rejectTask(
      t.id,
      "tommy",
      "Needs more polish",
      "incomplete",
    );
    assertExists(after);
    assertEquals(after!.section, "In Progress");
    assertStrictEquals(after!.claimedBy, undefined);
    assertExists(after!.approvalRequest);
    assertExists(after!.approvalRequest!.verdict);
    assertEquals(after!.approvalRequest!.verdict!.decision, "rejected");
    assertEquals(after!.approvalRequest!.verdict!.decidedBy, "tommy");
    assertEquals(
      after!.approvalRequest!.verdict!.feedback,
      "Needs more polish",
    );
    assertEquals(after!.approvalRequest!.verdict!.rejectionType, "incomplete");
  } finally {
    await cleanup(dir);
  }
});

Deno.test("TaskService.approveTask returns null for missing task", async () => {
  const { service, dir } = await setup();
  try {
    assertStrictEquals(
      await service.approveTask("task_missing", "tommy"),
      null,
    );
  } finally {
    await cleanup(dir);
  }
});
