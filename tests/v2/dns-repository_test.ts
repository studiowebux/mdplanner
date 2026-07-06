/**
 * Unit tests for v2 DnsRepository (CRUD on disk + record sub-operations).
 *
 * DnsRepository.nameField = "domain". Body keys = ["id", "notes"]. Parse-guard
 * is `fm.domain` (only field that must be present). Records are stored inline
 * in frontmatter as `dnsRecords:` array; addRecord/updateRecord/deleteRecord
 * are index-based mutations.
 *
 * Cloudflare sync coverage is intentionally OUT OF SCOPE — it requires a
 * mocked IDnsProvider and a configured ProjectService.
 */

import { assertEquals, assertExists, assertStrictEquals } from "@std/assert";
import { DnsRepository } from "../../src/repositories/dns.repository.ts";

async function setup(): Promise<{ repo: DnsRepository; dir: string }> {
  const dir = await Deno.makeTempDir({ prefix: "mdplanner-dns-test-" });
  const repo = new DnsRepository(dir);
  return { repo, dir };
}

async function cleanup(dir: string): Promise<void> {
  try {
    await Deno.remove(dir, { recursive: true });
  } catch {
    // ignore
  }
}

// === create + findById ===

Deno.test("DnsRepository - create stores file and returns entity", async () => {
  const { repo, dir } = await setup();
  try {
    const domain = await repo.create({
      domain: "example.com",
      expiryDate: "2027-01-15",
      autoRenew: true,
      renewalCostUsd: 12.99,
      provider: "cloudflare",
      notes: "Primary domain.",
      project: "MD Planner",
    });
    assertExists(domain.id);
    assertEquals(domain.domain, "example.com");
    assertEquals(domain.expiryDate, "2027-01-15");
    assertEquals(domain.autoRenew, true);
    assertEquals(domain.renewalCostUsd, 12.99);
    assertEquals(domain.provider, "cloudflare");
    assertEquals(domain.notes, "Primary domain.");
    assertEquals(domain.project, "MD Planner");
  } finally {
    await cleanup(dir);
  }
});

Deno.test("DnsRepository - findById returns null for missing ID", async () => {
  const { repo, dir } = await setup();
  try {
    assertStrictEquals(await repo.findById("dns_nope"), null);
  } finally {
    await cleanup(dir);
  }
});

// === parse-guard ===

Deno.test("DnsRepository - findById succeeds after update (parse-guard regression)", async () => {
  const { repo, dir } = await setup();
  try {
    const created = await repo.create({
      domain: "guard.example.com",
      provider: "cloudflare",
    });
    await repo.update(created.id, { autoRenew: true });
    const fetched = await repo.findById(created.id);
    assertExists(fetched);
    assertEquals(fetched!.domain, "guard.example.com");
    assertEquals(fetched!.autoRenew, true);
  } finally {
    await cleanup(dir);
  }
});

// === update ===

Deno.test("DnsRepository - update preserves sibling fields", async () => {
  const { repo, dir } = await setup();
  try {
    const created = await repo.create({
      domain: "multi.example.com",
      provider: "cloudflare",
      autoRenew: true,
      expiryDate: "2026-12-31",
      notes: "Keep intact.",
    });
    await repo.update(created.id, { autoRenew: false });
    const fetched = await repo.findById(created.id);
    assertExists(fetched);
    assertEquals(fetched!.autoRenew, false);
    assertEquals(fetched!.domain, "multi.example.com");
    assertEquals(fetched!.provider, "cloudflare");
    assertEquals(fetched!.expiryDate, "2026-12-31");
    assertEquals(fetched!.notes, "Keep intact.");
  } finally {
    await cleanup(dir);
  }
});

Deno.test("DnsRepository - update returns null for non-existent ID", async () => {
  const { repo, dir } = await setup();
  try {
    assertStrictEquals(
      await repo.update("dns_missing", { autoRenew: true }),
      null,
    );
  } finally {
    await cleanup(dir);
  }
});

// === delete + hardDelete ===

