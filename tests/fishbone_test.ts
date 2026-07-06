/**
 * FishboneRepository tests — create/read/update/delete round-trip.
 */

import { assertEquals, assertExists, assertRejects } from "@std/assert";
import { FishboneRepository } from "../src/repositories/fishbone.repository.ts";

async function withTmpDir(
  fn: (dir: string) => Promise<void>,
): Promise<void> {
  const dir = await Deno.makeTempDir();
  try {
    await fn(dir);
  } finally {
    await Deno.remove(dir, { recursive: true });
  }
}

Deno.test("FishboneRepository - create stores file and returns entity", async () => {
  await withTmpDir(async (dir) => {
    const repo = new FishboneRepository(dir);
    const item = await repo.create({
      title: "Test Fishbone",
      description: "Why did X happen?",
      causes: [
        { section: "People", items: ["Understaffed", "No training"] },
        { section: "Process", items: ["No checklist"] },
      ],
    });

    assertExists(item.id);
    assertEquals(item.title, "Test Fishbone");
    assertEquals(item.description, "Why did X happen?");
    assertEquals(item.causes.length, 2);
    assertEquals(item.causes[0].section, "People");
    assertEquals(item.causes[0].items, ["Understaffed", "No training"]);
    assertEquals(item.causes[1].section, "Process");
    assertEquals(item.causes[1].items, ["No checklist"]);
  });
});

Deno.test("FishboneRepository - findById returns correct entity", async () => {
  await withTmpDir(async (dir) => {
    const repo = new FishboneRepository(dir);
    const created = await repo.create({
      title: "Churn Analysis",
      causes: [{ section: "Pricing", items: ["Too expensive"] }],
    });

    const found = await repo.findById(created.id);
    assertExists(found);
    assertEquals(found!.title, "Churn Analysis");
    assertEquals(found!.causes[0].section, "Pricing");
    assertEquals(found!.causes[0].items, ["Too expensive"]);
  });
});

Deno.test("FishboneRepository - findById returns null for missing ID", async () => {
  await withTmpDir(async (dir) => {
    const repo = new FishboneRepository(dir);
    const found = await repo.findById("fishbone_nonexistent");
    assertEquals(found, null);
  });
});

Deno.test("FishboneRepository - update modifies existing entity", async () => {
  await withTmpDir(async (dir) => {
    const repo = new FishboneRepository(dir);
    const created = await repo.create({
      title: "Original",
      causes: [{ section: "People", items: ["Issue A"] }],
    });

    const updated = await repo.update(created.id, {
      title: "Updated Title",
      causes: [
        { section: "People", items: ["Issue A", "Issue B"] },
        { section: "Machine", items: ["Old equipment"] },
      ],
    });

    assertExists(updated);
    assertEquals(updated!.title, "Updated Title");
    assertEquals(updated!.causes.length, 2);
    assertEquals(updated!.causes[1].section, "Machine");
  });
});

Deno.test("FishboneRepository - delete soft-archives entity", async () => {
  await withTmpDir(async (dir) => {
    const repo = new FishboneRepository(dir);
    const created = await repo.create({
      title: "To Delete",
      causes: [],
    });

    const deleted = await repo.delete(created.id);
    assertEquals(deleted, true);

    // delete() now aliases archive() — file stays on disk, findById still
    // resolves it. findAll filters it out.
    const found = await repo.findById(created.id);
    assertExists(found);
    const all = await repo.findAll();
    assertEquals(all.find((f) => f.id === created.id), undefined);
  });
});

Deno.test("FishboneRepository - hardDelete removes the file", async () => {
  await withTmpDir(async (dir) => {
    const repo = new FishboneRepository(dir);
    const created = await repo.create({
      title: "Truly Gone",
      causes: [],
    });

    const ok = await repo.hardDelete(created.id);
    assertEquals(ok, true);

    const found = await repo.findById(created.id);
    assertEquals(found, null);
  });
});

Deno.test("FishboneRepository - findAll returns all entities", async () => {
  await withTmpDir(async (dir) => {
    const repo = new FishboneRepository(dir);
    await repo.create({ title: "Fishbone A", causes: [] });
    await repo.create({ title: "Fishbone B", causes: [] });
    await repo.create({ title: "Fishbone C", causes: [] });

    const all = await repo.findAll();
    assertEquals(all.length, 3);
  });
});

Deno.test("FishboneRepository - parses example file format correctly", async () => {
  await withTmpDir(async (dir) => {
    // Write an example file matching the real fishbone file format
    await Deno.mkdir(`${dir}/fishbone`, { recursive: true });
    const content = `---
id: fishbone_test_parse
title: Customer Churn Increase
description: Why are monthly cancellations up?
project: My Project
created_at: 2026-02-28T00:00:00.000Z
updated_at: 2026-02-28T00:00:00.000Z
---

## People

- Support response time too slow
- Onboarding team understaffed

## Process

- No proactive health check workflow
`;
    await Deno.writeTextFile(
      `${dir}/fishbone/fishbone_test_parse.md`,
      content,
    );

    const repo = new FishboneRepository(dir);
    const item = await repo.findById("fishbone_test_parse");
    assertExists(item);
    assertEquals(item!.title, "Customer Churn Increase");
    assertEquals(item!.description, "Why are monthly cancellations up?");
    assertEquals(item!.project, "My Project");
    assertEquals(item!.causes.length, 2);
    assertEquals(item!.causes[0].section, "People");
    assertEquals(item!.causes[0].items.length, 2);
    assertEquals(item!.causes[1].section, "Process");
    assertEquals(item!.causes[1].items.length, 1);
  });
});
