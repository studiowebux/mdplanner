/**
 * Unit tests for v2 HabitRepository (CRUD on disk) + HabitService
 * (per-user scoping via inline userId on completion entries).
 *
 * Per-user model (decision `note_1779414832945_rnwuge`):
 * - Each CompletionEntry carries a userId.
 * - UserScope (built per-request via `resolveUserScope`) pairs userId with
 *   `isDefault` — whether this user owns legacy untagged entries.
 * - Non-default users only see/mutate their own entries.
 * - Default user sees their own entries PLUS legacy entries with no userId
 *   (lazy migration — never bulk-rewritten).
 *
 * Tests construct UserScope inline to avoid the singleton wiring that
 * `resolveUserScope`/`defaultScope`/`getDefaultUserId` need.
 *
 * Complements `tests/src/habit-search_test.ts` which covers FTS only.
 */

import { assertEquals, assertExists, assertStrictEquals } from "@std/assert";
import { join } from "@std/path";
import { HabitRepository } from "../../src/repositories/habit.repository.ts";
import { HabitService } from "../../src/services/habit.service.ts";
import type { UserScope } from "../../src/utils/actor.ts";

const ALICE: UserScope = { userId: "alice", isDefault: false };
const BOB: UserScope = { userId: "bob", isDefault: false };
const DEFAULT_USER: UserScope = { userId: "alice", isDefault: true };

async function setup(): Promise<
  { repo: HabitRepository; service: HabitService; dir: string }
> {
  const dir = await Deno.makeTempDir({ prefix: "mdplanner-habit-test-" });
  const repo = new HabitRepository(dir);
  const service = new HabitService(repo);
  return { repo, service, dir };
}

async function cleanup(dir: string): Promise<void> {
  try {
    await Deno.remove(dir, { recursive: true });
  } catch {
    // ignore
  }
}

// === repository CRUD ===

Deno.test("HabitRepository - create stores file with default-fill", async () => {
  const { repo, dir } = await setup();
  try {
    const h = await repo.create({ title: "Drink water" });
    assertExists(h.id);
    assertEquals(h.title, "Drink water");
    assertEquals(h.frequency, "daily");
    assertEquals(h.targetPerPeriod, 1);
    assertEquals(h.completedDates, []);
    assertEquals(h.tags, []);
  } finally {
    await cleanup(dir);
  }
});

Deno.test("HabitRepository - create with full fields round-trips", async () => {
  const { repo, dir } = await setup();
  try {
    const h = await repo.create({
      title: "Exercise",
      description: "30 minutes minimum.",
      frequency: "weekly",
      targetPerPeriod: 3,
      unit: "sessions",
      color: "#ff6b00",
      tags: ["health", "physical"],
    });
    const fetched = await repo.findById(h.id);
    assertExists(fetched);
    assertEquals(fetched!.description, "30 minutes minimum.");
    assertEquals(fetched!.frequency, "weekly");
    assertEquals(fetched!.targetPerPeriod, 3);
    assertEquals(fetched!.unit, "sessions");
    assertEquals(fetched!.color, "#ff6b00");
    assertEquals(fetched!.tags, ["health", "physical"]);
  } finally {
    await cleanup(dir);
  }
});

Deno.test("HabitRepository - findById returns null for missing ID", async () => {
  const { repo, dir } = await setup();
  try {
    assertStrictEquals(await repo.findById("habit_nonexistent"), null);
  } finally {
    await cleanup(dir);
  }
});

// === parse-guard regression ===

