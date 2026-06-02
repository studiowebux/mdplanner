/**
 * Unit tests for v2 PeopleRepository (CRUD on disk) and PeopleService
 * (filters, org tree, departments, skills, availability, workload,
 * heartbeat, preferences deep-merge).
 *
 * Disk-only — no cache attached, no FTS entity registered.
 */

import { assertEquals, assertExists, assertStrictEquals } from "@std/assert";
import { PeopleRepository } from "../../src/repositories/people.repository.ts";
import { PeopleService } from "../../src/services/people.service.ts";
import type { Person } from "../../src/types/person.types.ts";

async function setupRepo(): Promise<{ repo: PeopleRepository; dir: string }> {
  const dir = await Deno.makeTempDir({ prefix: "mdplanner-people-test-" });
  const repo = new PeopleRepository(dir);
  return { repo, dir };
}

async function setupService(): Promise<{
  service: PeopleService;
  repo: PeopleRepository;
  dir: string;
}> {
  const dir = await Deno.makeTempDir({ prefix: "mdplanner-people-svc-" });
  const repo = new PeopleRepository(dir);
  const service = new PeopleService(repo);
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
// PeopleRepository — CRUD round-trip
// =============================================================================

Deno.test("PeopleRepository - create stores file and returns entity", async () => {
  const { repo, dir } = await setupRepo();
  try {
    const p = await repo.create({
      name: "Jane Smith",
      title: "Senior Engineer",
      role: "developer",
      departments: ["Engineering", "Platform"],
      email: "jane@example.com",
      phone: "555-0100",
      startDate: "2025-01-15",
      hoursPerDay: 8,
      workingDays: ["Mon", "Tue", "Wed", "Thu", "Fri"],
      agentType: "human",
      skills: ["typescript", "go"],
      notes: "Senior team member",
    });
    assertExists(p.id);
    assertEquals(p.name, "Jane Smith");
    assertEquals(p.title, "Senior Engineer");
    assertEquals(p.role, "developer");
    assertEquals(p.departments, ["Engineering", "Platform"]);
    assertEquals(p.email, "jane@example.com");
    assertEquals(p.hoursPerDay, 8);
    assertEquals(p.workingDays, ["Mon", "Tue", "Wed", "Thu", "Fri"]);
    assertEquals(p.agentType, "human");
    assertEquals(p.skills, ["typescript", "go"]);
  } finally {
    await cleanup(dir);
  }
});

Deno.test("PeopleRepository - findById round-trips every persisted field", async () => {
  const { repo, dir } = await setupRepo();
  try {
    const created = await repo.create({
      name: "Round Trip",
      title: "Lead",
      role: "manager",
      departments: ["Engineering"],
      email: "rt@example.com",
      phone: "555-0101",
      startDate: "2025-02-01",
      hoursPerDay: 7,
      workingDays: ["Mon", "Tue", "Wed"],
      notes: "Detailed notes here",
      agentType: "ai",
      skills: ["review"],
      models: [
        { name: "claude-sonnet-4-5", provider: "anthropic" },
      ],
      systemPrompt: "You are a helpful assistant",
      accounts: { github: "octocat", asana: "rt" },
      preferences: {
        viewPrefs: { tasks: "board", goals: "grid" },
        pinnedNav: ["/tasks", "/goals"],
        filterDefaults: {
          tasks: { section: "In Progress" },
        },
      },
    });
    const found = await repo.findById(created.id);
    assertExists(found);
    assertEquals(found!.name, "Round Trip");
    assertEquals(found!.title, "Lead");
    assertEquals(found!.role, "manager");
    assertEquals(found!.departments, ["Engineering"]);
    assertEquals(found!.email, "rt@example.com");
    assertEquals(found!.hoursPerDay, 7);
    assertEquals(found!.workingDays, ["Mon", "Tue", "Wed"]);
    assertEquals(found!.notes, "Detailed notes here");
    assertEquals(found!.agentType, "ai");
    assertEquals(found!.skills, ["review"]);
    assertEquals(found!.models, [
      { name: "claude-sonnet-4-5", provider: "anthropic" },
    ]);
    assertEquals(found!.systemPrompt, "You are a helpful assistant");
    assertEquals(found!.accounts, { github: "octocat", asana: "rt" });
    assertEquals(found!.preferences, {
      viewPrefs: { tasks: "board", goals: "grid" },
      pinnedNav: ["/tasks", "/goals"],
      filterDefaults: {
        tasks: { section: "In Progress" },
      },
    });
  } finally {
    await cleanup(dir);
  }
});

Deno.test("PeopleRepository - findById returns null for missing ID", async () => {
  const { repo, dir } = await setupRepo();
  try {
    const found = await repo.findById("person_nonexistent");
    assertStrictEquals(found, null);
  } finally {
    await cleanup(dir);
  }
});

Deno.test("PeopleRepository - findAll returns all entities", async () => {
  const { repo, dir } = await setupRepo();
  try {
    await repo.create({ name: "Alpha" });
    await repo.create({ name: "Beta" });
    await repo.create({ name: "Gamma" });
    const all = await repo.findAll();
    assertEquals(all.length, 3);
  } finally {
    await cleanup(dir);
  }
});

Deno.test("PeopleRepository - update modifies existing entity", async () => {
  const { repo, dir } = await setupRepo();
  try {
    const p = await repo.create({ name: "Before", title: "Old" });
    const updated = await repo.update(p.id, {
      title: "New",
      email: "u@example.com",
    });
    assertExists(updated);
    assertEquals(updated!.title, "New");
    assertEquals(updated!.email, "u@example.com");

    const found = await repo.findById(p.id);
    assertEquals(found!.title, "New");
    assertEquals(found!.email, "u@example.com");
  } finally {
    await cleanup(dir);
  }
});

Deno.test("PeopleRepository - update leaves untouched fields intact", async () => {
  const { repo, dir } = await setupRepo();
  try {
    const p = await repo.create({
      name: "Stable",
      title: "Keep me",
      departments: ["Engineering"],
      skills: ["ts", "go"],
    });
    await repo.update(p.id, { email: "stable@example.com" });
    const found = await repo.findById(p.id);
    assertEquals(found!.name, "Stable");
    assertEquals(found!.title, "Keep me");
    assertEquals(found!.departments, ["Engineering"]);
    assertEquals(found!.skills, ["ts", "go"]);
    assertEquals(found!.email, "stable@example.com");
  } finally {
    await cleanup(dir);
  }
});

Deno.test("PeopleRepository - update returns null for non-existent ID", async () => {
  const { repo, dir } = await setupRepo();
  try {
    const result = await repo.update("person_missing", { title: "Ghost" });
    assertStrictEquals(result, null);
  } finally {
    await cleanup(dir);
  }
});

Deno.test("PeopleRepository - parse-guard: findById resolves after update", async () => {
  const { repo, dir } = await setupRepo();
  try {
    const p = await repo.create({
      name: "Round-trip",
      title: "Engineer",
      departments: ["Engineering"],
      notes: "Initial",
    });
    await repo.update(p.id, { title: "Lead" });
    const found = await repo.findById(p.id);
    assertExists(found);
    assertEquals(found!.id, p.id);
    assertEquals(found!.name, "Round-trip");
    assertEquals(found!.title, "Lead");
  } finally {
    await cleanup(dir);
  }
});

Deno.test("PeopleRepository - delete soft-archives entity", async () => {
  const { repo, dir } = await setupRepo();
  try {
    const p = await repo.create({ name: "To Archive" });
    const deleted = await repo.delete(p.id);
    assertEquals(deleted, true);
    // delete() aliases archive() — file stays on disk, findById still resolves.
    const found = await repo.findById(p.id);
    assertExists(found);
    const all = await repo.findAll();
    assertStrictEquals(all.find((x) => x.id === p.id), undefined);
  } finally {
    await cleanup(dir);
  }
});

Deno.test("PeopleRepository - hardDelete removes the file", async () => {
  const { repo, dir } = await setupRepo();
  try {
    const p = await repo.create({ name: "Truly gone" });
    const ok = await repo.hardDelete(p.id);
    assertEquals(ok, true);
    const found = await repo.findById(p.id);
    assertStrictEquals(found, null);
  } finally {
    await cleanup(dir);
  }
});

Deno.test("PeopleRepository - delete returns false for non-existent ID", async () => {
  const { repo, dir } = await setupRepo();
  try {
    const result = await repo.delete("person_ghost");
    assertEquals(result, false);
  } finally {
    await cleanup(dir);
  }
});

Deno.test("PeopleRepository - findByName matches case-insensitively", async () => {
  const { repo, dir } = await setupRepo();
  try {
    await repo.create({ name: "Jane Smith" });
    const found = await repo.findByName("jane SMITH");
    assertExists(found);
    assertEquals(found!.name, "Jane Smith");

    const missing = await repo.findByName("no one here");
    assertStrictEquals(missing, null);
  } finally {
    await cleanup(dir);
  }
});

// =============================================================================
// PeopleService — list filter by department
// =============================================================================

Deno.test("PeopleService - list filters by department (case-insensitive)", async () => {
  const { service, dir } = await setupService();
  try {
    await service.create({ name: "Alice", departments: ["Engineering"] });
    await service.create({
      name: "Bob",
      departments: ["Engineering", "Platform"],
    });
    await service.create({ name: "Carol", departments: ["Design"] });

    const eng = await service.list({ department: "engineering" });
    assertEquals(eng.length, 2);
    assertEquals(eng.map((p) => p.name).sort(), ["Alice", "Bob"]);

    const design = await service.list({ department: "DESIGN" });
    assertEquals(design.length, 1);
    assertEquals(design[0].name, "Carol");
  } finally {
    await cleanup(dir);
  }
});

// =============================================================================
// PeopleService — buildTree / getTree
// =============================================================================

Deno.test("PeopleService - getTree builds hierarchy from reportsTo", async () => {
  const { service, dir } = await setupService();
  try {
    const ceo = await service.create({ name: "CEO" });
    const cto = await service.create({ name: "CTO", reportsTo: ceo.id });
    await service.create({ name: "Eng1", reportsTo: cto.id });
    await service.create({ name: "Eng2", reportsTo: cto.id });

    const tree = await service.getTree();
    assertEquals(tree.length, 1);
    assertEquals(tree[0].name, "CEO");
    assertEquals(tree[0].children!.length, 1);
    assertEquals(tree[0].children![0].name, "CTO");
    assertEquals(tree[0].children![0].children!.length, 2);
  } finally {
    await cleanup(dir);
  }
});

Deno.test("PeopleService.buildTree (static) - builds from filtered subset", async () => {
  // No I/O — pure static call.
  const a: Person = { id: "a", name: "A" };
  const b: Person = { id: "b", name: "B", reportsTo: "a" };
  const c: Person = { id: "c", name: "C", reportsTo: "b" };
  const tree = PeopleService.buildTree([a, b, c]);
  assertEquals(tree.length, 1);
  assertEquals(tree[0].id, "a");
  assertEquals(tree[0].children![0].id, "b");
  assertEquals(tree[0].children![0].children![0].id, "c");
});

Deno.test("PeopleService.buildTree (static) - orphan reportsTo becomes root", async () => {
  // Node references a manager not in the subset — should not crash; node
  // surfaces as a root rather than being dropped.
  const lone: Person = { id: "lone", name: "Lone", reportsTo: "missing" };
  const tree = PeopleService.buildTree([lone]);
  assertEquals(tree.length, 1);
  assertEquals(tree[0].id, "lone");
});

Deno.test("PeopleService.buildTree (static) - mutual cycle returns no roots without crashing", async () => {
  const a: Person = { id: "a", name: "A", reportsTo: "b" };
  const b: Person = { id: "b", name: "B", reportsTo: "a" };
  const tree = PeopleService.buildTree([a, b]);
  // A points at B (which exists) → A becomes child of B.
  // B points at A (which exists) → B becomes child of A.
  // Neither surfaces as a root.
  assertEquals(tree.length, 0);
});

// =============================================================================
// PeopleService — direct reports + departments + summary
// =============================================================================

Deno.test("PeopleService - getDirectReports returns only direct children", async () => {
  const { service, dir } = await setupService();
  try {
    const lead = await service.create({ name: "Lead" });
    await service.create({ name: "Direct1", reportsTo: lead.id });
    await service.create({ name: "Direct2", reportsTo: lead.id });
    const indirect = await service.create({ name: "Indirect" });
    await service.create({ name: "Skip", reportsTo: indirect.id });

    const reports = await service.getDirectReports(lead.id);
    assertEquals(reports.length, 2);
    assertEquals(reports.map((p) => p.name).sort(), ["Direct1", "Direct2"]);
  } finally {
    await cleanup(dir);
  }
});

Deno.test("PeopleService - getDepartments returns unique sorted list", async () => {
  const { service, dir } = await setupService();
  try {
    await service.create({ name: "A", departments: ["Engineering"] });
    await service.create({
      name: "B",
      departments: ["Engineering", "Platform"],
    });
    await service.create({ name: "C", departments: ["Design"] });

    const depts = await service.getDepartments();
    assertEquals(depts, ["Design", "Engineering", "Platform"]);
  } finally {
    await cleanup(dir);
  }
});

Deno.test("PeopleService - getSummary returns counts", async () => {
  const { service, dir } = await setupService();
  try {
    await service.create({ name: "A", departments: ["Engineering"] });
    await service.create({ name: "B", departments: ["Engineering"] });
    await service.create({ name: "C", departments: ["Design"] });

    const summary = await service.getSummary();
    assertEquals(summary.totalPeople, 3);
    assertEquals(summary.totalDepartments, 2);
    assertEquals(summary.departments, ["Design", "Engineering"]);
  } finally {
    await cleanup(dir);
  }
});

// =============================================================================
// PeopleService — skills / availability / accounts / workload
// =============================================================================

Deno.test("PeopleService - listBySkill matches case-insensitively", async () => {
  const { service, dir } = await setupService();
  try {
    await service.create({ name: "TS Dev", skills: ["typescript", "go"] });
    await service.create({ name: "Go Dev", skills: ["go", "rust"] });
    await service.create({ name: "Designer", skills: ["figma"] });

    const ts = await service.listBySkill("TYPESCRIPT");
    assertEquals(ts.length, 1);
    assertEquals(ts[0].name, "TS Dev");

    const go = await service.listBySkill("go");
    assertEquals(go.length, 2);
  } finally {
    await cleanup(dir);
  }
});

Deno.test("PeopleService - getAvailable excludes offline by default", async () => {
  const { service, dir } = await setupService();
  try {
    const a = await service.create({ name: "Online One" });
    await service.heartbeat(a.id, "idle");

    const b = await service.create({ name: "Working One" });
    await service.heartbeat(b.id, "working");

    const c = await service.create({ name: "Offline One" });
    await service.heartbeat(c.id, "offline");

    const available = await service.getAvailable();
    assertEquals(available.length, 2);
    assertEquals(
      available.map((p) => p.name).sort(),
      ["Online One", "Working One"],
    );

    const all = await service.getAvailable(false);
    assertEquals(all.length, 3);
  } finally {
    await cleanup(dir);
  }
});

Deno.test("PeopleService - findForSkills ranks by match count and skips offline", async () => {
  const { service, dir } = await setupService();
  try {
    const a = await service.create({
      name: "All Three",
      skills: ["typescript", "testing", "review"],
    });
    await service.create({
      name: "Two Skills",
      skills: ["typescript", "testing"],
    });
    await service.create({
      name: "One Skill",
      skills: ["typescript"],
    });
    const offline = await service.create({
      name: "Offline",
      skills: ["typescript", "testing", "review"],
    });
    await service.heartbeat(offline.id, "offline");

    const matches = await service.findForSkills(["typescript", "testing"]);
    // Offline excluded; ordered by score desc
    assertEquals(matches.length, 3);
    assertEquals(matches[0].person.id, a.id);
    assertEquals(matches[0].score, 2);
    assertEquals(matches[0].matchedSkills.sort(), ["testing", "typescript"]);
    assertEquals(matches[1].score, 2);
    assertEquals(matches[2].score, 1);
  } finally {
    await cleanup(dir);
  }
});

Deno.test("PeopleService - findByAccount matches case-insensitively on username", async () => {
  const { service, dir } = await setupService();
  try {
    await service.create({
      name: "GH user",
      accounts: { github: "OctoCat" },
    });
    await service.create({
      name: "Asana user",
      accounts: { asana: "tommy.gingras" },
    });

    const hit = await service.findByAccount("github", "octocat");
    assertExists(hit);
    assertEquals(hit!.name, "GH user");

    const miss = await service.findByAccount("github", "ghost");
    assertStrictEquals(miss, null);
  } finally {
    await cleanup(dir);
  }
});

Deno.test("PeopleService - getWorkload returns workload subset; null for missing", async () => {
  const { service, dir } = await setupService();
  try {
    const p = await service.create({
      name: "Worker",
      hoursPerDay: 6,
      workingDays: ["Mon", "Tue", "Wed", "Thu"],
      agentType: "human",
    });
    const wl = await service.getWorkload(p.id);
    assertExists(wl);
    assertEquals(wl!.id, p.id);
    assertEquals(wl!.name, "Worker");
    assertEquals(wl!.hoursPerDay, 6);
    assertEquals(wl!.workingDays, ["Mon", "Tue", "Wed", "Thu"]);
    assertEquals(wl!.agentType, "human");

    const missing = await service.getWorkload("person_missing");
    assertStrictEquals(missing, null);
  } finally {
    await cleanup(dir);
  }
});

// =============================================================================
// PeopleService — updatePreferences (deep-merge)
// =============================================================================

Deno.test("PeopleService - updatePreferences deep-merges object sub-keys and replaces arrays", async () => {
  const { service, dir } = await setupService();
  try {
    const p = await service.create({
      name: "Pref User",
      preferences: {
        viewPrefs: { tasks: "board", goals: "grid" },
        pinnedNav: ["/tasks"],
        filterDefaults: { tasks: { section: "Todo" } },
      },
    });

    const merged = await service.updatePreferences(p.id, {
      viewPrefs: { tasks: "list" },
      pinnedNav: ["/goals", "/notes"],
      filterDefaults: { goals: { status: "active" } },
    });
    assertExists(merged);
    assertEquals(merged!.preferences, {
      viewPrefs: { tasks: "list", goals: "grid" },
      pinnedNav: ["/goals", "/notes"],
      filterDefaults: {
        tasks: { section: "Todo" },
        goals: { status: "active" },
      },
    });

    const reread = await service.getById(p.id);
    assertEquals(reread!.preferences, merged!.preferences);
  } finally {
    await cleanup(dir);
  }
});

Deno.test("PeopleService - updatePreferences returns null for missing person", async () => {
  const { service, dir } = await setupService();
  try {
    const result = await service.updatePreferences("person_missing", {
      viewPrefs: { tasks: "board" },
    });
    assertStrictEquals(result, null);
  } finally {
    await cleanup(dir);
  }
});

// =============================================================================
// PeopleService — heartbeat
// =============================================================================

Deno.test("PeopleService - heartbeat updates lastSeen, status, and currentTaskId", async () => {
  const { service, dir } = await setupService();
  try {
    const p = await service.create({ name: "Agent", agentType: "ai" });
    const ok = await service.heartbeat(p.id, "working", "task_abc");
    assertEquals(ok, true);

    const reread = await service.getById(p.id);
    assertExists(reread!.lastSeen);
    assertEquals(reread!.status, "working");
    assertEquals(reread!.currentTaskId, "task_abc");

    const missing = await service.heartbeat("person_missing");
    assertEquals(missing, false);
  } finally {
    await cleanup(dir);
  }
});