Deno.test("DnsRepository - delete soft-archives entity", async () => {
  const { repo, dir } = await setup();
  try {
    const domain = await repo.create({ domain: "archive.example.com" });
    assertEquals(await repo.delete(domain.id), true);
    const found = await repo.findById(domain.id);
    assertExists(found);
    const all = await repo.findAllFromDisk();
    assertStrictEquals(all.find((d) => d.id === domain.id), undefined);
  } finally {
    await cleanup(dir);
  }
});

Deno.test("DnsRepository - hardDelete removes the file", async () => {
  const { repo, dir } = await setup();
  try {
    const domain = await repo.create({ domain: "gone.example.com" });
    assertEquals(await repo.hardDelete(domain.id), true);
    assertStrictEquals(await repo.findById(domain.id), null);
  } finally {
    await cleanup(dir);
  }
});

Deno.test("DnsRepository - delete returns false for non-existent ID", async () => {
  const { repo, dir } = await setup();
  try {
    assertEquals(await repo.delete("dns_ghost"), false);
  } finally {
    await cleanup(dir);
  }
});

// === sort by domain (nameField) ===

Deno.test("DnsRepository - findAll sorts alphabetically by domain", async () => {
  const { repo, dir } = await setup();
  try {
    await repo.create({ domain: "charlie.example.com" });
    await repo.create({ domain: "alpha.example.com" });
    await repo.create({ domain: "bravo.example.com" });
    const all = await repo.findAllFromDisk();
    assertEquals(all.map((d) => d.domain), [
      "alpha.example.com",
      "bravo.example.com",
      "charlie.example.com",
    ]);
  } finally {
    await cleanup(dir);
  }
});

// === record operations ===

Deno.test("DnsRepository - addRecord appends to dnsRecords", async () => {
  const { repo, dir } = await setup();
  try {
    const domain = await repo.create({ domain: "rec.example.com" });
    const updated = await repo.addRecord(domain.id, {
      type: "A",
      name: "www",
      value: "192.168.1.1",
      ttl: 3600,
    });
    assertExists(updated);
    assertEquals(updated!.dnsRecords?.length, 1);
    assertEquals(updated!.dnsRecords![0], {
      type: "A",
      name: "www",
      value: "192.168.1.1",
      ttl: 3600,
    });

    const second = await repo.addRecord(domain.id, {
      type: "CNAME",
      name: "blog",
      value: "www.rec.example.com",
      ttl: 3600,
    });
    assertEquals(second!.dnsRecords?.length, 2);
  } finally {
    await cleanup(dir);
  }
});

Deno.test("DnsRepository - updateRecord patches existing record by index", async () => {
  const { repo, dir } = await setup();
  try {
    const domain = await repo.create({ domain: "upd.example.com" });
    await repo.addRecord(domain.id, {
      type: "A",
      name: "@",
      value: "192.168.1.1",
      ttl: 3600,
    });
    const updated = await repo.updateRecord(domain.id, 0, {
      value: "10.0.0.1",
      ttl: 600,
    });
    assertExists(updated);
    assertEquals(updated!.dnsRecords![0].value, "10.0.0.1");
    assertEquals(updated!.dnsRecords![0].ttl, 600);
    assertEquals(updated!.dnsRecords![0].type, "A"); // preserved
    assertEquals(updated!.dnsRecords![0].name, "@"); // preserved
  } finally {
    await cleanup(dir);
  }
});

Deno.test("DnsRepository - deleteRecord removes record at index", async () => {
  const { repo, dir } = await setup();
  try {
    const domain = await repo.create({ domain: "del.example.com" });
    await repo.addRecord(domain.id, {
      type: "A",
      name: "a",
      value: "1",
      ttl: 1,
    });
    await repo.addRecord(domain.id, {
      type: "A",
      name: "b",
      value: "2",
      ttl: 1,
    });
    await repo.addRecord(domain.id, {
      type: "A",
      name: "c",
      value: "3",
      ttl: 1,
    });
    const after = await repo.deleteRecord(domain.id, 1);
    assertExists(after);
    assertEquals(after!.dnsRecords?.length, 2);
    assertEquals(
      after!.dnsRecords!.map((r) => r.name),
      ["a", "c"],
    );
  } finally {
    await cleanup(dir);
  }
});

