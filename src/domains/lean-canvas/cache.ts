// Lean Canvas entity registration for SQLite cache.
// Called by initServices() after repos are created.

import {
  ARCHIVE_COLS_DDL,
  archiveCols,
  archiveFieldsFromRow,
  archiveMigrations,
  archiveVals,
  AUDIT_COLS_DDL,
  auditCols,
  auditFieldsFromRow,
  auditVals,
  jsonVal,
  parseJson,
  registerEntityCache,
  val,
} from "../../database/sqlite/mod.ts";
import type { CacheDatabase } from "../../database/sqlite/mod.ts";
import type { LeanCanvasRepository } from "../../repositories/lean-canvas.repository.ts";
import type { LeanCanvas } from "../../types/lean-canvas.types.ts";
import { LEAN_CANVAS_SECTIONS } from "../../types/lean-canvas.types.ts";

export const LEAN_CANVAS_TABLE = "lean_canvases";

/** Parse a JSON string-array column, falling back to empty array. */
function lcArr(
  row: Record<string, string | number | null>,
  col: string,
): string[] {
  return parseJson<string[]>(row[col]) ?? [];
}

/** Deserialize a SQLite row to a LeanCanvas. */
export function rowToLeanCanvas(
  row: Record<string, string | number | null>,
): LeanCanvas {
  return {
    id: row.id as string,
    title: (row.title as string) ?? "",
    project: row.project as string | undefined,
    date: row.date as string | undefined,
    problem: lcArr(row, "problem"),
    solution: lcArr(row, "solution"),
    uniqueValueProp: lcArr(row, "unique_value_prop"),
    unfairAdvantage: lcArr(row, "unfair_advantage"),
    customerSegments: lcArr(row, "customer_segments"),
    existingAlternatives: lcArr(row, "existing_alternatives"),
    keyMetrics: lcArr(row, "key_metrics"),
    highLevelConcept: lcArr(row, "high_level_concept"),
    channels: lcArr(row, "channels"),
    earlyAdopters: lcArr(row, "early_adopters"),
    costStructure: lcArr(row, "cost_structure"),
    revenueStreams: lcArr(row, "revenue_streams"),
    completedSections: (row.completed_sections as number) ?? 0,
    sectionCount: (row.section_count as number) ?? 0,
    completionPct: (row.completion_pct as number) ?? 0,
    ...archiveFieldsFromRow(row),
    ...auditFieldsFromRow(row),
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
  ${ARCHIVE_COLS_DDL},
  ${AUDIT_COLS_DDL}
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
       ${archiveCols()},
       ${auditCols()}, synced_at
     ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      val(lc.id),
      val(lc.title),
      val(lc.project),
      val(lc.date),
      jsonVal(lc.problem),
      jsonVal(lc.solution),
      jsonVal(lc.uniqueValueProp),
      jsonVal(lc.unfairAdvantage),
      jsonVal(lc.customerSegments),
      jsonVal(lc.existingAlternatives),
      jsonVal(lc.keyMetrics),
      jsonVal(lc.highLevelConcept),
      jsonVal(lc.channels),
      jsonVal(lc.earlyAdopters),
      jsonVal(lc.costStructure),
      jsonVal(lc.revenueStreams),
      sectionsToText(lc),
      lc.completedSections,
      lc.sectionCount,
      lc.completionPct,
      ...archiveVals(lc),
      ...auditVals(lc),
      syncedAt ?? new Date().toISOString(),
    ],
  );
}

/** Register the lean canvas cache entity. Call from initServices(). */
export function registerLeanCanvasEntity(repo: LeanCanvasRepository): void {
  registerEntityCache({
    table: LEAN_CANVAS_TABLE,
    schema: LEAN_CANVAS_SCHEMA,
    migrations: [
      ...archiveMigrations(LEAN_CANVAS_TABLE),
    ],
    fts: {
      type: "lean_canvas",
      columns: ["id", "title", "sections_text"],
      titleCol: "title",
      contentCol: "sections_text",
    },
    source: () => repo.findAllFromDisk(),
    insert: insertLeanCanvasRow,
  });
}
