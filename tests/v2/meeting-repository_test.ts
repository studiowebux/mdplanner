/**
 * Unit tests for v2 MeetingRepository (CRUD on disk) and MeetingService
 * (filters, action mutations, symmetric link/unlink, getOpenActions).
 *
 * Disk-only — no cache attached, no FTS entity registered.
 */

import { assertEquals, assertExists, assertStrictEquals } from "@std/assert";
import { MeetingRepository } from "../../v2/repositories/meeting.repository.ts";
import { MeetingService } from "../../v2/services/meeting.service.ts";

async function setupRepo(): Promise<{ repo: MeetingRepository; dir: string }> {
  const dir = await Deno.makeTempDir({ prefix: "mdplanner-meeting-test-" });
  const repo = new MeetingRepository(dir);
  return { repo, dir };
}

async function setupService(): Promise<{
  service: MeetingService;
  repo: MeetingRepository;
  dir: string;
}> {
  const dir = await Deno.makeTempDir({ prefix: "mdplanner-meeting-svc-" });
  const repo = new MeetingRepository(dir);
  const service = new MeetingService(repo);
  return { service, repo, dir };
}

async function cleanup(dir: string): Promise<void> {
  try {
    await Deno.remove(dir, { recursive: true });
  } catch {
    // ignore
  }
}

// =============================================================================
// MeetingRepository — CRUD round-trip
// =============================================================================

Deno.test("MeetingRepository - create stores file and returns entity", async () => {
  const { repo, dir } = await setupRepo();
  try {
    const m = await repo.create({
      title: "Kickoff",
      date: "2026-02-20",
      attendees: ["alice", "bob"],
      agenda: "Project kickoff agenda",
      notes: "Notes body",
      project: "MD Planner",
    });
    assertExists(m.id);
    assertEquals(m.title, "Kickoff");
    assertEquals(m.date, "2026-02-20");
    assertEquals(m.attendees, ["alice", "bob"]);
    assertEquals(m.agenda, "Project kickoff agenda");
    assertEquals(m.notes, "Notes body");
    assertEquals(m.project, "MD Planner");
    assertEquals(m.actions, []);
    assertEquals(m.relatedMeetings, []);
  } finally {
    await cleanup(dir);
  }
});

Deno.test("MeetingRepository - findById returns correct entity", async () => {
  const { repo, dir } = await setupRepo();
  try {
    const created = await repo.create({
      title: "Findable",
      date: "2026-02-21",
    });
    const found = await repo.findById(created.id);
    assertExists(found);
    assertEquals(found!.id, created.id);
    assertEquals(found!.title, "Findable");
  } finally {
    await cleanup(dir);
  }
});

Deno.test("MeetingRepository - findById returns null for missing ID", async () => {
  const { repo, dir } = await setupRepo();
  try {
    const found = await repo.findById("meeting_nonexistent");
    assertStrictEquals(found, null);
  } finally {
    await cleanup(dir);
  }
});

Deno.test("MeetingRepository - findAll returns all entities", async () => {
  const { repo, dir } = await setupRepo();
  try {
    await repo.create({ title: "A", date: "2026-02-22" });
    await repo.create({ title: "B", date: "2026-02-23" });
    await repo.create({ title: "C", date: "2026-02-24" });
    const all = await repo.findAll();
    assertEquals(all.length, 3);
  } finally {
    await cleanup(dir);
  }
});

Deno.test("MeetingRepository - update modifies existing entity", async () => {
  const { repo, dir } = await setupRepo();
  try {
    const m = await repo.create({ title: "Before", date: "2026-02-25" });
    const updated = await repo.update(m.id, {
      title: "After",
      notes: "New notes",
    });
    assertExists(updated);
    assertEquals(updated!.title, "After");
    assertEquals(updated!.notes, "New notes");

    const found = await repo.findById(m.id);
    assertEquals(found!.title, "After");
    assertEquals(found!.notes, "New notes");
  } finally {
    await cleanup(dir);
  }
});

Deno.test("MeetingRepository - update leaves untouched fields intact", async () => {
  const { repo, dir } = await setupRepo();
  try {
    const m = await repo.create({
      title: "Stable",
      date: "2026-02-26",
      attendees: ["alice"],
      agenda: "Keep me",
      project: "MD Planner",
    });
    await repo.update(m.id, { notes: "Only this changes" });
    const found = await repo.findById(m.id);
    assertEquals(found!.title, "Stable");
    assertEquals(found!.date, "2026-02-26");
    assertEquals(found!.attendees, ["alice"]);
    assertEquals(found!.agenda, "Keep me");
    assertEquals(found!.project, "MD Planner");
    assertEquals(found!.notes, "Only this changes");
  } finally {
    await cleanup(dir);
  }
});