Deno.test("HabitRepository - findById succeeds after update with completedDates populated", async () => {
  const { repo, dir } = await setup();
  try {
    const created = await repo.create({
      title: "Parse Guard",
      completedDates: [
        { date: "2026-01-01", userId: "alice" },
        { date: "2026-01-02", userId: "alice", note: "Felt good" },
      ],
    });
    // Custom serialize writes fm.id; guard `!fm.id && !fm.title` holds.
    const updated = await repo.update(created.id, {
      targetPerPeriod: 2,
    });
    assertExists(updated);
    const fetched = await repo.findById(created.id);
    assertExists(fetched);
    assertEquals(fetched!.id, created.id);
    assertEquals(fetched!.title, "Parse Guard");
    assertEquals(fetched!.targetPerPeriod, 2);
    // Parser always sets all 3 keys (date/note/userId) — even when source
    // had no `note`, the parsed entry surfaces `note: undefined`. Locking
    // the actual shape here.
    assertEquals(fetched!.completedDates.length, 2);
    assertEquals(fetched!.completedDates[0].date, "2026-01-01");
    assertEquals(fetched!.completedDates[0].userId, "alice");
    assertEquals(fetched!.completedDates[1].date, "2026-01-02");
    assertEquals(fetched!.completedDates[1].userId, "alice");
    assertEquals(fetched!.completedDates[1].note, "Felt good");
  } finally {
    await cleanup(dir);
  }
});

// === completion entry shape round-trip ===

Deno.test("HabitRepository - completion entry shape variants round-trip ({date}, {date,note}, {date,userId}, {date,userId,note})", async () => {
  const { repo, dir } = await setup();
  try {
    const h = await repo.create({
      title: "Variant Shapes",
      completedDates: [
        { date: "2026-01-01" },
        { date: "2026-01-02", note: "With note" },
        { date: "2026-01-03", userId: "alice" },
        { date: "2026-01-04", userId: "bob", note: "User + note" },
      ],
    });
    const fetched = await repo.findById(h.id);
    assertExists(fetched);
    assertEquals(fetched!.completedDates.length, 4);
    // Parser always materialises all 3 keys (date/note/userId) — assert per
    // key instead of object equality so undefined keys don't fail.
    assertEquals(fetched!.completedDates[0].date, "2026-01-01");
    assertStrictEquals(fetched!.completedDates[0].note, undefined);
    assertStrictEquals(fetched!.completedDates[0].userId, undefined);

    assertEquals(fetched!.completedDates[1].date, "2026-01-02");
    assertEquals(fetched!.completedDates[1].note, "With note");
    assertStrictEquals(fetched!.completedDates[1].userId, undefined);

    assertEquals(fetched!.completedDates[2].date, "2026-01-03");
    assertStrictEquals(fetched!.completedDates[2].note, undefined);
    assertEquals(fetched!.completedDates[2].userId, "alice");

    assertEquals(fetched!.completedDates[3].date, "2026-01-04");
    assertEquals(fetched!.completedDates[3].userId, "bob");
    assertEquals(fetched!.completedDates[3].note, "User + note");
  } finally {
    await cleanup(dir);
  }
});

// === update ===

Deno.test("HabitRepository - update preserves sibling fields", async () => {
  const { repo, dir } = await setup();
  try {
    const created = await repo.create({
      title: "Sibling Habit",
      description: "Keep me intact.",
      frequency: "weekly",
      tags: ["mindfulness"],
      color: "#0033cc",
    });
    await repo.update(created.id, { targetPerPeriod: 5 });
    const fetched = await repo.findById(created.id);
    assertExists(fetched);
    assertEquals(fetched!.description, "Keep me intact.");
    assertEquals(fetched!.frequency, "weekly");
    assertEquals(fetched!.tags, ["mindfulness"]);
    assertEquals(fetched!.color, "#0033cc");
    assertEquals(fetched!.targetPerPeriod, 5);
  } finally {
    await cleanup(dir);
  }
});

Deno.test("HabitRepository - update returns null for non-existent ID", async () => {
  const { repo, dir } = await setup();
  try {
    assertStrictEquals(
      await repo.update("habit_missing", { title: "X" }),
      null,
    );
  } finally {
    await cleanup(dir);
  }
});

// === delete / hardDelete ===

Deno.test("HabitRepository - delete soft-archives entity", async () => {
  const { repo, dir } = await setup();
  try {
    const h = await repo.create({ title: "Archive me" });
    assertEquals(await repo.delete(h.id), true);
    const found = await repo.findById(h.id);
    assertExists(found);
    const all = await repo.findAllFromDisk();
    assertStrictEquals(all.find((x) => x.id === h.id), undefined);
  } finally {
    await cleanup(dir);
  }
});

