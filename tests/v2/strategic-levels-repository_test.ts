/**
 * Unit tests for v2 StrategicLevelsRepository (CRUD on disk) +
 * StrategicLevelsService.
 *
 * StrategicLevels stores its level items in BODY sections (one ## per
 * LEVEL_ORDER type: vision/mission/goals/objectives/strategies/tactics) with
 * `- (level_id) Title` bullet lines. The title is the body `# heading` —
 * NOT in frontmatter. Parse-guard via `fm.id` (title isn't stored in fm).
 * nameField = "title".
 */

import { assertEquals, assertExists, assertStrictEquals } from "@std/assert";
import { StrategicLevelsRepository } from "../../v2/repositories/strategic-levels.repository.ts";
import { StrategicLevelsService } from "../../v2/services/strategic-levels.service.ts";

async function setup(): Promise<
  {
    repo: StrategicLevelsRepository;
    service: StrategicLevelsService;
    dir: string;
  }
> {
  const dir = await Deno.makeTempDir({
    prefix: "mdplanner-strategic-test-",
  });
  const repo = new StrategicLevelsRepository(dir);
  const service = new StrategicLevelsService(repo);
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

Deno.test("StrategicLevelsRepository - create defaults date to today and levels to []", async () => {
  const { repo, dir } = await setup();
  try {
    const item = await repo.create({ title: "Q1 Strategy" });
    assertExists(item.id);
    assertEquals(item.title, "Q1 Strategy");
    assertEquals(item.levels, []);
    assertEquals(item.date.length, 10);
  } finally {
    await cleanup(dir);
  }
});

Deno.test("StrategicLevelsRepository - create with explicit levels", async () => {
  const { repo, dir } = await setup();
  try {
    const item = await repo.create({
      title: "Full strategy",
      date: "2026-01-01",
      levels: [
        {
          id: "lv_vision1",
          title: "Become market leader",
          level: "vision",
          order: 0,
        },
        {
          id: "lv_mission1",
          title: "Empower teams",
          level: "mission",
          order: 0,
        },
        { id: "lv_goal1", title: "Ship v2", level: "goals", order: 0 },
        { id: "lv_obj1", title: "1000 users", level: "objectives", order: 0 },
        { id: "lv_strat1", title: "PLG funnel", level: "strategies", order: 0 },
        {
          id: "lv_tac1",
          title: "Onboarding email",
          level: "tactics",
          order: 0,
        },
      ],
    });
    assertEquals(item.levels.length, 6);
    assertEquals(item.date, "2026-01-01");
  } finally {
    await cleanup(dir);
  }
});

Deno.test("StrategicLevelsRepository - findById returns null for missing ID", async () => {
  const { repo, dir } = await setup();
  try {
    assertStrictEquals(await repo.findById("strategic_nope"), null);
  } finally {
    await cleanup(dir);
  }
});

// === parse-guard ===

Deno.test("StrategicLevelsRepository - findById succeeds after update (parse-guard regression)", async () => {
  const { repo, dir } = await setup();
  try {
    const created = await repo.create({
      title: "Guard Strategy",
      levels: [
        { id: "v1", title: "Vision item", level: "vision", order: 0 },
      ],
    });
    await repo.update(created.id, {
      levels: [
        { id: "v1", title: "Vision item", level: "vision", order: 0 },
        { id: "m1", title: "Mission item", level: "mission", order: 0 },
      ],
    });
    const fetched = await repo.findById(created.id);
    assertExists(fetched);
    assertEquals(fetched!.id, created.id);
    assertEquals(fetched!.title, "Guard Strategy");
    assertEquals(fetched!.levels.length, 2);
  } finally {
    await cleanup(dir);
  }
});

// === body-section round-trip ===

Deno.test("StrategicLevelsRepository - levels round-trip through ## headings + (id) Title bullets", async () => {
  const { repo, dir } = await setup();
  try {
    const created = await repo.create({
      title: "Section Round Trip",
      levels: [
        { id: "v1", title: "Become #1", level: "vision", order: 0 },
        { id: "g1", title: "Ship Q1", level: "goals", order: 0 },
        { id: "g2", title: "Ship Q2", level: "goals", order: 1 },
      ],
    });
    const filePath = `${dir}/strategiclevels/${created.id}.md`;
    const raw = await Deno.readTextFile(filePath);
    assertEquals(raw.includes("# Section Round Trip"), true);
    assertEquals(raw.includes("## Vision"), true);
    assertEquals(raw.includes("## Goals"), true);
    assertEquals(raw.includes("- (v1) Become #1"), true);
    assertEquals(raw.includes("- (g1) Ship Q1"), true);
    assertEquals(raw.includes("- (g2) Ship Q2"), true);
    // Sections without items are NOT rendered.
    assertEquals(raw.includes("## Mission"), false);
    assertEquals(raw.includes("## Tactics"), false);

    // Re-read: levels reconstructed from body. Order is re-numbered globally.
    const fetched = await repo.findById(created.id);
    assertExists(fetched);
    assertEquals(fetched!.title, "Section Round Trip");
    assertEquals(fetched!.levels.length, 3);
    assertEquals(
      fetched!.levels.map((l) => `${l.level}:${l.id}`),
      ["vision:v1", "goals:g1", "goals:g2"],
    );
  } finally {
    await cleanup(dir);
  }
});

// === update ===

Deno.test("StrategicLevelsRepository - update returns null for non-existent ID", async () => {
  const { repo, dir } = await setup();
  try {
    assertStrictEquals(
      await repo.update("strategic_missing", { title: "X" }),
      null,
    );
  } finally {
    await cleanup(dir);
  }
});

// === delete + hardDelete ===

Deno.test("StrategicLevelsRepository - delete soft-archives entity", async () => {
  const { repo, dir } = await setup();
  try {
    const item = await repo.create({ title: "Archive me" });
    assertEquals(await repo.delete(item.id), true);
    const found = await repo.findById(item.id);
    assertExists(found);
    const all = await repo.findAllFromDisk();
    assertStrictEquals(all.find((s) => s.id === item.id), undefined);
  } finally {
    await cleanup(dir);
  }
});

Deno.test("StrategicLevelsRepository - hardDelete removes the file", async () => {
  const { repo, dir } = await setup();
  try {
    const item = await repo.create({ title: "Truly gone" });
    assertEquals(await repo.hardDelete(item.id), true);
    assertStrictEquals(await repo.findById(item.id), null);
  } finally {
    await cleanup(dir);
  }
});

Deno.test("StrategicLevelsRepository - delete returns false for non-existent ID", async () => {
  const { repo, dir } = await setup();
  try {
    assertEquals(await repo.delete("strategic_ghost"), false);
  } finally {
    await cleanup(dir);
  }
});

// === sort by title ===

Deno.test("StrategicLevelsRepository - findAll sorts alphabetically by title", async () => {
  const { repo, dir } = await setup();
  try {
    await repo.create({ title: "Charlie" });
    await repo.create({ title: "Alpha" });
    await repo.create({ title: "Bravo" });
    const all = await repo.findAllFromDisk();
    assertEquals(all.map((s) => s.title), ["Alpha", "Bravo", "Charlie"]);
  } finally {
    await cleanup(dir);
  }
});

// === service filters ===

Deno.test("StrategicLevelsService - list with q filter matches title (case-insensitive)", async () => {
  const { repo, service, dir } = await setup();
  try {
    await repo.create({ title: "Strategic Q1" });
    await repo.create({ title: "Tactical Q1" });
    const matches = await service.list({ q: "strategic" });
    assertEquals(matches.length, 1);
    assertEquals(matches[0].title, "Strategic Q1");
  } finally {
    await cleanup(dir);
  }
});

Deno.test("StrategicLevelsService - list with date filter (exact)", async () => {
  const { repo, service, dir } = await setup();
  try {
    await repo.create({ title: "A", date: "2026-01-01" });
    await repo.create({ title: "B", date: "2026-02-01" });
    const matches = await service.list({ date: "2026-01-01" });
    assertEquals(matches.length, 1);
    assertEquals(matches[0].title, "A");
  } finally {
    await cleanup(dir);
  }
});

Deno.test("StrategicLevelsService - list combines q + date (AND)", async () => {
  const { repo, service, dir } = await setup();
  try {
    await repo.create({ title: "Match", date: "2026-01-01" });
    await repo.create({ title: "Match", date: "2026-02-01" });
    await repo.create({ title: "Other", date: "2026-01-01" });
    const matches = await service.list({
      q: "match",
      date: "2026-01-01",
    });
    assertEquals(matches.length, 1);
    assertEquals(matches[0].date, "2026-01-01");
  } finally {
    await cleanup(dir);
  }
});

Deno.test("StrategicLevelsService - list with no options returns all", async () => {
  const { repo, service, dir } = await setup();
  try {
    await repo.create({ title: "A" });
    await repo.create({ title: "B" });
    assertEquals((await service.list()).length, 2);
  } finally {
    await cleanup(dir);
  }
});

// === edges ===

Deno.test("StrategicLevelsRepository - findByName via title (case-insensitive)", async () => {
  const { repo, dir } = await setup();
  try {
    await repo.create({ title: "Company Strategy 2026" });
    await repo.create({ title: "Other doc" });
    const found = await repo.findByName("company strategy 2026");
    assertExists(found);
    assertEquals(found!.title, "Company Strategy 2026");
  } finally {
    await cleanup(dir);
  }
});
