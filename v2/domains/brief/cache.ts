// Brief entity registration for SQLite cache.
// Called by initServices() after repos are created.

import { ENTITIES, parseJson, val } from "../../database/sqlite/mod.ts";
import type { CacheDatabase, EntityDef } from "../../database/sqlite/mod.ts";
import type { BriefRepository } from "../../repositories/brief.repository.ts";
import type { Brief } from "../../types/brief.types.ts";

export const BRIEF_TABLE = "briefs";

/** Deserialize a SQLite row to a Brief. */
export function rowToBrief(row: Record<string, unknown>): Brief {
  return {
    id: row.id as string,
    title: (row.title as string) ?? "",
    date: row.date as string | undefined,
    summary: parseJson<string[]>(row.summary),
    mission: parseJson<string[]>(row.mission),
    responsible: parseJson<string[]>(row.responsible),
    accountable: parseJson<string[]>(row.accountable),
    consulted: parseJson<string[]>(row.consulted),
    informed: parseJson<string[]>(row.informed),
    highLevelBudget: parseJson<string[]>(row.high_level_budget),
    highLevelTimeline: parseJson<string[]>(row.high_level_timeline),
    culture: parseJson<string[]>(row.culture),
    changeCapacity: parseJson<string[]>(row.change_capacity),
    guidingPrinciples: parseJson<string[]>(row.guiding_principles),
    createdAt: (row.created_at as string) ?? new Date().toISOString(),
    updatedAt: (row.updated_at as string) ?? new Date().toISOString(),
    createdBy: row.created_by as string | undefined,
    updatedBy: row.updated_by as string | undefined,
  };
}

/** Flatten section arrays to searchable text for FTS. */
function sectionsToText(b: Brief): string {
  return [
    ...(b.summary ?? []),
    ...(b.mission ?? []),
    ...(b.responsible ?? []),
    ...(b.accountable ?? []),
  ].join(" ");
}

const BRIEF_SCHEMA = `CREATE TABLE IF NOT EXISTS ${BRIEF_TABLE} (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  date TEXT,
  summary TEXT,
  mission TEXT,
  responsible TEXT,
  accountable TEXT,
  consulted TEXT,
  informed TEXT,
  high_level_budget TEXT,
  high_level_timeline TEXT,
  culture TEXT,
  change_capacity TEXT,
  guiding_principles TEXT,
  sections_text TEXT,
  created_at TEXT,
  updated_at TEXT,
  created_by TEXT,
  updated_by TEXT,
  synced_at TEXT
)`;

function insertBriefRow(
  db: CacheDatabase,
  b: Brief,
  syncedAt?: string,
): void {
  db.execute(
    `INSERT OR REPLACE INTO ${BRIEF_TABLE} (id, title, date,
       summary, mission, responsible, accountable, consulted, informed,
       high_level_budget, high_level_timeline, culture, change_capacity,
       guiding_principles, sections_text,
       created_at, updated_at, created_by, updated_by, synced_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      val(b.id),
      val(b.title),
      val(b.date),
      b.summary ? JSON.stringify(b.summary) : null,
      b.mission ? JSON.stringify(b.mission) : null,
      b.responsible ? JSON.stringify(b.responsible) : null,
      b.accountable ? JSON.stringify(b.accountable) : null,
      b.consulted ? JSON.stringify(b.consulted) : null,
      b.informed ? JSON.stringify(b.informed) : null,
      b.highLevelBudget ? JSON.stringify(b.highLevelBudget) : null,
      b.highLevelTimeline ? JSON.stringify(b.highLevelTimeline) : null,
      b.culture ? JSON.stringify(b.culture) : null,
      b.changeCapacity ? JSON.stringify(b.changeCapacity) : null,
      b.guidingPrinciples ? JSON.stringify(b.guidingPrinciples) : null,
      sectionsToText(b),
      val(b.createdAt),
      val(b.updatedAt),
      val(b.createdBy),
      val(b.updatedBy),
      syncedAt ?? new Date().toISOString(),
    ],
  );
}

/** Register the brief cache entity. Call from initServices(). */
export function registerBriefEntity(repo: BriefRepository): void {
  const entity: EntityDef = {
    table: BRIEF_TABLE,
    schema: BRIEF_SCHEMA,
    fts: {
      type: "brief",
      columns: ["id", "title", "sections_text"],
      titleCol: "title",
      contentCol: "sections_text",
    },
    sync: async (db, syncedAt) => {
      const items = await repo.findAll();
      for (const b of items) insertBriefRow(db, b, syncedAt);
      return items.length;
    },
  };
  ENTITIES.push(entity);
}
