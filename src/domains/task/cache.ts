// Task entity registration for SQLite cache.
// Called by initServices() after repos are created — no side-effect imports.

import {
  archiveCols,
  archiveFieldsFromRow,
  archiveMigrations,
  archiveVals,
  auditCols,
  auditVals,
  json,
  parseJson,
  registerEntityCache,
  val,
} from "../../database/sqlite/mod.ts";
import type { CacheDatabase } from "../../database/sqlite/mod.ts";
import type { TaskRepository } from "../../repositories/task.repository.ts";
import type { Task } from "../../types/task.types.ts";
import { TASK_SCHEMA, TASK_TABLE } from "./constants.ts";

/** Deserialize a SQLite row to a Task. */
export function rowToTask(row: Record<string, string | number | null>): Task {
  const task: Task = {
    id: row.id as string,
    title: row.title as string,
    completed: row.completed === 1,
    revision: (row.revision as number) ?? 1,
    section: row.section as string,
  };
  applyTaskScalars(task, row);
  applyTaskJson(task, row);
  const archive = archiveFieldsFromRow(row);
  if (archive.archived !== undefined) task.archived = archive.archived;
  if (archive.archivedAt !== undefined) task.archivedAt = archive.archivedAt;
  if (archive.archivedBy !== undefined) task.archivedBy = archive.archivedBy;
  if (row.board_archived === 1 || row.board_archived === "1") {
    task.boardArchived = true;
  }
  if (row.archived_month != null) {
    task.archivedMonth = row.archived_month as string;
  }
  return task;
}

// Nullable [column, Task key] mappings, copied verbatim by type. Table-driven
// so the copy loop stays flat instead of a 20-branch conditional chain.
const TASK_STR_COLS: readonly (readonly [string, keyof Task])[] = [
  ["completed_at", "completedAt"],
  ["created_at", "createdAt"],
  ["updated_at", "updatedAt"],
  ["parent_id", "parentId"],
  ["due_date", "due_date"],
  ["assignee", "assignee"],
  ["milestone", "milestone"],
  ["planned_start", "planned_start"],
  ["planned_end", "planned_end"],
  ["project", "project"],
  ["github_repo", "githubRepo"],
  ["claimed_by", "claimedBy"],
  ["claimed_at", "claimedAt"],
  ["created_by", "createdBy"],
  ["updated_by", "updatedBy"],
];
const TASK_NUM_COLS: readonly (readonly [string, keyof Task])[] = [
  ["priority", "priority"],
  ["effort", "effort"],
  ["sort_order", "order"],
  ["github_issue", "githubIssue"],
  ["github_pr", "githubPR"],
];

/** Copy the nullable scalar columns (string/number) onto the task. */
function applyTaskScalars(
  task: Task,
  row: Record<string, string | number | null>,
): void {
  const t = task as Record<string, unknown>;
  for (const [col, key] of TASK_STR_COLS) {
    if (row[col] != null) t[key] = row[col] as string;
  }
  for (const [col, key] of TASK_NUM_COLS) {
    if (row[col] != null) t[key] = row[col] as number;
  }
  if (row.description != null) {
    task.description = (row.description as string).split("\n");
  }
}

/** Parse and assign the JSON-encoded columns onto the task. */
function applyTaskJson(
  task: Task,
  row: Record<string, string | number | null>,
): void {
  const tags = parseJson<string[]>(row.tags);
  if (tags) task.tags = tags;
  const blockedBy = parseJson<string[]>(row.blocked_by);
  if (blockedBy) task.blocked_by = blockedBy;
  const timeEntries = parseJson<Task["time_entries"]>(row.time_entries);
  if (timeEntries) task.time_entries = timeEntries;
  const attachments = parseJson<string[]>(row.attachments);
  if (attachments) task.attachments = attachments;
  const comments = parseJson<Task["comments"]>(row.comments);
  if (comments) task.comments = comments;
  const approvalArr = parseJson<unknown[]>(row.approval_request);
  if (approvalArr?.[0] != null) {
    task.approvalRequest = approvalArr[0] as Task["approvalRequest"];
  }
  const files = parseJson<string[]>(row.files);
  if (files) task.files = files;
  const children = parseJson<Task["children"]>(row.children);
  if (children) task.children = children;
}

/** Insert or replace a Task in the cache table. */
export function insertTaskRow(
  db: CacheDatabase,
  t: Task,
  syncedAt?: string,
): void {
  db.execute(
    `INSERT OR REPLACE INTO ${TASK_TABLE} (id, title, completed, completed_at,
       ${auditCols()}, revision, section, description, parent_id, tags,
       due_date, assignee, priority, effort, blocked_by, milestone,
       planned_start, planned_end, time_entries, sort_order, attachments,
       project, github_issue, github_repo, github_pr, comments, claimed_by,
       claimed_at, approval_request, files, children, board_archived,
       archived_month, ${archiveCols()}, synced_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      val(t.id),
      val(t.title),
      t.completed ? 1 : 0,
      val(t.completedAt),
      ...auditVals(t),
      t.revision,
      val(t.section),
      val(t.description?.join("\n")),
      val(t.parentId),
      json(t.tags),
      val(t.due_date),
      val(t.assignee),
      t.priority ?? null,
      t.effort ?? null,
      json(t.blocked_by),
      val(t.milestone),
      val(t.planned_start),
      val(t.planned_end),
      json(t.time_entries),
      t.order ?? null,
      json(t.attachments),
      val(t.project),
      t.githubIssue ?? null,
      val(t.githubRepo),
      t.githubPR ?? null,
      json(t.comments),
      val(t.claimedBy),
      val(t.claimedAt),
      json(t.approvalRequest ? [t.approvalRequest] : null),
      json(t.files),
      json(t.children),
      t.boardArchived ? 1 : 0,
      val(t.archivedMonth),
      ...archiveVals(t),
      syncedAt ?? new Date().toISOString(),
    ],
  );
}

/** Register the task cache entity. Call from initServices(). */
export function registerTaskEntity(repo: TaskRepository): void {
  registerEntityCache({
    table: TASK_TABLE,
    schema: TASK_SCHEMA,
    migrations: [
      `CREATE INDEX IF NOT EXISTS idx_tasks_project ON ${TASK_TABLE} (project)`,
      `CREATE INDEX IF NOT EXISTS idx_tasks_section ON ${TASK_TABLE} (section)`,
      `CREATE INDEX IF NOT EXISTS idx_tasks_assignee ON ${TASK_TABLE} (assignee)`,
      `CREATE INDEX IF NOT EXISTS idx_tasks_milestone ON ${TASK_TABLE} (milestone)`,
      `CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON ${TASK_TABLE} (due_date)`,
      `CREATE INDEX IF NOT EXISTS idx_tasks_completed ON ${TASK_TABLE} (completed)`,
      `ALTER TABLE ${TASK_TABLE} ADD COLUMN board_archived INTEGER DEFAULT 0`,
      `ALTER TABLE ${TASK_TABLE} ADD COLUMN archived_month TEXT`,
      `CREATE INDEX IF NOT EXISTS idx_tasks_board_archived ON ${TASK_TABLE} (board_archived)`,
      ...archiveMigrations(TASK_TABLE),
    ],
    fts: {
      type: "task",
      columns: ["id", "title", "description"],
      titleCol: "title",
      contentCol: "description",
    },
    onSyncComplete: () => repo.markClean(),
    // Include board-archived tasks so they stay in the cache → searchable and
    // counted in analytics, even though findAll (board) filters them out.
    source: () => repo.findAllForCache(),
    insert: insertTaskRow,
  });
}
