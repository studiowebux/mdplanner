/**
 * Unit tests for v2 MindmapRepository (CRUD on disk) + MindmapService
 * (filter behaviour) + the exported `parseBulletTree` / `serializeBulletTree`
 * helpers.
 *
 * Tree is stored as 2-space-indented bullet markdown in the body. Bug class
 * to guard against: parse/serialize asymmetry corrupts deep hierarchies on
 * update. Tests include 3+ levels of nesting round-tripped through both
 * create and update.
 *
 * `project` is required at the schema layer (decision
 * `note_1778628262842_478as3`) — every fixture passes one.
 */

import { assertEquals, assertExists, assertStrictEquals } from "@std/assert";
import { join } from "@std/path";
import {
  MindmapRepository,
  parseBulletTree,
  serializeBulletTree,
} from "../../src/repositories/mindmap.repository.ts";
import { MindmapService } from "../../src/services/mindmap.service.ts";
import type { MindmapNode } from "../../src/types/mindmap.types.ts";

async function setup(): Promise<
  { repo: MindmapRepository; service: MindmapService; dir: string }
> {
  const dir = await Deno.makeTempDir({ prefix: "mdplanner-mindmap-test-" });
  const repo = new MindmapRepository(dir);
  const service = new MindmapService(repo);
  return { repo, service, dir };
}

async function cleanup(dir: string): Promise<void> {
  try {
    await Deno.remove(dir, { recursive: true });
  } catch {
    // ignore
  }
}

function leaf(text: string): MindmapNode {
  return { text, children: [] };
}

// === parseBulletTree (pure) ===

Deno.test("parseBulletTree - parses flat list of root nodes", () => {
  const tree = parseBulletTree("- a\n- b\n- c\n");
  assertEquals(tree, [leaf("a"), leaf("b"), leaf("c")]);
});

Deno.test("parseBulletTree - parses 3-level nested tree", () => {
  const tree = parseBulletTree(
    "- root\n  - child\n    - grandchild\n      - great-grandchild\n",
  );
  assertEquals(tree, [
    {
      text: "root",
      children: [
        {
          text: "child",
          children: [
            {
              text: "grandchild",
              children: [leaf("great-grandchild")],
            },
          ],
        },
      ],
    },
  ]);
});

Deno.test("parseBulletTree - empty input returns []", () => {
  assertEquals(parseBulletTree(""), []);
  assertEquals(parseBulletTree("\n\n"), []);
});

Deno.test("parseBulletTree - rejects tabs", () => {
  assertStrictEquals(parseBulletTree("- a\n\t- child\n"), null);
});

Deno.test("parseBulletTree - rejects odd indent count", () => {
  // 3 spaces is not a multiple of 2 — invalid.
  assertStrictEquals(parseBulletTree("- a\n   - child\n"), null);
});

Deno.test("parseBulletTree - rejects depth jump > parent+1", () => {
  // 4-space indent without a 2-space parent first.
  assertStrictEquals(parseBulletTree("- root\n    - skipped depth\n"), null);
});

Deno.test("parseBulletTree - rejects non-bullet line", () => {
  assertStrictEquals(parseBulletTree("- a\nplain text\n"), null);
});

// === serializeBulletTree + inverse property ===

Deno.test("serializeBulletTree - inverse of parseBulletTree on deep tree", () => {
  const original: MindmapNode[] = [
    {
      text: "Backend",
      children: [
        {
          text: "API",
          children: [
            leaf("REST"),
            { text: "GraphQL", children: [leaf("Subscriptions")] },
          ],
        },
        leaf("Database"),
      ],
    },
    { text: "Frontend", children: [leaf("Components"), leaf("State")] },
  ];
  const serialized = serializeBulletTree(original);
  const reparsed = parseBulletTree(serialized);
  assertEquals(reparsed, original);
});

Deno.test("serializeBulletTree - empty tree → empty string", () => {
  assertEquals(serializeBulletTree([]), "");
});

// === create + findById ===

