// Brainstorm entity registration for SQLite cache.
// Called by initServices() after repos are created.

import {
  auditCols,
  auditVals,
  ENTITIES,
  json,
  jsonVal,
  parseJson,
  val,
} from "../../database/sqlite/mod.ts";
import type { CacheDatabase, EntityDef } from "../../database/sqlite/mod.ts";
import type { BrainstormRepository } from "../../repositories/brainstorm.repository.ts";
import type {
  Brainstorm,
  BrainstormQuestion,
} from "../../types/brainstorm.types.ts";

export const BRAINSTORM_TABLE = "brainstorms";

/** Deserialize a SQLite row to a Brainstorm. */
export function rowToBrainstorm(row: Record<string, unknown>): Brainstorm {
  return {
    id: row.id as string,
    title: (row.title as string) ?? "",
    tags: parseJson<string[]>(row.tags),
    linkedProjects: parseJson<string[]>(row.linked_projects),
    linkedTasks: parseJson<string[]>(row.linked_tasks),
    linkedGoals: parseJson<string[]>(row.linked_goals),
    questions: parseJson<BrainstormQuestion[]>(row.questions) ?? [],
    createdAt: (row.created_at as string) ?? new Date().toISOString(),
    updatedAt: (row.updated_at as string) ?? new Date().toISOString(),
    createdBy: row.created_by as string | undefined,
    updatedBy: row.updated_by as string | undefined,
  };
}

/** Flatten questions to searchable text for FTS. */
function questionsToText(questions: BrainstormQuestion[]): string {
  return questions
    .map((q) => [q.question, q.answer].filter(Boolean).join(" "))
    .join(" ");
}

const BRAINSTORM_SCHEMA = `CREATE TABLE IF NOT EXISTS ${BRAINSTORM_TABLE} (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  tags TEXT,
  linked_projects TEXT,
  linked_tasks TEXT,
  linked_goals TEXT,
  questions TEXT,
  questions_text TEXT,
  created_at TEXT,
  updated_at TEXT,
  created_by TEXT,
  updated_by TEXT,
  synced_at TEXT
)`;

function insertBrainstormRow(
  db: CacheDatabase,
  b: Brainstorm,
  syncedAt?: string,
): void {
  db.execute(
    `INSERT OR REPLACE INTO ${BRAINSTORM_TABLE} (id, title, tags,
       linked_projects, linked_tasks, linked_goals,
       questions, questions_text,
       ${auditCols()}, synced_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      val(b.id),
      val(b.title),
      jsonVal(b.tags),
      jsonVal(b.linkedProjects),
      jsonVal(b.linkedTasks),
      jsonVal(b.linkedGoals),
      json(b.questions),
      questionsToText(b.questions),
      ...auditVals(b),
      syncedAt ?? new Date().toISOString(),
    ],
  );
}

/** Register the brainstorm cache entity. Call from initServices(). */
export function registerBrainstormEntity(repo: BrainstormRepository): void {
  const entity: EntityDef = {
    table: BRAINSTORM_TABLE,
    schema: BRAINSTORM_SCHEMA,
    fts: {
      type: "brainstorm",
      columns: ["id", "title", "questions_text"],
      titleCol: "title",
      contentCol: "questions_text",
    },
    sync: async (db, syncedAt) => {
      const items = await repo.findAll();
      for (const b of items) insertBrainstormRow(db, b, syncedAt);
      return items.length;
    },
  };
  ENTITIES.push(entity);
}
