/**
 * Unit tests for v2 LeanCanvasRepository (CRUD on disk) + LeanCanvasService
 * (filter behaviour + enrichment).
 *
 * Lean Canvas has 12 body sections (problem, solution, uniqueValueProp,
 * unfairAdvantage, customerSegments, existingAlternatives, keyMetrics,
 * highLevelConcept, channels, earlyAdopters, costStructure, revenueStreams)
 * stored as `## Label` headings + bullet lists in the markdown body — not
 * frontmatter. Keyword matching for parse is substring-based per
 * `LEAN_CANVAS_SECTIONS`.
 *
 * Bug class guarded against: body-section regex parse-guard (note
 * `note_1779079642800_rv539c`) — sections must survive an update cycle even
 * when LEAN_CANVAS_BODY_KEYS excludes them from frontmatter. The repo
 * `parse()` guard is `!fm.id && !fm.title`; `id` is in BODY_KEYS so the
 * post-update file only has `fm.title` available.
 */

import { assertEquals, assertExists, assertStrictEquals } from "@std/assert";
import { join } from "@std/path";
import { LeanCanvasRepository } from "../../src/repositories/lean-canvas.repository.ts";
import { LeanCanvasService } from "../../src/services/lean-canvas.service.ts";

async function setup(): Promise<
  { repo: LeanCanvasRepository; service: LeanCanvasService; dir: string }