Deno.test("MindmapRepository - create stores file and returns entity", async () => {
  const { repo, dir } = await setup();
  try {
    const mm = await repo.create({
      title: "Product Feature Map",
      project: "Acme Platform",
      nodes: [
        { text: "Core", children: [leaf("Auth"), leaf("Billing")] },
        leaf("Integrations"),
      ],
      notes: "Initial brainstorm.",
    });
    assertExists(mm.id);
    assertEquals(mm.title, "Product Feature Map");
    assertEquals(mm.project, "Acme Platform");
    assertEquals(mm.nodes.length, 2);
    assertEquals(mm.nodes[0].text, "Core");
    assertEquals(mm.nodes[0].children.length, 2);
    assertEquals(mm.notes, "Initial brainstorm.");
    assertExists(mm.createdAt);
  } finally {
    await cleanup(dir);
  }
});

Deno.test("MindmapRepository - create defaults nodes to []", async () => {
  const { repo, dir } = await setup();
  try {
    const mm = await repo.create({
      title: "Empty Map",
      project: "Test",
    });
    assertEquals(mm.nodes, []);
  } finally {
    await cleanup(dir);
  }
});

Deno.test("MindmapRepository - findById returns null for missing ID", async () => {
  const { repo, dir } = await setup();
  try {
    const found = await repo.findById("mindmap_nonexistent");
    assertStrictEquals(found, null);
  } finally {
    await cleanup(dir);
  }
});

// === parse-guard regression — deep tree round-trip ===

Deno.test("MindmapRepository - findById succeeds after update with deep tree (parse-guard regression)", async () => {
  const { repo, dir } = await setup();
  try {
    const created = await repo.create({
      title: "Deep Map",
      project: "Acme",
      nodes: [
        {
          text: "Level 1",
          children: [
            {
              text: "Level 2",
              children: [
                {
                  text: "Level 3",
                  children: [leaf("Level 4")],
                },
              ],
            },
          ],
        },
      ],
    });
    // MINDMAP_BODY_KEYS = ["id","title","nodes"] — id absent from frontmatter
    // post-update; guard `!fm.id && !fm.title && !headingMatch` falls back to
    // the `# Title` heading in the body.
    const updated = await repo.update(created.id, {
      title: "Deep Map Renamed",
    });
    assertExists(updated);
    const fetched = await repo.findById(created.id);
    assertExists(fetched);
    assertEquals(fetched!.id, created.id);
    assertEquals(fetched!.title, "Deep Map Renamed");
    // Whole 4-level nesting preserved.
    assertEquals(fetched!.nodes.length, 1);
    assertEquals(
      fetched!.nodes[0].children[0].children[0].children[0].text,
      "Level 4",
    );
  } finally {
    await cleanup(dir);
  }
});

// === update ===

Deno.test("MindmapRepository - update can replace the entire tree", async () => {
  const { repo, dir } = await setup();
  try {
    const created = await repo.create({
      title: "Replaceable",
      project: "Test",
      nodes: [leaf("Old")],
    });
    const updated = await repo.update(created.id, {
      nodes: [leaf("New"), { text: "Branch", children: [leaf("Leaf")] }],
    });
    assertExists(updated);
    assertEquals(updated!.nodes.length, 2);
    const fetched = await repo.findById(created.id);
    assertEquals(fetched!.nodes[0].text, "New");
    assertEquals(fetched!.nodes[1].children[0].text, "Leaf");
  } finally {
    await cleanup(dir);
  }
});

Deno.test("MindmapRepository - update preserves sibling fields", async () => {
  const { repo, dir } = await setup();
  try {
    const created = await repo.create({
      title: "Sibling Map",
      project: "ProjectA",
      nodes: [leaf("a")],
      notes: "Keep me intact.",
    });
    await repo.update(created.id, { nodes: [leaf("b")] });
    const fetched = await repo.findById(created.id);
    assertExists(fetched);
    assertEquals(fetched!.title, "Sibling Map");
    assertEquals(fetched!.project, "ProjectA");
    assertEquals(fetched!.notes, "Keep me intact.");
    assertEquals(fetched!.nodes[0].text, "b");
  } finally {
    await cleanup(dir);
  }
});

Deno.test("MindmapRepository - update returns null for non-existent ID", async () => {
  const { repo, dir } = await setup();
  try {
    const result = await repo.update("mindmap_missing", { title: "X" });
    assertStrictEquals(result, null);
  } finally {
    await cleanup(dir);
  }
});

