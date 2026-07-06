#!/usr/bin/env -S deno run --allow-read --allow-write --allow-env
/**
 * scripts/audit-v1-v2-loss.ts
 *
 * Loss-detection audit for the v1→v2 migration. READ-ONLY — never writes.
 *
 * Strategy: use v2's own repositories as the oracle. For every domain service,
 * `list()` (+ `listArchived()` when present) every entity and record the set of
 * fields v2 actually models (normalized to snake_case). Then walk every .md file
 * under the project dir, parse its frontmatter, and report:
 *   - DROPPED KEYS  — frontmatter keys v2 does not carry on the parsed entity
 *                     (potential data loss).
 *   - UNMATCHED     — files whose `id` no v2 service returns (whole entity not
 *                     loaded by any domain: unhandled type, parse failure, or a
 *                     non-entity file like project.md).
 *
 * LIMITATION (be honest): this detects DROPPED KEYS, not value-level mis-reads.
 * If v2 parses a v1 *value* incorrectly (e.g. an enum/date format), the key
 * survives and this audit will NOT flag it. Certifying zero-loss additionally
 * requires a value diff — run this against a copy of REAL v1 data, not just
 * example/.
 *
 * Usage:
 *   deno run --allow-read --allow-write --allow-env scripts/audit-v1-v2-loss.ts [projectDir]
 *   projectDir defaults to ./example
 */

import { join } from "@std/path";
import { parseFrontmatter } from "../src/utils/frontmatter.ts";
import { camelToSnake } from "../src/utils/frontmatter-mapper.ts";
import {
  getBillingRateService,
  getBrainstormService,
  getBrainstormTemplateService,
  getBriefService,
  getBusinessModelService,
  getC4Service,
  getCapacityPlanService,
  getCompanyService,
  getContactService,
  getCustomerService,
  getDealService,
  getDnsService,
  getEisenhowerService,
  getFinanceService,
  getFishboneService,
  getGoalService,
  getHabitService,
  getIdeaService,
  getInvestorService,
  getInvoiceService,
  getJournalService,
  getLeanCanvasService,
  getMarketingPlanService,
  getMeetingService,
  getMilestoneService,
  getMindmapService,
  getMoscowService,
  getNoteService,
  getOnboardingService,
  getOnboardingTemplateService,
  getPaymentService,
  getPeopleService,
  getPortfolioService,
  getProjectValueBoardService,
  getQuoteService,
  getReflectionService,
  getReflectionTemplateService,
  getRetrospectiveService,
  getRiskService,
  getSafeService,
  getStickyNoteService,
  getStrategicLevelsService,
  getSwotService,
  getTaskService,
  getVacationService,
  initServices,
} from "../src/singletons/services.ts";

// Domain entity sources. Each has a `list()`; a few also expose `listArchived()`.
// Skipped: project (config, not entities), github (integration), analytics.
interface ListLike {
  list: () => Promise<Array<Record<string, unknown>>>;
  listArchived?: () => Promise<Array<Record<string, unknown>>>;
}

