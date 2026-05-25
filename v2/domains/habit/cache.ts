// Habit entity registration for SQLite cache.

import {
  ARCHIVE_COLS_DDL,
  archiveCols,
  archiveFieldsFromRow,
  archiveMigrations,
  archiveVals,
  auditCols,
  auditVals,
  ENTITIES,
  json,
  parseJson,
  val,
} from "../../database/sqlite/mod.ts";
import type { CacheDatabase, EntityDef } from "../../database/sqlite/mod.ts";
import type { HabitRepository } from "../../repositories/habit.repository.ts";
import type { CompletionEntry, Habit } from "../../types/habit.types.ts";

export const HABIT_TABLE = "habit";

export function rowToHabit(row: Record<string, string | number | null>): Habit {
  return {
    id: row.id as string,
    title: (row.title as string) ?? "",
    description: row.description as string | undefined,
    frequency: ((row.frequency as string) ?? "daily") as Habit["frequency"],
    targetPerPeriod: Number(row.target_per_period ?? 1),
    unit: row.unit as string | undefined,
    completedDates:
      (parseJson<(string | CompletionEntry)[]>(row.completed_dates) ?? []).map(
        (e): CompletionEntry => typeof e === "string" ? { date: e } : e,
      ),
    color: row.color as string | undefined,
    tags: parseJson<string[]>(row.tags) ?? [],
    ...archiveFieldsFromRow(row),
    createdAt: (row.created_at as string) ?? new Date().toISOString(),
    updatedAt: (row.updated_at as string) ?? new Date().toISOString(),
    createdBy: row.created_by as string | undefined,
    updatedBy: row.updated_by as string | undefined,
  };
}

const SCHEMA = `CREATE TABLE IF NOT EXISTS ${HABIT_TABLE} (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  frequency TEXT,
  target_per_period INTEGER,
  unit TEXT,
  completed_dates TEXT,
  color TEXT,
  tags TEXT,
  ${ARCHIVE_COLS_DDL},
  created_at TEXT,
  updated_at TEXT,
  created_by TEXT,
  updated_by TEXT,
  synced_at TEXT
)`;

function insertRow(db: CacheDatabase, h: Habit, syncedAt?: string): void {
  db.execute(
    `INSERT OR REPLACE INTO ${HABIT_TABLE} (id, title, description,
       frequency, target_per_period, unit, completed_dates, color, tags,
       ${archiveCols()},
       ${auditCols()}, synced_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      val(h.id),
      val(h.title),
      val(h.description),
      val(h.frequency),
      h.targetPerPeriod,
      val(h.unit),
      json(h.completedDates),
      val(h.color),
      json(h.tags),
      ...archiveVals(h),
      ...auditVals(h),
      syncedAt ?? new Date().toISOString(),
    ],
  );
}

export function registerHabitEntity(repo: HabitRepository): void {
  const entity: EntityDef = {
    table: HABIT_TABLE,
    schema: SCHEMA,
    migrations: [
      ...archiveMigrations(HABIT_TABLE),
    ],
    fts: {
      type: "habit",
      columns: ["id", "title", "description"],
      titleCol: "title",
      contentCol: "description",
    },
    sync: async (db, syncedAt) => {
      const items = await repo.findAllFromDisk();
      for (const h of items) insertRow(db, h, syncedAt);
      return items.length;
    },
  };
  ENTITIES.push(entity);
}