Deno.test("MeetingRepository - update returns null for non-existent ID", async () => {
  const { repo, dir } = await setupRepo();
  try {
    const result = await repo.update("meeting_missing", { title: "Ghost" });
    assertStrictEquals(result, null);
  } finally {
    await cleanup(dir);
  }
});

Deno.test("MeetingRepository - parse-guard: findById resolves after update", async () => {
  const { repo, dir } = await setupRepo();
  try {
    const m = await repo.create({
      title: "Round-trip",
      date: "2026-02-27",
      attendees: ["alice", "bob"],
      agenda: "Initial agenda",
      notes: "Initial notes",
      project: "MD Planner",
    });
    await repo.update(m.id, { notes: "Edited" });
    const found = await repo.findById(m.id);
    assertExists(found);
    assertEquals(found!.id, m.id);
    assertEquals(found!.title, "Round-trip");
    assertEquals(found!.notes, "Edited");
  } finally {
    await cleanup(dir);
  }
});

Deno.test("MeetingRepository - delete soft-archives entity", async () => {
  const { repo, dir } = await setupRepo();
  try {
    const m = await repo.create({ title: "To Archive", date: "2026-02-28" });
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

Deno.test("MeetingRepository - hardDelete removes the file", async () => {
  const { repo, dir } = await setupRepo();
  try {
    const m = await repo.create({ title: "Truly gone", date: "2026-03-01" });
    const ok = await repo.hardDelete(m.id);
    assertEquals(ok, true);
    const found = await repo.findById(m.id);
    assertStrictEquals(found, null);
  } finally {
    await cleanup(dir);
  }
});

Deno.test("MeetingRepository - delete returns false for non-existent ID", async () => {
  const { repo, dir } = await setupRepo();
  try {
    const result = await repo.delete("meeting_ghost");
    assertEquals(result, false);
  } finally {
    await cleanup(dir);
  }
});

// =============================================================================
// MeetingRepository — defaults + readByName
// =============================================================================

Deno.test("MeetingRepository - defaults attendees/actions/relatedMeetings to [] when omitted", async () => {
  const { repo, dir } = await setupRepo();
  try {
    const m = await repo.create({ title: "Minimal", date: "2026-03-01" });
    assertEquals(m.attendees, []);
    assertEquals(m.actions, []);
    assertEquals(m.relatedMeetings, []);
  } finally {
    await cleanup(dir);
  }
});

Deno.test("MeetingRepository - readByName matches case-insensitively", async () => {
  const { repo, dir } = await setupRepo();
  try {
    await repo.create({ title: "Weekly Standup", date: "2026-03-02" });
    const found = await repo.readByName("weekly STANDUP");
    assertExists(found);
    assertEquals(found!.title, "Weekly Standup");

    const missing = await repo.readByName("does not exist");
    assertStrictEquals(missing, null);
  } finally {
    await cleanup(dir);
  }
});

// =============================================================================
// MeetingService — applyFilters
// =============================================================================

Deno.test("MeetingService - list filters by date_from (inclusive lower bound)", async () => {
  const { service, dir } = await setupService();
  try {
    await service.create({ title: "Early", date: "2026-03-01" });
    await service.create({ title: "Boundary", date: "2026-03-10" });
    await service.create({ title: "Late", date: "2026-03-15" });

    const result = await service.list({ date_from: "2026-03-10" });
    assertEquals(result.length, 2);
    assertEquals(
      result.map((m) => m.title).sort(),
      ["Boundary", "Late"],
    );
  } finally {
    await cleanup(dir);
  }
});

Deno.test("MeetingService - list filters by date_to (inclusive upper bound)", async () => {
  const { service, dir } = await setupService();
  try {
    await service.create({ title: "Early", date: "2026-03-01" });
    await service.create({ title: "Boundary", date: "2026-03-10" });
    await service.create({ title: "Late", date: "2026-03-15" });

    const result = await service.list({ date_to: "2026-03-10" });
    assertEquals(result.length, 2);
    assertEquals(
      result.map((m) => m.title).sort(),
      ["Boundary", "Early"],
    );
  } finally {
    await cleanup(dir);
  }
});

Deno.test("MeetingService - list filters by project (exact match)", async () => {
  const { service, dir } = await setupService();
  try {
    await service.create({
      title: "MDP one",
      date: "2026-03-01",
      project: "MD Planner",
    });
    await service.create({
      title: "Other",
      date: "2026-03-02",
      project: "Something Else",
    });
    await service.create({
      title: "MDP two",
      date: "2026-03-03",
      project: "MD Planner",
    });

    const result = await service.list({ project: "MD Planner" });
    assertEquals(result.length, 2);
    assertEquals(
      result.map((m) => m.title).sort(),
      ["MDP one", "MDP two"],
    );
  } finally {
    await cleanup(dir);
  }
});

Deno.test("MeetingService - list q search matches title/agenda/notes/attendees", async () => {
  const { service, dir } = await setupService();
  try {
    await service.create({
      title: "Kickoff session",
      date: "2026-03-01",
    });
    await service.create({
      title: "Other",
      date: "2026-03-02",
      agenda: "Discuss KICKOFF",
    });
    await service.create({
      title: "Another",
      date: "2026-03-03",
      notes: "Plan the kickoff",
    });
    await service.create({
      title: "Attended",
      date: "2026-03-04",
      attendees: ["kickoff-bot"],
    });
    await service.create({
      title: "Unrelated",
      date: "2026-03-05",
    });

    const result = await service.list({ q: "kickoff" });
    assertEquals(result.length, 4);
    assertEquals(
      result.map((m) => m.title).sort(),
      ["Another", "Attended", "Kickoff session", "Other"],
    );
  } finally {
    await cleanup(dir);
  }
});

Deno.test("MeetingService - list open_actions_only filters to meetings with at least one open action", async () => {
  const { service, repo, dir } = await setupService();
  try {
    const withOpen = await service.create({
      title: "Has open",
      date: "2026-03-01",
    });
    await service.addAction(withOpen.id, { description: "do thing" });

    const onlyDone = await service.create({
      title: "Has done only",
      date: "2026-03-02",
    });
    const withClosed = await service.addAction(onlyDone.id, {
      description: "closed thing",
    });
    const closedAction = withClosed!.actions[0];
    await service.toggleAction(onlyDone.id, closedAction.id);

    await service.create({ title: "No actions", date: "2026-03-03" });

    const result = await service.list({ open_actions_only: "true" });
    assertEquals(result.length, 1);
    assertEquals(result[0].title, "Has open");
    // Sanity — three meetings on disk
    const all = await repo.findAll();
    assertEquals(all.length, 3);
  } finally {
    await cleanup(dir);
  }
});

// =============================================================================
// MeetingService — action mutations
// =============================================================================

Deno.test("MeetingService - addAction appends action with generated id and status=open", async () => {
  const { service, dir } = await setupService();
  try {
    const m = await service.create({ title: "Actions", date: "2026-03-04" });
    const updated = await service.addAction(m.id, {
      description: "Follow up",
      owner: "alice",
      due: "2026-03-11",
    });
    assertExists(updated);
    assertEquals(updated!.actions.length, 1);
    const a = updated!.actions[0];
    assertExists(a.id);
    assertEquals(a.description, "Follow up");
    assertEquals(a.owner, "alice");
    assertEquals(a.due, "2026-03-11");
    assertEquals(a.status, "open");
  } finally {
    await cleanup(dir);
  }
});

Deno.test("MeetingService - toggleAction flips open ↔ done", async () => {
  const { service, dir } = await setupService();
  try {
    const m = await service.create({ title: "Toggle", date: "2026-03-05" });
    const seeded = await service.addAction(m.id, { description: "x" });
    const actionId = seeded!.actions[0].id;

    const done = await service.toggleAction(m.id, actionId);
    assertEquals(done!.actions[0].status, "done");

    const open = await service.toggleAction(m.id, actionId);
    assertEquals(open!.actions[0].status, "open");
  } finally {
    await cleanup(dir);
  }
});

Deno.test("MeetingService - deleteAction removes the action", async () => {
  const { service, dir } = await setupService();
  try {
    const m = await service.create({ title: "Delete", date: "2026-03-06" });
    const seeded = await service.addAction(m.id, { description: "x" });
    const actionId = seeded!.actions[0].id;

    const removed = await service.deleteAction(m.id, actionId);
    assertExists(removed);
    assertEquals(removed!.actions.length, 0);
  } finally {
    await cleanup(dir);
  }
});

Deno.test("MeetingService - addAction returns null for missing meeting", async () => {
  const { service, dir } = await setupService();
  try {
    const result = await service.addAction("meeting_missing", {
      description: "x",
    });
    assertStrictEquals(result, null);
  } finally {
    await cleanup(dir);
  }
});

// =============================================================================
// MeetingService — symmetric link / unlink
// =============================================================================

Deno.test("MeetingService - linkMeetings populates both sides", async () => {
  const { service, dir } = await setupService();
  try {
    const a = await service.create({ title: "A", date: "2026-03-07" });
    const b = await service.create({ title: "B", date: "2026-03-08" });

    const result = await service.linkMeetings(a.id, b.id);
    assertExists(result);
    assertEquals(result!.a.relatedMeetings, [b.id]);
    assertEquals(result!.b.relatedMeetings, [a.id]);

    // Persistence — re-read both
    const reA = await service.getById(a.id);
    const reB = await service.getById(b.id);
    assertEquals(reA!.relatedMeetings, [b.id]);
    assertEquals(reB!.relatedMeetings, [a.id]);
  } finally {
    await cleanup(dir);
  }
});

Deno.test("MeetingService - linkMeetings is idempotent (Set dedup)", async () => {
  const { service, dir } = await setupService();
  try {
    const a = await service.create({ title: "A", date: "2026-03-07" });
    const b = await service.create({ title: "B", date: "2026-03-08" });
    await service.linkMeetings(a.id, b.id);
    await service.linkMeetings(a.id, b.id);

    const reA = await service.getById(a.id);
    const reB = await service.getById(b.id);
    assertEquals(reA!.relatedMeetings, [b.id]);
    assertEquals(reB!.relatedMeetings, [a.id]);
  } finally {
    await cleanup(dir);
  }
});

Deno.test("MeetingService - unlinkMeetings clears both sides", async () => {
  const { service, dir } = await setupService();
  try {
    const a = await service.create({ title: "A", date: "2026-03-07" });
    const b = await service.create({ title: "B", date: "2026-03-08" });
    await service.linkMeetings(a.id, b.id);

    const result = await service.unlinkMeetings(a.id, b.id);
    assertExists(result);
    assertEquals(result!.a.relatedMeetings, []);
    assertEquals(result!.b.relatedMeetings, []);

    const reA = await service.getById(a.id);
    const reB = await service.getById(b.id);
    assertEquals(reA!.relatedMeetings, []);
    assertEquals(reB!.relatedMeetings, []);
  } finally {
    await cleanup(dir);
  }
});

Deno.test("MeetingService - linkMeetings returns null when either side missing", async () => {
  const { service, dir } = await setupService();
  try {
    const a = await service.create({ title: "A", date: "2026-03-07" });
    const result = await service.linkMeetings(a.id, "meeting_missing");
    assertStrictEquals(result, null);
  } finally {
    await cleanup(dir);
  }
});

// =============================================================================
// MeetingService — getOpenActions
// =============================================================================

Deno.test("MeetingService - getOpenActions returns only open actions, sorted by meeting date desc", async () => {
  const { service, dir } = await setupService();
  try {
    const m1 = await service.create({ title: "Older", date: "2026-03-01" });
    const seeded1 = await service.addAction(m1.id, { description: "Old open" });

    const m2 = await service.create({ title: "Newer", date: "2026-03-10" });
    const seeded2 = await service.addAction(m2.id, { description: "New open" });
    await service.addAction(m2.id, { description: "New closed" });
    // close one of the m2 actions
    const closeId = seeded2!.actions[0].id;
    // toggle takes the action id — flip the second one (the "New closed") to done
    const m2After = await service.getById(m2.id);
    const newClosedId = m2After!.actions.find(
      (a) => a.description === "New closed",
    )!.id;
    await service.toggleAction(m2.id, newClosedId);

    const open = await service.getOpenActions();
    assertEquals(open.length, 2);
    // Sorted by meetingDate desc → m2 (Newer) before m1 (Older)
    assertEquals(open[0].meetingId, m2.id);
    assertEquals(open[0].action.id, closeId);
    assertEquals(open[1].meetingId, m1.id);
    assertEquals(open[1].action.id, seeded1!.actions[0].id);
  } finally {
    await cleanup(dir);
  }
});

Deno.test("MeetingService - getOpenActions(beforeDate) skips meetings on or after the boundary", async () => {
  const { service, dir } = await setupService();
  try {
    const early = await service.create({ title: "Early", date: "2026-03-01" });
    await service.addAction(early.id, { description: "in" });

    const boundary = await service.create({
      title: "Boundary",
      date: "2026-03-10",
    });
    await service.addAction(boundary.id, { description: "boundary" });

    const late = await service.create({ title: "Late", date: "2026-03-15" });
    await service.addAction(late.id, { description: "out" });

    // beforeDate is strict — `m.date >= beforeDate` is skipped
    const open = await service.getOpenActions("2026-03-10");
    assertEquals(open.length, 1);
    assertEquals(open[0].meetingId, early.id);
  } finally {
    await cleanup(dir);
  }
});