Deno.test("HabitRepository - hardDelete removes the file", async () => {
  const { repo, dir } = await setup();
  try {
    const h = await repo.create({ title: "Gone" });
    assertEquals(await repo.hardDelete(h.id), true);
    assertStrictEquals(await repo.findById(h.id), null);
  } finally {
    await cleanup(dir);
  }
});

Deno.test("HabitRepository - delete returns false for non-existent ID", async () => {
  const { repo, dir } = await setup();
  try {
    assertEquals(await repo.delete("habit_ghost"), false);
  } finally {
    await cleanup(dir);
  }
});

// === findAll: sort ===

Deno.test("HabitRepository - findAllFromDisk sorts alphabetically by title", async () => {
  const { repo, dir } = await setup();
  try {
    await repo.create({ title: "Charlie" });
    await repo.create({ title: "Alpha" });
    await repo.create({ title: "Bravo" });
    const all = await repo.findAllFromDisk();
    assertEquals(all.map((h) => h.title), ["Alpha", "Bravo", "Charlie"]);
  } finally {
    await cleanup(dir);
  }
});

// === service.list filters (unscoped) ===

Deno.test("HabitService - list with frequency filter returns only matching", async () => {
  const { repo, service, dir } = await setup();
  try {
    await repo.create({ title: "Daily A", frequency: "daily" });
    await repo.create({ title: "Daily B", frequency: "daily" });
    await repo.create({ title: "Weekly", frequency: "weekly" });
    const daily = await service.list({ frequency: "daily" });
    assertEquals(daily.length, 2);
    assertEquals(daily.every((h) => h.frequency === "daily"), true);
  } finally {
    await cleanup(dir);
  }
});

Deno.test("HabitService - list with tag filter is exact match", async () => {
  const { repo, service, dir } = await setup();
  try {
    await repo.create({ title: "Tagged A", tags: ["health"] });
    await repo.create({ title: "Tagged B", tags: ["health", "fitness"] });
    await repo.create({ title: "Other", tags: ["mindfulness"] });
    const health = await service.list({ tag: "health" });
    assertEquals(health.length, 2);
  } finally {
    await cleanup(dir);
  }
});

Deno.test("HabitService - list with q filter matches title + description (case-insensitive)", async () => {
  const { repo, service, dir } = await setup();
  try {
    await repo.create({
      title: "Meditation",
      description: "Daily mindfulness practice.",
    });
    await repo.create({
      title: "Read",
      description: "Books only.",
    });

    const byTitle = await service.list({ q: "meditation" });
    assertEquals(byTitle.length, 1);
    assertEquals(byTitle[0].title, "Meditation");

    const byDesc = await service.list({ q: "mindfulness" });
    assertEquals(byDesc.length, 1);
    assertEquals(byDesc[0].description, "Daily mindfulness practice.");
  } finally {
    await cleanup(dir);
  }
});

Deno.test("HabitService - list combines frequency + tag (AND)", async () => {
  const { repo, service, dir } = await setup();
  try {
    await repo.create({
      title: "Match",
      frequency: "daily",
      tags: ["health"],
    });
    await repo.create({
      title: "Wrong frequency",
      frequency: "weekly",
      tags: ["health"],
    });
    await repo.create({
      title: "Wrong tag",
      frequency: "daily",
      tags: ["other"],
    });
    const matches = await service.list({
      frequency: "daily",
      tag: "health",
    });
    assertEquals(matches.length, 1);
    assertEquals(matches[0].title, "Match");
  } finally {
    await cleanup(dir);
  }
});

// === per-user scoping — getForUser / listForUser ===

