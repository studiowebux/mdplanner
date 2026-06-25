// Task service — orchestrates repository + workflow logic.
// Consumed by API routes, MCP tools, and SSR views.

import type { TaskRepository } from "../repositories/task.repository.ts";
import type { PeopleRepository } from "../repositories/people.repository.ts";
import type {
  ApprovalRequest,
  BatchUpdateItem,
  BatchUpdateResult,
  CreateTask,
  ListTaskOptions,
  RejectionType,
  Task,
  TaskComment,
  TimeEntry,
  UpdateTask,
} from "../types/task.types.ts";
import type { CacheSync } from "../database/sqlite/mod.ts";
import { insertTaskRow } from "../domains/task/cache.ts";
import { TASK_TABLE } from "../domains/task/constants.ts";
import { generateId } from "../utils/id.ts";
import { ciEquals } from "../utils/string.ts";
import { publish } from "../singletons/event-bus.ts";
import {
  DONE_SECTION,
  IN_PROGRESS_SECTION,
  PENDING_REVIEW_SECTION,
  TODO_SECTION,
} from "../constants/mod.ts";

// ---------------------------------------------------------------------------
// Error types
// ---------------------------------------------------------------------------

/** Thrown on optimistic-lock failure: the task's revision changed since it was read. */
export class RevisionConflictError extends Error {
  readonly code = "REVISION_CONFLICT";
  constructor(id: string, expected: number, actual: number) {
    super(`Task ${id}: expected revision ${expected}, found ${actual}`);
    this.name = "RevisionConflictError";
  }
}

/** Thrown when claiming a task that is no longer in Todo (another agent claimed it first). */
export class ClaimConflictError extends Error {
  readonly code = "CLAIM_CONFLICT";
  constructor(id: string, currentSection: string) {
    super(`Task ${id} is in section '${currentSection}', expected 'Todo'`);
    this.name = "ClaimConflictError";
  }
}

/** Thrown when updating a task currently claimed by a different agent. */
export class ClaimGuardError extends Error {
  readonly code = "CLAIM_GUARD";
  constructor(id: string, claimedBy: string) {
    super(`Task ${id} is claimed by ${claimedBy} — cannot update`);
    this.name = "ClaimGuardError";
  }
}

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

/**
 * Orchestrates task CRUD, claim/approval workflow, comments, and time entries
 * over the task + people repositories, keeping the SQLite cache mirror in sync.
 */
export class TaskService {
  private cache: CacheSync | null = null;

  constructor(
    private taskRepo: TaskRepository,
    private peopleRepo: PeopleRepository,
  ) {}

  setCache(cache: CacheSync): void {
    this.cache = cache;
  }

  private cacheUpsert(t: Task): void {
    if (!this.cache) return;
    this.cache.remove(TASK_TABLE, t.id);
    insertTaskRow(this.cache.getDb(), t);
  }

  private cacheRemove(id: string): void {
    this.cache?.remove(TASK_TABLE, id);
  }

  // Standalone service (no BaseService) — publish the SSE refresh directly so
  // mutations via REST *or* MCP live-update browsers. Same contract as
  // BaseService.publishChange; prefix = "task".
  //
  // Event taxonomy drives how the list view live-updates (see TaskSseRefresh +
  // task-sse-row.js):
  //   - "updated" carries the changed task `id` → the client swaps only that
  //     row (`#task-row-<id>`). Use ONLY for same-section field edits where the
  //     row stays put (assignee, comments, time entries, attachments, …).
  //   - "created" / "moved" / "deleted" carry no id → the client refetches the
  //     whole #tasks-view (membership/section/order changes that a single-row
  //     swap cannot relocate correctly).
  private publishChange(
    event: "updated" | "created" | "moved" | "deleted" = "updated",
    id?: string,
  ): void {
    publish(`task.${event}`, id !== undefined ? { id } : undefined);
  }

  // -------------------------------------------------------------------------
  // Read
  // -------------------------------------------------------------------------

