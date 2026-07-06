/**
 * Unit tests for v2 VacationRepository (CRUD on disk) + VacationService
 * (filters). Soft-archive flow is covered separately in
 * `vacation-soft-delete_test.ts` — this file focuses on CRUD, parse-guard,
 * sort, and filter behaviour.
 */

import { assertEquals, assertExists, assertStrictEquals } from "@std/assert";
import { VacationRepository } from "../../src/repositories/vacation.repository.ts";
import { VacationService } from "../../src/services/vacation.service.ts";

async function setup(): Promise<
  { repo: VacationRepository; service: VacationService; dir: string }
> {
  const dir = await Deno.makeTempDir({ prefix: "mdplanner-vacation-test-" });
  const repo = new VacationRepository(dir);
  const service = new VacationService(repo);
  return { repo, service, dir };
}

async function cleanup(dir: string): Promise<void> {
  try {
    await Deno.remove(dir, { recursive: true });
  } catch {
    // ignore
  }
}

// === create + defaults ===

Deno.test("VacationRepository - create stores entity and defaults status to 'pending'", async () => {
  const { repo, dir } = await setup();
  try {
    const req = await repo.create({
      personId: "person_alice",
      startDate: "2026-07-01",
      endDate: "2026-07-05",
      type: "vacation",
    });
    assertExists(req.id);
    assertEquals(req.personId, "person_alice");
    assertEquals(req.startDate, "2026-07-01");
    assertEquals(req.endDate, "2026-07-05");
    assertEquals(req.type, "vacation");
    assertEquals(req.status, "pending");
  } finally {
    await cleanup(dir);
  }
});

Deno.test("VacationRepository - create with full fields", async () => {
  const { repo, dir } = await setup();
  try {
    const req = await repo.create({
      personId: "person_bob",
      startDate: "2026-08-10",
      endDate: "2026-08-15",
      type: "sick",
      status: "approved",
      notes: "Doctor's note attached.",
    });
    assertEquals(req.type, "sick");
    assertEquals(req.status, "approved");
    assertEquals(req.notes, "Doctor's note attached.");
  } finally {
    await cleanup(dir);
  }
});

Deno.test("VacationRepository - findById returns null for missing ID", async () => {
  const { repo, dir } = await setup();
  try {
    assertStrictEquals(await repo.findById("vacation_nope"), null);
  } finally {
    await cleanup(dir);
  }
});

// === parse-guard ===

Deno.test("VacationRepository - findById succeeds after update (parse-guard regression)", async () => {
  const { repo, dir } = await setup();
  try {
    const created = await repo.create({
      personId: "person_alice",
      startDate: "2026-07-01",
      endDate: "2026-07-05",
      type: "vacation",
    });
    const updated = await repo.update(created.id, { status: "approved" });
    assertExists(updated);
    const fetched = await repo.findById(created.id);
    assertExists(fetched);
    assertEquals(fetched!.id, created.id);
    assertEquals(fetched!.personId, "person_alice");
    assertEquals(fetched!.status, "approved");
  } finally {
    await cleanup(dir);
  }
});

// === update ===

Deno.test("VacationRepository - update preserves sibling fields", async () => {
  const { repo, dir } = await setup();
  try {
    const created = await repo.create({
      personId: "person_charlie",
      startDate: "2026-09-01",
      endDate: "2026-09-10",
      type: "personal",
      status: "pending",
      notes: "Keep intact.",
    });
    await repo.update(created.id, { status: "approved" });
    const fetched = await repo.findById(created.id);
    assertExists(fetched);
    assertEquals(fetched!.status, "approved");
    assertEquals(fetched!.personId, "person_charlie");
    assertEquals(fetched!.startDate, "2026-09-01");
    assertEquals(fetched!.endDate, "2026-09-10");
    assertEquals(fetched!.type, "personal");
    assertEquals(fetched!.notes, "Keep intact.");
  } finally {
    await cleanup(dir);
  }
});

Deno.test("VacationRepository - update returns null for non-existent ID", async () => {
  const { repo, dir } = await setup();
  try {
    assertStrictEquals(
      await repo.update("vacation_missing", { status: "approved" }),
      null,
    );
  } finally {
    await cleanup(dir);
  }
});

// === delete (soft) + hardDelete ===

Deno.test("VacationRepository - delete soft-archives entity", async () => {
  const { repo, dir } = await setup();
  try {
    const req = await repo.create({
      personId: "person_z",
      startDate: "2026-01-01",
      endDate: "2026-01-02",
      type: "vacation",
    });
    assertEquals(await repo.delete(req.id), true);
    const found = await repo.findById(req.id);
    assertExists(found);
    const all = await repo.findAllFromDisk();
    assertStrictEquals(all.find((r) => r.id === req.id), undefined);
  } finally {
    await cleanup(dir);
  }
});

Deno.test("VacationRepository - hardDelete removes the file", async () => {
  const { repo, dir } = await setup();
  try {
    const req = await repo.create({
      personId: "person_z",
      startDate: "2026-01-01",
      endDate: "2026-01-02",
      type: "vacation",
    });
    assertEquals(await repo.hardDelete(req.id), true);
    assertStrictEquals(await repo.findById(req.id), null);
  } finally {
    await cleanup(dir);
  }
});

