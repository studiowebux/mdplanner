/**
 * RiskRepository tests — create/read/update/delete round-trip.
 */

import { assertEquals, assertExists } from "@std/assert";
import { RiskRepository } from "../v2/repositories/risk.repository.ts";

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

Deno.test("RiskRepository - create stores file and returns entity", async () => {
  await withTmpDir(async (dir) => {
    const repo = new RiskRepository(dir);
    const item = await repo.create({
      title: "Database outage",
      category: "technical",
      likelihood: 3,
      impact: 5,
      status: "open",
      description: "Database could go down during peak hours.",
      mitigation: "Set up read replicas and automated failover.",
    });

    assertExists(item.id);
    assertEquals(item.title, "Database outage");
    assertEquals(item.category, "technical");
    assertEquals(item.likelihood, 3);
    assertEquals(item.impact, 5);
    assertEquals(item.status, "open");
    assertEquals(item.description, "Database could go down during peak hours.");
    assertEquals(
      item.mitigation,
      "Set up read replicas and automated failover.",
    );
  });
});

Deno.test("RiskRepository - findById returns correct entity", async () => {
  await withTmpDir(async (dir) => {
    const repo = new RiskRepository(dir);
    const created = await repo.create({
      title: "Compliance gap",
      category: "compliance",
      likelihood: 2,
      impact: 4,
      status: "open",
    });

    const found = await repo.findById(created.id);
    assertExists(found);
    assertEquals(found!.title, "Compliance gap");
    assertEquals(found!.category, "compliance");
    assertEquals(found!.likelihood, 2);
    assertEquals(found!.impact, 4);
  });
});

Deno.test("RiskRepository - findById returns null for missing ID", async () => {
  await withTmpDir(async (dir) => {
    const repo = new RiskRepository(dir);
    const found = await repo.findById("risk_nonexistent");
    assertEquals(found, null);
  });
});

Deno.test("RiskRepository - update modifies existing entity", async () => {
  await withTmpDir(async (dir) => {
    const repo = new RiskRepository(dir);
    const created = await repo.create({
      title: "Original Risk",
      category: "operational",
      likelihood: 3,
      impact: 3,
      status: "open",
    });

    const updated = await repo.update(created.id, {
      title: "Updated Risk",
      status: "mitigated",
      likelihood: 1,
    });

    assertExists(updated);
    assertEquals(updated!.title, "Updated Risk");
    assertEquals(updated!.status, "mitigated");
    assertEquals(updated!.likelihood, 1);
    assertEquals(updated!.impact, 3);
  });
});

Deno.test("RiskRepository - delete removes entity", async () => {
  await withTmpDir(async (dir) => {
    const repo = new RiskRepository(dir);
    const created = await repo.create({
      title: "To Delete",
      category: "financial",
      likelihood: 2,
      impact: 2,
      status: "open",
    });

    const deleted = await repo.delete(created.id);
    assertEquals(deleted, true);

    const found = await repo.findById(created.id);
    assertEquals(found, null);
  });
});

Deno.test("RiskRepository - findAll returns all entities", async () => {
  await withTmpDir(async (dir) => {
    const repo = new RiskRepository(dir);
    await repo.create({
      title: "Risk A",
      category: "technical",
      likelihood: 1,
      impact: 1,
      status: "open",
    });
    await repo.create({
      title: "Risk B",
      category: "financial",
      likelihood: 2,
      impact: 2,
      status: "open",
    });
    await repo.create({
      title: "Risk C",
      category: "strategic",
      likelihood: 3,
      impact: 3,
      status: "closed",
    });

    const all = await repo.findAll();
    assertEquals(all.length, 3);
  });
});

Deno.test("RiskRepository - parses example file format correctly", async () => {
  await withTmpDir(async (dir) => {
    await Deno.mkdir(`${dir}/risks`, { recursive: true });
    const content = `---
id: risk_test_parse
title: Key Person Dependency
category: operational
likelihood: 4
impact: 5
status: open
owner: Jane Doe
project: My Project
tags:
  - staffing
  - continuity
created_at: 2026-01-01T00:00:00.000Z
updated_at: 2026-01-01T00:00:00.000Z
---

Only one engineer knows the deployment process.

## Mitigation

Document all deployment steps and cross-train two other engineers.
`;
    await Deno.writeTextFile(`${dir}/risks/risk_test_parse.md`, content);

    const repo = new RiskRepository(dir);
    const item = await repo.findById("risk_test_parse");
    assertExists(item);
    assertEquals(item!.title, "Key Person Dependency");
    assertEquals(item!.category, "operational");
    assertEquals(item!.likelihood, 4);
    assertEquals(item!.impact, 5);
    assertEquals(item!.status, "open");
    assertEquals(item!.owner, "Jane Doe");
    assertEquals(item!.project, "My Project");
    assertEquals(item!.tags, ["staffing", "continuity"]);
    assertEquals(
      item!.description,
      "Only one engineer knows the deployment process.",
    );
    assertEquals(
      item!.mitigation,
      "Document all deployment steps and cross-train two other engineers.",
    );
  });
});