Deno.test("HabitService.getForUser filters completedDates to the scoped user", async () => {
  const { repo, service, dir } = await setup();
  try {
    const h = await repo.create({
      title: "Shared",
      completedDates: [
        { date: "2026-01-01", userId: "alice" },
        { date: "2026-01-02", userId: "alice" },
        { date: "2026-01-03", userId: "bob" },
      ],
    });
    const forAlice = await service.getForUser(h.id, ALICE);
    assertExists(forAlice);
    assertEquals(forAlice!.completedDates.length, 2);
    assertEquals(
      forAlice!.completedDates.every((e) => e.userId === "alice"),
      true,
    );

    const forBob = await service.getForUser(h.id, BOB);
    assertExists(forBob);
    assertEquals(forBob!.completedDates.length, 1);
    assertEquals(forBob!.completedDates[0].userId, "bob");
  } finally {
    await cleanup(dir);
  }
});

Deno.test("HabitService.getForUser returns null for missing habit", async () => {
  const { service, dir } = await setup();
  try {
    assertStrictEquals(await service.getForUser("habit_missing", ALICE), null);
  } finally {
    await cleanup(dir);
  }
});

Deno.test("HabitService.getForUser - default-scope user sees legacy untagged entries; non-default does not", async () => {
  const { repo, service, dir } = await setup();
  try {
    const h = await repo.create({
      title: "Legacy",
      completedDates: [
        { date: "2026-01-01" }, // legacy (no userId)
        { date: "2026-01-02", userId: "alice" },
      ],
    });
    const forDefault = await service.getForUser(h.id, DEFAULT_USER);
    assertExists(forDefault);
    // Default user sees BOTH the legacy entry AND their own.
    assertEquals(forDefault!.completedDates.length, 2);

    const forBob = await service.getForUser(h.id, BOB);
    assertExists(forBob);
    // Non-default user sees neither — legacy belongs to default, alice's is alice's.
    assertEquals(forBob!.completedDates.length, 0);
  } finally {
    await cleanup(dir);
  }
});

Deno.test("HabitService.listForUser filters each habit's completedDates to the scoped user", async () => {
  const { repo, service, dir } = await setup();
  try {
    await repo.create({
      title: "H1",
      completedDates: [
        { date: "2026-01-01", userId: "alice" },
        { date: "2026-01-02", userId: "bob" },
      ],
    });
    await repo.create({
      title: "H2",
      completedDates: [
        { date: "2026-02-01", userId: "alice" },
      ],
    });
    const forAlice = await service.listForUser({}, ALICE);
    assertEquals(forAlice.length, 2);
    const h1 = forAlice.find((h) => h.title === "H1");
    const h2 = forAlice.find((h) => h.title === "H2");
    assertEquals(h1!.completedDates.length, 1);
    assertEquals(h1!.completedDates[0].userId, "alice");
    assertEquals(h2!.completedDates.length, 1);
  } finally {
    await cleanup(dir);
  }
});

// === markComplete / unmarkComplete ===

Deno.test("HabitService.markComplete tags new entry with scope.userId and is idempotent within the same user", async () => {
  const { repo, service, dir } = await setup();
  try {
    const h = await repo.create({ title: "Mark" });
    const after1 = await service.markComplete(h.id, "2026-01-15", ALICE);
    assertExists(after1);
    assertEquals(after1!.completedDates.length, 1);
    assertEquals(after1!.completedDates[0].date, "2026-01-15");
    assertEquals(after1!.completedDates[0].userId, "alice");
    // Marking the same date again is a no-op for that user.
    const after2 = await service.markComplete(h.id, "2026-01-15", ALICE);
    assertEquals(after2!.completedDates.length, 1);
  } finally {
    await cleanup(dir);
  }
});

Deno.test("HabitService.markComplete - two users can complete the same date independently", async () => {
  const { repo, service, dir } = await setup();
  try {
    const h = await repo.create({ title: "Shared Date" });
    await service.markComplete(h.id, "2026-01-15", ALICE);
    await service.markComplete(h.id, "2026-01-15", BOB);

    // Raw repo read shows both entries.
    const raw = await repo.findById(h.id);
    assertExists(raw);
    assertEquals(raw!.completedDates.length, 2);

    // Each user sees only their own entry.
    const forAlice = await service.getForUser(h.id, ALICE);
    assertEquals(forAlice!.completedDates.length, 1);
    assertEquals(forAlice!.completedDates[0].userId, "alice");
    const forBob = await service.getForUser(h.id, BOB);
    assertEquals(forBob!.completedDates.length, 1);
    assertEquals(forBob!.completedDates[0].userId, "bob");
  } finally {
    await cleanup(dir);
  }
});

