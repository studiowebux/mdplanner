/**
 * Unit tests for v2 CapacityPlanRepository (CRUD on disk) + CapacityPlanService
 * (member and allocation mutation helpers).
 *
 * Custom body format — pipe-delimited member and allocation lines under
 * `## Team Members` / `## Allocations`. Frontmatter holds id/title/dates/
 * budgetHours, members + allocations live in the body.
 * `CAPACITY_PLAN_BODY_KEYS = ["title","teamMembers","allocations"]` —
 * title is in BODY_KEYS so it's NOT written to frontmatter; the parse guard
 * `!fm.id && !fm.title` must hold via fm.id.
 *
 * Body line formats covered:
 * - Member minimal: `- (id) personId`
 * - Member hours-only: `- (id) personId | 6h/day`
 * - Member full: `- (id) personId | 6h/day | Mon,Tue,Wed`
 * - Allocation pct: `- (id) personId | project | targetId | 50%`
 * - Allocation hpw: `- (id) personId | project | targetId | 20h/week`
 * - Allocation + notes: `... | quantifier | optional notes`
 */

import { assertEquals, assertExists, assertStrictEquals } from "@std/assert";
import { join } from "@std/path";
import { CapacityPlanRepository } from "../../v2/repositories/capacity-plan.repository.ts";
import { CapacityPlanService } from "../../v2/services/capacity-plan.service.ts";

async function setup(): Promise<{
  repo: CapacityPlanRepository;
  service: CapacityPlanService;
  dir: string;
}> {
  const dir = await Deno.makeTempDir({ prefix: "mdplanner-capacity-test-" });
  const repo = new CapacityPlanRepository(dir);
  const service = new CapacityPlanService(repo);
  return { repo, service, dir };
}

async function cleanup(dir: string): Promise<void> {
  try {
    await Deno.remove(dir, { recursive: true });
  } catch {
    // ignore
  }
}

// === create + findById ===

Deno.test("CapacityPlanRepository - create stores file with empty defaults", async () => {
  const { repo, dir } = await setup();
  try {
    const plan = await repo.create({ title: "Q2 2026 Plan" });
    assertExists(plan.id);
    assertEquals(plan.title, "Q2 2026 Plan");
    assertEquals(plan.teamMembers, []);
    assertEquals(plan.allocations, []);
    assertExists(plan.createdAt);
  } finally {
    await cleanup(dir);
  }
});

Deno.test("CapacityPlanRepository - create with full top-level fields", async () => {
  const { repo, dir } = await setup();
  try {
    const plan = await repo.create({
      title: "Full Plan",
      startDate: "2026-04-01",
      endDate: "2026-06-30",
      budgetHours: 160,
    });
    assertEquals(plan.startDate, "2026-04-01");
    assertEquals(plan.endDate, "2026-06-30");
    assertEquals(plan.budgetHours, 160);
  } finally {
    await cleanup(dir);
  }
});

Deno.test("CapacityPlanRepository - findById returns null for missing ID", async () => {
  const { repo, dir } = await setup();
  try {
    const found = await repo.findById("capacity_nonexistent");
    assertStrictEquals(found, null);
  } finally {
    await cleanup(dir);
  }
});

// === member format round-trip ===

Deno.test("CapacityPlanRepository - team member round-trip — all three formats", async () => {
  const { repo, dir } = await setup();
  try {
    const created = await repo.create({
      title: "Members",
      teamMembers: [
        { id: "m_min", personId: "person_001" },
        { id: "m_hours", personId: "person_002", hoursPerDay: 6 },
        {
          id: "m_full",
          personId: "person_003",
          hoursPerDay: 8,
          workingDays: ["Mon", "Tue", "Wed", "Thu"],
        },
      ],
    });
    const fetched = await repo.findById(created.id);
    assertExists(fetched);
    assertEquals(fetched!.teamMembers.length, 3);
    // Minimal
    assertEquals(fetched!.teamMembers[0].id, "m_min");
    assertEquals(fetched!.teamMembers[0].personId, "person_001");
    assertStrictEquals(fetched!.teamMembers[0].hoursPerDay, undefined);
    assertStrictEquals(fetched!.teamMembers[0].workingDays, undefined);
    // Hours-only
    assertEquals(fetched!.teamMembers[1].id, "m_hours");
    assertEquals(fetched!.teamMembers[1].hoursPerDay, 6);
    assertStrictEquals(fetched!.teamMembers[1].workingDays, undefined);
    // Full
    assertEquals(fetched!.teamMembers[2].id, "m_full");
    assertEquals(fetched!.teamMembers[2].hoursPerDay, 8);
    assertEquals(fetched!.teamMembers[2].workingDays, [
      "Mon",
      "Tue",
      "Wed",
      "Thu",
    ]);
  } finally {
    await cleanup(dir);
  }
});

