/**
 * Unit tests for v2 MarketingPlanRepository (CRUD on disk) + MarketingPlanService
 * (filter behaviour).
 *
 * Custom serialize: nested arrays go straight into frontmatter (top-level keys
 * snake_cased: `target_audiences`, `linked_goals`, etc.), notes in the body.
 * Campaigns have explicit per-item snake_case: `start_date`/`end_date`.
 * `parseCampaign` accepts both snake and camel for back-compat. All other
 * nested arrays keep camelCase keys inside their items because `mapKeysFromFm`
 * is single-level (architecture note `note_1779951164461_w3e8gp`).
 *
 * Per decision `note_1774638117350_51npdq`: marketing plan KPIs live in
 * `linkedGoals` (goal IDs), NOT inline `kpiTargets`.
 */

import { assertEquals, assertExists, assertStrictEquals } from "@std/assert";
import { join } from "@std/path";
import { MarketingPlanRepository } from "../../src/repositories/marketing-plan.repository.ts";
import { MarketingPlanService } from "../../src/services/marketing-plan.service.ts";

async function setup(): Promise<{
  repo: MarketingPlanRepository;
  service: MarketingPlanService;
  dir: string;
}> {
  const dir = await Deno.makeTempDir({ prefix: "mdplanner-mktplan-test-" });
  const repo = new MarketingPlanRepository(dir);
  const service = new MarketingPlanService(repo);
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

Deno.test("MarketingPlanRepository - create stores file and returns entity with default status", async () => {
  const { repo, dir } = await setup();
  try {
    const plan = await repo.create({
      name: "Q2 Launch",
      // status omitted — defaults to "draft"
    });
    assertExists(plan.id);
    assertEquals(plan.name, "Q2 Launch");
    assertEquals(plan.status, "draft");
    assertExists(plan.createdAt);
  } finally {
    await cleanup(dir);
  }
});

Deno.test("MarketingPlanRepository - create with all top-level fields", async () => {
  const { repo, dir } = await setup();
  try {
    const plan = await repo.create({
      name: "Full Plan",
      description: "Comprehensive Q2 plan.",
      status: "active",
      budgetTotal: 50000,
      budgetCurrency: "USD",
      startDate: "2026-04-01",
      endDate: "2026-06-30",
      project: "Acme Platform",
      responsible: "person_001",
      team: ["person_002", "person_003"],
      notes: "## Strategy\n\nFocus on enterprise.",
    });
    assertEquals(plan.description, "Comprehensive Q2 plan.");
    assertEquals(plan.status, "active");
    assertEquals(plan.budgetTotal, 50000);
    assertEquals(plan.budgetCurrency, "USD");
    assertEquals(plan.startDate, "2026-04-01");
    assertEquals(plan.endDate, "2026-06-30");
    assertEquals(plan.project, "Acme Platform");
    assertEquals(plan.responsible, "person_001");
    assertEquals(plan.team, ["person_002", "person_003"]);
    assertEquals(plan.notes, "## Strategy\n\nFocus on enterprise.");
  } finally {
    await cleanup(dir);
  }
});

Deno.test("MarketingPlanRepository - findById returns null for missing ID", async () => {
  const { repo, dir } = await setup();
  try {
    const found = await repo.findById("mktplan_nonexistent");
    assertStrictEquals(found, null);
  } finally {
    await cleanup(dir);
  }
});

// === nested arrays round-trip ===

Deno.test("MarketingPlanRepository - targetAudiences round-trip on create", async () => {
  const { repo, dir } = await setup();
  try {
    const created = await repo.create({
      name: "Audience Test",
      targetAudiences: [
        {
          name: "Enterprise IT",
          description: "Senior decision-makers",
          size: "10k-50k",
        },
        { name: "SMB founders", description: undefined, size: undefined },
      ],
    });
    const fetched = await repo.findById(created.id);
    assertExists(fetched);
    assertEquals(fetched!.targetAudiences?.length, 2);
    assertEquals(fetched!.targetAudiences![0].name, "Enterprise IT");
    assertEquals(
      fetched!.targetAudiences![0].description,
      "Senior decision-makers",
    );
    assertEquals(fetched!.targetAudiences![0].size, "10k-50k");
    assertEquals(fetched!.targetAudiences![1].name, "SMB founders");
    assertStrictEquals(fetched!.targetAudiences![1].description, undefined);
  } finally {
    await cleanup(dir);
  }
});

Deno.test("MarketingPlanRepository - channels round-trip on create", async () => {
  const { repo, dir } = await setup();
  try {
    const created = await repo.create({
      name: "Channels Test",
      channels: [
        {
          name: "Social Media",
          budget: 15000,
          goals: "+25% engagement",
          status: "active",
        },
        { name: "Email", budget: 5000, goals: undefined, status: "planned" },
      ],
    });
    const fetched = await repo.findById(created.id);
    assertExists(fetched);
    assertEquals(fetched!.channels?.length, 2);
    assertEquals(fetched!.channels![0].name, "Social Media");
    assertEquals(fetched!.channels![0].budget, 15000);
    assertEquals(fetched!.channels![0].goals, "+25% engagement");
    assertEquals(fetched!.channels![0].status, "active");
    assertEquals(fetched!.channels![1].status, "planned");
  } finally {
    await cleanup(dir);
  }
});

Deno.test("MarketingPlanRepository - campaigns round-trip on create (snake_case start_date/end_date on disk)", async () => {
  const { repo, dir } = await setup();
  try {
    const created = await repo.create({
      name: "Campaigns Test",
      campaigns: [
        {
          name: "Spring Launch",
          channel: "Social Media",
          budget: 5000,
          startDate: "2026-03-01",
          endDate: "2026-03-31",
          status: "planned",
          goals: "Generate 500 leads",
        },
      ],
    });
    const fetched = await repo.findById(created.id);
    assertExists(fetched);
    assertEquals(fetched!.campaigns?.length, 1);
    const c = fetched!.campaigns![0];
    assertEquals(c.name, "Spring Launch");
    assertEquals(c.channel, "Social Media");
    assertEquals(c.budget, 5000);
    assertEquals(c.startDate, "2026-03-01");
    assertEquals(c.endDate, "2026-03-31");
    assertEquals(c.status, "planned");
    assertEquals(c.goals, "Generate 500 leads");
  } finally {
    await cleanup(dir);
  }
});

Deno.test("MarketingPlanRepository - campaigns write snake_case start_date/end_date on disk", async () => {
  const { repo, dir } = await setup();
  try {
    const created = await repo.create({
      name: "Disk Check",
      campaigns: [{
        name: "C1",
        startDate: "2026-01-01",
        endDate: "2026-01-31",
      }],
    });
    const filePath = join(dir, "marketing-plans", `${created.id}.md`);
    const raw = await Deno.readTextFile(filePath);
    assertEquals(raw.includes("start_date:"), true);
    assertEquals(raw.includes("end_date:"), true);
    // camelCase versions must NOT appear inside campaign blocks.
    assertEquals(raw.includes("startDate:"), false);
    assertEquals(raw.includes("endDate:"), false);
  } finally {
    await cleanup(dir);
  }
});

Deno.test("MarketingPlanRepository - hypothesis array round-trips", async () => {
  const { repo, dir } = await setup();
  try {
    const created = await repo.create({
      name: "Hypothesis Test",
      hypothesis: [
        { text: "Buyers want X", verdict: "confirmed" },
        { text: "Buyers want Y", verdict: "rejected" },
        { text: "Buyers want Z" },
      ],
    });
    const fetched = await repo.findById(created.id);
    assertExists(fetched);
    assertEquals(fetched!.hypothesis?.length, 3);
    assertEquals(fetched!.hypothesis![0], {
      text: "Buyers want X",
      verdict: "confirmed",
    });
    assertEquals(fetched!.hypothesis![1], {
      text: "Buyers want Y",
      verdict: "rejected",
    });
    assertEquals(fetched!.hypothesis![2].text, "Buyers want Z");
    assertStrictEquals(fetched!.hypothesis![2].verdict, undefined);
  } finally {
    await cleanup(dir);
  }
});

Deno.test("MarketingPlanRepository - learnings array round-trips", async () => {
  const { repo, dir } = await setup();
  try {
    const created = await repo.create({
      name: "Learnings Test",
      learnings: [
        { text: "Discovery 1" },
        { text: "Discovery 2" },
      ],
    });
    const fetched = await repo.findById(created.id);
    assertExists(fetched);
    assertEquals(fetched!.learnings?.length, 2);
    assertEquals(fetched!.learnings![0], { text: "Discovery 1" });
    assertEquals(fetched!.learnings![1], { text: "Discovery 2" });
  } finally {
    await cleanup(dir);
  }
});

Deno.test("MarketingPlanRepository - linkedGoals string[] round-trips (KPIs via linked goals, per decision note_1774638117350_51npdq)", async () => {
  const { repo, dir } = await setup();
  try {
    const created = await repo.create({
      name: "Goals Test",
      linkedGoals: ["goal_001", "goal_002", "goal_003"],
    });
    const fetched = await repo.findById(created.id);
    assertExists(fetched);
    assertEquals(fetched!.linkedGoals, ["goal_001", "goal_002", "goal_003"]);
  } finally {
    await cleanup(dir);
  }
});

// === parse-guard regression — nested arrays survive update ===

Deno.test("MarketingPlanRepository - findById succeeds after update with nested arrays populated (parse-guard regression)", async () => {
  const { repo, dir } = await setup();
  try {
    const created = await repo.create({
      name: "Parse Guard",
      targetAudiences: [{ name: "Enterprise" }],
      channels: [{ name: "Email", budget: 1000 }],
      campaigns: [{ name: "C1", startDate: "2026-01-01" }],
      hypothesis: [{ text: "H1" }],
      learnings: [{ text: "L1" }],
      linkedGoals: ["g1"],
    });
    const updated = await repo.update(created.id, { status: "active" });
    assertExists(updated);
    const fetched = await repo.findById(created.id);
    assertExists(fetched);
    assertEquals(fetched!.id, created.id);
    assertEquals(fetched!.name, "Parse Guard");
    assertEquals(fetched!.status, "active");
    // All nested arrays intact.
    assertEquals(fetched!.targetAudiences?.length, 1);
    assertEquals(fetched!.channels?.length, 1);
    assertEquals(fetched!.campaigns?.length, 1);
    assertEquals(fetched!.campaigns![0].startDate, "2026-01-01");
    assertEquals(fetched!.hypothesis?.length, 1);
    assertEquals(fetched!.learnings?.length, 1);
    assertEquals(fetched!.linkedGoals, ["g1"]);
  } finally {
    await cleanup(dir);
  }
});

// === update ===

Deno.test("MarketingPlanRepository - update modifies existing entity", async () => {
  const { repo, dir } = await setup();
  try {
    const plan = await repo.create({ name: "U" });
    const updated = await repo.update(plan.id, { status: "completed" });
    assertExists(updated);
    assertEquals(updated!.status, "completed");
  } finally {
    await cleanup(dir);
  }
});

Deno.test("MarketingPlanRepository - update preserves sibling fields", async () => {
  const { repo, dir } = await setup();
  try {
    const created = await repo.create({
      name: "Sibling",
      description: "Stay intact",
      budgetTotal: 1000,
      notes: "Body notes survive.",
      channels: [{ name: "CH1", budget: 100 }],
    });
    await repo.update(created.id, { status: "active" });
    const fetched = await repo.findById(created.id);
    assertExists(fetched);
    assertEquals(fetched!.description, "Stay intact");
    assertEquals(fetched!.budgetTotal, 1000);
    assertEquals(fetched!.notes, "Body notes survive.");
    assertEquals(fetched!.channels?.length, 1);
  } finally {
    await cleanup(dir);
  }
});

Deno.test("MarketingPlanRepository - update returns null for non-existent ID", async () => {
  const { repo, dir } = await setup();
  try {
    const result = await repo.update("mktplan_missing", { name: "X" });
    assertStrictEquals(result, null);
  } finally {
    await cleanup(dir);
  }
});

// === delete (soft-archive) + hardDelete ===

Deno.test("MarketingPlanRepository - delete soft-archives entity", async () => {
  const { repo, dir } = await setup();
  try {
    const plan = await repo.create({ name: "To Archive" });
    const deleted = await repo.delete(plan.id);
    assertEquals(deleted, true);
    const found = await repo.findById(plan.id);
    assertExists(found);
    const all = await repo.findAllFromDisk();
    assertStrictEquals(all.find((p) => p.id === plan.id), undefined);
  } finally {
    await cleanup(dir);
  }
});

Deno.test("MarketingPlanRepository - hardDelete removes the file", async () => {
  const { repo, dir } = await setup();
  try {
    const plan = await repo.create({ name: "Truly Gone" });
    const ok = await repo.hardDelete(plan.id);
    assertEquals(ok, true);
    const found = await repo.findById(plan.id);
    assertStrictEquals(found, null);
  } finally {
    await cleanup(dir);
  }
});

Deno.test("MarketingPlanRepository - delete returns false for non-existent ID", async () => {
  const { repo, dir } = await setup();
  try {
    const result = await repo.delete("mktplan_ghost");
    assertEquals(result, false);
  } finally {
    await cleanup(dir);
  }
});

// === findAll: sort ===

Deno.test("MarketingPlanRepository - findAllFromDisk sorts alphabetically by name", async () => {
  const { repo, dir } = await setup();
  try {
    await repo.create({ name: "Charlie Plan" });
    await repo.create({ name: "Alpha Plan" });
    await repo.create({ name: "Bravo Plan" });
    const all = await repo.findAllFromDisk();
    assertEquals(all.length, 3);
    assertEquals(all.map((p) => p.name), [
      "Alpha Plan",
      "Bravo Plan",
      "Charlie Plan",
    ]);
  } finally {
    await cleanup(dir);
  }
});

// === service.list filters ===

Deno.test("MarketingPlanService - list with status filter returns only matching", async () => {
  const { repo, service, dir } = await setup();
  try {
    await repo.create({ name: "Drafty" });
    await repo.create({ name: "Active One", status: "active" });
    await repo.create({ name: "Done", status: "completed" });
    const active = await service.list({ status: "active" });
    assertEquals(active.length, 1);
    assertEquals(active[0].name, "Active One");
    const drafts = await service.list({ status: "draft" });
    assertEquals(drafts.length, 1);
    assertEquals(drafts[0].name, "Drafty");
  } finally {
    await cleanup(dir);
  }
});

Deno.test("MarketingPlanService - list with q filter matches name (case-insensitive)", async () => {
  const { repo, service, dir } = await setup();
  try {
    await repo.create({ name: "Spring Launch Plan" });
    await repo.create({ name: "Holiday Sale Plan" });
    const matches = await service.list({ q: "spring" });
    assertEquals(matches.length, 1);
    assertEquals(matches[0].name, "Spring Launch Plan");
  } finally {
    await cleanup(dir);
  }
});

Deno.test("MarketingPlanService - list with q filter matches description (case-insensitive)", async () => {
  const { repo, service, dir } = await setup();
  try {
    await repo.create({
      name: "A",
      description: "Covers ENTERPRISE scope.",
    });
    await repo.create({
      name: "B",
      description: "SMB launch.",
    });
    const matches = await service.list({ q: "enterprise" });
    assertEquals(matches.length, 1);
    assertEquals(matches[0].name, "A");
  } finally {
    await cleanup(dir);
  }
});

Deno.test("MarketingPlanService - list with q filter matches notes body (case-insensitive)", async () => {
  const { repo, service, dir } = await setup();
  try {
    await repo.create({
      name: "A",
      notes: "## Strategy\n\nFocus on UNICORN segments.",
    });
    await repo.create({
      name: "B",
      notes: "## Tactics\n\nStandard playbook.",
    });
    const matches = await service.list({ q: "unicorn" });
    assertEquals(matches.length, 1);
    assertEquals(matches[0].name, "A");
  } finally {
    await cleanup(dir);
  }
});

Deno.test("MarketingPlanService - list combines status + q (AND)", async () => {
  const { repo, service, dir } = await setup();
  try {
    await repo.create({ name: "Match", status: "active" });
    await repo.create({ name: "Wrong status", status: "draft" });
    await repo.create({ name: "Wrong name", status: "active" });
    const matches = await service.list({ status: "active", q: "match" });
    assertEquals(matches.length, 1);
    assertEquals(matches[0].name, "Match");
  } finally {
    await cleanup(dir);
  }
});

Deno.test("MarketingPlanService - list with no options returns all", async () => {
  const { repo, service, dir } = await setup();
  try {
    await repo.create({ name: "A" });
    await repo.create({ name: "B" });
    const all = await service.list();
    assertEquals(all.length, 2);
  } finally {
    await cleanup(dir);
  }
});

// === manual fixture parse ===

Deno.test("MarketingPlanRepository - parses a manually-written file with snake_case campaign dates", async () => {
  const { repo, dir } = await setup();
  try {
    await Deno.mkdir(join(dir, "marketing-plans"), { recursive: true });
    await Deno.writeTextFile(
      join(dir, "marketing-plans", "mktplan_manual.md"),
      [
        "---",
        "id: mktplan_manual",
        "name: Manual Plan",
        "status: active",
        "budget_total: 25000",
        "budget_currency: USD",
        "start_date: 2026-02-01",
        "end_date: 2026-04-30",
        "campaigns:",
        "  - name: C1",
        "    start_date: 2026-02-15",
        "    end_date: 2026-02-28",
        "    budget: 5000",
        "    status: planned",
        "linked_goals:",
        "  - goal_001",
        "  - goal_002",
        "created_at: 2026-01-01T00:00:00.000Z",
        "updated_at: 2026-01-02T00:00:00.000Z",
        "---",
        "## Strategy",
        "",
        "Focus on enterprise.",
        "",
      ].join("\n"),
    );
    const fetched = await repo.findById("mktplan_manual");
    assertExists(fetched);
    assertEquals(fetched!.id, "mktplan_manual");
    assertEquals(fetched!.name, "Manual Plan");
    assertEquals(fetched!.status, "active");
    assertEquals(fetched!.budgetTotal, 25000);
    assertEquals(fetched!.budgetCurrency, "USD");
    assertEquals(fetched!.startDate, "2026-02-01");
    assertEquals(fetched!.endDate, "2026-04-30");
    assertEquals(fetched!.campaigns?.length, 1);
    assertEquals(fetched!.campaigns![0].startDate, "2026-02-15");
    assertEquals(fetched!.campaigns![0].endDate, "2026-02-28");
    assertEquals(fetched!.linkedGoals, ["goal_001", "goal_002"]);
    assertEquals(fetched!.notes?.includes("Focus on enterprise."), true);
  } finally {
    await cleanup(dir);
  }
});

// === edge cases ===

Deno.test("MarketingPlanRepository - optional fields left undefined round-trip as undefined", async () => {
  const { repo, dir } = await setup();
  try {
    const created = await repo.create({ name: "Minimal" });
    assertStrictEquals(created.description, undefined);
    assertStrictEquals(created.budgetTotal, undefined);
    assertStrictEquals(created.project, undefined);
    assertStrictEquals(created.notes, undefined);
    const fetched = await repo.findById(created.id);
    assertExists(fetched);
    assertStrictEquals(fetched!.description, undefined);
    assertStrictEquals(fetched!.budgetTotal, undefined);
    assertStrictEquals(fetched!.project, undefined);
    assertStrictEquals(fetched!.notes, undefined);
    // Empty nested arrays are dropped on serialize → parse returns undefined.
    assertStrictEquals(fetched!.targetAudiences, undefined);
    assertStrictEquals(fetched!.channels, undefined);
    assertStrictEquals(fetched!.campaigns, undefined);
    assertStrictEquals(fetched!.hypothesis, undefined);
    assertStrictEquals(fetched!.learnings, undefined);
    assertStrictEquals(fetched!.linkedGoals, undefined);
  } finally {
    await cleanup(dir);
  }
});

Deno.test("MarketingPlanRepository - findByName returns matching plan (case-insensitive)", async () => {
  const { repo, dir } = await setup();
  try {
    await repo.create({ name: "Premium Plan" });
    await repo.create({ name: "Standard Plan" });
    const found = await repo.findByName("premium plan");
    assertExists(found);
    assertEquals(found!.name, "Premium Plan");
  } finally {
    await cleanup(dir);
  }
});