Deno.test("HabitService.markComplete returns null for missing habit", async () => {
  const { service, dir } = await setup();
  try {
    assertStrictEquals(
      await service.markComplete("habit_missing", "2026-01-01", ALICE),
      null,
    );
  } finally {
    await cleanup(dir);
  }
});

Deno.test("HabitService.unmarkComplete only removes the scoped user's entry on that date", async () => {
  const { repo, service, dir } = await setup();
  try {
    const h = await repo.create({
      title: "Unmark",
      completedDates: [
        { date: "2026-01-15", userId: "alice" },
        { date: "2026-01-15", userId: "bob" },
      ],
    });
    const after = await service.unmarkComplete(h.id, "2026-01-15", ALICE);
    assertExists(after);
    // Alice's view: empty.
    assertEquals(after!.completedDates.length, 0);
    // Raw: only bob's left.
    const raw = await repo.findById(h.id);
    assertEquals(raw!.completedDates.length, 1);
    assertEquals(raw!.completedDates[0].userId, "bob");
  } finally {
    await cleanup(dir);
  }
});

// === toggleDate ===

Deno.test("HabitService.toggleDate adds when missing and removes when present (for that user)", async () => {
  const { service, dir } = await setup();
  try {
    const h = await service.create({ title: "Toggle" });
    // First toggle: add.
    let after = await service.toggleDate(h.id, "2026-01-15", ALICE);
    assertExists(after);
    assertEquals(after!.completedDates.length, 1);
    // Second toggle: remove.
    after = await service.toggleDate(h.id, "2026-01-15", ALICE);
    assertEquals(after!.completedDates.length, 0);
  } finally {
    await cleanup(dir);
  }
});

Deno.test("HabitService.toggleDate stores note on add when supplied", async () => {
  const { service, dir } = await setup();
  try {
    const h = await service.create({ title: "Toggle Note" });
    const after = await service.toggleDate(
      h.id,
      "2026-01-15",
      ALICE,
      "Felt great",
    );
    assertExists(after);
    assertEquals(after!.completedDates[0], {
      date: "2026-01-15",
      userId: "alice",
      note: "Felt great",
    });
  } finally {
    await cleanup(dir);
  }
});

// === deleteCompletion ===

Deno.test("HabitService.deleteCompletion drops the scoped user's entry on that date only", async () => {
  const { repo, service, dir } = await setup();
  try {
    const h = await repo.create({
      title: "Delete completion",
      completedDates: [
        { date: "2026-01-15", userId: "alice" },
        { date: "2026-01-16", userId: "alice" },
        { date: "2026-01-15", userId: "bob" },
      ],
    });
    const after = await service.deleteCompletion(h.id, "2026-01-15", ALICE);
    assertExists(after);
    // Alice view: only 01-16 remains.
    assertEquals(after!.completedDates.length, 1);
    assertEquals(after!.completedDates[0].date, "2026-01-16");
    // Raw: bob's 01-15 untouched.
    const raw = await repo.findById(h.id);
    assertEquals(raw!.completedDates.length, 2);
    assertEquals(
      raw!.completedDates.some((e) =>
        e.date === "2026-01-15" && e.userId === "bob"
      ),
      true,
    );
  } finally {
    await cleanup(dir);
  }
});

Deno.test("HabitService.deleteCompletion returns null for missing habit", async () => {
  const { service, dir } = await setup();
  try {
    assertStrictEquals(
      await service.deleteCompletion("habit_missing", "2026-01-01", ALICE),
      null,
    );
  } finally {
    await cleanup(dir);
  }
});

// === default-scope ownership of legacy entries ===