  async list(options?: ListTaskOptions): Promise<Task[]> {
    const tasks = await this.taskRepo.findAll();
    return this.applyFilters(tasks, options);
  }

  /**
   * List archived tasks only. Mirror of `list` for callers that opt in to
   * archived rows (MCP `list_tasks { archived: true }` etc.). Filters from
   * `list` apply identically to the archived set. See
   * `[architecture] MD Planner — Soft-delete (archive) pattern`.
   */
  async listArchived(options?: ListTaskOptions): Promise<Task[]> {
    const tasks = await this.taskRepo.findArchived();
    return this.applyFilters(tasks, options);
  }

  private applyFilters(
    tasks: Task[],
    options?: ListTaskOptions,
  ): Task[] {
    let result = tasks;
    if (options?.section) {
      result = result.filter((t) => ciEquals(t.section, options.section));
    }
    if (options?.project) {
      result = result.filter((t) => ciEquals(t.project, options.project));
    }
    if (options?.milestone) {
      result = result.filter((t) => ciEquals(t.milestone, options.milestone));
    }
    if (options?.assignee) {
      result = result.filter((t) => t.assignee === options.assignee);
    }
    if (options?.tags?.length) {
      const required = options.tags.map((t) => t.toLowerCase());
      result = result.filter((t) => {
        const taskTags = (t.tags ?? []).map((tg) => tg.toLowerCase());
        return required.every((r) => taskTags.includes(r));
      });
    }
    if (options?.ready) {
      result = result.filter((t) => {
        if (!t.blocked_by?.length) return true;
        return t.blocked_by.every((bid) => {
          const blocker = result.find((bt) => bt.id === bid);
          return !blocker || blocker.completed;
        });
      });
    }
    return result;
  }

  async getById(id: string): Promise<Task | null> {
    return this.taskRepo.findById(id);
  }

  async getByName(name: string): Promise<Task | null> {
    const all = await this.taskRepo.findAll();
    return all.find((t) => ciEquals(t.title, name)) ?? null;
  }

  async getSlim(id: string): Promise<Task | null> {
    const task = await this.taskRepo.findById(id);
    if (!task) return null;
    const {
      comments: _c,
      time_entries: _te,
      approvalRequest: _ar,
      ...slim
    } = task;
    return slim as Task;
  }

  // -------------------------------------------------------------------------
  // Write
  // -------------------------------------------------------------------------

  async create(data: CreateTask): Promise<Task> {
    const created = await this.taskRepo.create(data);
    this.cacheUpsert(created);
    this.publishChange("created");
    return created;
  }

  async update(
    id: string,
    data: UpdateTask,
    expectedRevision?: number,
    agentId?: string,
  ): Promise<Task | null> {
    if (expectedRevision !== undefined || agentId) {
      const current = await this.taskRepo.findById(id);
      if (!current) return null;
      if (
        expectedRevision !== undefined &&
        current.revision !== expectedRevision
      ) {
        throw new RevisionConflictError(
          id,
          expectedRevision,
          current.revision,
        );
      }
      if (
        agentId &&
        current.section === IN_PROGRESS_SECTION &&
        current.claimedBy &&
        current.claimedBy !== agentId
      ) {
        throw new ClaimGuardError(id, current.claimedBy);
      }
    }

    const updated = await this.taskRepo.update(id, data);
    if (updated) {
      this.cacheUpsert(updated);
      // A section/completion change relocates the row across sections and
      // shifts section counts → full-view refetch ("moved"). A pure field edit
      // keeps the row in place → targeted single-row swap ("updated" + id).
      const membershipChange = data.section !== undefined ||
        data.completed !== undefined;
      if (membershipChange) this.publishChange("moved");
      else this.publishChange("updated", id);
    }
    return updated;
  }

  async delete(id: string): Promise<boolean> {
    const deleted = await this.taskRepo.delete(id);
    if (deleted) {
      this.cacheRemove(id);
      this.publishChange("deleted");
    }
    return deleted;
  }

