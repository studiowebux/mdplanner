/**
 * Unit tests for v2 IdeaRepository (CRUD on disk) + IdeaService
 * (filter behaviour, link/unlink, auto-timestamp on status transitions).
 *
 * Regression focus: id and description live in IDEA_BODY_KEYS. The
 * parse-guard hinges on `fm.title` (nameField is "title", not "name").
 */

import { assertEquals, assertExists, assertStrictEquals } from "@std/assert";
import { IdeaRepository } from "../../v2/repositories/idea.repository.ts";
import { IdeaService } from "../../v2/services/idea.service.ts";

async function setup(): Promise<
  { repo: IdeaRepository; service: IdeaService; dir: string }
> {
  const dir = await Deno.makeTempDir({ prefix: "mdplanner-idea-test-" });
  const repo = new IdeaRepository(dir);
  const service = new IdeaService(repo);
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

Deno.test("IdeaRepository - create stores file and defaults status to 'new'", async () => {
  const { repo, dir } = await setup();
  try {
    const idea = await repo.create({ title: "AI Task Assistant" });
    assertExists(idea.id);
    assertEquals(idea.title, "AI Task Assistant");
    assertEquals(idea.status, "new");
  } finally {
    await cleanup(dir);
  }
});

Deno.test("IdeaRepository - create with all fields", async () => {
  const { repo, dir } = await setup();
  try {
    const idea = await repo.create({
      title: "Full Idea",
      status: "considering",
      category: "feature",
      priority: "high",
      project: "MD Planner",
      submittedBy: "Alice",
      startDate: "2026-04-01",
      endDate: "2026-06-30",
      resources: "2 devs",
      subtasks: ["Design", "Build", "Ship"],
      description: "Long description here.",
      links: ["idea_other"],
    });
    assertEquals(idea.category, "feature");
    assertEquals(idea.priority, "high");
    assertEquals(idea.subtasks, ["Design", "Build", "Ship"]);
    assertEquals(idea.links, ["idea_other"]);
    assertEquals(idea.description, "Long description here.");
  } finally {
    await cleanup(dir);
  }
});

Deno.test("IdeaRepository - findById returns null for missing ID", async () => {
  const { repo, dir } = await setup();
  try {
    assertStrictEquals(await repo.findById("idea_nope"), null);
  } finally {
    await cleanup(dir);
  }
});

// === parse-guard regression (guard holds via fm.title, not fm.name) ===

Deno.test("IdeaRepository - findById succeeds after update (parse-guard regression)", async () => {
  const { repo, dir } = await setup();
  try {
    const created = await repo.create({
      title: "Guard Idea",
      category: "feature",
    });
    const updated = await repo.update(created.id, { category: "research" });
    assertExists(updated);
    const fetched = await repo.findById(created.id);
    assertExists(fetched);
    assertEquals(fetched!.id, created.id);
    assertEquals(fetched!.title, "Guard Idea");
    assertEquals(fetched!.category, "research");
  } finally {
    await cleanup(dir);
  }
});

// === update + auto-timestamp on status transitions ===

Deno.test("IdeaRepository - update stamps implementedAt on status → implemented", async () => {
  const { repo, dir } = await setup();
  try {
    const idea = await repo.create({ title: "Auto stamp implemented" });
    assertStrictEquals(idea.implementedAt, undefined);
    const updated = await repo.update(idea.id, { status: "implemented" });
    assertExists(updated);
    assertEquals(updated!.status, "implemented");
    assertExists(updated!.implementedAt);
  } finally {
    await cleanup(dir);
  }
});

Deno.test("IdeaRepository - update stamps cancelledAt on status → cancelled", async () => {
  const { repo, dir } = await setup();
  try {
    const idea = await repo.create({ title: "Auto stamp cancelled" });
    assertStrictEquals(idea.cancelledAt, undefined);
    const updated = await repo.update(idea.id, { status: "cancelled" });
    assertExists(updated);
    assertEquals(updated!.status, "cancelled");
    assertExists(updated!.cancelledAt);
  } finally {
    await cleanup(dir);
  }
});

Deno.test("IdeaRepository - update does not restamp implementedAt if already set", async () => {
  const { repo, dir } = await setup();
  try {
    const idea = await repo.create({ title: "Sticky stamp" });
    await repo.update(idea.id, { status: "implemented" });
    const firstStamp = (await repo.findById(idea.id))!.implementedAt;
    // Re-update with same status (still implemented) — must keep first stamp.
    await new Promise((r) => setTimeout(r, 5));
    await repo.update(idea.id, {
      status: "implemented",
      category: "feature",
    });
    const second = await repo.findById(idea.id);
    assertEquals(second!.implementedAt, firstStamp);
  } finally {
    await cleanup(dir);
  }
});

Deno.test("IdeaRepository - update without status does not touch lifecycle stamps", async () => {
  const { repo, dir } = await setup();
  try {
    const idea = await repo.create({ title: "No stamp" });
    const updated = await repo.update(idea.id, { category: "research" });
    assertExists(updated);
    assertStrictEquals(updated!.implementedAt, undefined);
    assertStrictEquals(updated!.cancelledAt, undefined);
  } finally {
    await cleanup(dir);
  }
});

Deno.test("IdeaRepository - update returns null for non-existent ID", async () => {
  const { repo, dir } = await setup();
  try {
    assertStrictEquals(
      await repo.update("idea_missing", { title: "X" }),
      null,
    );
    // Even with status payload — the status path also resolves through findById.
    assertStrictEquals(
      await repo.update("idea_missing", { status: "implemented" }),
      null,
    );
  } finally {
    await cleanup(dir);
  }
});

// === delete (soft-archive) + hardDelete ===

Deno.test("IdeaRepository - delete soft-archives entity", async () => {
  const { repo, dir } = await setup();
  try {
    const idea = await repo.create({ title: "Archive me" });
    assertEquals(await repo.delete(idea.id), true);
    const found = await repo.findById(idea.id);
    assertExists(found);
    const all = await repo.findAllFromDisk();
    assertStrictEquals(all.find((i) => i.id === idea.id), undefined);
  } finally {
    await cleanup(dir);
  }
});

Deno.test("IdeaRepository - hardDelete removes the file", async () => {
  const { repo, dir } = await setup();
  try {
    const idea = await repo.create({ title: "Truly gone" });
    assertEquals(await repo.hardDelete(idea.id), true);
    assertStrictEquals(await repo.findById(idea.id), null);
  } finally {
    await cleanup(dir);
  }
});

Deno.test("IdeaRepository - delete returns false for non-existent ID", async () => {
  const { repo, dir } = await setup();
  try {
    assertEquals(await repo.delete("idea_ghost"), false);
  } finally {
    await cleanup(dir);
  }
});

// === findAll: sort (by title — nameField) ===

Deno.test("IdeaRepository - findAll sorts alphabetically by title", async () => {
  const { repo, dir } = await setup();
  try {
    await repo.create({ title: "Charlie" });
    await repo.create({ title: "Alpha" });
    await repo.create({ title: "Bravo" });
    const all = await repo.findAllFromDisk();
    assertEquals(all.map((i) => i.title), ["Alpha", "Bravo", "Charlie"]);
  } finally {
    await cleanup(dir);
  }
});

// === service.list filters ===

Deno.test("IdeaService - list with status filter (exact match)", async () => {
  const { repo, service, dir } = await setup();
  try {
    await repo.create({ title: "A", status: "new" });
    await repo.create({ title: "B", status: "considering" });
    await repo.create({ title: "C", status: "approved" });
    const matches = await service.list({ status: "considering" });
    assertEquals(matches.length, 1);
    assertEquals(matches[0].title, "B");
  } finally {
    await cleanup(dir);
  }
});

Deno.test("IdeaService - list with category filter (case-insensitive)", async () => {
  const { repo, service, dir } = await setup();
  try {
    await repo.create({ title: "A", category: "Feature" });
    await repo.create({ title: "B", category: "feature" });
    await repo.create({ title: "C", category: "Research" });
    const matches = await service.list({ category: "FEATURE" });
    assertEquals(matches.length, 2);
    assertEquals(matches.map((i) => i.title).sort(), ["A", "B"]);
  } finally {
    await cleanup(dir);
  }
});

Deno.test("IdeaService - list with priority filter (exact match)", async () => {
  const { repo, service, dir } = await setup();
  try {
    await repo.create({ title: "Hi", priority: "high" });
    await repo.create({ title: "Med", priority: "medium" });
    await repo.create({ title: "Lo", priority: "low" });
    const matches = await service.list({ priority: "high" });
    assertEquals(matches.length, 1);
    assertEquals(matches[0].title, "Hi");
  } finally {
    await cleanup(dir);
  }
});

Deno.test("IdeaService - list with q filter matches title and description", async () => {
  const { repo, service, dir } = await setup();
  try {
    await repo.create({ title: "AI Assistant" });
    await repo.create({ title: "Other", description: "Includes AI concepts." });
    await repo.create({ title: "Unrelated", description: "About widgets." });
    const matches = await service.list({ q: "ai" });
    assertEquals(matches.length, 2);
    assertEquals(matches.map((i) => i.title).sort(), ["AI Assistant", "Other"]);
  } finally {
    await cleanup(dir);
  }
});

Deno.test("IdeaService - list combines status + category + priority + q (AND)", async () => {
  const { repo, service, dir } = await setup();
  try {
    await repo.create({
      title: "Match",
      status: "considering",
      category: "feature",
      priority: "high",
      description: "alpha keyword",
    });
    await repo.create({
      title: "Wrong status",
      status: "new",
      category: "feature",
      priority: "high",
      description: "alpha keyword",
    });
    await repo.create({
      title: "Wrong q",
      status: "considering",
      category: "feature",
      priority: "high",
      description: "no keyword",
    });
    const matches = await service.list({
      status: "considering",
      category: "feature",
      priority: "high",
      q: "alpha",
    });
    assertEquals(matches.length, 1);
    assertEquals(matches[0].title, "Match");
  } finally {
    await cleanup(dir);
  }
});

// === linkIdeas / unlinkIdeas (symmetric) ===

Deno.test("IdeaRepository - linkIdeas adds bidirectional link", async () => {
  const { repo, dir } = await setup();
  try {
    const a = await repo.create({ title: "A" });
    const b = await repo.create({ title: "B" });
    const ok = await repo.linkIdeas(a.id, b.id);
    assertEquals(ok, true);
    const fetchedA = await repo.findById(a.id);
    const fetchedB = await repo.findById(b.id);
    assertEquals(fetchedA!.links, [b.id]);
    assertEquals(fetchedB!.links, [a.id]);
  } finally {
    await cleanup(dir);
  }
});

Deno.test("IdeaRepository - linkIdeas is idempotent (no duplicate links)", async () => {
  const { repo, dir } = await setup();
  try {
    const a = await repo.create({ title: "A" });
    const b = await repo.create({ title: "B" });
    await repo.linkIdeas(a.id, b.id);
    await repo.linkIdeas(a.id, b.id);
    const fetchedA = await repo.findById(a.id);
    assertEquals(fetchedA!.links?.length, 1);
  } finally {
    await cleanup(dir);
  }
});

Deno.test("IdeaRepository - linkIdeas returns false when an idea is missing", async () => {
  const { repo, dir } = await setup();
  try {
    const a = await repo.create({ title: "A" });
    const ok = await repo.linkIdeas(a.id, "idea_missing");
    assertEquals(ok, false);
  } finally {
    await cleanup(dir);
  }
});

Deno.test("IdeaRepository - unlinkIdeas removes bidirectional link", async () => {
  const { repo, dir } = await setup();
  try {
    const a = await repo.create({ title: "A" });
    const b = await repo.create({ title: "B" });
    await repo.linkIdeas(a.id, b.id);
    const ok = await repo.unlinkIdeas(a.id, b.id);
    assertEquals(ok, true);
    const fetchedA = await repo.findById(a.id);
    const fetchedB = await repo.findById(b.id);
    assertEquals(fetchedA!.links, []);
    assertEquals(fetchedB!.links, []);
  } finally {
    await cleanup(dir);
  }
});

// === findAllWithBacklinks ===

Deno.test("IdeaRepository - findAllWithBacklinks computes incoming refs", async () => {
  const { repo, dir } = await setup();
  try {
    const a = await repo.create({ title: "A" });
    const b = await repo.create({ title: "B" });
    const c = await repo.create({ title: "C" });
    // Manually link A → B (not bidirectional via linkIdeas, to exercise the
    // backlinks computation which works off `other.links.includes(this.id)`).
    await repo.update(a.id, { links: [b.id] });
    await repo.update(c.id, { links: [b.id] });
    const withBacklinks = await repo.findAllWithBacklinks();
    const idA = withBacklinks.find((i) => i.id === a.id)!;
    const idB = withBacklinks.find((i) => i.id === b.id)!;
    const idC = withBacklinks.find((i) => i.id === c.id)!;
    assertEquals(idA.backlinks, []);
    assertEquals(idB.backlinks.sort(), [a.id, c.id].sort());
    assertEquals(idC.backlinks, []);
  } finally {
    await cleanup(dir);
  }
});

// === edges ===

Deno.test("IdeaRepository - subtasks array round-trips", async () => {
  const { repo, dir } = await setup();
  try {
    const created = await repo.create({
      title: "With subtasks",
      subtasks: ["one", "two", "three"],
    });
    const fetched = await repo.findById(created.id);
    assertEquals(fetched!.subtasks, ["one", "two", "three"]);
  } finally {
    await cleanup(dir);
  }
});

Deno.test("IdeaRepository - optional fields left undefined round-trip as undefined", async () => {
  const { repo, dir } = await setup();
  try {
    const created = await repo.create({ title: "Minimal" });
    assertStrictEquals(created.category, undefined);
    assertStrictEquals(created.priority, undefined);
    assertStrictEquals(created.project, undefined);
    assertStrictEquals(created.submittedBy, undefined);
    assertStrictEquals(created.description, undefined);

    const fetched = await repo.findById(created.id);
    assertExists(fetched);
    assertStrictEquals(fetched!.category, undefined);
    assertStrictEquals(fetched!.priority, undefined);
    assertStrictEquals(fetched!.project, undefined);
    assertStrictEquals(fetched!.submittedBy, undefined);
    assertStrictEquals(fetched!.description, undefined);
  } finally {
    await cleanup(dir);
  }
});

Deno.test("IdeaRepository - findByName (title) returns matching idea (case-insensitive)", async () => {
  const { repo, dir } = await setup();
  try {
    await repo.create({ title: "AI Assistant" });
    await repo.create({ title: "Widget Factory" });
    const found = await repo.findByName("ai assistant");
    assertExists(found);
    assertEquals(found!.title, "AI Assistant");
  } finally {
    await cleanup(dir);
  }
});
