/**
 * BusinessModelRepository tests — create/read/update/delete round-trip.
 */

import { assertEquals, assertExists } from "@std/assert";
import { BusinessModelRepository } from "../src/repositories/business-model.repository.ts";

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

Deno.test("BusinessModelRepository - create stores file and returns entity", async () => {
  await withTmpDir(async (dir) => {
    const repo = new BusinessModelRepository(dir);
    const item = await repo.create({
      title: "MDPlanner BMC",
      keyPartners: ["Cloud provider", "Payment processor"],
      valueProposition: ["All-in-one planning tool"],
      customerSegments: ["SMBs", "Freelancers"],
    });

    assertExists(item.id);
    assertEquals(item.title, "MDPlanner BMC");
    assertEquals(item.keyPartners, ["Cloud provider", "Payment processor"]);
    assertEquals(item.valueProposition, ["All-in-one planning tool"]);
    assertEquals(item.customerSegments, ["SMBs", "Freelancers"]);
    assertEquals(item.keyActivities, []);
    assertEquals(item.revenueStreams, []);
  });
});

Deno.test("BusinessModelRepository - findById returns correct entity", async () => {
  await withTmpDir(async (dir) => {
    const repo = new BusinessModelRepository(dir);
    const created = await repo.create({
      title: "Startup BMC",
      revenueStreams: ["Subscriptions"],
    });

    const found = await repo.findById(created.id);
    assertExists(found);
    assertEquals(found!.title, "Startup BMC");
    assertEquals(found!.revenueStreams, ["Subscriptions"]);
  });
});

Deno.test("BusinessModelRepository - findById returns null for missing ID", async () => {
  await withTmpDir(async (dir) => {
    const repo = new BusinessModelRepository(dir);
    const found = await repo.findById("bmc_nonexistent");
    assertEquals(found, null);
  });
});

Deno.test("BusinessModelRepository - update modifies existing entity", async () => {
  await withTmpDir(async (dir) => {
    const repo = new BusinessModelRepository(dir);
    const created = await repo.create({ title: "Original BMC" });

    const updated = await repo.update(created.id, {
      title: "Updated BMC",
      channels: ["Direct sales", "Online"],
    });

    assertExists(updated);
    assertEquals(updated!.title, "Updated BMC");
    assertEquals(updated!.channels, ["Direct sales", "Online"]);
  });
});

Deno.test("BusinessModelRepository - delete soft-archives entity", async () => {
  await withTmpDir(async (dir) => {
    const repo = new BusinessModelRepository(dir);
    const created = await repo.create({ title: "To Delete" });

    const deleted = await repo.delete(created.id);
    assertEquals(deleted, true);

    // delete() now aliases archive() — file stays on disk, findById still
    // resolves it for cross-domain reference safety. findAll filters it out.
    const found = await repo.findById(created.id);
    assertExists(found);
    const all = await repo.findAll();
    assertEquals(all.find((b) => b.id === created.id), undefined);
  });
});

Deno.test("BusinessModelRepository - hardDelete removes the file", async () => {
  await withTmpDir(async (dir) => {
    const repo = new BusinessModelRepository(dir);
    const created = await repo.create({ title: "Truly Gone" });

    const ok = await repo.hardDelete(created.id);
    assertEquals(ok, true);

    const found = await repo.findById(created.id);
    assertEquals(found, null);
  });
});

Deno.test("BusinessModelRepository - findAll returns all entities", async () => {
  await withTmpDir(async (dir) => {
    const repo = new BusinessModelRepository(dir);
    await repo.create({ title: "BMC A" });
    await repo.create({ title: "BMC B" });

    const all = await repo.findAll();
    assertEquals(all.length, 2);
  });
});

Deno.test("BusinessModelRepository - parses section headers correctly", async () => {
  await withTmpDir(async (dir) => {
    await Deno.mkdir(`${dir}/businessmodel`, { recursive: true });
    const content = `---
id: bmc_test_parse
title: Test BMC
date: 2026-01-01
created_at: 2026-01-01T00:00:00.000Z
updated_at: 2026-01-01T00:00:00.000Z
---

## Key Partners

- Partner A
- Partner B

## Value Proposition

- Core value

## Revenue Streams

- Subscriptions
- Consulting
`;
    await Deno.writeTextFile(
      `${dir}/businessmodel/bmc_test_parse.md`,
      content,
    );

    const repo = new BusinessModelRepository(dir);
    const item = await repo.findById("bmc_test_parse");
    assertExists(item);
    assertEquals(item!.title, "Test BMC");
    assertEquals(item!.keyPartners, ["Partner A", "Partner B"]);
    assertEquals(item!.valueProposition, ["Core value"]);
    assertEquals(item!.revenueStreams, ["Subscriptions", "Consulting"]);
    assertEquals(item!.channels, []);
  });
});