  /** Soft-delete (archive). Aliased by `delete`. See
   * `[architecture] MD Planner — Soft-delete (archive) pattern`. */
  async archive(id: string, by?: string): Promise<boolean> {
    const ok = await this.taskRepo.archive(id, by);
    if (ok) {
      this.cacheRemove(id);
      // Leaves the active view → full refetch.
      this.publishChange("moved");
    }
    return ok;
  }

  /** Restore a soft-deleted task. */
  async restore(id: string): Promise<boolean> {
    const ok = await this.taskRepo.restore(id);
    if (ok) {
      const restored = await this.taskRepo.findById(id);
      if (restored) this.cacheUpsert(restored);
      // Re-enters the active view → full refetch.
      this.publishChange("moved");
    }
    return ok;
  }

  // -------------------------------------------------------------------------
  // Monthly board archive — sweep Done tasks off the active board while
  // keeping them in search + analytics. Distinct from soft-delete `archive`.
  // -------------------------------------------------------------------------

  /** Sweep a single Done task into the monthly archive. */
  async boardArchive(id: string, month?: string): Promise<boolean> {
    const ok = await this.taskRepo.boardArchive(id, month);
    if (ok) {
      // Re-cache with board_archived=1: stays searchable + counted, but
      // findAll (board) filters it out. Leaves the active view → full refetch.
      const archived = await this.taskRepo.findById(id);
      if (archived) this.cacheUpsert(archived);
      this.publishChange("moved");
    }
    return ok;
  }

  /** Restore a board-archived task to the active board. */
  async boardRestore(id: string): Promise<boolean> {
    const ok = await this.taskRepo.boardRestore(id);
    if (ok) {
      const restored = await this.taskRepo.findById(id);
      if (restored) this.cacheUpsert(restored);
      this.publishChange("moved");
    }
    return ok;
  }

  /**
   * Bulk sweep: board-archive every Done task whose completion month is
   * strictly before `beforeMonth` (YYYY-MM). Returns the swept task ids.
   */
  async sweepDoneBefore(beforeMonth: string): Promise<string[]> {
    const done = await this.list({ section: DONE_SECTION });
    const swept: string[] = [];
    for (const task of done) {
      const completedMonth = (task.completedAt ?? "").slice(0, 7);
      if (completedMonth && completedMonth < beforeMonth) {
        if (await this.taskRepo.boardArchive(task.id, completedMonth)) {
          const archived = await this.taskRepo.findById(task.id);
          if (archived) this.cacheUpsert(archived);
          swept.push(task.id);
        }
      }
    }
    if (swept.length > 0) this.publishChange("moved");
    return swept;
  }

  /** Board-archived tasks only (browse-by-month view). */
  async listBoardArchived(options?: ListTaskOptions): Promise<Task[]> {
    const tasks = await this.taskRepo.findBoardArchived();
    return this.applyFilters(tasks, options);
  }

  /**
   * Tasks for analytics: the active board PLUS board-archived tasks (which are
   * excluded from the board but must still count in rollups). Soft-deleted
   * `archived` tasks remain excluded.
   */
  async listForAnalytics(options?: ListTaskOptions): Promise<Task[]> {
    const [board, archived] = await Promise.all([
      this.taskRepo.findAll(),
      this.taskRepo.findBoardArchived(),
    ]);
    return this.applyFilters([...board, ...archived], options);
  }

  /** Permanently delete the task file from disk. No recovery. */
  async hardDelete(id: string): Promise<boolean> {
    const ok = await this.taskRepo.hardDelete(id);
    if (ok) {
      this.cacheRemove(id);
      this.publishChange("deleted");
    }
    return ok;
  }

  // -------------------------------------------------------------------------
  // Workflow
  // -------------------------------------------------------------------------

  async claimTask(
    id: string,
    assignee: string,
    expectedSection: string = TODO_SECTION,
  ): Promise<Task | null> {
    const task = await this.taskRepo.findById(id);
    if (!task) return null;

    if (task.section !== expectedSection) {
      throw new ClaimConflictError(id, task.section);
    }

    const now = new Date().toISOString();
    const updated = await this.taskRepo.update(id, {
      section: IN_PROGRESS_SECTION,
      assignee,
      claimedBy: assignee,
      claimedAt: now,
    });
    if (updated) {
      this.cacheUpsert(updated);
      // Section → In Progress → full refetch.
      this.publishChange("moved");
    }
    return updated;
  }