const DOMAINS: Array<{ name: string; svc: () => ListLike }> = [
  { name: "task", svc: () => getTaskService() as unknown as ListLike },
  { name: "note", svc: () => getNoteService() as unknown as ListLike },
  {
    name: "milestone",
    svc: () => getMilestoneService() as unknown as ListLike,
  },
  { name: "goal", svc: () => getGoalService() as unknown as ListLike },
  { name: "idea", svc: () => getIdeaService() as unknown as ListLike },
  { name: "people", svc: () => getPeopleService() as unknown as ListLike },
  {
    name: "portfolio",
    svc: () => getPortfolioService() as unknown as ListLike,
  },
  {
    name: "marketing-plan",
    svc: () => getMarketingPlanService() as unknown as ListLike,
  },
  { name: "swot", svc: () => getSwotService() as unknown as ListLike },
  { name: "moscow", svc: () => getMoscowService() as unknown as ListLike },
  { name: "c4", svc: () => getC4Service() as unknown as ListLike },
  {
    name: "eisenhower",
    svc: () => getEisenhowerService() as unknown as ListLike,
  },
  { name: "mindmap", svc: () => getMindmapService() as unknown as ListLike },
  { name: "fishbone", svc: () => getFishboneService() as unknown as ListLike },
  {
    name: "business-model",
    svc: () => getBusinessModelService() as unknown as ListLike,
  },
  { name: "risk", svc: () => getRiskService() as unknown as ListLike },
  { name: "vacation", svc: () => getVacationService() as unknown as ListLike },
  {
    name: "strategic-levels",
    svc: () => getStrategicLevelsService() as unknown as ListLike,
  },
  { name: "safe", svc: () => getSafeService() as unknown as ListLike },
  {
    name: "project-value-board",
    svc: () => getProjectValueBoardService() as unknown as ListLike,
  },
  { name: "customer", svc: () => getCustomerService() as unknown as ListLike },
  { name: "contact", svc: () => getContactService() as unknown as ListLike },
  { name: "deal", svc: () => getDealService() as unknown as ListLike },
  { name: "habit", svc: () => getHabitService() as unknown as ListLike },
  { name: "journal", svc: () => getJournalService() as unknown as ListLike },
  {
    name: "reflection",
    svc: () => getReflectionService() as unknown as ListLike,
  },
  {
    name: "reflection-template",
    svc: () => getReflectionTemplateService() as unknown as ListLike,
  },
  {
    name: "onboarding",
    svc: () => getOnboardingService() as unknown as ListLike,
  },
  {
    name: "onboarding-template",
    svc: () => getOnboardingTemplateService() as unknown as ListLike,
  },
  { name: "finance", svc: () => getFinanceService() as unknown as ListLike },
  { name: "company", svc: () => getCompanyService() as unknown as ListLike },
  {
    name: "billing-rate",
    svc: () => getBillingRateService() as unknown as ListLike,
  },
  { name: "quote", svc: () => getQuoteService() as unknown as ListLike },
  { name: "invoice", svc: () => getInvoiceService() as unknown as ListLike },
  { name: "payment", svc: () => getPaymentService() as unknown as ListLike },
  {
    name: "brainstorm",
    svc: () => getBrainstormService() as unknown as ListLike,
  },
  {
    name: "brainstorm-template",
    svc: () => getBrainstormTemplateService() as unknown as ListLike,
  },
  { name: "brief", svc: () => getBriefService() as unknown as ListLike },
  {
    name: "capacity-plan",
    svc: () => getCapacityPlanService() as unknown as ListLike,
  },
  {
    name: "retrospective",
    svc: () => getRetrospectiveService() as unknown as ListLike,
  },
  { name: "meeting", svc: () => getMeetingService() as unknown as ListLike },
  {
    name: "lean-canvas",
    svc: () => getLeanCanvasService() as unknown as ListLike,
  },
  {
    name: "sticky-note",
    svc: () => getStickyNoteService() as unknown as ListLike,
  },
  { name: "dns", svc: () => getDnsService() as unknown as ListLike },
  { name: "investor", svc: () => getInvestorService() as unknown as ListLike },
];

// Frontmatter keys that are structural meta, never a per-domain data field.
// These are produced/consumed by the base layer, not the entity schema.
const META_KEYS = new Set([
  "id",
  "created_at",
  "updated_at",
  "created_by",
  "updated_by",
  "archived",
  "archived_at",
  "archived_by",
]);

interface EntityRecord {
  domain: string;
  keys: Set<string>; // snake_case field names v2 carries
}

/** snake-case every own-key of an entity into a set. */
function entityKeySet(entity: Record<string, unknown>): Set<string> {
  const set = new Set<string>();
  for (const k of Object.keys(entity)) set.add(camelToSnake(k));
  return set;
}

/** Recursively collect every .md file under dir (skips hidden dirs). */
async function walkMd(dir: string): Promise<string[]> {
  const out: string[] = [];
  const entries: Deno.DirEntry[] = [];
  try {
    for await (const e of Deno.readDir(dir)) entries.push(e);
  } catch (err) {
    if (err instanceof Deno.errors.NotFound) return out;
    throw err;
  }
  for (const e of entries) {
    if (e.name.startsWith(".") || e.name.startsWith("._")) continue;
    const full = join(dir, e.name);
    if (e.isDirectory) out.push(...await walkMd(full));
    else if (e.isFile && e.name.endsWith(".md")) out.push(full);
  }
  return out;
}

