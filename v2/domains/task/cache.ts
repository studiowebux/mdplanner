// Task entity registration for SQLite cache.
// Called by initServices() after repos are created — no side-effect imports.

import { ENTITIES, json, parseJson, val } from "../../database/sqlite/mod.ts";
import type { CacheDatabase, EntityDef } from "../../database/sqlite/mod.ts";
import type { TaskRepository } from "../../repositories/task.repository.ts";
import type { Task } from "../../types/task.types.ts";
import { TASK_SCHEMA, TASK_TABLE } from "./constants.ts";

/** Deserialize a SQLite row to a Task. */
export function rowToTask(row: Record<string, unknown>): Task {
  const approvalArr = parseJson<unknown[]>(row.approval_request);
  const task: Task = {
    id: row.id as string,
    title: row.title as string,
    completed: row.completed === 1,
    revision: (row.revision as number) ?? 1,
    section: row.section as string,
  };
  if (row.completed_at != null) task.completedAt = row.completed_at as string;
  if (row.created_at != null) task.createdAt = row.created_at as string;
  if (row.updated_at != null) task.updatedAt = row.updated_at as string;
  if (row.description != null) {
    task.description = (row.description as string).split("\n");
  }
  if (row.parent_id != null) task.parentId = row.parent_id as string;
  const tags = parseJson<string[]>(row.tags);
  if (tags) task.tags = tags;
  if (row.due_date != null) task.due_date = row.due_date as string;
  if (row.assignee != null) task.assignee = row.assignee as string;
  if (row.priority != null) task.priority = row.priority as number;
  if (row.effort != null) task.effort = row.effort as number;
  const blockedBy = parseJson<string[]>(row.blocked_by);
  if (blockedBy) task.blocked_by = blockedBy;
  if (row.milestone != null) task.milestone = row.milestone as string;
  if (row.planned_start != null) {
    task.planned_start = row.planned_start as string;
  }
  if (row.planned_end != null) task.planned_end = row.planned_end as string;
  const timeEntries = parseJson<Task["time_entries"]>(row.time_entries);
  if (timeEntries) task.time_entries = timeEntries;
  if (row.sort_order != null) task.order = row.sort_order as number;
  const attachments = parseJson<string[]>(row.attachments);
  if (attachments) task.attachments = attachments;
  if (row.project != null) task.project = row.project as string;
  if (row.github_issue != null) task.githubIssue = row.github_issue as number;
  if (row.github_repo != null) task.githubRepo = row.github_repo as string;
  if (row.github_pr != null) task.githubPR = row.github_pr as number;
  const comments = parseJson<Task["comments"]>(row.comments);
  if (comments) task.comments = comments;
  if (row.claimed_by != null) task.claimedBy = row.claimed_by as string;
  if (row.claimed_at != null) task.claimedAt = row.claimed_at as string;
  if (approvalArr?.[0] != null) {
    task.approvalRequest = approvalArr[0] as Task["approvalRequest"];
  }
  const files = parseJson<string[]>(row.files);
  if (files) task.files = files;
  return task;
}

/** Insert or replace a Task in the cache table. */
export function insertTaskRow(
  db: CacheDatabase,
  t: Task,
  syncedAt?: string,
): void {
  db.execute(
    `INSERT OR REPLACE INTO ${TASK_TABLE} (id, title, completed, completed_at,
       created_at, updated_at, revision, section, description, parent_id, tags,
       due_date, assignee, priority, effort, blocked_by, milestone,
       planned_start, planned_end, time_entries, sort_order, attachments,
       project, github_issue, github_repo, github_pr, comments, claimed_by,
       claimed_at, approval_request, files, synced_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      val(t.id),
      val(t.title),
      t.completed ? 1 : 0,
      val(t.completedAt),
      val(t.createdAt),
      val(t.updatedAt),
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
      syncedAt ?? new Date().toISOString(),
    ],
  );
}

/** Register the task cache entity. Call from initServices(). */
export function registerTaskEntity(repo: TaskRepository): void {
  const entity: EntityDef = {
    table: TASK_TABLE,
    schema: TASK_SCHEMA,
    fts: {
      type: "task",
      columns: ["id", "title", "description"],
      titleCol: "title",
      contentCol: "description",
    },
    sync: async (db, syncedAt) => {
      const tasks = await repo.findAllFromDisk();
      for (const t of tasks) insertTaskRow(db, t, syncedAt);
      return tasks.length;
    },
  };
  ENTITIES.push(entity);
}