// === delete (soft-archive) + hardDelete ===

Deno.test("MindmapRepository - delete soft-archives entity", async () => {
  const { repo, dir } = await setup();
  try {
    const mm = await repo.create({
      title: "To Archive",
      project: "Test",
    });
    const deleted = await repo.delete(mm.id);
    assertEquals(deleted, true);
    const found = await repo.findById(mm.id);
    assertExists(found);
    const all = await repo.findAllFromDisk();
    assertStrictEquals(all.find((m) => m.id === mm.id), undefined);
  } finally {
    await cleanup(dir);
  }
});

Deno.test("MindmapRepository - hardDelete removes the file", async () => {
  const { repo, dir } = await setup();
  try {
    const mm = await repo.create({
      title: "Truly Gone",
      project: "Test",
    });
    const ok = await repo.hardDelete(mm.id);
    assertEquals(ok, true);
    const found = await repo.findById(mm.id);
    assertStrictEquals(found, null);
  } finally {
    await cleanup(dir);
  }
});

Deno.test("MindmapRepository - delete returns false for non-existent ID", async () => {
  const { repo, dir } = await setup();
  try {
    const result = await repo.delete("mindmap_ghost");
    assertEquals(result, false);
  } finally {
    await cleanup(dir);
  }
});

// === findAll: sort + archive filtering ===

Deno.test("MindmapRepository - findAllFromDisk sorts alphabetically by title", async () => {
  const { repo, dir } = await setup();
  try {
    await repo.create({ title: "Charlie Map", project: "Test" });
    await repo.create({ title: "Alpha Map", project: "Test" });
    await repo.create({ title: "Bravo Map", project: "Test" });
    const all = await repo.findAllFromDisk();
    assertEquals(all.length, 3);
    assertEquals(all.map((m) => m.title), [
      "Alpha Map",
      "Bravo Map",
      "Charlie Map",
    ]);
  } finally {
    await cleanup(dir);
  }
});

// === service.list filters ===

Deno.test("MindmapService - list with project filter is case-insensitive equals", async () => {
  const { repo, service, dir } = await setup();
  try {
    await repo.create({ title: "A", project: "Acme Platform" });
    await repo.create({ title: "B", project: "Acme Platform" });
    await repo.create({ title: "C", project: "Other Project" });
    const matches = await service.list({ project: "ACME PLATFORM" });
    assertEquals(matches.length, 2);
    assertEquals(matches.every((m) => m.project === "Acme Platform"), true);
  } finally {
    await cleanup(dir);
  }
});

Deno.test("MindmapService - list with q filter matches title (case-insensitive)", async () => {
  const { repo, service, dir } = await setup();
  try {
    await repo.create({ title: "Authentication Flow", project: "T" });
    await repo.create({ title: "Billing System", project: "T" });
    const matches = await service.list({ q: "auth" });
    assertEquals(matches.length, 1);
    assertEquals(matches[0].title, "Authentication Flow");
  } finally {
    await cleanup(dir);
  }
});

Deno.test("MindmapService - list with q filter matches deeply nested node text", async () => {
  const { repo, service, dir } = await setup();
  try {
    await repo.create({
      title: "Map 1",
      project: "T",
      nodes: [
        {
          text: "Root",
          children: [
            {
              text: "Middle",
              children: [leaf("DEEP_MATCH_TARGET")],
            },
          ],
        },
      ],
    });
    await repo.create({
      title: "Map 2",
      project: "T",
      nodes: [leaf("nothing relevant")],
    });
    const matches = await service.list({ q: "deep_match_target" });
    assertEquals(matches.length, 1);
    assertEquals(matches[0].title, "Map 1");
  } finally {
    await cleanup(dir);
  }
});

Deno.test("MindmapService - list with q filter matches notes (case-insensitive)", async () => {
  const { repo, service, dir } = await setup();
  try {
    await repo.create({
      title: "A",
      project: "T",
      notes: "Covers ONBOARDING scope.",
    });
    await repo.create({
      title: "B",
      project: "T",
      notes: "Retention work.",
    });
    const matches = await service.list({ q: "onboarding" });
    assertEquals(matches.length, 1);
    assertEquals(matches[0].title, "A");
  } finally {
    await cleanup(dir);
  }
});