> {
  const dir = await Deno.makeTempDir({ prefix: "mdplanner-lc-test-" });
  const repo = new LeanCanvasRepository(dir);
  const service = new LeanCanvasService(repo);
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

Deno.test("LeanCanvasRepository - create stores file and returns entity with empty section defaults", async () => {
  const { repo, dir } = await setup();
  try {
    const lc = await repo.create({
      title: "TaskFlow Lean Canvas",
      project: "TaskFlow",
      date: "2026-01-05",
    });
    assertExists(lc.id);
    assertEquals(lc.title, "TaskFlow Lean Canvas");
    assertEquals(lc.project, "TaskFlow");
    assertEquals(lc.date, "2026-01-05");
    // All 12 sections default to [].
    assertEquals(lc.problem, []);
    assertEquals(lc.solution, []);
    assertEquals(lc.uniqueValueProp, []);
    assertEquals(lc.unfairAdvantage, []);
    assertEquals(lc.customerSegments, []);
    assertEquals(lc.existingAlternatives, []);
    assertEquals(lc.keyMetrics, []);
    assertEquals(lc.highLevelConcept, []);
    assertEquals(lc.channels, []);
    assertEquals(lc.earlyAdopters, []);
    assertEquals(lc.costStructure, []);
    assertEquals(lc.revenueStreams, []);
    // Repo returns raw (un-enriched) — computed fields zeroed.
    assertEquals(lc.completedSections, 0);
    assertEquals(lc.sectionCount, 0);
    assertEquals(lc.completionPct, 0);
  } finally {
    await cleanup(dir);
  }
});

Deno.test("LeanCanvasRepository - create stores all 12 sections", async () => {
  const { repo, dir } = await setup();
  try {
    const lc = await repo.create({
      title: "Full Canvas",
      problem: ["Manual workflows", "Tool sprawl"],
      solution: ["All-in-one", "Open source"],
      uniqueValueProp: ["One platform for everything"],
      unfairAdvantage: ["Built-in MCP integration"],
      customerSegments: ["SMBs", "Indie hackers"],
      existingAlternatives: ["Spreadsheets", "Notion"],
      keyMetrics: ["WAU", "Conversion rate"],
      highLevelConcept: ["The Linear for product strategy"],
      channels: ["Twitter", "Product Hunt"],
      earlyAdopters: ["Solo founders"],
      costStructure: ["Hosting", "Domain"],
      revenueStreams: ["Pro plan", "Enterprise license"],
    });
    assertEquals(lc.problem, ["Manual workflows", "Tool sprawl"]);
    assertEquals(lc.solution, ["All-in-one", "Open source"]);
    assertEquals(lc.uniqueValueProp, ["One platform for everything"]);
    assertEquals(lc.unfairAdvantage, ["Built-in MCP integration"]);
    assertEquals(lc.customerSegments, ["SMBs", "Indie hackers"]);
    assertEquals(lc.existingAlternatives, ["Spreadsheets", "Notion"]);
    assertEquals(lc.keyMetrics, ["WAU", "Conversion rate"]);
    assertEquals(lc.highLevelConcept, ["The Linear for product strategy"]);
    assertEquals(lc.channels, ["Twitter", "Product Hunt"]);
    assertEquals(lc.earlyAdopters, ["Solo founders"]);
    assertEquals(lc.costStructure, ["Hosting", "Domain"]);
    assertEquals(lc.revenueStreams, ["Pro plan", "Enterprise license"]);
  } finally {
    await cleanup(dir);
  }
});

Deno.test("LeanCanvasRepository - findById round-trips all 12 sections", async () => {
  const { repo, dir } = await setup();
  try {
    const created = await repo.create({
      title: "Round-Trip",
      problem: ["p1"],
      solution: ["s1"],
      uniqueValueProp: ["uvp1"],
      unfairAdvantage: ["ua1"],
      customerSegments: ["cs1"],
      existingAlternatives: ["ea1"],
      keyMetrics: ["km1"],
      highLevelConcept: ["hlc1"],
      channels: ["ch1"],
      earlyAdopters: ["adopter1"],
      costStructure: ["cost1"],
      revenueStreams: ["rev1"],
    });
    const found = await repo.findById(created.id);
    assertExists(found);
    assertEquals(found!.problem, ["p1"]);
    assertEquals(found!.solution, ["s1"]);
    assertEquals(found!.uniqueValueProp, ["uvp1"]);
    assertEquals(found!.unfairAdvantage, ["ua1"]);
    assertEquals(found!.customerSegments, ["cs1"]);
    assertEquals(found!.existingAlternatives, ["ea1"]);
    assertEquals(found!.keyMetrics, ["km1"]);
    assertEquals(found!.highLevelConcept, ["hlc1"]);
    assertEquals(found!.channels, ["ch1"]);
    assertEquals(found!.earlyAdopters, ["adopter1"]);
    assertEquals(found!.costStructure, ["cost1"]);
    assertEquals(found!.revenueStreams, ["rev1"]);
  } finally {
    await cleanup(dir);
  }
});

Deno.test("LeanCanvasRepository - findById returns null for missing ID", async () => {
  const { repo, dir } = await setup();
  try {
    const found = await repo.findById("lean_canvas_nonexistent");
    assertStrictEquals(found, null);
  } finally {
    await cleanup(dir);
  }
});

// === parse-guard regression — sections survive update ===

Deno.test("LeanCanvasRepository - findById succeeds after update with sections populated (parse-guard regression)", async () => {
  const { repo, dir } = await setup();
  try {
    const created = await repo.create({
      title: "Parse Guard LC",
      problem: ["p1", "p2"],
      solution: ["s1"],
      keyMetrics: ["km1", "km2", "km3"],
    });
    // LEAN_CANVAS_BODY_KEYS includes "id" so id is NOT in fm post-update;
    // guard `!fm.id && !fm.title` must hold via fm.title.
    const updated = await repo.update(created.id, {
      problem: ["p1", "p2", "p3-new"],
    });
    assertExists(updated);
    const fetched = await repo.findById(created.id);
    assertExists(fetched);
    assertEquals(fetched!.id, created.id);
    assertEquals(fetched!.title, "Parse Guard LC");
    // Updated section.
    assertEquals(fetched!.problem, ["p1", "p2", "p3-new"]);
    // Sibling sections intact.
    assertEquals(fetched!.solution, ["s1"]);
    assertEquals(fetched!.keyMetrics, ["km1", "km2", "km3"]);
  } finally {
    await cleanup(dir);
  }
});

// === update ===

Deno.test("LeanCanvasRepository - update can replace a section", async () => {
  const { repo, dir } = await setup();
  try {
    const created = await repo.create({
      title: "Replaceable",
      problem: ["old"],
    });
    const updated = await repo.update(created.id, {
      problem: ["new1", "new2"],
    });
    assertExists(updated);
    const fetched = await repo.findById(created.id);
    assertEquals(fetched!.problem, ["new1", "new2"]);
  } finally {
    await cleanup(dir);
  }
});

Deno.test("LeanCanvasRepository - update preserves sibling fields", async () => {
  const { repo, dir } = await setup();
  try {
    const created = await repo.create({
      title: "Sibling Canvas",
      project: "Proj",
      date: "2026-03-01",
      problem: ["p1"],
      solution: ["s1"],
      uniqueValueProp: ["uvp1"],
    });
    await repo.update(created.id, { problem: ["p2"] });
    const fetched = await repo.findById(created.id);
    assertExists(fetched);
    assertEquals(fetched!.title, "Sibling Canvas");
    assertEquals(fetched!.project, "Proj");
    assertEquals(fetched!.date, "2026-03-01");
    assertEquals(fetched!.solution, ["s1"]);
    assertEquals(fetched!.uniqueValueProp, ["uvp1"]);
  } finally {
    await cleanup(dir);
  }
});

Deno.test("LeanCanvasRepository - update returns null for non-existent ID", async () => {
  const { repo, dir } = await setup();
  try {
    const result = await repo.update("lean_canvas_missing", { title: "X" });
    assertStrictEquals(result, null);
  } finally {
    await cleanup(dir);
  }
});

// === delete (soft-archive) + hardDelete ===

Deno.test("LeanCanvasRepository - delete soft-archives entity", async () => {
  const { repo, dir } = await setup();
  try {
    const lc = await repo.create({ title: "To Archive" });
    const deleted = await repo.delete(lc.id);
    assertEquals(deleted, true);
    const found = await repo.findById(lc.id);
    assertExists(found);
    const all = await repo.findAllFromDisk();
    assertStrictEquals(all.find((c) => c.id === lc.id), undefined);
  } finally {
    await cleanup(dir);
  }
});

Deno.test("LeanCanvasRepository - hardDelete removes the file", async () => {
  const { repo, dir } = await setup();
  try {
    const lc = await repo.create({ title: "Truly Gone" });
    const ok = await repo.hardDelete(lc.id);
    assertEquals(ok, true);
    const found = await repo.findById(lc.id);
    assertStrictEquals(found, null);
  } finally {
    await cleanup(dir);
  }
});

Deno.test("LeanCanvasRepository - delete returns false for non-existent ID", async () => {
  const { repo, dir } = await setup();
  try {
    const result = await repo.delete("lean_canvas_ghost");
    assertEquals(result, false);
  } finally {
    await cleanup(dir);
  }
});

// === findAll: sort + archive filtering ===

Deno.test("LeanCanvasRepository - findAllFromDisk sorts alphabetically by title", async () => {
  const { repo, dir } = await setup();
  try {
    await repo.create({ title: "Charlie Canvas" });
    await repo.create({ title: "Alpha Canvas" });
    await repo.create({ title: "Bravo Canvas" });
    const all = await repo.findAllFromDisk();
    assertEquals(all.length, 3);
    assertEquals(all.map((c) => c.title), [
      "Alpha Canvas",
      "Bravo Canvas",
      "Charlie Canvas",
    ]);
  } finally {
    await cleanup(dir);
  }
});

// === service enrichment (overrides create/getById/update/list) ===

Deno.test("LeanCanvasService.create returns enriched entity (completedSections/sectionCount/completionPct)", async () => {
  const { service, dir } = await setup();
  try {
    const lc = await service.create({
      title: "Enriched",
      problem: ["p1", "p2"],
      solution: ["s1"],
      keyMetrics: ["km1"],
      // 3 of 12 sections populated, 4 total items.
    });
    assertEquals(lc.completedSections, 3);
    assertEquals(lc.sectionCount, 4);
    assertEquals(lc.completionPct, Math.round((3 / 12) * 100));
  } finally {
    await cleanup(dir);
  }
});

Deno.test("LeanCanvasService.getById returns enriched entity", async () => {
  const { repo, service, dir } = await setup();
  try {
    const created = await repo.create({
      title: "GetById Enriched",
      problem: ["a"],
      solution: ["b"],
    });
    const fetched = await service.getById(created.id);
    assertExists(fetched);
    assertEquals(fetched!.completedSections, 2);
    assertEquals(fetched!.sectionCount, 2);
    assertEquals(fetched!.completionPct, Math.round((2 / 12) * 100));
  } finally {
    await cleanup(dir);
  }
});

Deno.test("LeanCanvasService.update returns enriched entity reflecting new state", async () => {
  const { service, dir } = await setup();
  try {
    const created = await service.create({
      title: "Update Enriched",
      problem: ["p1"],
    });
    assertEquals(created.completedSections, 1);
    const updated = await service.update(created.id, {
      problem: ["p1", "p2"],
      solution: ["s1"],
      keyMetrics: ["km1"],
    });
    assertExists(updated);
    assertEquals(updated!.completedSections, 3);
    assertEquals(updated!.sectionCount, 4);
  } finally {
    await cleanup(dir);
  }
});

Deno.test("LeanCanvasService.list returns enriched entities", async () => {
  const { service, dir } = await setup();
  try {
    await service.create({
      title: "Full",
      problem: ["a"],
      solution: ["b"],
      uniqueValueProp: ["c"],
      unfairAdvantage: ["d"],
      customerSegments: ["e"],
      existingAlternatives: ["f"],
      keyMetrics: ["g"],
      highLevelConcept: ["h"],
      channels: ["i"],
      earlyAdopters: ["j"],
      costStructure: ["k"],
      revenueStreams: ["l"],
    });
    await service.create({ title: "Empty" });
    const all = await service.list();
    assertEquals(all.length, 2);
    const full = all.find((c) => c.title === "Full");
    const empty = all.find((c) => c.title === "Empty");
    assertEquals(full!.completedSections, 12);
    assertEquals(full!.completionPct, 100);
    assertEquals(empty!.completedSections, 0);
    assertEquals(empty!.completionPct, 0);
  } finally {
    await cleanup(dir);
  }
});

// === service.list filters ===

Deno.test("LeanCanvasService - list with project filter is exact match", async () => {
  const { service, dir } = await setup();
  try {
    await service.create({ title: "A", project: "Acme" });
    await service.create({ title: "B", project: "Acme" });
    await service.create({ title: "C", project: "Other" });
    const matches = await service.list({ project: "Acme" });
    assertEquals(matches.length, 2);
    assertEquals(matches.every((c) => c.project === "Acme"), true);
  } finally {
    await cleanup(dir);
  }
});

Deno.test("LeanCanvasService - list with q matches title + project + every section", async () => {
  const { service, dir } = await setup();
  try {
    await service.create({
      title: "Match TITLE",
      project: "FindablePROJECT",
      problem: ["match-PROBLEM"],
      solution: ["match-SOLUTION"],
      uniqueValueProp: ["match-UVP"],
      unfairAdvantage: ["match-UA"],
      customerSegments: ["match-CS"],
      existingAlternatives: ["match-EA"],
      keyMetrics: ["match-KM"],
      highLevelConcept: ["match-HLC"],
      channels: ["match-CHANNEL"],
      earlyAdopters: ["match-ADOPTER"],
      costStructure: ["match-COST"],
      revenueStreams: ["match-REVENUE"],
    });
    await service.create({ title: "Other Canvas", project: "Other" });

    // Each keyword targets exactly one canvas — title or one of 12 sections.
    for (
      const kw of [
        "title",
        "findableproject",
        "match-problem",
        "match-solution",
        "match-uvp",
        "match-ua",
        "match-cs",
        "match-ea",
        "match-km",
        "match-hlc",
        "match-channel",
        "match-adopter",
        "match-cost",
        "match-revenue",
      ]
    ) {
      const matches = await service.list({ q: kw });
      assertEquals(
        matches.length,
        1,
        `q="${kw}" should match exactly 1 canvas`,
      );
      assertEquals(matches[0].title, "Match TITLE");
    }
  } finally {
    await cleanup(dir);
  }
});

Deno.test("LeanCanvasService - list combines project + q (AND)", async () => {
  const { service, dir } = await setup();
  try {
    await service.create({
      title: "Match",
      project: "Acme",
      problem: ["uniqueProb"],
    });
    await service.create({
      title: "Wrong project",
      project: "Other",
      problem: ["uniqueProb"],
    });
    await service.create({
      title: "Right project, wrong q",
      project: "Acme",
    });
    const matches = await service.list({
      project: "Acme",
      q: "uniqueprob",
    });
    assertEquals(matches.length, 1);
    assertEquals(matches[0].title, "Match");
  } finally {
    await cleanup(dir);
  }
});

Deno.test("LeanCanvasService - list with no options returns all", async () => {
  const { service, dir } = await setup();
  try {
    await service.create({ title: "A" });
    await service.create({ title: "B" });
    const all = await service.list();
    assertEquals(all.length, 2);
  } finally {
    await cleanup(dir);
  }
});

// === manual fixture parse — alternate section keyword matching ===

Deno.test("LeanCanvasRepository - parses alternate section heading keywords", async () => {
  const { repo, dir } = await setup();
  try {
    await Deno.mkdir(join(dir, "leancanvas"), { recursive: true });
    await Deno.writeTextFile(
      join(dir, "leancanvas", "lean_canvas_alt.md"),
      [
        "---",
        "title: Alt Keywords",
        "---",
        "# Alt Keywords",
        "",
        "## Problems", // plural → problem
        "",
        "- Slow onboarding",
        "",
        "## Solutions", // plural → solution
        "",
        "- Automation",
        "",
        "## UVP", // acronym → uniqueValueProp
        "",
        "- The fastest onboarding flow",
        "",
        "## Alternatives", // shortened → existingAlternatives
        "",
        "- Manual scripts",
        "",
        "## Metrics", // shortened → keyMetrics
        "",
        "- TTFV (time to first value)",
        "",
        "## Adopters", // shortened → earlyAdopters
        "",
        "- DevTools startups",
        "",
        "## Costs", // shortened → costStructure
        "",
        "- Engineering time",
        "",
        "## Revenue", // shortened → revenueStreams
        "",
        "- Pro plan",
        "",
      ].join("\n"),
    );
    const fetched = await repo.findById("lean_canvas_alt");
    assertExists(fetched);
    assertEquals(fetched!.problem, ["Slow onboarding"]);
    assertEquals(fetched!.solution, ["Automation"]);
    assertEquals(fetched!.uniqueValueProp, ["The fastest onboarding flow"]);
    assertEquals(fetched!.existingAlternatives, ["Manual scripts"]);
    assertEquals(fetched!.keyMetrics, ["TTFV (time to first value)"]);
    assertEquals(fetched!.earlyAdopters, ["DevTools startups"]);
    assertEquals(fetched!.costStructure, ["Engineering time"]);
    assertEquals(fetched!.revenueStreams, ["Pro plan"]);
  } finally {
    await cleanup(dir);
  }
});

// === edge cases ===

Deno.test("LeanCanvasRepository - optional project/date left undefined round-trip as undefined", async () => {
  const { repo, dir } = await setup();
  try {
    const created = await repo.create({ title: "Minimal" });
    assertStrictEquals(created.project, undefined);
    assertStrictEquals(created.date, undefined);
    const fetched = await repo.findById(created.id);
    assertExists(fetched);
    assertStrictEquals(fetched!.project, undefined);
    assertStrictEquals(fetched!.date, undefined);
  } finally {
    await cleanup(dir);
  }
});

Deno.test("LeanCanvasRepository - findByName returns matching canvas (case-insensitive)", async () => {
  const { repo, dir } = await setup();
  try {
    await repo.create({ title: "Premium Canvas" });
    await repo.create({ title: "Standard Canvas" });
    const found = await repo.findByName("premium canvas");
    assertExists(found);
    assertEquals(found!.title, "Premium Canvas");
  } finally {
    await cleanup(dir);
  }
});

Deno.test("LeanCanvasRepository - empty sections round-trip as empty arrays after update", async () => {
  const { repo, dir } = await setup();
  try {
    const created = await repo.create({
      title: "Empty Sections",
      problem: [],
      solution: [],
    });
    await repo.update(created.id, { title: "Still Empty" });
    const fetched = await repo.findById(created.id);
    assertExists(fetched);
    assertEquals(fetched!.problem, []);
    assertEquals(fetched!.solution, []);
  } finally {
    await cleanup(dir);
  }
});