  async moveTask(id: string, newSection: string): Promise<Task | null> {
    const updated = await this.taskRepo.moveToSection(id, newSection);
    if (updated) {
      this.cacheUpsert(updated);
      this.publishChange("moved");
    }
    return updated;
  }

  async sweepStaleClaims(ttlMinutes = 60): Promise<string[]> {
    const all = await this.taskRepo.findAll();
    const cutoff = Date.now() - ttlMinutes * 60_000;
    const swept: string[] = [];

    for (const task of all) {
      if (
        task.claimedBy &&
        task.claimedAt &&
        new Date(task.claimedAt).getTime() < cutoff
      ) {
        const updated = await this.taskRepo.update(task.id, {
          claimedBy: null,
          claimedAt: null,
        });
        if (updated) {
          this.cacheUpsert(updated);
          swept.push(task.id);
        }
      }
    }

    // Bulk claim-clear across many tasks → full refetch.
    if (swept.length > 0) this.publishChange("moved");
    return swept;
  }

  async batchUpdate(items: BatchUpdateItem[]): Promise<BatchUpdateResult> {
    const results = await Promise.allSettled(
      items.map(async (item) => {
        const updated = await this.update(item.id, item.updates);
        if (!updated) throw new Error(`Task ${item.id} not found`);
        if (item.comment) {
          await this.addComment(item.id, item.comment);
        }
        return { id: item.id, task: updated };
      }),
    );

    const succeeded: BatchUpdateResult["succeeded"] = [];
    const failed: BatchUpdateResult["failed"] = [];

    for (let i = 0; i < results.length; i++) {
      const r = results[i];
      if (r.status === "fulfilled") {
        succeeded.push(r.value);
      } else {
        failed.push({
          id: items[i].id,
          error: r.reason?.message ?? "Unknown error",
        });
      }
    }

    return { succeeded, failed };
  }

  async getNextTask(
    agentId: string,
    agentSkills?: string[],
  ): Promise<Task | null> {
    const tasks = await this.list({ section: TODO_SECTION, ready: true });
    if (tasks.length === 0) return null;

    const sorted = [...tasks].sort((a, b) => {
      const pa = a.priority ?? 5;
      const pb = b.priority ?? 5;
      if (pa !== pb) return pa - pb;
      return (a.order ?? 0) - (b.order ?? 0);
    });

    if (agentSkills?.length) {
      const skills = agentSkills.map((s) => s.toLowerCase());
      const matched = sorted.find((t) => {
        const tags = (t.tags ?? []).map((tg) => tg.toLowerCase());
        return tags.some((tg) => skills.includes(tg));
      });
      if (matched) return matched;
    }

    return sorted[0];
  }

  // -------------------------------------------------------------------------
  // Comments
  // -------------------------------------------------------------------------

  async addComment(
    id: string,
    body: string,
    author = "Claude",
    metadata?: Record<string, unknown>,
  ): Promise<TaskComment | null> {
    const task = await this.taskRepo.findById(id);
    if (!task) return null;

    const comment: TaskComment = {
      id: generateId("comment"),
      author,
      timestamp: new Date().toISOString(),
      body,
      ...(metadata ? { metadata } : {}),
    };

    const comments = [...(task.comments ?? []), comment];
    const updated = await this.taskRepo.update(id, { comments });
    if (updated) {
      this.cacheUpsert(updated);
      this.publishChange("updated", id);
    }
    return comment;
  }

  // -------------------------------------------------------------------------
  // Time entries
  // -------------------------------------------------------------------------