Deno.test("HabitService.unmarkComplete - default-scope user can remove a legacy untagged entry", async () => {
  const { repo, service, dir } = await setup();
  try {
    const h = await repo.create({
      title: "Legacy + default",
      completedDates: [
        { date: "2026-01-01" }, // legacy
        { date: "2026-01-02", userId: "alice" },
      ],
    });
    const after = await service.unmarkComplete(
      h.id,
      "2026-01-01",
      DEFAULT_USER,
    );
    assertExists(after);
    // Default user sees only 01-02 in their scoped view.
    assertEquals(after!.completedDates.length, 1);
    assertEquals(after!.completedDates[0].date, "2026-01-02");
    // Raw: legacy entry is gone, alice's tagged entry remains.
    const raw = await repo.findById(h.id);
    assertEquals(raw!.completedDates.length, 1);
    assertEquals(raw!.completedDates[0].date, "2026-01-02");
    assertEquals(raw!.completedDates[0].userId, "alice");
  } finally {
    await cleanup(dir);
  }
});

Deno.test("HabitService.unmarkComplete - non-default user CANNOT remove a legacy untagged entry", async () => {
  const { repo, service, dir } = await setup();
  try {
    const h = await repo.create({
      title: "Legacy + non-default",
      completedDates: [{ date: "2026-01-01" }],
    });
    // Bob tries to unmark legacy entry — should be a no-op (not owned).
    const after = await service.unmarkComplete(h.id, "2026-01-01", BOB);
    assertExists(after);
    // Bob's scoped view: empty (didn't see it to begin with).
    assertEquals(after!.completedDates.length, 0);
    // Raw: legacy entry still there.
    const raw = await repo.findById(h.id);
    assertEquals(raw!.completedDates.length, 1);
    assertStrictEquals(raw!.completedDates[0].userId, undefined);
  } finally {
    await cleanup(dir);
  }
});

// === manual fixture parse with mixed entry shapes ===

Deno.test("HabitRepository - parses a manually-written file with legacy string + structured entries", async () => {
  const { repo, dir } = await setup();
  try {
    await Deno.mkdir(join(dir, "habits"), { recursive: true });
    await Deno.writeTextFile(
      join(dir, "habits", "habit_manual.md"),
      [
        "---",
        "id: habit_manual",
        "title: Mixed Entries",
        "frequency: daily",
        "target_per_period: 1",
        "completed_dates:",
        "  - 2026-01-01", // legacy string format
        "  - date: 2026-01-02", // structured, no userId (legacy migration)
        "  - date: 2026-01-03",
        // Nested object keys stay camelCase on disk — mapKeysFromFm is
        // single-level (architecture note `note_1779951164461_w3e8gp`).
        "    userId: alice",
        "  - date: 2026-01-04",
        "    userId: bob",
        "    note: With note",
        "tags:",
        "  - health",
        "created_at: 2026-01-01T00:00:00.000Z",
        "updated_at: 2026-01-02T00:00:00.000Z",
        "---",
        "",
        "Hand-written fixture body.",
        "",
      ].join("\n"),
    );
    const fetched = await repo.findById("habit_manual");
    assertExists(fetched);
    assertEquals(fetched!.id, "habit_manual");
    assertEquals(fetched!.title, "Mixed Entries");
    assertEquals(fetched!.completedDates.length, 4);
    // Legacy string → {date}
    assertEquals(fetched!.completedDates[0], { date: "2026-01-01" });
    // Structured no userId
    assertEquals(fetched!.completedDates[1].date, "2026-01-02");
    assertStrictEquals(fetched!.completedDates[1].userId, undefined);
    // Structured with userId
    assertEquals(fetched!.completedDates[2].userId, "alice");
    // Structured with userId + note
    assertEquals(fetched!.completedDates[3].userId, "bob");
    assertEquals(fetched!.completedDates[3].note, "With note");
    assertEquals(fetched!.tags, ["health"]);
    assertEquals(fetched!.description, "Hand-written fixture body.");
  } finally {
    await cleanup(dir);
  }
});

// === edge cases ===

Deno.test("HabitRepository - findByName returns matching habit (case-insensitive)", async () => {
  const { repo, dir } = await setup();
  try {
    await repo.create({ title: "Premium Habit" });
    await repo.create({ title: "Standard Habit" });
    const found = await repo.findByName("premium habit");
    assertExists(found);
    assertEquals(found!.title, "Premium Habit");
  } finally {
    await cleanup(dir);
  }
});