Deno.test("DnsRepository - record ops return null for missing id/index", async () => {
  const { repo, dir } = await setup();
  try {
    const domain = await repo.create({ domain: "edge.example.com" });
    assertStrictEquals(
      await repo.addRecord("dns_missing", {
        type: "A",
        name: "n",
        value: "v",
        ttl: 1,
      }),
      null,
    );
    assertStrictEquals(
      await repo.updateRecord("dns_missing", 0, { value: "x" }),
      null,
    );
    assertStrictEquals(
      await repo.deleteRecord("dns_missing", 0),
      null,
    );
    // Out-of-range index on existing domain.
    assertStrictEquals(
      await repo.updateRecord(domain.id, 999, { value: "x" }),
      null,
    );
    assertStrictEquals(await repo.deleteRecord(domain.id, 999), null);
  } finally {
    await cleanup(dir);
  }
});

// === upsertByDomain (Cloudflare sync helper) ===

Deno.test("DnsRepository - upsertByDomain creates when missing, updates when present", async () => {
  const { repo, dir } = await setup();
  try {
    const r1 = await repo.upsertByDomain("upsert.example.com", {
      provider: "cloudflare",
      status: "active",
    });
    assertEquals(r1.created, true);
    assertEquals(r1.item.domain, "upsert.example.com");
    assertEquals(r1.item.status, "active");

    const r2 = await repo.upsertByDomain("upsert.example.com", {
      status: "paused",
    });
    assertEquals(r2.created, false);
    assertEquals(r2.item.status, "paused");
  } finally {
    await cleanup(dir);
  }
});

Deno.test("DnsRepository - upsertByDomain sets/overrides provider to cloudflare", async () => {
  const { repo, dir } = await setup();
  try {
    // New domain: provider is set even when not passed in the synced fields.
    const created = await repo.upsertByDomain("provider.example.com", {
      status: "active",
    });
    assertEquals(created.created, true);
    assertEquals(created.item.provider, "cloudflare");

    // Pre-existing domain with a different provider: a later sync overrides it.
    const manual = await repo.create({
      domain: "manual.example.com",
      provider: "manual",
    });
    assertEquals(manual.provider, "manual");

    const synced = await repo.upsertByDomain("manual.example.com", {
      status: "active",
    });
    assertEquals(synced.created, false);
    assertEquals(synced.item.provider, "cloudflare");
  } finally {
    await cleanup(dir);
  }
});

// === edges ===

Deno.test("DnsRepository - optional fields left undefined round-trip as undefined", async () => {
  const { repo, dir } = await setup();
  try {
    const created = await repo.create({ domain: "minimal.example.com" });
    assertStrictEquals(created.expiryDate, undefined);
    assertStrictEquals(created.autoRenew, undefined);
    assertStrictEquals(created.renewalCostUsd, undefined);
    assertStrictEquals(created.provider, undefined);
    assertStrictEquals(created.nameservers, undefined);
    assertStrictEquals(created.dnsRecords, undefined);
    assertStrictEquals(created.status, undefined);
    assertStrictEquals(created.notes, undefined);

    const fetched = await repo.findById(created.id);
    assertExists(fetched);
    assertStrictEquals(fetched!.expiryDate, undefined);
    assertStrictEquals(fetched!.autoRenew, undefined);
    assertStrictEquals(fetched!.notes, undefined);
  } finally {
    await cleanup(dir);
  }
});

Deno.test("DnsRepository - findByName via domain (case-insensitive)", async () => {
  const { repo, dir } = await setup();
  try {
    await repo.create({ domain: "Example.com" });
    await repo.create({ domain: "other.example.org" });
    const found = await repo.findByName("example.com");
    assertExists(found);
    assertEquals(found!.domain, "Example.com");
  } finally {
    await cleanup(dir);
  }
});