// === allocation format round-trip ===

Deno.test("CapacityPlanRepository - allocation round-trip — percentage and hours/week, with and without notes", async () => {
  const { repo, dir } = await setup();
  try {
    const created = await repo.create({
      title: "Allocs",
      teamMembers: [
        { id: "m1", personId: "p1" },
        { id: "m2", personId: "p2" },
      ],
      allocations: [
        {
          id: "a_pct",
          personId: "p1",
          targetType: "project",
          targetId: "portfolio_001",
          percentage: 50,
        },
        {
          id: "a_hpw",
          personId: "p2",
          targetType: "milestone",
          targetId: "milestone_001",
          hoursPerWeek: 20,
          notes: "Two days a week",
        },
      ],
    });
    const fetched = await repo.findById(created.id);
    assertExists(fetched);
    assertEquals(fetched!.allocations.length, 2);

    const pct = fetched!.allocations.find((a) => a.id === "a_pct");
    assertExists(pct);
    assertEquals(pct!.personId, "p1");
    assertEquals(pct!.targetType, "project");
    assertEquals(pct!.targetId, "portfolio_001");
    assertEquals(pct!.percentage, 50);
    assertStrictEquals(pct!.hoursPerWeek, undefined);
    assertStrictEquals(pct!.notes, undefined);

    const hpw = fetched!.allocations.find((a) => a.id === "a_hpw");
    assertExists(hpw);
    assertEquals(hpw!.targetType, "milestone");
    assertEquals(hpw!.hoursPerWeek, 20);
    assertStrictEquals(hpw!.percentage, undefined);
    assertEquals(hpw!.notes, "Two days a week");
  } finally {
    await cleanup(dir);
  }
});

// === parse-guard regression — members + allocations survive update ===

Deno.test("CapacityPlanRepository - findById succeeds after update (parse-guard regression)", async () => {
  const { repo, dir } = await setup();
  try {
    const created = await repo.create({
      title: "Parse Guard",
      budgetHours: 100,
      teamMembers: [{ id: "m1", personId: "p1", hoursPerDay: 6 }],
      allocations: [{
        id: "a1",
        personId: "p1",
        targetType: "project",
        targetId: "portfolio_x",
        percentage: 75,
      }],
    });
    // CAPACITY_PLAN_BODY_KEYS includes "title" — title isn't in fm after
    // update. Guard `!fm.id && !fm.title` must hold via fm.id.
    const updated = await repo.update(created.id, { budgetHours: 150 });
    assertExists(updated);
    const fetched = await repo.findById(created.id);
    assertExists(fetched);
    assertEquals(fetched!.id, created.id);
    assertEquals(fetched!.title, "Parse Guard");
    assertEquals(fetched!.budgetHours, 150);
    // Members and allocations intact post-update.
    assertEquals(fetched!.teamMembers.length, 1);
    assertEquals(fetched!.teamMembers[0].personId, "p1");
    assertEquals(fetched!.teamMembers[0].hoursPerDay, 6);
    assertEquals(fetched!.allocations.length, 1);
    assertEquals(fetched!.allocations[0].percentage, 75);
  } finally {
    await cleanup(dir);
  }
});

// === update ===

Deno.test("CapacityPlanRepository - update can replace teamMembers + allocations", async () => {
  const { repo, dir } = await setup();
  try {
    const created = await repo.create({
      title: "Replaceable",
      teamMembers: [{ id: "old_m", personId: "p_old" }],
      allocations: [{
        id: "old_a",
        personId: "p_old",
        targetType: "project",
        targetId: "t",
        percentage: 25,
      }],
    });
    await repo.update(created.id, {
      teamMembers: [{ id: "new_m", personId: "p_new", hoursPerDay: 4 }],
      allocations: [{
        id: "new_a",
        personId: "p_new",
        targetType: "milestone",
        targetId: "t2",
        hoursPerWeek: 10,
      }],
    });
    const fetched = await repo.findById(created.id);
    assertExists(fetched);
    assertEquals(fetched!.teamMembers.length, 1);
    assertEquals(fetched!.teamMembers[0].id, "new_m");
    assertEquals(fetched!.allocations.length, 1);
    assertEquals(fetched!.allocations[0].id, "new_a");
    assertEquals(fetched!.allocations[0].targetType, "milestone");
  } finally {
    await cleanup(dir);
  }
});