Deno.test("MindmapService - list combines project + q (AND)", async () => {
  const { repo, service, dir } = await setup();
  try {
    await repo.create({ title: "Match", project: "Acme" });
    await repo.create({ title: "Wrong project", project: "Other" });
    await repo.create({ title: "Wrong title", project: "Acme" });
    const matches = await service.list({ project: "acme", q: "match" });
    assertEquals(matches.length, 1);
    assertEquals(matches[0].title, "Match");
  } finally {
    await cleanup(dir);
  }
});

Deno.test("MindmapService - list with no options returns all", async () => {
  const { repo, service, dir } = await setup();
  try {
    await repo.create({ title: "A", project: "T" });
    await repo.create({ title: "B", project: "T" });
    const all = await service.list();
    assertEquals(all.length, 2);
  } finally {
    await cleanup(dir);
  }
});

// === manual fixture parse ===

Deno.test("MindmapRepository - parses a manually-written file", async () => {
  const { repo, dir } = await setup();
  try {
    await Deno.mkdir(join(dir, "mindmaps"), { recursive: true });
    await Deno.writeTextFile(
      join(dir, "mindmaps", "mindmap_manual.md"),
      [
        "---",
        "project: Manual Project",
        "notes: Hand-written fixture.",
        "created_at: 2026-01-01T00:00:00.000Z",
        "updated_at: 2026-01-02T00:00:00.000Z",
        "---",
        "# Manual Title",
        "",
        "- Root A",
        "  - Child A1",
        "  - Child A2",
        "    - Grandchild A2.1",
        "- Root B",
        "",
      ].join("\n"),
    );
    const fetched = await repo.findById("mindmap_manual");
    assertExists(fetched);
    assertEquals(fetched!.id, "mindmap_manual");
    assertEquals(fetched!.title, "Manual Title");
    assertEquals(fetched!.project, "Manual Project");
    assertEquals(fetched!.notes, "Hand-written fixture.");
    assertEquals(fetched!.nodes.length, 2);
    assertEquals(
      fetched!.nodes[0].children[1].children[0].text,
      "Grandchild A2.1",
    );
    assertEquals(fetched!.nodes[1].text, "Root B");
    assertEquals(fetched!.createdAt, "2026-01-01T00:00:00.000Z");
  } finally {
    await cleanup(dir);
  }
});

Deno.test("MindmapRepository - schema rejects file with no project (returns null)", async () => {
  const { repo, dir } = await setup();
  try {
    await Deno.mkdir(join(dir, "mindmaps"), { recursive: true });
    await Deno.writeTextFile(
      join(dir, "mindmaps", "mindmap_no_project.md"),
      [
        "---",
        "id: mindmap_no_project",
        "title: Orphan",
        "---",
        "# Orphan",
        "",
        "- only node",
        "",
      ].join("\n"),
    );
    // MindmapSchema requires `project: z.string().min(1)`. Missing → parse
    // logs a warning and returns null.
    const fetched = await repo.findById("mindmap_no_project");
    assertStrictEquals(fetched, null);
  } finally {
    await cleanup(dir);
  }
});

// === edge cases ===

Deno.test("MindmapRepository - findByName returns matching mindmap (case-insensitive)", async () => {
  const { repo, dir } = await setup();
  try {
    await repo.create({ title: "Premium Roadmap", project: "T" });
    await repo.create({ title: "Standard Roadmap", project: "T" });
    const found = await repo.findByName("premium roadmap");
    assertExists(found);
    assertEquals(found!.title, "Premium Roadmap");
  } finally {
    await cleanup(dir);
  }
});

Deno.test("MindmapRepository - single-node tree round-trips", async () => {
  const { repo, dir } = await setup();
  try {
    const mm = await repo.create({
      title: "Single Node",
      project: "T",
      nodes: [leaf("only")],
    });
    const fetched = await repo.findById(mm.id);
    assertEquals(fetched!.nodes.length, 1);
    assertEquals(fetched!.nodes[0], leaf("only"));
  } finally {
    await cleanup(dir);
  }
});
