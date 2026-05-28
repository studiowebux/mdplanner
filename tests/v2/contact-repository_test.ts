/**
 * Unit tests for v2 ContactRepository (CRUD on disk) + ContactService
 * (filter behaviour).
 *
 * Regression focus: id and notes live in CONTACT_BODY_KEYS, so `serialize()`
 * writes id only via the filename and notes only in the `## Notes` body
 * block — never to frontmatter. `parse()` must still recognise such a file
 * after `update()` rewrites it.
 */

import { assertEquals, assertExists, assertStrictEquals } from "@std/assert";
import { join } from "@std/path";
import { ContactRepository } from "../../v2/repositories/contact.repository.ts";
import { ContactService } from "../../v2/services/contact.service.ts";

async function setup(): Promise<
  { repo: ContactRepository; service: ContactService; dir: string }
> {
  const dir = await Deno.makeTempDir({ prefix: "mdplanner-contact-test-" });
  const repo = new ContactRepository(dir);
  const service = new ContactService(repo);
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

Deno.test("ContactRepository - create stores file and returns entity", async () => {
  const { repo, dir } = await setup();
  try {
    const contact = await repo.create({
      name: "Jane Doe",
      email: "jane@example.com",
      phone: "+1-555-0100",
      role: "Head of Marketing",
      company: "Acme Corp",
      type: "lead",
      notes: "Met at conference.",
      tags: ["vip", "q1-2026"],
    });
    assertExists(contact.id);
    assertEquals(contact.name, "Jane Doe");
    assertEquals(contact.email, "jane@example.com");
    assertEquals(contact.phone, "+1-555-0100");
    assertEquals(contact.role, "Head of Marketing");
    assertEquals(contact.company, "Acme Corp");
    assertEquals(contact.type, "lead");
    assertEquals(contact.notes, "Met at conference.");
    assertEquals(contact.tags, ["vip", "q1-2026"]);
    assertExists(contact.createdAt);
    assertExists(contact.updatedAt);
  } finally {
    await cleanup(dir);
  }
});

Deno.test("ContactRepository - findById returns correct entity", async () => {
  const { repo, dir } = await setup();
  try {
    const created = await repo.create({
      name: "Findable Contact",
      type: "lead",
    });
    const found = await repo.findById(created.id);
    assertExists(found);
    assertEquals(found!.id, created.id);
    assertEquals(found!.name, "Findable Contact");
    assertEquals(found!.type, "lead");
  } finally {
    await cleanup(dir);
  }
});

Deno.test("ContactRepository - findById returns null for missing ID", async () => {
  const { repo, dir } = await setup();
  try {
    assertStrictEquals(await repo.findById("contact_nope"), null);
  } finally {
    await cleanup(dir);
  }
});

// === parse-guard regression (id + notes in body keys) ===

Deno.test("ContactRepository - findById succeeds after update (parse-guard regression)", async () => {
  const { repo, dir } = await setup();
  try {
    const created = await repo.create({
      name: "Guard Contact",
      type: "lead",
      company: "Acme Corp",
    });
    // First update — rewrites the file. CONTACT_BODY_KEYS = ["id", "notes"]
    // so `fm.id` is absent from the new file; the parse guard
    // `!fm.id && !fm.name` must still hold via `fm.name`.
    const updated = await repo.update(created.id, { type: "customer" });
    assertExists(updated);
    const fetched = await repo.findById(created.id);
    assertExists(fetched);
    assertEquals(fetched!.id, created.id);
    assertEquals(fetched!.name, "Guard Contact");
    assertEquals(fetched!.type, "customer");
    assertEquals(fetched!.company, "Acme Corp");
  } finally {
    await cleanup(dir);
  }
});

// === update ===

Deno.test("ContactRepository - update modifies existing entity", async () => {
  const { repo, dir } = await setup();
  try {
    const contact = await repo.create({
      name: "Original Name",
      type: "lead",
    });
    const updated = await repo.update(contact.id, { type: "customer" });
    assertExists(updated);
    assertEquals(updated!.type, "customer");

    const found = await repo.findById(contact.id);
    assertEquals(found!.type, "customer");
  } finally {
    await cleanup(dir);
  }
});

Deno.test("ContactRepository - update preserves sibling fields", async () => {
  const { repo, dir } = await setup();
  try {
    const created = await repo.create({
      name: "Multi-field Contact",
      email: "multi@example.com",
      phone: "+1-555-0200",
      role: "VP Engineering",
      company: "Globex",
      type: "customer",
      notes: "Keep me intact.",
      tags: ["alpha", "beta"],
    });
    // Patch only `type` — every sibling must round-trip unchanged.
    await repo.update(created.id, { type: "partner" });
    const fetched = await repo.findById(created.id);
    assertExists(fetched);
    assertEquals(fetched!.type, "partner");
    assertEquals(fetched!.name, "Multi-field Contact");
    assertEquals(fetched!.email, "multi@example.com");
    assertEquals(fetched!.phone, "+1-555-0200");
    assertEquals(fetched!.role, "VP Engineering");
    assertEquals(fetched!.company, "Globex");
    assertEquals(fetched!.notes, "Keep me intact.");
    assertEquals(fetched!.tags, ["alpha", "beta"]);
  } finally {
    await cleanup(dir);
  }
});

Deno.test("ContactRepository - update returns null for non-existent ID", async () => {
  const { repo, dir } = await setup();
  try {
    assertStrictEquals(
      await repo.update("contact_missing", { name: "X" }),
      null,
    );
  } finally {
    await cleanup(dir);
  }
});

// === delete (soft-archive) + hardDelete ===

Deno.test("ContactRepository - delete soft-archives entity", async () => {
  const { repo, dir } = await setup();
  try {
    const contact = await repo.create({ name: "To be archived" });
    const deleted = await repo.delete(contact.id);
    assertEquals(deleted, true);
    const found = await repo.findById(contact.id);
    assertExists(found);
    const all = await repo.findAllFromDisk();
    assertStrictEquals(all.find((c) => c.id === contact.id), undefined);
  } finally {
    await cleanup(dir);
  }
});

Deno.test("ContactRepository - hardDelete removes the file", async () => {
  const { repo, dir } = await setup();
  try {
    const contact = await repo.create({ name: "Truly gone" });
    const ok = await repo.hardDelete(contact.id);
    assertEquals(ok, true);
    assertStrictEquals(await repo.findById(contact.id), null);
  } finally {
    await cleanup(dir);
  }
});

Deno.test("ContactRepository - delete returns false for non-existent ID", async () => {
  const { repo, dir } = await setup();
  try {
    assertEquals(await repo.delete("contact_ghost"), false);
  } finally {
    await cleanup(dir);
  }
});

// === findAll: sort ===

Deno.test("ContactRepository - findAll sorts alphabetically by name", async () => {
  const { repo, dir } = await setup();
  try {
    await repo.create({ name: "Charlie Doe" });
    await repo.create({ name: "Alpha Doe" });
    await repo.create({ name: "Bravo Doe" });
    const all = await repo.findAllFromDisk();
    assertEquals(all.length, 3);
    assertEquals(all.map((c) => c.name), [
      "Alpha Doe",
      "Bravo Doe",
      "Charlie Doe",
    ]);
  } finally {
    await cleanup(dir);
  }
});

// === service.list filters ===

Deno.test("ContactRepository - list with q filter matches name (case-insensitive)", async () => {
  const { repo, service, dir } = await setup();
  try {
    await repo.create({ name: "Jane Doe" });
    await repo.create({ name: "John Smith" });
    const matches = await service.list({ q: "jane" });
    assertEquals(matches.length, 1);
    assertEquals(matches[0].name, "Jane Doe");
  } finally {
    await cleanup(dir);
  }
});

Deno.test("ContactService - list with q filter matches email, role, company, notes", async () => {
  const { repo, service, dir } = await setup();
  try {
    await repo.create({ name: "A", email: "alpha@acme.example.com" });
    await repo.create({ name: "B", role: "Acme Liaison" });
    await repo.create({ name: "C", company: "Acme Corp" });
    await repo.create({ name: "D", notes: "Met at acme summit." });
    await repo.create({ name: "E", company: "Globex" });
    const matches = await service.list({ q: "acme" });
    assertEquals(matches.length, 4);
    assertEquals(matches.map((c) => c.name).sort(), ["A", "B", "C", "D"]);
  } finally {
    await cleanup(dir);
  }
});

Deno.test("ContactService - list with type filter (case-insensitive exact)", async () => {
  const { repo, service, dir } = await setup();
  try {
    await repo.create({ name: "Lead A", type: "lead" });
    await repo.create({ name: "Cust B", type: "customer" });
    await repo.create({ name: "Vend C", type: "vendor" });
    const matches = await service.list({ type: "customer" });
    assertEquals(matches.length, 1);
    assertEquals(matches[0].name, "Cust B");
  } finally {
    await cleanup(dir);
  }
});

Deno.test("ContactService - list with company filter (case-insensitive exact)", async () => {
  const { repo, service, dir } = await setup();
  try {
    await repo.create({ name: "A", company: "Acme Corp" });
    await repo.create({ name: "B", company: "acme corp" });
    await repo.create({ name: "C", company: "Globex" });
    const matches = await service.list({ company: "ACME CORP" });
    assertEquals(matches.length, 2);
    assertEquals(matches.map((c) => c.name).sort(), ["A", "B"]);
  } finally {
    await cleanup(dir);
  }
});

Deno.test("ContactService - list combines q + type + company (AND)", async () => {
  const { repo, service, dir } = await setup();
  try {
    await repo.create({
      name: "Match",
      type: "customer",
      company: "Acme",
      notes: "alpha keyword",
    });
    await repo.create({
      name: "Wrong Type",
      type: "lead",
      company: "Acme",
      notes: "alpha keyword",
    });
    await repo.create({
      name: "Wrong Company",
      type: "customer",
      company: "Globex",
      notes: "alpha keyword",
    });
    await repo.create({
      name: "Wrong Q",
      type: "customer",
      company: "Acme",
      notes: "no keyword",
    });
    const matches = await service.list({
      q: "alpha",
      type: "customer",
      company: "Acme",
    });
    assertEquals(matches.length, 1);
    assertEquals(matches[0].name, "Match");
  } finally {
    await cleanup(dir);
  }
});

Deno.test("ContactService - list with no options returns all", async () => {
  const { repo, service, dir } = await setup();
  try {
    await repo.create({ name: "A" });
    await repo.create({ name: "B" });
    const all = await service.list();
    assertEquals(all.length, 2);
  } finally {
    await cleanup(dir);
  }
});

// === snake_case ↔ camelCase round-trip ===

Deno.test("ContactRepository - writes snake_case on disk, reads camelCase entity", async () => {
  const { repo, dir } = await setup();
  try {
    const contact = await repo.create({
      name: "Round Trip Contact",
      type: "lead",
      tags: ["alpha", "beta"],
    });
    const filePath = join(dir, "contacts", `${contact.id}.md`);
    const raw = await Deno.readTextFile(filePath);
    const fmEnd = raw.indexOf("\n---", 4);
    const fm = raw.slice(0, fmEnd);
    assertEquals(fm.includes("created_at:"), true);
    assertEquals(fm.includes("updated_at:"), true);
    assertEquals(fm.includes("createdAt:"), false);
    assertEquals(fm.includes("updatedAt:"), false);
    assertEquals(fm.includes("tags:"), true);

    const fetched = await repo.findById(contact.id);
    assertExists(fetched);
    assertExists(fetched!.createdAt);
    assertExists(fetched!.updatedAt);
    assertEquals(fetched!.tags, ["alpha", "beta"]);
  } finally {
    await cleanup(dir);
  }
});

Deno.test("ContactRepository - parses a manually-written snake_case file", async () => {
  const { repo, dir } = await setup();
  try {
    await Deno.mkdir(join(dir, "contacts"), { recursive: true });
    await Deno.writeTextFile(
      join(dir, "contacts", "contact_manual.md"),
      [
        "---",
        "name: Manual Contact",
        "type: partner",
        "company: Acme",
        "role: CTO",
        "tags:",
        "  - alpha",
        "  - beta",
        "created_at: 2026-01-01T00:00:00.000Z",
        "updated_at: 2026-01-02T00:00:00.000Z",
        "---",
        "# Manual Contact",
        "",
        "## Notes",
        "",
        "Hand-written fixture.",
        "",
      ].join("\n"),
    );
    const fetched = await repo.findById("contact_manual");
    assertExists(fetched);
    assertEquals(fetched!.id, "contact_manual");
    assertEquals(fetched!.name, "Manual Contact");
    assertEquals(fetched!.type, "partner");
    assertEquals(fetched!.company, "Acme");
    assertEquals(fetched!.role, "CTO");
    assertEquals(fetched!.tags, ["alpha", "beta"]);
    assertEquals(fetched!.notes, "Hand-written fixture.");
    assertEquals(fetched!.createdAt, "2026-01-01T00:00:00.000Z");
    assertEquals(fetched!.updatedAt, "2026-01-02T00:00:00.000Z");
  } finally {
    await cleanup(dir);
  }
});

// === edge cases ===

Deno.test("ContactRepository - optional fields left undefined round-trip as undefined", async () => {
  const { repo, dir } = await setup();
  try {
    const created = await repo.create({ name: "Minimal" });
    assertStrictEquals(created.email, undefined);
    assertStrictEquals(created.phone, undefined);
    assertStrictEquals(created.role, undefined);
    assertStrictEquals(created.company, undefined);
    assertStrictEquals(created.type, undefined);
    assertStrictEquals(created.notes, undefined);
    assertEquals(created.tags, []);

    const fetched = await repo.findById(created.id);
    assertExists(fetched);
    assertStrictEquals(fetched!.email, undefined);
    assertStrictEquals(fetched!.phone, undefined);
    assertStrictEquals(fetched!.role, undefined);
    assertStrictEquals(fetched!.company, undefined);
    assertStrictEquals(fetched!.type, undefined);
    assertStrictEquals(fetched!.notes, undefined);
    assertEquals(fetched!.tags, []);
  } finally {
    await cleanup(dir);
  }
});

Deno.test("ContactRepository - parse() coerces invalid type to undefined", async () => {
  const { repo, dir } = await setup();
  try {
    await Deno.mkdir(join(dir, "contacts"), { recursive: true });
    await Deno.writeTextFile(
      join(dir, "contacts", "contact_bad.md"),
      [
        "---",
        "name: Bad Enum Contact",
        "type: invalid-type",
        "---",
        "# Bad Enum Contact",
        "",
      ].join("\n"),
    );
    const fetched = await repo.findById("contact_bad");
    assertExists(fetched);
    assertStrictEquals(fetched!.type, undefined);
  } finally {
    await cleanup(dir);
  }
});

Deno.test("ContactRepository - findByName returns matching contact (case-insensitive)", async () => {
  const { repo, dir } = await setup();
  try {
    await repo.create({ name: "Jane Doe" });
    await repo.create({ name: "John Smith" });
    const found = await repo.findByName("jane doe");
    assertExists(found);
    assertEquals(found!.name, "Jane Doe");
  } finally {
    await cleanup(dir);
  }
});
