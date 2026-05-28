/**
 * Unit tests for v2 PortfolioRepository (standalone repo — does NOT extend
 * CachedMarkdownRepository) and PortfolioService.
 *
 * Disk-only — no cache attached.
 */

import { assertEquals, assertExists, assertStrictEquals } from "@std/assert";
import { PortfolioRepository } from "../../v2/repositories/portfolio.repository.ts";
import { PortfolioService } from "../../v2/services/portfolio.service.ts";

async function setupRepo(): Promise<
  { repo: PortfolioRepository; dir: string }
> {
  const dir = await Deno.makeTempDir({ prefix: "mdplanner-portfolio-test-" });
  const repo = new PortfolioRepository(dir);
  return { repo, dir };
}

async function setupService(): Promise<{
  service: PortfolioService;
  repo: PortfolioRepository;
  dir: string;
}> {
  const dir = await Deno.makeTempDir({ prefix: "mdplanner-portfolio-svc-" });
  const repo = new PortfolioRepository(dir);
  const service = new PortfolioService(repo);
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
// PortfolioRepository — CRUD round-trip
// =============================================================================

Deno.test("PortfolioRepository - create stores file and returns entity", async () => {
  const { repo, dir } = await setupRepo();
  try {
    const item = await repo.create({
      name: "MDPlanner",
      category: "SaaS Products",
      status: "active",
      description: "A modern project management platform",
      client: "Internal",
      progress: 65,
      revenue: 125000,
      expenses: 45000,
    });
    // ID is a slug of the name
    assertEquals(item.id, "mdplanner");
    assertEquals(item.name, "MDPlanner");
    assertEquals(item.category, "SaaS Products");
    assertEquals(item.status, "active");
    assertEquals(item.client, "Internal");
    assertEquals(item.progress, 65);
    assertEquals(item.revenue, 125000);
    assertEquals(item.expenses, 45000);
  } finally {
    await cleanup(dir);
  }
});

Deno.test("PortfolioRepository - create defaults category/status/progress when omitted", async () => {
  const { repo, dir } = await setupRepo();
  try {
    const item = await repo.create({ name: "Minimal" });
    assertEquals(item.category, "Uncategorized");
    assertEquals(item.status, "active");
    assertEquals(item.progress, 0);
  } finally {
    await cleanup(dir);
  }
});

Deno.test("PortfolioRepository - create appends counter for duplicate name", async () => {
  const { repo, dir } = await setupRepo();
  try {
    const first = await repo.create({ name: "Same Name" });
    const second = await repo.create({ name: "Same Name" });
    const third = await repo.create({ name: "Same Name" });
    assertEquals(first.id, "same-name");
    assertEquals(second.id, "same-name-1");
    assertEquals(third.id, "same-name-2");
  } finally {
    await cleanup(dir);
  }
});

Deno.test("PortfolioRepository - findById returns correct entity", async () => {
  const { repo, dir } = await setupRepo();
  try {
    const created = await repo.create({ name: "Findable" });
    const found = await repo.findById(created.id);
    assertExists(found);
    assertEquals(found!.id, created.id);
    assertEquals(found!.name, "Findable");
  } finally {
    await cleanup(dir);
  }
});

Deno.test("PortfolioRepository - findById returns null for missing ID", async () => {
  const { repo, dir } = await setupRepo();
  try {
    const found = await repo.findById("nonexistent-slug");
    assertStrictEquals(found, null);
  } finally {
    await cleanup(dir);
  }
});

Deno.test("PortfolioRepository - findAll returns all entities sorted by category then name", async () => {
  const { repo, dir } = await setupRepo();
  try {
    await repo.create({ name: "Zeta", category: "Alpha" });
    await repo.create({ name: "Alpha One", category: "Beta" });
    await repo.create({ name: "Alpha Two", category: "Alpha" });
    const all = await repo.findAll();
    assertEquals(all.length, 3);
    // Sort: category asc, then name asc
    assertEquals(all.map((i) => i.name), ["Alpha Two", "Zeta", "Alpha One"]);
  } finally {
    await cleanup(dir);
  }
});

Deno.test("PortfolioRepository - update modifies existing entity", async () => {
  const { repo, dir } = await setupRepo();
  try {
    const item = await repo.create({ name: "Before", status: "planning" });
    const updated = await repo.update(item.id, {
      status: "active",
      progress: 50,
    });
    assertExists(updated);
    assertEquals(updated!.status, "active");
    assertEquals(updated!.progress, 50);

    const found = await repo.findById(item.id);
    assertEquals(found!.status, "active");
    assertEquals(found!.progress, 50);
  } finally {
    await cleanup(dir);
  }
});

Deno.test("PortfolioRepository - update leaves untouched fields intact", async () => {
  const { repo, dir } = await setupRepo();
  try {
    const item = await repo.create({
      name: "Stable",
      category: "Keep",
      status: "active",
      client: "Internal",
      revenue: 100,
    });
    await repo.update(item.id, { progress: 75 });
    const found = await repo.findById(item.id);
    assertEquals(found!.name, "Stable");
    assertEquals(found!.category, "Keep");
    assertEquals(found!.status, "active");
    assertEquals(found!.client, "Internal");
    assertEquals(found!.revenue, 100);
    assertEquals(found!.progress, 75);
  } finally {
    await cleanup(dir);
  }
});

Deno.test("PortfolioRepository - update returns null for non-existent ID", async () => {
  const { repo, dir } = await setupRepo();
  try {
    const result = await repo.update("missing-id", { progress: 10 });
    assertStrictEquals(result, null);
  } finally {
    await cleanup(dir);
  }
});

Deno.test("PortfolioRepository - parse-guard: findById resolves after update", async () => {
  const { repo, dir } = await setupRepo();
  try {
    const item = await repo.create({
      name: "Round-trip",
      category: "Test",
      status: "planning",
      description: "Initial description",
    });
    await repo.update(item.id, { status: "active" });
    const found = await repo.findById(item.id);
    assertExists(found);
    assertEquals(found!.id, item.id);
    assertEquals(found!.name, "Round-trip");
    assertEquals(found!.status, "active");
  } finally {
    await cleanup(dir);
  }
});

Deno.test("PortfolioRepository - delete soft-archives entity", async () => {
  const { repo, dir } = await setupRepo();
  try {
    const item = await repo.create({ name: "To Archive" });
    const deleted = await repo.delete(item.id);
    assertEquals(deleted, true);
    // delete() aliases archive() — file stays on disk; findById still resolves
    // (intentionally unfiltered), findAll filters it out.
    const found = await repo.findById(item.id);
    assertExists(found);
    assertEquals(found!.archived, true);
    const all = await repo.findAll();
    assertStrictEquals(all.find((x) => x.id === item.id), undefined);
  } finally {
    await cleanup(dir);
  }
});

Deno.test("PortfolioRepository - findArchived returns only archived items", async () => {
  const { repo, dir } = await setupRepo();
  try {
    const a = await repo.create({ name: "Active One" });
    const b = await repo.create({ name: "To Archive" });
    await repo.delete(b.id);

    const archived = await repo.findArchived();
    assertEquals(archived.length, 1);
    assertEquals(archived[0].id, b.id);

    const all = await repo.findAll();
    assertEquals(all.length, 1);
    assertEquals(all[0].id, a.id);
  } finally {
    await cleanup(dir);
  }
});

Deno.test("PortfolioRepository - restore re-shows archived item in default list", async () => {
  const { repo, dir } = await setupRepo();
  try {
    const item = await repo.create({ name: "Round Trip" });
    await repo.delete(item.id);
    const restored = await repo.restore(item.id);
    assertEquals(restored, true);

    const all = await repo.findAll();
    assertExists(all.find((x) => x.id === item.id));
    const archived = await repo.findArchived();
    assertEquals(archived.length, 0);
  } finally {
    await cleanup(dir);
  }
});

Deno.test("PortfolioRepository - hardDelete removes the file", async () => {
  const { repo, dir } = await setupRepo();
  try {
    const item = await repo.create({ name: "Truly gone" });
    const ok = await repo.hardDelete(item.id);
    assertEquals(ok, true);
    const found = await repo.findById(item.id);
    assertStrictEquals(found, null);
  } finally {
    await cleanup(dir);
  }
});

Deno.test("PortfolioRepository - delete returns false for non-existent ID", async () => {
  const { repo, dir } = await setupRepo();
  try {
    const result = await repo.delete("ghost-id");
    assertEquals(result, false);
  } finally {
    await cleanup(dir);
  }
});

Deno.test("PortfolioRepository - hardDelete returns false for non-existent ID", async () => {
  const { repo, dir } = await setupRepo();
  try {
    const result = await repo.hardDelete("ghost-id");
    assertEquals(result, false);
  } finally {
    await cleanup(dir);
  }
});

// =============================================================================
// PortfolioRepository — field round-trip
// =============================================================================

Deno.test("PortfolioRepository - round-trips domain fields via findById", async () => {
  const { repo, dir } = await setupRepo();
  try {
    const created = await repo.create({
      name: "Full Round Trip",
      category: "SaaS Products",
      status: "active",
      description: "Full field round-trip body",
      client: "ACME Corp",
      progress: 42,
      revenue: 100000,
      expenses: 35000,
      startDate: "2026-01-01",
      endDate: "2026-12-31",
      team: [
        { personId: "person_1", role: "Lead" },
        { personId: "person_2", role: "Engineer" },
      ],
      techStack: ["Deno", "Hono", "SQLite"],
      githubRepo: "studiowebux/mdplanner",
      logo: "/logos/mdp.png",
      license: "MIT",
      billingCustomerId: "cust_123",
      brainManaged: true,
      linkedGoals: ["goal_1", "goal_2"],
      kpis: [
        { name: "MAU", value: 1250, target: 2000, unit: "users" },
      ],
      urls: [
        { label: "GitHub", href: "https://github.com/studiowebux/mdplanner" },
      ],
    });
    const found = await repo.findById(created.id);
    assertExists(found);
    assertEquals(found!.description, "Full field round-trip body");
    assertEquals(found!.client, "ACME Corp");
    assertEquals(found!.progress, 42);
    assertEquals(found!.revenue, 100000);
    assertEquals(found!.expenses, 35000);
    assertEquals(found!.startDate, "2026-01-01");
    assertEquals(found!.endDate, "2026-12-31");
    assertEquals(found!.team, [
      { personId: "person_1", role: "Lead" },
      { personId: "person_2", role: "Engineer" },
    ]);
    assertEquals(found!.techStack, ["Deno", "Hono", "SQLite"]);
    assertEquals(found!.githubRepo, "studiowebux/mdplanner");
    assertEquals(found!.logo, "/logos/mdp.png");
    assertEquals(found!.license, "MIT");
    assertEquals(found!.billingCustomerId, "cust_123");
    assertEquals(found!.brainManaged, true);
    assertEquals(found!.linkedGoals, ["goal_1", "goal_2"]);
    assertEquals(found!.kpis, [
      { name: "MAU", value: 1250, target: 2000, unit: "users" },
    ]);
    assertEquals(found!.urls, [
      { label: "GitHub", href: "https://github.com/studiowebux/mdplanner" },
    ]);
  } finally {
    await cleanup(dir);
  }
});

Deno.test("PortfolioRepository - round-trips audit fields via findById after update", async () => {
  const { repo, dir } = await setupRepo();
  try {
    const created = await repo.create({ name: "Audit Round Trip" });
    // Write audit fields via upsertEntity so serialize() emits them.
    await repo.upsertEntity({
      ...created,
      createdAt: "2026-01-15T10:00:00.000Z",
      updatedAt: "2026-02-20T14:30:00.000Z",
      createdBy: "person_creator",
      updatedBy: "person_editor",
    });
    const found = await repo.findById(created.id);
    assertExists(found);
    assertEquals(found!.createdAt, "2026-01-15T10:00:00.000Z");
    assertEquals(found!.updatedAt, "2026-02-20T14:30:00.000Z");
    assertEquals(found!.createdBy, "person_creator");
    assertEquals(found!.updatedBy, "person_editor");
  } finally {
    await cleanup(dir);
  }
});

// =============================================================================
// PortfolioRepository — findByName + search
// =============================================================================

Deno.test("PortfolioRepository - findByName matches case-insensitively", async () => {
  const { repo, dir } = await setupRepo();
  try {
    await repo.create({ name: "MD Planner" });
    const found = await repo.findByName("md PLANNER");
    assertExists(found);
    assertEquals(found!.name, "MD Planner");

    const missing = await repo.findByName("Does Not Exist");
    assertStrictEquals(missing, null);
  } finally {
    await cleanup(dir);
  }
});

Deno.test("PortfolioRepository - search filters by case-insensitive name substring", async () => {
  const { repo, dir } = await setupRepo();
  try {
    await repo.create({ name: "Frontend App" });
    await repo.create({ name: "Backend Service" });
    await repo.create({ name: "Backend Library" });

    const backend = await repo.search("backend");
    assertEquals(backend.length, 2);
    assertEquals(
      backend.map((i) => i.name).sort(),
      ["Backend Library", "Backend Service"],
    );

    const frontend = await repo.search("FRONT");
    assertEquals(frontend.length, 1);
    assertEquals(frontend[0].name, "Frontend App");
  } finally {
    await cleanup(dir);
  }
});

// =============================================================================
// PortfolioRepository — status updates
// =============================================================================

Deno.test("PortfolioRepository - addStatusUpdate returns new update and round-trips via findById", async () => {
  const { repo, dir } = await setupRepo();
  try {
    const item = await repo.create({ name: "With Updates" });
    const update = await repo.addStatusUpdate(
      item.id,
      "First milestone shipped",
    );
    assertExists(update);
    assertExists(update!.id);
    assertEquals(update!.message, "First milestone shipped");
    // Date defaults to today (YYYY-MM-DD)
    assertEquals(update!.date.length, 10);

    const found = await repo.findById(item.id);
    assertExists(found);
    assertEquals(found!.statusUpdates?.length, 1);
    assertEquals(found!.statusUpdates?.[0].id, update!.id);
    assertEquals(found!.statusUpdates?.[0].message, "First milestone shipped");
    assertEquals(found!.statusUpdates?.[0].date, update!.date);
  } finally {
    await cleanup(dir);
  }
});

Deno.test("PortfolioRepository - addStatusUpdate prepends to existing statusUpdates", async () => {
  const { repo, dir } = await setupRepo();
  try {
    const item = await repo.create({ name: "Multi Updates" });
    const first = await repo.addStatusUpdate(item.id, "First");
    const second = await repo.addStatusUpdate(item.id, "Second");
    assertExists(first);
    assertExists(second);

    const found = await repo.findById(item.id);
    assertExists(found);
    assertEquals(found!.statusUpdates?.length, 2);
    // Newest first.
    assertEquals(found!.statusUpdates?.[0].id, second!.id);
    assertEquals(found!.statusUpdates?.[1].id, first!.id);
  } finally {
    await cleanup(dir);
  }
});

Deno.test("PortfolioRepository - addStatusUpdate returns null for missing item", async () => {
  const { repo, dir } = await setupRepo();
  try {
    const result = await repo.addStatusUpdate("ghost-id", "x");
    assertStrictEquals(result, null);
  } finally {
    await cleanup(dir);
  }
});

Deno.test("PortfolioRepository - updateStatusUpdate round-trips new message via findById", async () => {
  const { repo, dir } = await setupRepo();
  try {
    const item = await repo.create({ name: "Editable Updates" });
    const created = await repo.addStatusUpdate(item.id, "Initial message");
    assertExists(created);

    const updated = await repo.updateStatusUpdate(
      item.id,
      created!.id,
      "Edited message",
    );
    assertExists(updated);
    assertEquals(updated!.message, "Edited message");

    const found = await repo.findById(item.id);
    assertExists(found);
    assertEquals(found!.statusUpdates?.length, 1);
    assertEquals(found!.statusUpdates?.[0].id, created!.id);
    assertEquals(found!.statusUpdates?.[0].message, "Edited message");
  } finally {
    await cleanup(dir);
  }
});

Deno.test("PortfolioRepository - updateStatusUpdate returns null for missing item or update", async () => {
  const { repo, dir } = await setupRepo();
  try {
    const missingItem = await repo.updateStatusUpdate("ghost-id", "x", "y");
    assertStrictEquals(missingItem, null);

    const item = await repo.create({ name: "No Updates" });
    const missingUpdate = await repo.updateStatusUpdate(
      item.id,
      "ghost-update",
      "y",
    );
    assertStrictEquals(missingUpdate, null);
  } finally {
    await cleanup(dir);
  }
});

Deno.test("PortfolioRepository - deleteStatusUpdate removes the update and round-trips via findById", async () => {
  const { repo, dir } = await setupRepo();
  try {
    const item = await repo.create({ name: "Deletable Updates" });
    const a = await repo.addStatusUpdate(item.id, "Keep");
    const b = await repo.addStatusUpdate(item.id, "Delete");
    assertExists(a);
    assertExists(b);

    const ok = await repo.deleteStatusUpdate(item.id, b!.id);
    assertEquals(ok, true);

    const found = await repo.findById(item.id);
    assertExists(found);
    assertEquals(found!.statusUpdates?.length, 1);
    assertEquals(found!.statusUpdates?.[0].id, a!.id);
    assertEquals(found!.statusUpdates?.[0].message, "Keep");
  } finally {
    await cleanup(dir);
  }
});

Deno.test("PortfolioRepository - deleteStatusUpdate returns false for missing item or update", async () => {
  const { repo, dir } = await setupRepo();
  try {
    const missingItem = await repo.deleteStatusUpdate("ghost-id", "x");
    assertEquals(missingItem, false);

    const item = await repo.create({ name: "No Updates To Delete" });
    const missingUpdate = await repo.deleteStatusUpdate(item.id, "ghost-id");
    assertEquals(missingUpdate, false);
  } finally {
    await cleanup(dir);
  }
});

// =============================================================================
// PortfolioService — list + search + create/update/delete passthrough
// =============================================================================

Deno.test("PortfolioService - list returns all items sorted by category then name", async () => {
  const { service, dir } = await setupService();
  try {
    await service.create({ name: "Z One", category: "Alpha" });
    await service.create({ name: "A One", category: "Beta" });
    await service.create({ name: "A Two", category: "Alpha" });

    const all = await service.list();
    assertEquals(all.length, 3);
    assertEquals(all.map((i) => i.name), ["A Two", "Z One", "A One"]);
  } finally {
    await cleanup(dir);
  }
});

Deno.test("PortfolioService - search filters by name substring (case-insensitive)", async () => {
  const { service, dir } = await setupService();
  try {
    await service.create({ name: "Web App" });
    await service.create({ name: "Mobile App" });
    await service.create({ name: "Backend" });

    const app = await service.search("APP");
    assertEquals(app.length, 2);
    assertEquals(app.map((i) => i.name).sort(), ["Mobile App", "Web App"]);
  } finally {
    await cleanup(dir);
  }
});

Deno.test("PortfolioService - create + update + delete passthrough to repo", async () => {
  const { service, dir } = await setupService();
  try {
    const created = await service.create({
      name: "Service Test",
      category: "Test",
    });
    assertEquals(created.name, "Service Test");

    const updated = await service.update(created.id, { progress: 90 });
    assertEquals(updated!.progress, 90);

    const deleted = await service.delete(created.id);
    assertEquals(deleted, true);
    // Service.delete soft-archives via repo.delete which aliases archive.
    const all = await service.list();
    assertStrictEquals(all.find((x) => x.id === created.id), undefined);
  } finally {
    await cleanup(dir);
  }
});

// =============================================================================
// PortfolioService — addStatusUpdate (in-memory only)
// =============================================================================

Deno.test("PortfolioService - addStatusUpdate returns the new update", async () => {
  // updateStatusUpdate / deleteStatusUpdate omitted — blocked on
  // task_1779926246910_1470 (depend on broken findById round-trip).
  const { service, dir } = await setupService();
  try {
    const item = await service.create({ name: "Status Test" });
    const update = await service.addStatusUpdate(item.id, "Hello");
    assertExists(update);
    assertEquals(update!.message, "Hello");

    const missing = await service.addStatusUpdate("ghost-id", "x");
    assertStrictEquals(missing, null);
  } finally {
    await cleanup(dir);
  }
});

// =============================================================================
// PortfolioService — listArchived
// =============================================================================

Deno.test("PortfolioService - listArchived returns archived items only", async () => {
  const { service, dir } = await setupService();
  try {
    await service.create({ name: "Active" });
    const toArchive = await service.create({ name: "Archived" });
    await service.delete(toArchive.id);

    const archived = await service.listArchived();
    assertEquals(archived.length, 1);
    assertEquals(archived[0].name, "Archived");

    const active = await service.list();
    assertEquals(active.length, 1);
    assertEquals(active[0].name, "Active");
  } finally {
    await cleanup(dir);
  }
});