Deno.test("CapacityPlanRepository - update returns null for non-existent ID", async () => {
  const { repo, dir } = await setup();
  try {
    const result = await repo.update("capacity_missing", { title: "X" });
    assertStrictEquals(result, null);
  } finally {
    await cleanup(dir);
  }
});

// === delete + hardDelete ===

Deno.test("CapacityPlanRepository - delete soft-archives entity", async () => {
  const { repo, dir } = await setup();
  try {
    const plan = await repo.create({ title: "To Archive" });
    const deleted = await repo.delete(plan.id);
    assertEquals(deleted, true);
    const found = await repo.findById(plan.id);
    assertExists(found);
    const all = await repo.findAllFromDisk();
    assertStrictEquals(all.find((p) => p.id === plan.id), undefined);
  } finally {
    await cleanup(dir);
  }
});

Deno.test("CapacityPlanRepository - hardDelete removes the file", async () => {
  const { repo, dir } = await setup();
  try {
    const plan = await repo.create({ title: "Gone" });
    const ok = await repo.hardDelete(plan.id);
    assertEquals(ok, true);
    assertStrictEquals(await repo.findById(plan.id), null);
  } finally {
    await cleanup(dir);
  }
});

Deno.test("CapacityPlanRepository - delete returns false for non-existent ID", async () => {
  const { repo, dir } = await setup();
  try {
    assertEquals(await repo.delete("capacity_ghost"), false);
  } finally {
    await cleanup(dir);
  }
});

// === findAll: sort ===

Deno.test("CapacityPlanRepository - findAllFromDisk sorts alphabetically by title", async () => {
  const { repo, dir } = await setup();
  try {
    await repo.create({ title: "Charlie Plan" });
    await repo.create({ title: "Alpha Plan" });
    await repo.create({ title: "Bravo Plan" });
    const all = await repo.findAllFromDisk();
    assertEquals(all.map((p) => p.title), [
      "Alpha Plan",
      "Bravo Plan",
      "Charlie Plan",
    ]);
  } finally {
    await cleanup(dir);
  }
});

// === service.list (no filters) ===

Deno.test("CapacityPlanService - list returns all plans (no filters defined)", async () => {
  const { repo, service, dir } = await setup();
  try {
    await repo.create({ title: "A" });
    await repo.create({ title: "B" });
    const all = await service.list();
    assertEquals(all.length, 2);
  } finally {
    await cleanup(dir);
  }
});

// === service.addMember / updateMember / removeMember ===

Deno.test("CapacityPlanService.addMember appends a member with a generated id", async () => {
  const { repo, service, dir } = await setup();
  try {
    const plan = await repo.create({ title: "Add Member" });
    const result = await service.addMember(plan.id, {
      personId: "p_new",
      hoursPerDay: 7,
    });
    assertExists(result);
    assertEquals(result!.teamMembers.length, 1);
    assertEquals(result!.teamMembers[0].personId, "p_new");
    assertEquals(result!.teamMembers[0].hoursPerDay, 7);
    assertExists(result!.teamMembers[0].id);
  } finally {
    await cleanup(dir);
  }
});

Deno.test("CapacityPlanService.addMember returns null for non-existent plan", async () => {
  const { service, dir } = await setup();
  try {
    const result = await service.addMember("capacity_missing", {
      personId: "p1",
    });
    assertStrictEquals(result, null);
  } finally {
    await cleanup(dir);
  }
});

Deno.test("CapacityPlanService.updateMember mutates one member without touching siblings", async () => {
  const { repo, service, dir } = await setup();
  try {
    const created = await repo.create({
      title: "Update Member",
      teamMembers: [
        { id: "m1", personId: "p1", hoursPerDay: 4 },
        { id: "m2", personId: "p2", hoursPerDay: 8 },
      ],
    });
    const result = await service.updateMember(created.id, "m1", {
      hoursPerDay: 6,
      workingDays: ["Mon", "Tue"],
    });
    assertExists(result);
    const m1 = result!.teamMembers.find((m) => m.id === "m1");
    const m2 = result!.teamMembers.find((m) => m.id === "m2");
    assertEquals(m1!.hoursPerDay, 6);
    assertEquals(m1!.workingDays, ["Mon", "Tue"]);
    assertEquals(m1!.personId, "p1"); // unchanged
    assertEquals(m2!.hoursPerDay, 8); // sibling untouched
  } finally {
    await cleanup(dir);
  }
});

