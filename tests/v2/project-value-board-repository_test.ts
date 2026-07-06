/**
 * Unit tests for v2 ProjectValueBoardRepository (CRUD on disk) +
 * ProjectValueBoardService (filter behaviour).
 *
 * Body uses `## Section` headings + bullet lists for each of the four
 * quadrants (`customerSegments`, `problem`, `solution`, `benefit`).
 * Parser matches heading prefixes case-insensitively (`Customer Segments` |
 * `Target Customer` | `Who` → customerSegments, etc.). Bug class to guard
 * against: section arrays dropping on update if frontmatter/body
 * serialization is asymmetric.
 */

import { assertEquals, assertExists, assertStrictEquals } from "@std/assert";
import { join } from "@std/path";
import { ProjectValueBoardRepository } from "../../src/repositories/project-value-board.repository.ts";
import { ProjectValueBoardService } from "../../src/services/project-value-board.service.ts";

async function setup(): Promise<{
  repo: ProjectValueBoardRepository;
  service: ProjectValueBoardService;
  dir: string;
}> {
  const dir = await Deno.makeTempDir({ prefix: "mdplanner-pvb-test-" });
  const repo = new ProjectValueBoardRepository(dir);
  const service = new ProjectValueBoardService(repo);
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

Deno.test("PVBRepository - create stores file and returns entity with defaults", async () => {
  const { repo, dir } = await setup();
  try {
    const board = await repo.create({
      title: "Q1 Value Assessment",
      // date / sections / project / notes all omitted — defaults apply
    });
    assertExists(board.id);
    assertEquals(board.title, "Q1 Value Assessment");
    assertExists(board.date); // today (YYYY-MM-DD)
    assertEquals(board.customerSegments, []);
    assertEquals(board.problem, []);
    assertEquals(board.solution, []);
    assertEquals(board.benefit, []);
    assertExists(board.createdAt);
  } finally {
    await cleanup(dir);
  }
});

Deno.test("PVBRepository - create stores all 4 sections", async () => {
  const { repo, dir } = await setup();
  try {
    const board = await repo.create({
      title: "Full Board",
      date: "2026-01-15",
      customerSegments: ["SMBs", "Indie hackers"],
      problem: ["Manual workflows", "Tooling sprawl"],
      solution: ["All-in-one platform", "Open source"],
      benefit: ["Time saved", "Lower cost"],
      project: "Platform 2026",
      notes: "Initial draft.",
    });
    assertEquals(board.customerSegments, ["SMBs", "Indie hackers"]);
    assertEquals(board.problem, ["Manual workflows", "Tooling sprawl"]);
    assertEquals(board.solution, ["All-in-one platform", "Open source"]);
    assertEquals(board.benefit, ["Time saved", "Lower cost"]);
    assertEquals(board.project, "Platform 2026");
    assertEquals(board.notes, "Initial draft.");
  } finally {
    await cleanup(dir);
  }
});

Deno.test("PVBRepository - findById returns correct entity with sections", async () => {
  const { repo, dir } = await setup();
  try {
    const created = await repo.create({
      title: "Findable",
      date: "2026-02-01",
      customerSegments: ["A", "B"],
      problem: ["P1"],
      solution: ["S1"],
      benefit: ["B1"],
    });
    const found = await repo.findById(created.id);
    assertExists(found);
    assertEquals(found!.customerSegments, ["A", "B"]);
    assertEquals(found!.problem, ["P1"]);
    assertEquals(found!.solution, ["S1"]);
    assertEquals(found!.benefit, ["B1"]);
  } finally {
    await cleanup(dir);
  }
});

Deno.test("PVBRepository - findById returns null for missing ID", async () => {
  const { repo, dir } = await setup();
  try {
    const found = await repo.findById("value_nonexistent");
    assertStrictEquals(found, null);
  } finally {
    await cleanup(dir);
  }
});

// === parse-guard regression — sections survive update ===

Deno.test("PVBRepository - findById succeeds after update with all sections populated", async () => {
  const { repo, dir } = await setup();
  try {
    const created = await repo.create({
      title: "Parse Guard",
      customerSegments: ["seg1", "seg2"],
      problem: ["prob1"],
      solution: ["sol1", "sol2"],
      benefit: ["ben1"],
    });
    const updated = await repo.update(created.id, {
      problem: ["prob1", "prob2-new"],
    });
    assertExists(updated);
    const fetched = await repo.findById(created.id);
    assertExists(fetched);
    assertEquals(fetched!.id, created.id);
    assertEquals(fetched!.title, "Parse Guard");
    // Updated section.
    assertEquals(fetched!.problem, ["prob1", "prob2-new"]);
    // Sibling sections intact.
    assertEquals(fetched!.customerSegments, ["seg1", "seg2"]);
    assertEquals(fetched!.solution, ["sol1", "sol2"]);
    assertEquals(fetched!.benefit, ["ben1"]);
  } finally {
    await cleanup(dir);
  }
});

// === update ===

Deno.test("PVBRepository - update can replace a section", async () => {
  const { repo, dir } = await setup();
  try {
    const created = await repo.create({
      title: "Replaceable",
      customerSegments: ["old"],
    });
    const updated = await repo.update(created.id, {
      customerSegments: ["new1", "new2", "new3"],
    });
    assertExists(updated);
    const fetched = await repo.findById(created.id);
    assertEquals(fetched!.customerSegments, ["new1", "new2", "new3"]);
  } finally {
    await cleanup(dir);
  }
});

Deno.test("PVBRepository - update preserves sibling fields", async () => {
  const { repo, dir } = await setup();
  try {
    const created = await repo.create({
      title: "Sibling Board",
      date: "2026-03-01",
      project: "ProjectX",
      customerSegments: ["a"],
      problem: ["b"],
      solution: ["c"],
      benefit: ["d"],
    });
    await repo.update(created.id, { customerSegments: ["a2"] });
    const fetched = await repo.findById(created.id);
    assertExists(fetched);
    assertEquals(fetched!.title, "Sibling Board");
    assertEquals(fetched!.date, "2026-03-01");
    assertEquals(fetched!.project, "ProjectX");
    assertEquals(fetched!.problem, ["b"]);
    assertEquals(fetched!.solution, ["c"]);
    assertEquals(fetched!.benefit, ["d"]);
  } finally {
    await cleanup(dir);
  }
});

Deno.test("PVBRepository - update returns null for non-existent ID", async () => {
  const { repo, dir } = await setup();
  try {
    const result = await repo.update("value_missing", { title: "X" });
    assertStrictEquals(result, null);
  } finally {
    await cleanup(dir);
  }
});

// === delete (soft-archive) + hardDelete ===

Deno.test("PVBRepository - delete soft-archives entity", async () => {
  const { repo, dir } = await setup();
  try {
    const board = await repo.create({ title: "To Archive" });
    const deleted = await repo.delete(board.id);
    assertEquals(deleted, true);
    const found = await repo.findById(board.id);
    assertExists(found);
    const all = await repo.findAllFromDisk();
    assertStrictEquals(all.find((b) => b.id === board.id), undefined);
  } finally {
    await cleanup(dir);
  }
});

Deno.test("PVBRepository - hardDelete removes the file", async () => {
  const { repo, dir } = await setup();
  try {
    const board = await repo.create({ title: "Truly Gone" });
    const ok = await repo.hardDelete(board.id);
    assertEquals(ok, true);
    const found = await repo.findById(board.id);
    assertStrictEquals(found, null);
  } finally {
    await cleanup(dir);
  }
});

Deno.test("PVBRepository - delete returns false for non-existent ID", async () => {
  const { repo, dir } = await setup();
  try {
    const result = await repo.delete("value_ghost");
    assertEquals(result, false);
  } finally {
    await cleanup(dir);
  }
});

// === findAll: sort + archive filtering ===

Deno.test("PVBRepository - findAllFromDisk sorts alphabetically by title", async () => {
  const { repo, dir } = await setup();
  try {
    await repo.create({ title: "Charlie Board" });
    await repo.create({ title: "Alpha Board" });
    await repo.create({ title: "Bravo Board" });
    const all = await repo.findAllFromDisk();
    assertEquals(all.length, 3);
    assertEquals(all.map((b) => b.title), [
      "Alpha Board",
      "Bravo Board",
      "Charlie Board",
    ]);
  } finally {
    await cleanup(dir);
  }
});

// === service.list filters ===

Deno.test("PVBService - list with project filter is exact match", async () => {
  const { repo, service, dir } = await setup();
  try {
    await repo.create({ title: "A", project: "Acme" });
    await repo.create({ title: "B", project: "Acme" });
    await repo.create({ title: "C", project: "Other" });
    const matches = await service.list({ project: "Acme" });
    assertEquals(matches.length, 2);
    assertEquals(matches.every((b) => b.project === "Acme"), true);
  } finally {
    await cleanup(dir);
  }
});

Deno.test("PVBService - list with q filter matches title (case-insensitive)", async () => {
  const { repo, service, dir } = await setup();
  try {
    await repo.create({ title: "Customer Onboarding" });
    await repo.create({ title: "Billing Overhaul" });
    const matches = await service.list({ q: "onboarding" });
    assertEquals(matches.length, 1);
    assertEquals(matches[0].title, "Customer Onboarding");
  } finally {
    await cleanup(dir);
  }
});

Deno.test("PVBRepository - notes round-trips through serialize/parse", async () => {
  const { repo, dir } = await setup();
  try {
    const created = await repo.create({
      title: "Notes Round-Trip",
      notes: "Sticky reminder for the next review.",
    });
    assertEquals(created.notes, "Sticky reminder for the next review.");
    const fetched = await repo.findById(created.id);
    assertExists(fetched);
    assertEquals(fetched!.notes, "Sticky reminder for the next review.");
  } finally {
    await cleanup(dir);
  }
});

Deno.test("PVBService - list with q filter matches notes (case-insensitive)", async () => {
  const { repo, service, dir } = await setup();
  try {
    await repo.create({
      title: "Board A",
      notes: "Customer requires SOC2 compliance.",
    });
    await repo.create({
      title: "Board B",
      notes: "Standard quarterly review.",
    });
    const matches = await service.list({ q: "soc2" });
    assertEquals(matches.length, 1);
    assertEquals(matches[0].title, "Board A");
  } finally {
    await cleanup(dir);
  }
});

Deno.test("PVBService - list with q filter matches each section", async () => {
  const { repo, service, dir } = await setup();
  try {
    await repo.create({
      title: "Match in customerSegments",
      customerSegments: ["FINDABLE_C"],
    });
    await repo.create({
      title: "Match in problem",
      problem: ["FINDABLE_P"],
    });
    await repo.create({
      title: "Match in solution",
      solution: ["FINDABLE_S"],
    });
    await repo.create({
      title: "Match in benefit",
      benefit: ["FINDABLE_B"],
    });

    const c = await service.list({ q: "findable_c" });
    assertEquals(c.length, 1);
    assertEquals(c[0].title, "Match in customerSegments");

    const p = await service.list({ q: "findable_p" });
    assertEquals(p.length, 1);
    assertEquals(p[0].title, "Match in problem");

    const s = await service.list({ q: "findable_s" });
    assertEquals(s.length, 1);
    assertEquals(s[0].title, "Match in solution");

    const b = await service.list({ q: "findable_b" });
    assertEquals(b.length, 1);
    assertEquals(b[0].title, "Match in benefit");
  } finally {
    await cleanup(dir);
  }
});

Deno.test("PVBService - list combines project + q (AND)", async () => {
  const { repo, service, dir } = await setup();
  try {
    await repo.create({ title: "Match", project: "Acme" });
    await repo.create({ title: "Wrong project", project: "Other" });
    await repo.create({ title: "Wrong title", project: "Acme" });
    const matches = await service.list({ project: "Acme", q: "match" });
    assertEquals(matches.length, 1);
    assertEquals(matches[0].title, "Match");
  } finally {
    await cleanup(dir);
  }
});

Deno.test("PVBService - list with no options returns all", async () => {
  const { repo, service, dir } = await setup();
  try {
    await repo.create({ title: "A" });
    await repo.create({ title: "B" });
    const all = await service.list();
    assertEquals(all.length, 2);
  } finally {
    await cleanup(dir);
  }
});

// === manual fixture parse — alternate heading prefixes ===

Deno.test("PVBRepository - parses alternate section heading prefixes (target customer / pain point / how we solve / outcome)", async () => {
  const { repo, dir } = await setup();
  try {
    await Deno.mkdir(join(dir, "projectvalue"), { recursive: true });
    await Deno.writeTextFile(
      join(dir, "projectvalue", "value_alt_headings.md"),
      [
        "---",
        "id: value_alt_headings",
        "title: Alt Headings Board",
        "date: 2026-01-01",
        "---",
        "# Alt Headings Board",
        "",
        "## Target Customer",
        "",
        "- Enterprise IT",
        "",
        "## Pain Point",
        "",
        "- Slow onboarding",
        "",
        "## How We Solve",
        "",
        "- Automated setup",
        "",
        "## Outcome",
        "",
        "- 50% faster ramp",
        "",
      ].join("\n"),
    );
    const fetched = await repo.findById("value_alt_headings");
    assertExists(fetched);
    assertEquals(fetched!.customerSegments, ["Enterprise IT"]);
    assertEquals(fetched!.problem, ["Slow onboarding"]);
    assertEquals(fetched!.solution, ["Automated setup"]);
    assertEquals(fetched!.benefit, ["50% faster ramp"]);
  } finally {
    await cleanup(dir);
  }
});

// === edge cases ===

Deno.test("PVBRepository - optional fields left undefined round-trip as undefined", async () => {
  const { repo, dir } = await setup();
  try {
    const created = await repo.create({ title: "Minimal" });
    assertStrictEquals(created.project, undefined);
    assertStrictEquals(created.notes, undefined);
    const fetched = await repo.findById(created.id);
    assertExists(fetched);
    assertStrictEquals(fetched!.project, undefined);
    assertStrictEquals(fetched!.notes, undefined);
  } finally {
    await cleanup(dir);
  }
});

Deno.test("PVBRepository - findByName returns matching board (case-insensitive)", async () => {
  const { repo, dir } = await setup();
  try {
    await repo.create({ title: "Premium Board" });
    await repo.create({ title: "Standard Board" });
    const found = await repo.findByName("premium board");
    assertExists(found);
    assertEquals(found!.title, "Premium Board");
  } finally {
    await cleanup(dir);
  }
});

Deno.test("PVBRepository - empty sections round-trip as empty arrays", async () => {
  const { repo, dir } = await setup();
  try {
    const created = await repo.create({
      title: "Empty Sections",
      customerSegments: [],
      problem: [],
      solution: [],
      benefit: [],
    });
    await repo.update(created.id, { title: "Still Empty" });
    const fetched = await repo.findById(created.id);
    assertExists(fetched);
    assertEquals(fetched!.customerSegments, []);
    assertEquals(fetched!.problem, []);
    assertEquals(fetched!.solution, []);
    assertEquals(fetched!.benefit, []);
  } finally {
    await cleanup(dir);
  }
});