async function main(): Promise<void> {
  const projectDir = Deno.args.find((a) => !a.startsWith("--")) ?? "./example";
  console.log(`v1→v2 loss audit — oracle: v2 repositories`);
  console.log(`Project directory: ${projectDir}\n`);

  // Cache OFF: list() reads straight from disk, no .db file side effect.
  initServices(projectDir, { cache: false });

  // 1. Build id → {domain, modelled keys} from every domain service.
  const byId = new Map<string, EntityRecord>();
  let loadedEntities = 0;
  for (const { name, svc } of DOMAINS) {
    try {
      const service = svc();
      const items = await service.list();
      const archived = service.listArchived ? await service.listArchived() : [];
      for (const entity of [...items, ...archived]) {
        const id = String(entity.id ?? "");
        if (!id) continue;
        byId.set(id, { domain: name, keys: entityKeySet(entity) });
        loadedEntities++;
      }
    } catch (err) {
      console.warn(
        `  ! ${name}.list() failed: ${
          err instanceof Error ? err.message : String(err)
        }`,
      );
    }
  }
  console.log(
    `Loaded ${loadedEntities} entities across ${DOMAINS.length} domains.\n`,
  );

  // 2. Walk every .md file, compare its frontmatter keys to what v2 carries.
  const droppedByDomain = new Map<string, Map<string, number>>();
  const unmatched: string[] = [];
  let filesScanned = 0;
  let filesWithDrops = 0;

  for (const filePath of await walkMd(projectDir)) {
    let frontmatter: Record<string, unknown>;
    try {
      ({ frontmatter } = parseFrontmatter(await Deno.readTextFile(filePath)));
    } catch {
      continue;
    }
    if (!frontmatter || Object.keys(frontmatter).length === 0) continue;
    filesScanned++;

    const id = String(frontmatter.id ?? "");
    const rec = id ? byId.get(id) : undefined;
    if (!rec) {
      unmatched.push(filePath);
      continue;
    }

    const dropped: string[] = [];
    for (const rawKey of Object.keys(frontmatter)) {
      const key = camelToSnake(rawKey);
      if (META_KEYS.has(key)) continue;
      if (!rec.keys.has(key)) dropped.push(key);
    }
    if (dropped.length > 0) {
      filesWithDrops++;
      const dm = droppedByDomain.get(rec.domain) ?? new Map<string, number>();
      for (const k of dropped) dm.set(k, (dm.get(k) ?? 0) + 1);
      droppedByDomain.set(rec.domain, dm);
    }
  }

  // 3. Report.
  console.log("=== DROPPED FRONTMATTER KEYS (per domain) ===");
  if (droppedByDomain.size === 0) {
    console.log(
      "  none — every matched file's frontmatter keys survive v2 parse.",
    );
  } else {
    for (const [domain, keys] of [...droppedByDomain].sort()) {
      console.log(`\n  [${domain}]`);
      for (const [key, count] of [...keys].sort((a, b) => b[1] - a[1])) {
        console.log(`    ${key}  (${count} file${count === 1 ? "" : "s"})`);
      }
    }
  }

  console.log("\n=== UNMATCHED FILES (id not returned by any v2 service) ===");
  if (unmatched.length === 0) {
    console.log("  none.");
  } else {
    for (const f of unmatched) console.log(`  ${f}`);
  }

  console.log("\n=== SUMMARY ===");
  console.log(`  Entities loaded via v2:  ${loadedEntities}`);
  console.log(`  Files scanned:           ${filesScanned}`);
  console.log(`  Files with dropped keys: ${filesWithDrops}`);
  console.log(`  Unmatched files:         ${unmatched.length}`);
  console.log(
    `  Distinct dropped keys:   ${
      [...droppedByDomain.values()].reduce((n, m) => n + m.size, 0)
    }`,
  );
}

await main();