Deno.test("CapacityPlanService.updateMember returns null for unknown member id", async () => {
  const { repo, service, dir } = await setup();
  try {
    const plan = await repo.create({
      title: "X",
      teamMembers: [{ id: "m1", personId: "p1" }],
    });
    const result = await service.updateMember(plan.id, "m_ghost", {
      hoursPerDay: 1,
    });
    assertStrictEquals(result, null);
  } finally {
    await cleanup(dir);
  }
});

Deno.test("CapacityPlanService.removeMember also removes that person's allocations (orphan cleanup)", async () => {
  const { repo, service, dir } = await setup();
  try {
    const created = await repo.create({
      title: "Remove Member",
      teamMembers: [
        { id: "m1", personId: "p1" },
        { id: "m2", personId: "p2" },
      ],
      allocations: [
        {
          id: "a1",
          personId: "p1",
          targetType: "project",
          targetId: "t1",
          percentage: 50,
        },
        {
          id: "a2",
          personId: "p1",
          targetType: "project",
          targetId: "t2",
          percentage: 25,
        },
        {
          id: "a3",
          personId: "p2",
          targetType: "project",
          targetId: "t1",
          percentage: 100,
        },
      ],
    });
    const result = await service.removeMember(created.id, "m1");
    assertExists(result);
    // Member gone.
    assertEquals(result!.teamMembers.length, 1);
    assertEquals(result!.teamMembers[0].id, "m2");
    // p1's allocations cleaned up; p2's allocation preserved.
    assertEquals(result!.allocations.length, 1);
    assertEquals(result!.allocations[0].id, "a3");
    assertEquals(result!.allocations[0].personId, "p2");
  } finally {
    await cleanup(dir);
  }
});

Deno.test("CapacityPlanService.removeMember returns null for non-existent plan", async () => {
  const { service, dir } = await setup();
  try {
    assertStrictEquals(
      await service.removeMember("capacity_missing", "m1"),
      null,
    );
  } finally {
    await cleanup(dir);
  }
});

// === service.addAllocation / updateAllocation / removeAllocation ===

Deno.test("CapacityPlanService.addAllocation appends with a generated id", async () => {
  const { repo, service, dir } = await setup();
  try {
    const plan = await repo.create({
      title: "Add Alloc",
      teamMembers: [{ id: "m1", personId: "p1" }],
    });
    const result = await service.addAllocation(plan.id, {
      personId: "p1",
      targetType: "project",
      targetId: "portfolio_xyz",
      percentage: 40,
    });
    assertExists(result);
    assertEquals(result!.allocations.length, 1);
    assertEquals(result!.allocations[0].percentage, 40);
    assertExists(result!.allocations[0].id);
  } finally {
    await cleanup(dir);
  }
});

Deno.test("CapacityPlanService.updateAllocation mutates one allocation", async () => {
  const { repo, service, dir } = await setup();
  try {
    const created = await repo.create({
      title: "Update Alloc",
      teamMembers: [{ id: "m1", personId: "p1" }],
      allocations: [
        {
          id: "a1",
          personId: "p1",
          targetType: "project",
          targetId: "t1",
          percentage: 50,
        },
        {
          id: "a2",
          personId: "p1",
          targetType: "project",
          targetId: "t2",
          percentage: 25,
        },
      ],
    });
    const result = await service.updateAllocation(created.id, "a1", {
      percentage: 75,
      notes: "Bumped",
    });
    assertExists(result);
    const a1 = result!.allocations.find((a) => a.id === "a1");
    const a2 = result!.allocations.find((a) => a.id === "a2");
    assertEquals(a1!.percentage, 75);
    assertEquals(a1!.notes, "Bumped");
    assertEquals(a2!.percentage, 25); // sibling intact
  } finally {
    await cleanup(dir);
  }
});

Deno.test("CapacityPlanService.updateAllocation returns null for unknown allocation id", async () => {
  const { repo, service, dir } = await setup();
  try {
    const plan = await repo.create({ title: "X" });
    const result = await service.updateAllocation(plan.id, "a_ghost", {
      percentage: 50,
    });
    assertStrictEquals(result, null);
  } finally {
    await cleanup(dir);
  }
});