Deno.test("VacationRepository - delete returns false for non-existent ID", async () => {
  const { repo, dir } = await setup();
  try {
    assertEquals(await repo.delete("vacation_ghost"), false);
  } finally {
    await cleanup(dir);
  }
});

// === sort by personId ===

Deno.test("VacationRepository - findAll sorts alphabetically by personId", async () => {
  const { repo, dir } = await setup();
  try {
    await repo.create({
      personId: "person_charlie",
      startDate: "2026-01-01",
      endDate: "2026-01-02",
      type: "vacation",
    });
    await repo.create({
      personId: "person_alice",
      startDate: "2026-01-01",
      endDate: "2026-01-02",
      type: "vacation",
    });
    await repo.create({
      personId: "person_bravo",
      startDate: "2026-01-01",
      endDate: "2026-01-02",
      type: "vacation",
    });
    const all = await repo.findAllFromDisk();
    assertEquals(all.map((r) => r.personId), [
      "person_alice",
      "person_bravo",
      "person_charlie",
    ]);
  } finally {
    await cleanup(dir);
  }
});

// === service filters ===

Deno.test("VacationService - list with status filter (exact)", async () => {
  const { repo, service, dir } = await setup();
  try {
    await repo.create({
      personId: "p1",
      startDate: "2026-01-01",
      endDate: "2026-01-02",
      type: "vacation",
      status: "pending",
    });
    await repo.create({
      personId: "p2",
      startDate: "2026-01-01",
      endDate: "2026-01-02",
      type: "vacation",
      status: "approved",
    });
    const matches = await service.list({ status: "approved" });
    assertEquals(matches.length, 1);
    assertEquals(matches[0].personId, "p2");
  } finally {
    await cleanup(dir);
  }
});

Deno.test("VacationService - list with type filter (exact)", async () => {
  const { repo, service, dir } = await setup();
  try {
    await repo.create({
      personId: "p1",
      startDate: "2026-01-01",
      endDate: "2026-01-02",
      type: "vacation",
    });
    await repo.create({
      personId: "p2",
      startDate: "2026-01-01",
      endDate: "2026-01-02",
      type: "sick",
    });
    const matches = await service.list({ type: "sick" });
    assertEquals(matches.length, 1);
    assertEquals(matches[0].personId, "p2");
  } finally {
    await cleanup(dir);
  }
});

Deno.test("VacationService - list with personId filter (exact)", async () => {
  const { repo, service, dir } = await setup();
  try {
    await repo.create({
      personId: "person_alice",
      startDate: "2026-01-01",
      endDate: "2026-01-02",
      type: "vacation",
    });
    await repo.create({
      personId: "person_bob",
      startDate: "2026-01-01",
      endDate: "2026-01-02",
      type: "vacation",
    });
    const matches = await service.list({ personId: "person_alice" });
    assertEquals(matches.length, 1);
    assertEquals(matches[0].personId, "person_alice");
  } finally {
    await cleanup(dir);
  }
});

Deno.test("VacationService - list with q filter matches personId and notes", async () => {
  const { repo, service, dir } = await setup();
  try {
    await repo.create({
      personId: "person_alice",
      startDate: "2026-01-01",
      endDate: "2026-01-02",
      type: "vacation",
    });
    await repo.create({
      personId: "person_bob",
      startDate: "2026-01-01",
      endDate: "2026-01-02",
      type: "vacation",
      notes: "Visiting Alice in Spain.",
    });
    await repo.create({
      personId: "person_charlie",
      startDate: "2026-01-01",
      endDate: "2026-01-02",
      type: "vacation",
    });
    const matches = await service.list({ q: "alice" });
    assertEquals(matches.length, 2);
    assertEquals(
      matches.map((r) => r.personId).sort(),
      ["person_alice", "person_bob"],
    );
  } finally {
    await cleanup(dir);
  }
});

Deno.test("VacationService - list combines filters (AND)", async () => {
  const { repo, service, dir } = await setup();
  try {
    await repo.create({
      personId: "person_alice",
      startDate: "2026-01-01",
      endDate: "2026-01-02",
      type: "vacation",
      status: "approved",
    });
    await repo.create({
      personId: "person_alice",
      startDate: "2026-02-01",
      endDate: "2026-02-02",
      type: "sick",
      status: "approved",
    });
    const matches = await service.list({
      personId: "person_alice",
      type: "vacation",
      status: "approved",
    });
    assertEquals(matches.length, 1);
    assertEquals(matches[0].startDate, "2026-01-01");
  } finally {
    await cleanup(dir);
  }
});

// === edges ===

Deno.test("VacationRepository - optional notes left undefined round-trip as undefined", async () => {
  const { repo, dir } = await setup();
  try {
    const created = await repo.create({
      personId: "p1",
      startDate: "2026-01-01",
      endDate: "2026-01-02",
      type: "vacation",
    });
    assertStrictEquals(created.notes, undefined);
    const fetched = await repo.findById(created.id);
    assertExists(fetched);
    assertStrictEquals(fetched!.notes, undefined);
  } finally {
    await cleanup(dir);
  }
});