// === multi-count tracking (targetPerPeriod > 1) ===

Deno.test("HabitService.markComplete - allows up to targetPerPeriod entries per date", async () => {
  const { repo, service, dir } = await setup();
  try {
    const h = await repo.create({ title: "3x daily", targetPerPeriod: 3 });
    // First completion
    let after = await service.markComplete(h.id, "2026-06-16", ALICE);
    assertEquals(after!.completedDates.length, 1);
    // Second
    after = await service.markComplete(h.id, "2026-06-16", ALICE);
    assertEquals(after!.completedDates.length, 2);
    // Third
    after = await service.markComplete(h.id, "2026-06-16", ALICE);
    assertEquals(after!.completedDates.length, 3);
    // Fourth — capped at target, no-op
    after = await service.markComplete(h.id, "2026-06-16", ALICE);
    assertEquals(after!.completedDates.length, 3);
  } finally {
    await cleanup(dir);
  }
});

Deno.test("HabitService.markComplete - targetPerPeriod=1 remains idempotent", async () => {
  const { repo, service, dir } = await setup();
  try {
    const h = await repo.create({ title: "Once daily", targetPerPeriod: 1 });
    await service.markComplete(h.id, "2026-06-16", ALICE);
    const after = await service.markComplete(h.id, "2026-06-16", ALICE);
    assertEquals(after!.completedDates.length, 1);
  } finally {
    await cleanup(dir);
  }
});

Deno.test("HabitService.unmarkComplete - decrements by one (not clear all)", async () => {
  const { repo, service, dir } = await setup();
  try {
    const h = await repo.create({
      title: "3x daily",
      targetPerPeriod: 3,
      completedDates: [
        { date: "2026-06-16", userId: "alice" },
        { date: "2026-06-16", userId: "alice" },
        { date: "2026-06-16", userId: "alice" },
      ],
    });
    // Remove one
    let after = await service.unmarkComplete(h.id, "2026-06-16", ALICE);
    assertEquals(after!.completedDates.length, 2);
    // Remove another
    after = await service.unmarkComplete(h.id, "2026-06-16", ALICE);
    assertEquals(after!.completedDates.length, 1);
    // Remove last
    after = await service.unmarkComplete(h.id, "2026-06-16", ALICE);
    assertEquals(after!.completedDates.length, 0);
  } finally {
    await cleanup(dir);
  }
});

Deno.test("HabitService.toggleDate - increments up to target then clears all", async () => {
  const { repo, service, dir } = await setup();
  try {
    const h = await repo.create({ title: "2x daily", targetPerPeriod: 2 });
    // 0 → 1
    let after = await service.toggleDate(h.id, "2026-06-16", ALICE);
    assertEquals(after!.completedDates.length, 1);
    // 1 → 2 (now done)
    after = await service.toggleDate(h.id, "2026-06-16", ALICE);
    assertEquals(after!.completedDates.length, 2);
    // 2 → 0 (clear all — was fully done)
    after = await service.toggleDate(h.id, "2026-06-16", ALICE);
    assertEquals(after!.completedDates.length, 0);
  } finally {
    await cleanup(dir);
  }
});

Deno.test("HabitService.toggleDate - note only attached to first completion", async () => {
  const { repo, service, dir } = await setup();
  try {
    const h = await repo.create({ title: "2x note test", targetPerPeriod: 2 });
    // First: with note
    let after = await service.toggleDate(
      h.id,
      "2026-06-16",
      ALICE,
      "Morning",
    );
    assertEquals(after!.completedDates[0].note, "Morning");
    // Second: note ignored (not first)
    after = await service.toggleDate(h.id, "2026-06-16", ALICE, "Evening");
    assertEquals(after!.completedDates.length, 2);
    // Second entry has no note
    const secondEntry = after!.completedDates.find((e) => !e.note);
    assertEquals(secondEntry?.note, undefined);
  } finally {
    await cleanup(dir);
  }
});