Deno.test("CapacityPlanService.removeAllocation drops one and keeps siblings", async () => {
  const { repo, service, dir } = await setup();
  try {
    const created = await repo.create({
      title: "Remove Alloc",
      teamMembers: [{ id: "m1", personId: "p1" }],
      allocations: [
        {
          id: "a1",
          personId: "p1",
          targetType: "project",
          targetId: "t1",
          percentage: 50,
        },
        {
          id: "a2",
          personId: "p1",
          targetType: "project",
          targetId: "t2",
          percentage: 25,
        },
      ],
    });
    const result = await service.removeAllocation(created.id, "a1");
    assertExists(result);
    assertEquals(result!.allocations.length, 1);
    assertEquals(result!.allocations[0].id, "a2");
  } finally {
    await cleanup(dir);
  }
});

Deno.test("CapacityPlanService.removeAllocation returns null for non-existent plan", async () => {
  const { service, dir } = await setup();
  try {
    assertStrictEquals(
      await service.removeAllocation("capacity_missing", "a1"),
      null,
    );
  } finally {
    await cleanup(dir);
  }
});

// === manual fixture parse ===

Deno.test("CapacityPlanRepository - parses a manually-written file with both sections", async () => {
  const { repo, dir } = await setup();
  try {
    await Deno.mkdir(join(dir, "capacity-plans"), { recursive: true });
    await Deno.writeTextFile(
      join(dir, "capacity-plans", "capacity_manual.md"),
      [
        "---",
        "id: capacity_manual",
        "start_date: 2026-04-01",
        "end_date: 2026-06-30",
        "budget_hours: 160",
        "created_at: 2026-01-01T00:00:00.000Z",
        "updated_at: 2026-01-02T00:00:00.000Z",
        "---",
        "# Manual Capacity Plan",
        "",
        "## Team Members",
        "",
        "- (m1) person_001",
        "- (m2) person_002 | 6h/day",
        "- (m3) person_003 | 8h/day | Mon,Tue,Wed,Thu,Fri",
        "",
        "## Allocations",
        "",
        "- (a1) person_001 | project | portfolio_alpha | 50%",
        "- (a2) person_002 | milestone | milestone_beta | 20h/week | Two days a week",
        "",
      ].join("\n"),
    );
    const fetched = await repo.findById("capacity_manual");
    assertExists(fetched);
    assertEquals(fetched!.id, "capacity_manual");
    assertEquals(fetched!.title, "Manual Capacity Plan");
    assertEquals(fetched!.startDate, "2026-04-01");
    assertEquals(fetched!.endDate, "2026-06-30");
    assertEquals(fetched!.budgetHours, 160);

    assertEquals(fetched!.teamMembers.length, 3);
    assertEquals(fetched!.teamMembers[0], {
      id: "m1",
      personId: "person_001",
    });
    assertEquals(fetched!.teamMembers[1], {
      id: "m2",
      personId: "person_002",
      hoursPerDay: 6,
    });
    assertEquals(fetched!.teamMembers[2], {
      id: "m3",
      personId: "person_003",
      hoursPerDay: 8,
      workingDays: ["Mon", "Tue", "Wed", "Thu", "Fri"],
    });

    assertEquals(fetched!.allocations.length, 2);
    assertEquals(fetched!.allocations[0].percentage, 50);
    assertEquals(fetched!.allocations[1].hoursPerWeek, 20);
    assertEquals(fetched!.allocations[1].notes, "Two days a week");
  } finally {
    await cleanup(dir);
  }
});

// === edge cases ===

Deno.test("CapacityPlanRepository - optional date/budgetHours undefined round-trip as undefined", async () => {
  const { repo, dir } = await setup();
  try {
    const created = await repo.create({ title: "Minimal" });
    assertStrictEquals(created.startDate, undefined);
    assertStrictEquals(created.endDate, undefined);
    assertStrictEquals(created.budgetHours, undefined);
    const fetched = await repo.findById(created.id);
    assertExists(fetched);
    assertStrictEquals(fetched!.startDate, undefined);
    assertStrictEquals(fetched!.endDate, undefined);
    assertStrictEquals(fetched!.budgetHours, undefined);
  } finally {
    await cleanup(dir);
  }
});

Deno.test("CapacityPlanRepository - findByName returns matching plan (case-insensitive)", async () => {
  const { repo, dir } = await setup();
  try {
    await repo.create({ title: "Premium Plan" });
    await repo.create({ title: "Standard Plan" });
    const found = await repo.findByName("premium plan");
    assertExists(found);
    assertEquals(found!.title, "Premium Plan");
  } finally {
    await cleanup(dir);
  }
});
