/**
 * Unit tests for v2 C4Repository (CRUD on disk) + C4Service
 * (filter + hierarchy + connection helpers).
 *
 * Storage shape (v1-compat):
 * - `name` is the body `# Heading`, NOT frontmatter
 * - `position` is `{ x, y }` nested in frontmatter; serialize rounds via Math.round
 * - `connections` array lives on the SOURCE component's frontmatter
 * - `parent` + `children` enable level drill-down (context → container → component → code)
 *
 * Covered: CRUD, parse-guard regression with connections, 3-level hierarchy
 * round-trip, every filter dimension, every service helper (findByLevel,
 * patchPosition, addConnection, removeConnection, getConnectionsFor).
 */

import { assertEquals, assertExists, assertStrictEquals } from "@std/assert";
import { join } from "@std/path";
import { C4Repository } from "../../v2/repositories/c4.repository.ts";
import { C4Service } from "../../v2/services/c4.service.ts";

async function setup(): Promise<
  { repo: C4Repository; service: C4Service; dir: string }
> {
  const dir = await Deno.makeTempDir({ prefix: "mdplanner-c4-test-" });
  const repo = new C4Repository(dir);
  const service = new C4Service(repo);
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

Deno.test("C4Repository - create stores file with default-fill (diagram, position, connections, children)", async () => {
  const { repo, dir } = await setup();
  try {
    const c = await repo.create({
      name: "API Server",
      level: "container",
      type: "API Application",
    });
    assertExists(c.id);
    assertEquals(c.name, "API Server");
    assertEquals(c.level, "container");
    assertEquals(c.type, "API Application");
    assertEquals(c.diagram, "default");
    assertEquals(c.position, { x: 0, y: 0 });
    assertEquals(c.connections, []);
    assertEquals(c.children, []);
    assertExists(c.createdAt);
  } finally {
    await cleanup(dir);
  }
});

Deno.test("C4Repository - create supports all four C4 levels", async () => {
  const { repo, dir } = await setup();
  try {
    for (
      const level of ["context", "container", "component", "code"] as const
    ) {
      const c = await repo.create({ name: `L-${level}`, level, type: "X" });
      assertEquals(c.level, level);
    }
    const all = await repo.findAllFromDisk();
    assertEquals(all.length, 4);
  } finally {
    await cleanup(dir);
  }
});

Deno.test("C4Repository - findById returns null for missing ID", async () => {
  const { repo, dir } = await setup();
  try {
    const found = await repo.findById("c4_nonexistent");
    assertStrictEquals(found, null);
  } finally {
    await cleanup(dir);
  }
});

// === parse-guard regression — connections survive update ===

Deno.test("C4Repository - findById succeeds after update with connections + children populated", async () => {
  const { repo, dir } = await setup();
  try {
    const created = await repo.create({
      name: "Parse Guard",
      level: "container",
      type: "Service",
      description: "Original description.",
      technology: "Deno",
      position: { x: 100, y: 200 },
    });
    // Inject connections + children via update.
    const updated = await repo.update(created.id, {
      // deno-lint-ignore no-explicit-any
      ...(({
        connections: [
          {
            id: "conn_1",
            target: "c4_db",
            label: "Reads from",
            technology: "SQL",
          },
          { id: "conn_2", target: "c4_cache", label: "Writes to" },
        ],
      }) as any),
    });
    assertExists(updated);
    const fetched = await repo.findById(created.id);
    assertExists(fetched);
    assertEquals(fetched!.id, created.id);
    assertEquals(fetched!.name, "Parse Guard");
    assertEquals(fetched!.description, "Original description.");
    assertEquals(fetched!.technology, "Deno");
    assertEquals(fetched!.connections?.length, 2);
    assertEquals(fetched!.connections![0].id, "conn_1");
    assertEquals(fetched!.connections![0].target, "c4_db");
    assertEquals(fetched!.connections![0].label, "Reads from");
    assertEquals(fetched!.connections![0].technology, "SQL");
    assertEquals(fetched!.connections![1].technology, undefined);
  } finally {
    await cleanup(dir);
  }
});

// === position round-trip with rounding ===

Deno.test("C4Repository - position round-trips with Math.round serialisation", async () => {
  const { repo, dir } = await setup();
  try {
    const created = await repo.create({
      name: "Pos",
      level: "context",
      type: "X",
      position: { x: 123.7, y: 456.4 },
    });
    const fetched = await repo.findById(created.id);
    assertExists(fetched);
    // Serializer rounds: 123.7 → 124, 456.4 → 456.
    assertEquals(fetched!.position, { x: 124, y: 456 });
  } finally {
    await cleanup(dir);
  }
});

// === hierarchy round-trip — context → container → component ===

Deno.test("C4Repository - 3-level hierarchy round-trip (parent + children)", async () => {
  const { repo, dir } = await setup();
  try {
    const ctx = await repo.create({
      name: "System",
      level: "context",
      type: "Software System",
    });
    const cnt = await repo.create({
      name: "API",
      level: "container",
      type: "API Application",
      parent: ctx.id,
    });
    const cmp = await repo.create({
      name: "Auth Module",
      level: "component",
      type: "Module",
      parent: cnt.id,
    });

    // Wire children pointers via update (children populated client-side).
    // deno-lint-ignore no-explicit-any
    await repo.update(ctx.id, { children: [cnt.id] } as any);
    // deno-lint-ignore no-explicit-any
    await repo.update(cnt.id, { children: [cmp.id] } as any);

    const fCtx = await repo.findById(ctx.id);
    const fCnt = await repo.findById(cnt.id);
    const fCmp = await repo.findById(cmp.id);

    assertEquals(fCtx!.children, [cnt.id]);
    assertEquals(fCnt!.parent, ctx.id);
    assertEquals(fCnt!.children, [cmp.id]);
    assertEquals(fCmp!.parent, cnt.id);
  } finally {
    await cleanup(dir);
  }
});

// === update ===

Deno.test("C4Repository - update modifies existing entity", async () => {
  const { repo, dir } = await setup();
  try {
    const c = await repo.create({ name: "X", level: "context", type: "Sys" });
    const updated = await repo.update(c.id, {
      name: "Renamed",
      type: "Person",
    });
    assertExists(updated);
    assertEquals(updated!.name, "Renamed");
    assertEquals(updated!.type, "Person");
  } finally {
    await cleanup(dir);
  }
});

Deno.test("C4Repository - update preserves sibling fields", async () => {
  const { repo, dir } = await setup();
  try {
    const created = await repo.create({
      name: "Sibling",
      level: "container",
      type: "Service",
      description: "Keep me intact.",
      technology: "Deno",
      position: { x: 50, y: 60 },
      diagram: "main",
    });
    await repo.update(created.id, { name: "Renamed" });
    const fetched = await repo.findById(created.id);
    assertExists(fetched);
    assertEquals(fetched!.name, "Renamed");
    assertEquals(fetched!.description, "Keep me intact.");
    assertEquals(fetched!.technology, "Deno");
    assertEquals(fetched!.position, { x: 50, y: 60 });
    assertEquals(fetched!.diagram, "main");
    assertEquals(fetched!.level, "container");
  } finally {
    await cleanup(dir);
  }
});

Deno.test("C4Repository - update returns null for non-existent ID", async () => {
  const { repo, dir } = await setup();
  try {
    const result = await repo.update("c4_missing", { name: "X" });
    assertStrictEquals(result, null);
  } finally {
    await cleanup(dir);
  }
});

// === delete + hardDelete ===

Deno.test("C4Repository - delete soft-archives entity", async () => {
  const { repo, dir } = await setup();
  try {
    const c = await repo.create({
      name: "Archived",
      level: "context",
      type: "S",
    });
    const deleted = await repo.delete(c.id);
    assertEquals(deleted, true);
    const found = await repo.findById(c.id);
    assertExists(found);
    const all = await repo.findAllFromDisk();
    assertStrictEquals(all.find((x) => x.id === c.id), undefined);
  } finally {
    await cleanup(dir);
  }
});

Deno.test("C4Repository - hardDelete removes the file", async () => {
  const { repo, dir } = await setup();
  try {
    const c = await repo.create({ name: "Gone", level: "context", type: "S" });
    assertEquals(await repo.hardDelete(c.id), true);
    assertStrictEquals(await repo.findById(c.id), null);
  } finally {
    await cleanup(dir);
  }
});

Deno.test("C4Repository - delete returns false for non-existent ID", async () => {
  const { repo, dir } = await setup();
  try {
    assertEquals(await repo.delete("c4_ghost"), false);
  } finally {
    await cleanup(dir);
  }
});

// === findAll: sort ===

Deno.test("C4Repository - findAllFromDisk sorts alphabetically by name", async () => {
  const { repo, dir } = await setup();
  try {
    await repo.create({ name: "Charlie", level: "context", type: "X" });
    await repo.create({ name: "Alpha", level: "context", type: "X" });
    await repo.create({ name: "Bravo", level: "context", type: "X" });
    const all = await repo.findAllFromDisk();
    assertEquals(all.map((c) => c.name), ["Alpha", "Bravo", "Charlie"]);
  } finally {
    await cleanup(dir);
  }
});

// === service.list filters ===

Deno.test("C4Service - list with level filter returns only matching level", async () => {
  const { repo, service, dir } = await setup();
  try {
    await repo.create({ name: "Sys", level: "context", type: "X" });
    await repo.create({ name: "API", level: "container", type: "X" });
    await repo.create({ name: "Auth", level: "component", type: "X" });
    const containers = await service.list({ level: "container" });
    assertEquals(containers.length, 1);
    assertEquals(containers[0].name, "API");
  } finally {
    await cleanup(dir);
  }
});

Deno.test("C4Service - list with diagram filter (default applies to entries with no diagram)", async () => {
  const { repo, service, dir } = await setup();
  try {
    await repo.create({ name: "A", level: "context", type: "X" }); // diagram default
    await repo.create({
      name: "B",
      level: "context",
      type: "X",
      diagram: "secondary",
    });
    const def = await service.list({ diagram: "default" });
    assertEquals(def.length, 1);
    assertEquals(def[0].name, "A");
    const sec = await service.list({ diagram: "secondary" });
    assertEquals(sec.length, 1);
    assertEquals(sec[0].name, "B");
  } finally {
    await cleanup(dir);
  }
});

Deno.test("C4Service - list with parent filter returns only direct children", async () => {
  const { repo, service, dir } = await setup();
  try {
    const root = await repo.create({
      name: "Root",
      level: "context",
      type: "X",
    });
    await repo.create({
      name: "Child1",
      level: "container",
      type: "X",
      parent: root.id,
    });
    await repo.create({
      name: "Child2",
      level: "container",
      type: "X",
      parent: root.id,
    });
    await repo.create({ name: "Orphan", level: "container", type: "X" });
    const children = await service.list({ parent: root.id });
    assertEquals(children.length, 2);
    assertEquals(
      children.map((c) => c.name).sort(),
      ["Child1", "Child2"],
    );
  } finally {
    await cleanup(dir);
  }
});

Deno.test("C4Service - list with q matches name/type/technology/description (case-insensitive)", async () => {
  const { repo, service, dir } = await setup();
  try {
    await repo.create({
      name: "Match-NAME",
      level: "context",
      type: "X",
    });
    await repo.create({
      name: "Other",
      level: "context",
      type: "Match-TYPE",
    });
    await repo.create({
      name: "Other2",
      level: "context",
      type: "X",
      technology: "Match-TECH",
    });
    await repo.create({
      name: "Other3",
      level: "context",
      type: "X",
      description: "Match-DESC",
    });

    for (
      const [kw, expected] of [
        ["match-name", "Match-NAME"],
        ["match-type", "Other"],
        ["match-tech", "Other2"],
        ["match-desc", "Other3"],
      ] as const
    ) {
      const matches = await service.list({ q: kw });
      assertEquals(matches.length, 1, `q="${kw}"`);
      assertEquals(matches[0].name, expected);
    }
  } finally {
    await cleanup(dir);
  }
});

Deno.test("C4Service - list combines level + parent (AND)", async () => {
  const { repo, service, dir } = await setup();
  try {
    const root = await repo.create({
      name: "Root",
      level: "context",
      type: "X",
    });
    await repo.create({
      name: "Match",
      level: "container",
      type: "X",
      parent: root.id,
    });
    await repo.create({
      name: "Wrong level",
      level: "component",
      type: "X",
      parent: root.id,
    });
    await repo.create({ name: "Wrong parent", level: "container", type: "X" });
    const matches = await service.list({
      level: "container",
      parent: root.id,
    });
    assertEquals(matches.length, 1);
    assertEquals(matches[0].name, "Match");
  } finally {
    await cleanup(dir);
  }
});

Deno.test("C4Service - list with no options returns all", async () => {
  const { repo, service, dir } = await setup();
  try {
    await repo.create({ name: "A", level: "context", type: "X" });
    await repo.create({ name: "B", level: "container", type: "X" });
    const all = await service.list();
    assertEquals(all.length, 2);
  } finally {
    await cleanup(dir);
  }
});

// === service helpers ===

Deno.test("C4Service.findByLevel returns only matching level (no parent filter)", async () => {
  const { repo, service, dir } = await setup();
  try {
    await repo.create({ name: "S", level: "context", type: "X" });
    await repo.create({ name: "A", level: "container", type: "X" });
    await repo.create({ name: "B", level: "container", type: "X" });
    const containers = await service.findByLevel("container");
    assertEquals(containers.length, 2);
  } finally {
    await cleanup(dir);
  }
});

Deno.test("C4Service.findByLevel with parentId returns only direct children of that level", async () => {
  const { repo, service, dir } = await setup();
  try {
    const root = await repo.create({
      name: "Root",
      level: "context",
      type: "X",
    });
    await repo.create({
      name: "C1",
      level: "container",
      type: "X",
      parent: root.id,
    });
    await repo.create({
      name: "C2",
      level: "container",
      type: "X",
      parent: root.id,
    });
    await repo.create({ name: "Orphan", level: "container", type: "X" });
    const children = await service.findByLevel("container", root.id);
    assertEquals(children.length, 2);
    assertEquals(children.every((c) => c.parent === root.id), true);
  } finally {
    await cleanup(dir);
  }
});

Deno.test("C4Service.patchPosition updates x/y only", async () => {
  const { repo, service, dir } = await setup();
  try {
    const c = await repo.create({
      name: "P",
      level: "context",
      type: "X",
      position: { x: 0, y: 0 },
      description: "Untouched",
    });
    const result = await service.patchPosition(c.id, 300, 400);
    assertExists(result);
    assertEquals(result!.position, { x: 300, y: 400 });
    assertEquals(result!.description, "Untouched");
  } finally {
    await cleanup(dir);
  }
});

Deno.test("C4Service.patchPosition returns null for missing id", async () => {
  const { service, dir } = await setup();
  try {
    assertStrictEquals(await service.patchPosition("c4_missing", 1, 2), null);
  } finally {
    await cleanup(dir);
  }
});

Deno.test("C4Service.addConnection appends with generated id and returns { component, connectionId }", async () => {
  const { repo, service, dir } = await setup();
  try {
    const src = await repo.create({
      name: "Src",
      level: "container",
      type: "X",
    });
    const tgt = await repo.create({
      name: "Tgt",
      level: "container",
      type: "X",
    });
    const result = await service.addConnection(
      src.id,
      tgt.id,
      "Calls",
      "HTTPS",
    );
    assertExists(result);
    assertExists(result!.connectionId);
    assertEquals(result!.component.connections?.length, 1);
    assertEquals(result!.component.connections![0].target, tgt.id);
    assertEquals(result!.component.connections![0].label, "Calls");
    assertEquals(result!.component.connections![0].technology, "HTTPS");
    assertEquals(result!.component.connections![0].id, result!.connectionId);
  } finally {
    await cleanup(dir);
  }
});

Deno.test("C4Service.addConnection returns null for missing source", async () => {
  const { service, dir } = await setup();
  try {
    const result = await service.addConnection("c4_missing", "c4_other", "x");
    assertStrictEquals(result, null);
  } finally {
    await cleanup(dir);
  }
});

Deno.test("C4Service.addConnection appends to existing connections (does not replace)", async () => {
  const { repo, service, dir } = await setup();
  try {
    const src = await repo.create({
      name: "Src",
      level: "container",
      type: "X",
    });
    await service.addConnection(src.id, "c4_a", "first");
    await service.addConnection(src.id, "c4_b", "second");
    const fetched = await repo.findById(src.id);
    assertEquals(fetched!.connections?.length, 2);
    assertEquals(fetched!.connections![0].label, "first");
    assertEquals(fetched!.connections![1].label, "second");
  } finally {
    await cleanup(dir);
  }
});

Deno.test("C4Service.removeConnection finds + removes connection across all components", async () => {
  const { repo, service, dir } = await setup();
  try {
    const src = await repo.create({
      name: "Src",
      level: "container",
      type: "X",
    });
    const addResult = await service.addConnection(src.id, "c4_a", "first");
    await service.addConnection(src.id, "c4_b", "second");
    assertExists(addResult);
    const removed = await service.removeConnection(addResult!.connectionId);
    assertEquals(removed, true);
    const fetched = await repo.findById(src.id);
    assertEquals(fetched!.connections?.length, 1);
    assertEquals(fetched!.connections![0].label, "second");
  } finally {
    await cleanup(dir);
  }
});

Deno.test("C4Service.removeConnection returns false for unknown connection id", async () => {
  const { service, dir } = await setup();
  try {
    assertEquals(await service.removeConnection("conn_ghost"), false);
  } finally {
    await cleanup(dir);
  }
});

Deno.test("C4Service.getConnectionsFor returns the component's connections", async () => {
  const { repo, service, dir } = await setup();
  try {
    const src = await repo.create({
      name: "Src",
      level: "container",
      type: "X",
    });
    await service.addConnection(src.id, "c4_a", "calls");
    await service.addConnection(src.id, "c4_b", "writes");
    const conns = await service.getConnectionsFor(src.id);
    assertEquals(conns.length, 2);
    assertEquals(conns.map((c) => c.label).sort(), ["calls", "writes"]);
  } finally {
    await cleanup(dir);
  }
});

Deno.test("C4Service.getConnectionsFor returns [] for unknown component id", async () => {
  const { service, dir } = await setup();
  try {
    const conns = await service.getConnectionsFor("c4_missing");
    assertEquals(conns, []);
  } finally {
    await cleanup(dir);
  }
});

// === manual fixture parse ===

Deno.test("C4Repository - parses a manually-written file with connections + hierarchy", async () => {
  const { repo, dir } = await setup();
  try {
    await Deno.mkdir(join(dir, "c4"), { recursive: true });
    await Deno.writeTextFile(
      join(dir, "c4", "c4_manual.md"),
      [
        "---",
        "id: c4_manual",
        "level: container",
        "type: API Application",
        "position:",
        "  x: 200",
        "  y: 300",
        "technology: Deno + Hono",
        "diagram: main",
        "parent: c4_system",
        "children:",
        "  - c4_auth",
        "  - c4_billing",
        "connections:",
        "  - id: conn_db",
        "    target: c4_db",
        "    label: Reads from",
        "    technology: SQL",
        "  - id: conn_cache",
        "    target: c4_cache",
        "    label: Writes to",
        "created_at: 2026-01-01T00:00:00.000Z",
        "updated_at: 2026-01-02T00:00:00.000Z",
        "---",
        "# API Server",
        "",
        "Multi-line description",
        "of the API server.",
        "",
      ].join("\n"),
    );
    const fetched = await repo.findById("c4_manual");
    assertExists(fetched);
    assertEquals(fetched!.id, "c4_manual");
    assertEquals(fetched!.name, "API Server");
    assertEquals(fetched!.level, "container");
    assertEquals(fetched!.type, "API Application");
    assertEquals(fetched!.position, { x: 200, y: 300 });
    assertEquals(fetched!.technology, "Deno + Hono");
    assertEquals(fetched!.diagram, "main");
    assertEquals(fetched!.parent, "c4_system");
    assertEquals(fetched!.children, ["c4_auth", "c4_billing"]);
    assertEquals(
      fetched!.description,
      "Multi-line description\nof the API server.",
    );
    assertEquals(fetched!.connections?.length, 2);
    assertEquals(fetched!.connections![0].id, "conn_db");
    assertEquals(fetched!.connections![0].target, "c4_db");
    assertEquals(fetched!.connections![0].technology, "SQL");
    assertEquals(fetched!.connections![1].technology, undefined);
  } finally {
    await cleanup(dir);
  }
});
