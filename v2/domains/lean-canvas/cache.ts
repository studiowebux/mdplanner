// Lean Canvas entity registration for SQLite cache.
// Called by initServices() after repos are created.

import { ENTITIES, parseJson, val } from "../../database/sqlite/mod.ts";
import type { CacheDatabase, EntityDef } from "../../database/sqlite/mod.ts";
import type { LeanCanvasRepository } from "../../repositories/lean-canvas.repository.ts";
import type { LeanCanvas } from "../../types/lean-canvas.types.ts";
import { LEAN_CANVAS_SECTIONS } from "../../types/lean-canvas.types.ts";

export const LEAN_CANVAS_TABLE = "lean_canvases";

/** Deserialize a SQLite row to a LeanCanvas. */
export function rowToLeanCanvas(row: Record<string, unknown>): LeanCanvas {
  return {
    id: row.id as string,
    title: (row.title as string) ?? "",
    project: row.project as string | undefined,
    date: row.date as string | undefined,
    problem: parseJson<string[]>(row.problem) ?? [],
    solution: parseJson<string[]>(row.solution) ?? [],
    uniqueValueProp: parseJson<string[]>(row.unique_value_prop) ?? [],
    unfairAdvantage: parseJson<string[]>(row.unfair_advantage) ?? [],
    customerSegments: parseJson<string[]>(row.customer_segments) ?? [],
    existingAlternatives: parseJson<string[]>(row.existing_alternatives) ?? [],
    keyMetrics: parseJson<string[]>(row.key_metrics) ?? [],
    highLevelConcept: parseJson<string[]>(row.high_level_concept) ?? [],
    channels: parseJson<string[]>(row.channels) ?? [],
    earlyAdopters: parseJson<string[]>(row.early_adopters) ?? [],
    costStructure: parseJson<string[]>(row.cost_structure) ?? [],
    revenueStreams: parseJson<string[]>(row.revenue_streams) ?? [],
    completedSections: (row.completed_sections as number) ?? 0,
    sectionCount: (row.section_count as number) ?? 0,
    completionPct: (row.completion_pct as number) ?? 0,
    createdAt: (row.created_at as string) ?? new Date().toISOString(),
    updatedAt: (row.updated_at as string) ?? new Date().toISOString(),
    createdBy: row.created_by as string | undefined,
    updatedBy: row.updated_by as string | undefined,
  };
}

/** Flatten all 12 section arrays to a single searchable text string for FTS. */
function sectionsToText(lc: LeanCanvas): string {
  return LEAN_CANVAS_SECTIONS.flatMap((s) => {
    const items = lc[s.key as keyof LeanCanvas];
    return Array.isArray(items) ? items : [];
  }).join(" ");
}

const LEAN_CANVAS_SCHEMA = `CREATE TABLE IF NOT EXISTS ${LEAN_CANVAS_TABLE} (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  project TEXT,
  date TEXT,
  problem TEXT,
  solution TEXT,
  unique_value_prop TEXT,
  unfair_advantage TEXT,
  customer_segments TEXT,
  existing_alternatives TEXT,
  key_metrics TEXT,
  high_level_concept TEXT,
  channels TEXT,
  early_adopters TEXT,
  cost_structure TEXT,
  revenue_streams TEXT,
  sections_text TEXT,
  completed_sections INTEGER DEFAULT 0,
  section_count INTEGER DEFAULT 0,
  completion_pct INTEGER DEFAULT 0,
  created_at TEXT,
  updated_at TEXT,
  created_by TEXT,
  updated_by TEXT,
  synced_at TEXT
)`;

export function insertLeanCanvasRow(
  db: CacheDatabase,
  lc: LeanCanvas,
  syncedAt?: string,
): void {
  db.execute(
    `INSERT OR REPLACE INTO ${LEAN_CANVAS_TABLE} (
       id, title, project, date,
       problem, solution, unique_value_prop, unfair_advantage,
       customer_segments, existing_alternatives, key_metrics, high_level_concept,
       channels, early_adopters, cost_structure, revenue_streams,
       sections_text, completed_sections, section_count, completion_pct,
       created_at, updated_at, created_by, updated_by, synced_at
     ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      val(lc.id),
      val(lc.title),
      val(lc.project),
      val(lc.date),
      lc.problem.length > 0 ? JSON.stringify(lc.problem) : null,
      lc.solution.length > 0 ? JSON.stringify(lc.solution) : null,
      lc.uniqueValueProp.length > 0 ? JSON.stringify(lc.uniqueValueProp) : null,
      lc.unfairAdvantage.length > 0 ? JSON.stringify(lc.unfairAdvantage) : null,
      lc.customerSegments.length > 0
        ? JSON.stringify(lc.customerSegments)
        : null,
      lc.existingAlternatives.length > 0
        ? JSON.stringify(lc.existingAlternatives)
        : null,
      lc.keyMetrics.length > 0 ? JSON.stringify(lc.keyMetrics) : null,
      lc.highLevelConcept.length > 0
        ? JSON.stringify(lc.highLevelConcept)
        : null,
      lc.channels.length > 0 ? JSON.stringify(lc.channels) : null,
      lc.earlyAdopters.length > 0 ? JSON.stringify(lc.earlyAdopters) : null,
      lc.costStructure.length > 0 ? JSON.stringify(lc.costStructure) : null,
      lc.revenueStreams.length > 0 ? JSON.stringify(lc.revenueStreams) : null,
      sectionsToText(lc),
      lc.completedSections,
      lc.sectionCount,
      lc.completionPct,
      val(lc.createdAt),
      val(lc.updatedAt),
      val(lc.createdBy),
      val(lc.updatedBy),
      syncedAt ?? new Date().toISOString(),
    ],
  );
}

/** Register the lean canvas cache entity. Call from initServices(). */
export function registerLeanCanvasEntity(repo: LeanCanvasRepository): void {
  const entity: EntityDef = {
    table: LEAN_CANVAS_TABLE,
    schema: LEAN_CANVAS_SCHEMA,
    fts: {
      type: "lean-canvas",
      columns: ["id", "title", "sections_text"],
      titleCol: "title",
      contentCol: "sections_text",
    },
    sync: async (db, syncedAt) => {
      const items = await repo.findAllFromDisk();
      for (const lc of items) insertLeanCanvasRow(db, lc, syncedAt);
      return items.length;
    },
  };
  ENTITIES.push(entity);
}
