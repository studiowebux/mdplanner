// Brainstorm entity registration for SQLite cache.
// Called by initServices() after repos are created.

import {
  ARCHIVE_COLS_DDL,
  archiveCols,
  archiveFieldsFromRow,
  archiveMigrations,
  archiveVals,
  AUDIT_COLS_DDL,
  auditCols,
  auditVals,
  json,
  jsonVal,
  parseJson,
  registerEntityCache,
  val,
} from "../../database/sqlite/mod.ts";
import type { CacheDatabase } from "../../database/sqlite/mod.ts";
import type { BrainstormRepository } from "../../repositories/brainstorm.repository.ts";
import type {
  Brainstorm,
  BrainstormQuestion,
} from "../../types/brainstorm.types.ts";

export const BRAINSTORM_TABLE = "brainstorms";

/** Deserialize a SQLite row to a Brainstorm. */
export function rowToBrainstorm(
  row: Record<string, string | number | null>,
): Brainstorm {
  return {
    id: row.id as string,
    title: (row.title as string) ?? "",
    tags: parseJson<string[]>(row.tags),
    linkedProjects: parseJson<string[]>(row.linked_projects),
    linkedTasks: parseJson<string[]>(row.linked_tasks),
    linkedGoals: parseJson<string[]>(row.linked_goals),
    templateId: row.template_id as string | undefined,
    questions: parseJson<BrainstormQuestion[]>(row.questions) ?? [],
    ...archiveFieldsFromRow(row),
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
  template_id TEXT,
  questions TEXT,
  questions_text TEXT,
  ${ARCHIVE_COLS_DDL},
  ${AUDIT_COLS_DDL}
)`;

function insertBrainstormRow(
  db: CacheDatabase,
  b: Brainstorm,
  syncedAt?: string,
): void {
  db.execute(
    `INSERT OR REPLACE INTO ${BRAINSTORM_TABLE} (id, title, tags,
       linked_projects, linked_tasks, linked_goals, template_id,
       questions, questions_text,
       ${archiveCols()},
       ${auditCols()}, synced_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      val(b.id),
      val(b.title),
      jsonVal(b.tags),
      jsonVal(b.linkedProjects),
      jsonVal(b.linkedTasks),
      jsonVal(b.linkedGoals),
      val(b.templateId),
      json(b.questions),
      questionsToText(b.questions),
      ...archiveVals(b),
      ...auditVals(b),
      syncedAt ?? new Date().toISOString(),
    ],
  );
}

/** Register the brainstorm cache entity. Call from initServices(). */
export function registerBrainstormEntity(repo: BrainstormRepository): void {
  registerEntityCache({
    table: BRAINSTORM_TABLE,
    schema: BRAINSTORM_SCHEMA,
    fts: {
      type: "brainstorm",
      columns: ["id", "title", "questions_text"],
      titleCol: "title",
      contentCol: "questions_text",
    },
    migrations: [
      ...archiveMigrations(BRAINSTORM_TABLE),
      `ALTER TABLE ${BRAINSTORM_TABLE} ADD COLUMN template_id TEXT`,
    ],
    source: () => repo.findAllFromDisk(),
    insert: insertBrainstormRow,
  });
}