  async addTimeEntry(
    id: string,
    data: Omit<TimeEntry, "id">,
  ): Promise<TimeEntry | null> {
    const task = await this.taskRepo.findById(id);
    if (!task) return null;

    const entry: TimeEntry = { id: generateId("te"), ...data };
    const time_entries = [...(task.time_entries ?? []), entry];
    const updated = await this.taskRepo.update(id, { time_entries });
    if (updated) {
      this.cacheUpsert(updated);
      this.publishChange("updated", id);
    }
    return entry;
  }

  async deleteTimeEntry(id: string, entryId: string): Promise<boolean> {
    const task = await this.taskRepo.findById(id);
    if (!task) return false;
    if (!task.time_entries?.find((e) => e.id === entryId)) return false;

    const time_entries = (task.time_entries ?? []).filter((e) =>
      e.id !== entryId
    );
    const updated = await this.taskRepo.update(id, { time_entries });
    if (updated) {
      this.cacheUpsert(updated);
      this.publishChange("updated", id);
    }
    return true;
  }

  // -------------------------------------------------------------------------
  // Attachments
  // -------------------------------------------------------------------------

  async addAttachments(id: string, paths: string[]): Promise<Task | null> {
    const task = await this.taskRepo.findById(id);
    if (!task) return null;

    const attachments = [...(task.attachments ?? []), ...paths];
    const updated = await this.taskRepo.update(id, { attachments });
    if (updated) {
      this.cacheUpsert(updated);
      this.publishChange("updated", id);
    }
    return updated;
  }

  // -------------------------------------------------------------------------
  // Approval
  // -------------------------------------------------------------------------

  async requestApproval(
    id: string,
    requestedBy: string,
    summary: string,
    commitHash?: string,
    artifactUrls?: string[],
  ): Promise<Task | null> {
    const approval: ApprovalRequest = {
      id: generateId("approval"),
      requestedAt: new Date().toISOString(),
      requestedBy,
      summary,
      ...(commitHash ? { commitHash } : {}),
      ...(artifactUrls?.length ? { artifactUrls } : {}),
    };

    const updated = await this.taskRepo.update(id, {
      section: PENDING_REVIEW_SECTION,
      approvalRequest: approval,
    });
    if (updated) {
      this.cacheUpsert(updated);
      // Section → Pending Review → full refetch.
      this.publishChange("moved");
    }
    return updated;
  }

  async approveTask(
    id: string,
    decidedBy: string,
    feedback?: string,
  ): Promise<Task | null> {
    const task = await this.taskRepo.findById(id);
    if (!task) return null;

    const verdict = {
      decidedAt: new Date().toISOString(),
      decidedBy,
      decision: "approved" as const,
      ...(feedback ? { feedback } : {}),
    };

    const approvalRequest = task.approvalRequest
      ? { ...task.approvalRequest, verdict }
      : undefined;

    const updated = await this.taskRepo.update(id, {
      section: DONE_SECTION,
      completed: true,
      claimedBy: null,
      claimedAt: null,
      approvalRequest: approvalRequest ?? null,
    });
    if (updated) {
      this.cacheUpsert(updated);
      // Section → Done → full refetch.
      this.publishChange("moved");
    }
    return updated;
  }

  async rejectTask(
    id: string,
    decidedBy: string,
    feedback?: string,
    rejectionType?: RejectionType,
  ): Promise<Task | null> {
    const task = await this.taskRepo.findById(id);
    if (!task) return null;

    const verdict = {
      decidedAt: new Date().toISOString(),
      decidedBy,
      decision: "rejected" as const,
      ...(feedback ? { feedback } : {}),
      ...(rejectionType ? { rejectionType } : {}),
    };

    const approvalRequest = task.approvalRequest
      ? { ...task.approvalRequest, verdict }
      : undefined;

    const updated = await this.taskRepo.update(id, {
      section: IN_PROGRESS_SECTION,
      claimedBy: null,
      claimedAt: null,
      approvalRequest: approvalRequest ?? null,
    });
    if (updated) {
      this.cacheUpsert(updated);
      // Section → In Progress → full refetch.
      this.publishChange("moved");
    }
    return updated;
  }
}
