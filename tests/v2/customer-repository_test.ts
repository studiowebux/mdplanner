/**
 * Unit tests for v2 CustomerRepository (CRUD on disk) + CustomerService
 * (filter behaviour).
 *
 * Regression focus: id and notes live in CUSTOMER_BODY_KEYS. `parse()` must
 * still recognise files after `update()` rewrites them (id absent from
 * frontmatter — guard holds via `fm.name`). Customer also has a nested
 * `billingAddress` object that must round-trip through frontmatter.
 */

import { assertEquals, assertExists, assertStrictEquals } from "@std/assert";
import { join } from "@std/path";
import { CustomerRepository } from "../../src/repositories/customer.repository.ts";
import { CustomerService } from "../../src/services/customer.service.ts";

async function setup(): Promise<
  { repo: CustomerRepository; service: CustomerService; dir: string }
> {
  const dir = await Deno.makeTempDir({ prefix: "mdplanner-customer-test-" });
  const repo = new CustomerRepository(dir);
  const service = new CustomerService(repo);
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

Deno.test("CustomerRepository - create stores file and returns entity", async () => {
  const { repo, dir } = await setup();
  try {
    const customer = await repo.create({
      name: "DevAgency Inc",
      email: "accounts@devagency.com",
      phone: "+1-555-0300",
      company: "DevAgency Inc",
      billingAddress: {
        street: "789 Agency Way",
        city: "New York",
        state: "NY",
        postalCode: "10001",
        country: "USA",
      },
      notes: "Net-30 terms.",
    });
    assertExists(customer.id);
    assertEquals(customer.name, "DevAgency Inc");
    assertEquals(customer.email, "accounts@devagency.com");
    assertEquals(customer.phone, "+1-555-0300");
    assertEquals(customer.company, "DevAgency Inc");
    assertEquals(customer.billingAddress?.street, "789 Agency Way");
    assertEquals(customer.billingAddress?.city, "New York");
    assertEquals(customer.billingAddress?.country, "USA");
    assertEquals(customer.notes, "Net-30 terms.");
  } finally {
    await cleanup(dir);
  }
});

Deno.test("CustomerRepository - findById returns null for missing ID", async () => {
  const { repo, dir } = await setup();
  try {
    assertStrictEquals(await repo.findById("customer_nope"), null);
  } finally {
    await cleanup(dir);
  }
});

// === parse-guard regression ===

Deno.test("CustomerRepository - findById succeeds after update (parse-guard regression)", async () => {
  const { repo, dir } = await setup();
  try {
    const created = await repo.create({
      name: "Guard Customer",
      company: "Acme",
    });
    const updated = await repo.update(created.id, { phone: "+1-555-9999" });
    assertExists(updated);
    const fetched = await repo.findById(created.id);
    assertExists(fetched);
    assertEquals(fetched!.id, created.id);
    assertEquals(fetched!.name, "Guard Customer");
    assertEquals(fetched!.phone, "+1-555-9999");
    assertEquals(fetched!.company, "Acme");
  } finally {
    await cleanup(dir);
  }
});

// === update ===

Deno.test("CustomerRepository - update modifies existing entity", async () => {
  const { repo, dir } = await setup();
  try {
    const customer = await repo.create({ name: "Original" });
    const updated = await repo.update(customer.id, {
      email: "new@example.com",
    });
    assertExists(updated);
    assertEquals(updated!.email, "new@example.com");
    const found = await repo.findById(customer.id);
    assertEquals(found!.email, "new@example.com");
  } finally {
    await cleanup(dir);
  }
});

Deno.test("CustomerRepository - update preserves sibling fields including billingAddress", async () => {
  const { repo, dir } = await setup();
  try {
    const created = await repo.create({
      name: "Multi-field",
      email: "multi@example.com",
      phone: "+1-555-0200",
      company: "Globex",
      billingAddress: { street: "1 Main", city: "Springfield", country: "USA" },
      notes: "Keep me intact.",
    });
    await repo.update(created.id, { phone: "+1-555-7777" });
    const fetched = await repo.findById(created.id);
    assertExists(fetched);
    assertEquals(fetched!.phone, "+1-555-7777");
    assertEquals(fetched!.name, "Multi-field");
    assertEquals(fetched!.email, "multi@example.com");
    assertEquals(fetched!.company, "Globex");
    assertEquals(fetched!.billingAddress?.street, "1 Main");
    assertEquals(fetched!.billingAddress?.city, "Springfield");
    assertEquals(fetched!.billingAddress?.country, "USA");
    assertEquals(fetched!.notes, "Keep me intact.");
  } finally {
    await cleanup(dir);
  }
});

Deno.test("CustomerRepository - update returns null for non-existent ID", async () => {
  const { repo, dir } = await setup();
  try {
    assertStrictEquals(
      await repo.update("customer_missing", { name: "X" }),
      null,
    );
  } finally {
    await cleanup(dir);
  }
});

// === delete (soft-archive) + hardDelete ===

Deno.test("CustomerRepository - delete soft-archives entity", async () => {
  const { repo, dir } = await setup();
  try {
    const customer = await repo.create({ name: "Archive me" });
    assertEquals(await repo.delete(customer.id), true);
    const found = await repo.findById(customer.id);
    assertExists(found);
    const all = await repo.findAllFromDisk();
    assertStrictEquals(all.find((c) => c.id === customer.id), undefined);
  } finally {
    await cleanup(dir);
  }
});

Deno.test("CustomerRepository - hardDelete removes the file", async () => {
  const { repo, dir } = await setup();
  try {
    const customer = await repo.create({ name: "Truly gone" });
    assertEquals(await repo.hardDelete(customer.id), true);
    assertStrictEquals(await repo.findById(customer.id), null);
  } finally {
    await cleanup(dir);
  }
});

Deno.test("CustomerRepository - delete returns false for non-existent ID", async () => {
  const { repo, dir } = await setup();
  try {
    assertEquals(await repo.delete("customer_ghost"), false);
  } finally {
    await cleanup(dir);
  }
});

// === findAll: sort ===

Deno.test("CustomerRepository - findAll sorts alphabetically by name", async () => {
  const { repo, dir } = await setup();
  try {
    await repo.create({ name: "Charlie" });
    await repo.create({ name: "Alpha" });
    await repo.create({ name: "Bravo" });
    const all = await repo.findAllFromDisk();
    assertEquals(all.map((c) => c.name), ["Alpha", "Bravo", "Charlie"]);
  } finally {
    await cleanup(dir);
  }
});

// === service.list filters ===

Deno.test("CustomerService - list with q filter matches name, email, company", async () => {
  const { repo, service, dir } = await setup();
  try {
    await repo.create({ name: "Acme Co" });
    await repo.create({ name: "B", email: "alpha@acme.example.com" });
    await repo.create({ name: "C", company: "Acme Holdings" });
    await repo.create({ name: "D", company: "Globex" });
    const matches = await service.list({ q: "acme" });
    assertEquals(matches.length, 3);
    assertEquals(matches.map((c) => c.name).sort(), ["Acme Co", "B", "C"]);
  } finally {
    await cleanup(dir);
  }
});

Deno.test("CustomerService - list with no options returns all", async () => {
  const { repo, service, dir } = await setup();
  try {
    await repo.create({ name: "A" });
    await repo.create({ name: "B" });
    assertEquals((await service.list()).length, 2);
  } finally {
    await cleanup(dir);
  }
});

// === round-trip ===

Deno.test("CustomerRepository - writes snake_case on disk, reads camelCase entity", async () => {
  const { repo, dir } = await setup();
  try {
    const customer = await repo.create({
      name: "Round Trip",
      billingAddress: { postalCode: "10001", country: "USA" },
    });
    const filePath = join(dir, "billing/customers", `${customer.id}.md`);
    const raw = await Deno.readTextFile(filePath);
    const fmEnd = raw.indexOf("\n---", 4);
    const fm = raw.slice(0, fmEnd);
    assertEquals(fm.includes("created_at:"), true);
    assertEquals(fm.includes("createdAt:"), false);
    // billingAddress nested object: top-level key is snake_case but
    // mapKeysToFm does NOT recurse — nested keys stay camelCase on disk.
    assertEquals(fm.includes("billing_address:"), true);
    assertEquals(fm.includes("postalCode:"), true);

    const fetched = await repo.findById(customer.id);
    assertExists(fetched);
    assertEquals(fetched!.billingAddress?.postalCode, "10001");
    assertEquals(fetched!.billingAddress?.country, "USA");
  } finally {
    await cleanup(dir);
  }
});

Deno.test("CustomerRepository - parses a manually-written snake_case file", async () => {
  const { repo, dir } = await setup();
  try {
    await Deno.mkdir(join(dir, "billing/customers"), { recursive: true });
    await Deno.writeTextFile(
      join(dir, "billing/customers", "customer_manual.md"),
      [
        "---",
        "name: Manual Customer",
        "email: manual@example.com",
        "billing_address:",
        "  street: 1 Main",
        "  city: Springfield",
        "  postalCode: 12345",
        "  country: USA",
        "created_at: 2026-01-01T00:00:00.000Z",
        "updated_at: 2026-01-02T00:00:00.000Z",
        "---",
        "# Manual Customer",
        "",
        "## Notes",
        "",
        "Hand-written fixture.",
        "",
      ].join("\n"),
    );
    const fetched = await repo.findById("customer_manual");
    assertExists(fetched);
    assertEquals(fetched!.id, "customer_manual");
    assertEquals(fetched!.name, "Manual Customer");
    assertEquals(fetched!.email, "manual@example.com");
    assertEquals(fetched!.billingAddress?.street, "1 Main");
    assertEquals(fetched!.billingAddress?.postalCode, "12345");
    assertEquals(fetched!.notes, "Hand-written fixture.");
    assertEquals(fetched!.createdAt, "2026-01-01T00:00:00.000Z");
  } finally {
    await cleanup(dir);
  }
});

// === edge cases ===

Deno.test("CustomerRepository - optional fields left undefined round-trip as undefined", async () => {
  const { repo, dir } = await setup();
  try {
    const created = await repo.create({ name: "Minimal" });
    assertStrictEquals(created.email, undefined);
    assertStrictEquals(created.phone, undefined);
    assertStrictEquals(created.company, undefined);
    assertStrictEquals(created.billingAddress, undefined);
    assertStrictEquals(created.notes, undefined);

    const fetched = await repo.findById(created.id);
    assertExists(fetched);
    assertStrictEquals(fetched!.email, undefined);
    assertStrictEquals(fetched!.phone, undefined);
    assertStrictEquals(fetched!.company, undefined);
    assertStrictEquals(fetched!.billingAddress, undefined);
    assertStrictEquals(fetched!.notes, undefined);
  } finally {
    await cleanup(dir);
  }
});

Deno.test("CustomerRepository - findByName returns matching customer (case-insensitive)", async () => {
  const { repo, dir } = await setup();
  try {
    await repo.create({ name: "Acme Co" });
    await repo.create({ name: "Globex" });
    const found = await repo.findByName("acme co");
    assertExists(found);
    assertEquals(found!.name, "Acme Co");
  } finally {
    await cleanup(dir);
  }
});
