/**
 * Unit tests for v2 CompanyRepository (CRUD on disk) + CompanyService
 * (filter behaviour).
 *
 * Regression focus: id and notes live in COMPANY_BODY_KEYS, so `serialize()`
 * writes id only via the filename and notes only in the `## Notes` body
 * block — never to frontmatter. `parse()` must still recognise such a file
 * after `update()` rewrites it.
 */

import { assertEquals, assertExists, assertStrictEquals } from "@std/assert";
import { join } from "@std/path";
import { CompanyRepository } from "../../src/repositories/company.repository.ts";
import { CompanyService } from "../../src/services/company.service.ts";

async function setup(): Promise<
  { repo: CompanyRepository; service: CompanyService; dir: string }
> {
  const dir = await Deno.makeTempDir({ prefix: "mdplanner-company-test-" });
  const repo = new CompanyRepository(dir);
  const service = new CompanyService(repo);
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

Deno.test("CompanyRepository - create stores file and returns entity", async () => {
  const { repo, dir } = await setup();
  try {
    const company = await repo.create({
      name: "Acme Corp",
      website: "https://acme.example.com",
      industry: "SaaS",
      size: "11-50",
      type: "customer",
      phone: "+1-555-0100",
      email: "contact@acme.example.com",
      address: "123 Main St",
      notes: "Top-tier customer.",
      tags: ["enterprise", "q1-2026"],
    });
    assertExists(company.id);
    assertEquals(company.name, "Acme Corp");
    assertEquals(company.website, "https://acme.example.com");
    assertEquals(company.industry, "SaaS");
    assertEquals(company.size, "11-50");
    assertEquals(company.type, "customer");
    assertEquals(company.phone, "+1-555-0100");
    assertEquals(company.email, "contact@acme.example.com");
    assertEquals(company.address, "123 Main St");
    assertEquals(company.notes, "Top-tier customer.");
    assertEquals(company.tags, ["enterprise", "q1-2026"]);
    assertExists(company.createdAt);
    assertExists(company.updatedAt);
  } finally {
    await cleanup(dir);
  }
});

Deno.test("CompanyRepository - findById returns correct entity", async () => {
  const { repo, dir } = await setup();
  try {
    const created = await repo.create({
      name: "Findable Co",
      type: "prospect",
    });
    const found = await repo.findById(created.id);
    assertExists(found);
    assertEquals(found!.id, created.id);
    assertEquals(found!.name, "Findable Co");
    assertEquals(found!.type, "prospect");
  } finally {
    await cleanup(dir);
  }
});

Deno.test("CompanyRepository - findById returns null for missing ID", async () => {
  const { repo, dir } = await setup();
  try {
    assertStrictEquals(await repo.findById("company_nope"), null);
  } finally {
    await cleanup(dir);
  }
});

// === parse-guard regression (id + notes in body keys) ===

Deno.test("CompanyRepository - findById succeeds after update (parse-guard regression)", async () => {
  const { repo, dir } = await setup();
  try {
    const created = await repo.create({
      name: "Guard Co",
      type: "customer",
      industry: "Fintech",
    });
    // First update — rewrites the file. COMPANY_BODY_KEYS = ["id", "notes"]
    // so `fm.id` is absent from the new file; the parse guard
    // `!fm.id && !fm.name` must still hold via `fm.name`.
    const updated = await repo.update(created.id, { industry: "Insurtech" });
    assertExists(updated);
    const fetched = await repo.findById(created.id);
    assertExists(fetched);
    assertEquals(fetched!.id, created.id);
    assertEquals(fetched!.name, "Guard Co");
    assertEquals(fetched!.industry, "Insurtech");
    assertEquals(fetched!.type, "customer");
  } finally {
    await cleanup(dir);
  }
});

// === update ===

Deno.test("CompanyRepository - update modifies existing entity", async () => {
  const { repo, dir } = await setup();
  try {
    const company = await repo.create({
      name: "Original Name",
      type: "prospect",
    });
    const updated = await repo.update(company.id, { type: "customer" });
    assertExists(updated);
    assertEquals(updated!.type, "customer");

    const found = await repo.findById(company.id);
    assertEquals(found!.type, "customer");
  } finally {
    await cleanup(dir);
  }
});

Deno.test("CompanyRepository - update preserves sibling fields", async () => {
  const { repo, dir } = await setup();
  try {
    const created = await repo.create({
      name: "Multi-field Co",
      website: "https://multi.example.com",
      industry: "SaaS",
      size: "51-200",
      type: "customer",
      phone: "+1-555-0200",
      email: "info@multi.example.com",
      address: "456 Side St",
      notes: "Keep me intact.",
      tags: ["alpha", "beta"],
    });
    // Patch only `type` — every sibling must round-trip unchanged.
    await repo.update(created.id, { type: "partner" });
    const fetched = await repo.findById(created.id);
    assertExists(fetched);
    assertEquals(fetched!.type, "partner");
    assertEquals(fetched!.name, "Multi-field Co");
    assertEquals(fetched!.website, "https://multi.example.com");
    assertEquals(fetched!.industry, "SaaS");
    assertEquals(fetched!.size, "51-200");
    assertEquals(fetched!.phone, "+1-555-0200");
    assertEquals(fetched!.email, "info@multi.example.com");
    assertEquals(fetched!.address, "456 Side St");
    assertEquals(fetched!.notes, "Keep me intact.");
    assertEquals(fetched!.tags, ["alpha", "beta"]);
  } finally {
    await cleanup(dir);
  }
});

Deno.test("CompanyRepository - update returns null for non-existent ID", async () => {
  const { repo, dir } = await setup();
  try {
    assertStrictEquals(
      await repo.update("company_missing", { name: "X" }),
      null,
    );
  } finally {
    await cleanup(dir);
  }
});

// === delete (soft-archive) + hardDelete ===

Deno.test("CompanyRepository - delete soft-archives entity", async () => {
  const { repo, dir } = await setup();
  try {
    const company = await repo.create({ name: "To be archived" });
    const deleted = await repo.delete(company.id);
    assertEquals(deleted, true);
    // delete() aliases archive() — file stays, findById still resolves,
    // findAll filters it out.
    const found = await repo.findById(company.id);
    assertExists(found);
    const all = await repo.findAllFromDisk();
    assertStrictEquals(all.find((c) => c.id === company.id), undefined);
  } finally {
    await cleanup(dir);
  }
});

Deno.test("CompanyRepository - hardDelete removes the file", async () => {
  const { repo, dir } = await setup();
  try {
    const company = await repo.create({ name: "Truly gone" });
    const ok = await repo.hardDelete(company.id);
    assertEquals(ok, true);
    assertStrictEquals(await repo.findById(company.id), null);
  } finally {
    await cleanup(dir);
  }
});

Deno.test("CompanyRepository - delete returns false for non-existent ID", async () => {
  const { repo, dir } = await setup();
  try {
    assertEquals(await repo.delete("company_ghost"), false);
  } finally {
    await cleanup(dir);
  }
});

// === findAll: sort ===

Deno.test("CompanyRepository - findAll sorts alphabetically by name", async () => {
  const { repo, dir } = await setup();
  try {
    await repo.create({ name: "Charlie Co" });
    await repo.create({ name: "Alpha Co" });
    await repo.create({ name: "Bravo Co" });
    const all = await repo.findAllFromDisk();
    assertEquals(all.length, 3);
    assertEquals(all.map((c) => c.name), [
      "Alpha Co",
      "Bravo Co",
      "Charlie Co",
    ]);
  } finally {
    await cleanup(dir);
  }
});

// === service.list filters ===

Deno.test("CompanyService - list with q filter matches name (case-insensitive)", async () => {
  const { repo, service, dir } = await setup();
  try {
    await repo.create({ name: "Acme Corp" });
    await repo.create({ name: "Globex Industries" });
    const matches = await service.list({ q: "acme" });
    assertEquals(matches.length, 1);
    assertEquals(matches[0].name, "Acme Corp");
  } finally {
    await cleanup(dir);
  }
});

Deno.test("CompanyService - list with q filter matches industry, website, address, notes", async () => {
  const { repo, service, dir } = await setup();
  try {
    await repo.create({ name: "Co A", industry: "Fintech" });
    await repo.create({
      name: "Co B",
      website: "https://fintech-hub.example.com",
    });
    await repo.create({ name: "Co C", address: "Fintech Plaza, NYC" });
    await repo.create({
      name: "Co D",
      notes: "Member of the fintech consortium.",
    });
    await repo.create({ name: "Co E", industry: "Healthcare" });
    const matches = await service.list({ q: "fintech" });
    assertEquals(matches.length, 4);
    assertEquals(
      matches.map((c) => c.name).sort(),
      ["Co A", "Co B", "Co C", "Co D"],
    );
  } finally {
    await cleanup(dir);
  }
});

Deno.test("CompanyService - list with type filter (case-insensitive exact)", async () => {
  const { repo, service, dir } = await setup();
  try {
    await repo.create({ name: "Cust Co", type: "customer" });
    await repo.create({ name: "Pros Co", type: "prospect" });
    await repo.create({ name: "Vend Co", type: "vendor" });
    const matches = await service.list({ type: "customer" });
    assertEquals(matches.length, 1);
    assertEquals(matches[0].name, "Cust Co");
  } finally {
    await cleanup(dir);
  }
});

Deno.test("CompanyService - list with industry filter (case-insensitive exact)", async () => {
  const { repo, service, dir } = await setup();
  try {
    await repo.create({ name: "A", industry: "SaaS" });
    await repo.create({ name: "B", industry: "saas" });
    await repo.create({ name: "C", industry: "Healthcare" });
    const matches = await service.list({ industry: "SAAS" });
    assertEquals(matches.length, 2);
    assertEquals(matches.map((c) => c.name).sort(), ["A", "B"]);
  } finally {
    await cleanup(dir);
  }
});

Deno.test("CompanyService - list combines q + type + industry (AND)", async () => {
  const { repo, service, dir } = await setup();
  try {
    await repo.create({
      name: "Match Co",
      type: "customer",
      industry: "SaaS",
      notes: "alpha keyword",
    });
    await repo.create({
      name: "Wrong Type",
      type: "prospect",
      industry: "SaaS",
      notes: "alpha keyword",
    });
    await repo.create({
      name: "Wrong Industry",
      type: "customer",
      industry: "Fintech",
      notes: "alpha keyword",
    });
    await repo.create({
      name: "Wrong Q",
      type: "customer",
      industry: "SaaS",
      notes: "no keyword",
    });
    const matches = await service.list({
      q: "alpha",
      type: "customer",
      industry: "SaaS",
    });
    assertEquals(matches.length, 1);
    assertEquals(matches[0].name, "Match Co");
  } finally {
    await cleanup(dir);
  }
});

Deno.test("CompanyService - list with no options returns all", async () => {
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

Deno.test("CompanyRepository - writes snake_case on disk, reads camelCase entity", async () => {
  const { repo, dir } = await setup();
  try {
    const company = await repo.create({
      name: "Round Trip Co",
      type: "customer",
      tags: ["alpha", "beta"],
    });
    const filePath = join(dir, "companies", `${company.id}.md`);
    const raw = await Deno.readTextFile(filePath);
    const fmEnd = raw.indexOf("\n---", 4);
    const fm = raw.slice(0, fmEnd);
    assertEquals(fm.includes("created_at:"), true);
    assertEquals(fm.includes("updated_at:"), true);
    assertEquals(fm.includes("createdAt:"), false);
    assertEquals(fm.includes("updatedAt:"), false);
    // tags array round-trips through frontmatter as YAML list.
    assertEquals(fm.includes("tags:"), true);

    const fetched = await repo.findById(company.id);
    assertExists(fetched);
    assertExists(fetched!.createdAt);
    assertExists(fetched!.updatedAt);
    assertEquals(fetched!.tags, ["alpha", "beta"]);
  } finally {
    await cleanup(dir);
  }
});

Deno.test("CompanyRepository - parses a manually-written snake_case file", async () => {
  const { repo, dir } = await setup();
  try {
    await Deno.mkdir(join(dir, "companies"), { recursive: true });
    await Deno.writeTextFile(
      join(dir, "companies", "company_manual.md"),
      [
        "---",
        "name: Manual Co",
        "type: partner",
        "industry: Logistics",
        "size: 201-1000",
        "tags:",
        "  - alpha",
        "  - beta",
        "created_at: 2026-01-01T00:00:00.000Z",
        "updated_at: 2026-01-02T00:00:00.000Z",
        "---",
        "# Manual Co",
        "",
        "## Notes",
        "",
        "Hand-written fixture.",
        "",
      ].join("\n"),
    );
    const fetched = await repo.findById("company_manual");
    assertExists(fetched);
    assertEquals(fetched!.id, "company_manual");
    assertEquals(fetched!.name, "Manual Co");
    assertEquals(fetched!.type, "partner");
    assertEquals(fetched!.industry, "Logistics");
    assertEquals(fetched!.size, "201-1000");
    assertEquals(fetched!.tags, ["alpha", "beta"]);
    assertEquals(fetched!.notes, "Hand-written fixture.");
    assertEquals(fetched!.createdAt, "2026-01-01T00:00:00.000Z");
    assertEquals(fetched!.updatedAt, "2026-01-02T00:00:00.000Z");
  } finally {
    await cleanup(dir);
  }
});

// === edge cases ===

Deno.test("CompanyRepository - optional fields left undefined round-trip as undefined", async () => {
  const { repo, dir } = await setup();
  try {
    const created = await repo.create({ name: "Minimal Co" });
    assertStrictEquals(created.website, undefined);
    assertStrictEquals(created.industry, undefined);
    assertStrictEquals(created.size, undefined);
    assertStrictEquals(created.type, undefined);
    assertStrictEquals(created.phone, undefined);
    assertStrictEquals(created.email, undefined);
    assertStrictEquals(created.address, undefined);
    assertStrictEquals(created.notes, undefined);
    assertEquals(created.tags, []);

    const fetched = await repo.findById(created.id);
    assertExists(fetched);
    assertStrictEquals(fetched!.website, undefined);
    assertStrictEquals(fetched!.industry, undefined);
    assertStrictEquals(fetched!.size, undefined);
    assertStrictEquals(fetched!.type, undefined);
    assertStrictEquals(fetched!.phone, undefined);
    assertStrictEquals(fetched!.email, undefined);
    assertStrictEquals(fetched!.address, undefined);
    assertStrictEquals(fetched!.notes, undefined);
    assertEquals(fetched!.tags, []);
  } finally {
    await cleanup(dir);
  }
});

Deno.test("CompanyRepository - parse() coerces invalid type/size to undefined", async () => {
  const { repo, dir } = await setup();
  try {
    await Deno.mkdir(join(dir, "companies"), { recursive: true });
    await Deno.writeTextFile(
      join(dir, "companies", "company_bad.md"),
      [
        "---",
        "name: Bad Enums Co",
        "type: invalid-type",
        "size: 9999+",
        "---",
        "# Bad Enums Co",
        "",
      ].join("\n"),
    );
    const fetched = await repo.findById("company_bad");
    assertExists(fetched);
    assertStrictEquals(fetched!.type, undefined);
    assertStrictEquals(fetched!.size, undefined);
  } finally {
    await cleanup(dir);
  }
});

Deno.test("CompanyRepository - findByName returns matching company (case-insensitive)", async () => {
  const { repo, dir } = await setup();
  try {
    await repo.create({ name: "Acme Corp" });
    await repo.create({ name: "Globex" });
    const found = await repo.findByName("acme corp");
    assertExists(found);
    assertEquals(found!.name, "Acme Corp");
  } finally {
    await cleanup(dir);
  }
});
