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
  UpdateTask,
} from "../types/task.types.ts";
import type { CacheSync } from "../database/sqlite/mod.ts";
import { insertTaskRow } from "../domains/task/cache.ts";
import { TASK_TABLE } from "../domains/task/constants.ts";
import { generateId } from "../utils/id.ts";

// ---------------------------------------------------------------------------
// Error types
// ---------------------------------------------------------------------------

export class RevisionConflictError extends Error {
  readonly code = "REVISION_CONFLICT";
  constructor(id: string, expected: number, actual: number) {
    super(`Task ${id}: expected revision ${expected}, found ${actual}`);
    this.name = "RevisionConflictError";
  }
}

export class ClaimConflictError extends Error {
  readonly code = "CLAIM_CONFLICT";
  constructor(id: string, currentSection: string) {
    super(`Task ${id} is in section '${currentSection}', expected 'Todo'`);
    this.name = "ClaimConflictError";
  }
}

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

  // -------------------------------------------------------------------------
  // Read
  // -------------------------------------------------------------------------

  async list(options?: ListTaskOptions): Promise<Task[]> {
    let tasks = await this.taskRepo.findAll();

    if (options?.section) {
      const s = options.section.toLowerCase();
      tasks = tasks.filter((t) => t.section.toLowerCase() === s);
    }
    if (options?.project) {
      const p = options.project.toLowerCase();
      tasks = tasks.filter((t) => (t.project ?? "").toLowerCase() === p);
    }
    if (options?.milestone) {
      const m = options.milestone.toLowerCase();
      tasks = tasks.filter((t) => (t.milestone ?? "").toLowerCase() === m);
    }
    if (options?.assignee) {
      tasks = tasks.filter((t) => t.assignee === options.assignee);
    }
    if (options?.tags?.length) {
      const required = options.tags.map((t) => t.toLowerCase());
      tasks = tasks.filter((t) => {
        const taskTags = (t.tags ?? []).map((tg) => tg.toLowerCase());
        return required.every((r) => taskTags.includes(r));
      });
    }
    if (options?.ready) {
      tasks = tasks.filter((t) => {
        if (!t.blocked_by?.length) return true;
        return t.blocked_by.every((bid) => {
          const blocker = tasks.find((bt) => bt.id === bid);
          return !blocker || blocker.completed;
        });
      });
    }

    return tasks;
  }

  async getById(id: string): Promise<Task | null> {
    return this.taskRepo.findById(id);
  }

  async getByName(name: string): Promise<Task | null> {
    const all = await this.taskRepo.findAll();
    const lower = name.toLowerCase();
    return all.find((t) => t.title.toLowerCase() === lower) ?? null;
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
        current.section === "In Progress" &&
        current.claimedBy &&
        current.claimedBy !== agentId
      ) {
        throw new ClaimGuardError(id, current.claimedBy);
      }
    }

    const updated = await this.taskRepo.update(id, data);
    if (updated) this.cacheUpsert(updated);
    return updated;
  }

  async delete(id: string): Promise<boolean> {
    const deleted = await this.taskRepo.delete(id);
    if (deleted) this.cacheRemove(id);
    return deleted;
  }

  // -------------------------------------------------------------------------
  // Workflow
  // -------------------------------------------------------------------------

  async claimTask(
    id: string,
    assignee: string,
    expectedSection = "Todo",
  ): Promise<Task | null> {
    const task = await this.taskRepo.findById(id);
    if (!task) return null;

    if (task.section !== expectedSection) {
      throw new ClaimConflictError(id, task.section);
    }

    const now = new Date().toISOString();
    const updated = await this.taskRepo.update(id, {
      section: "In Progress",
      assignee,
      claimedBy: assignee,
      claimedAt: now,
    });
    if (updated) this.cacheUpsert(updated);
    return updated;
  }

  async moveTask(id: string, newSection: string): Promise<Task | null> {
    const updated = await this.taskRepo.moveToSection(id, newSection);
    if (updated) this.cacheUpsert(updated);
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
    const tasks = await this.list({ section: "Todo", ready: true });
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
    if (updated) this.cacheUpsert(updated);
    return comment;
  }

  // -------------------------------------------------------------------------
  // Attachments
  // -------------------------------------------------------------------------

  async addAttachments(id: string, paths: string[]): Promise<Task | null> {
    const task = await this.taskRepo.findById(id);
    if (!task) return null;

    const attachments = [...(task.attachments ?? []), ...paths];
    const updated = await this.taskRepo.update(id, { attachments });
    if (updated) this.cacheUpsert(updated);
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
      section: "Pending Review",
      approvalRequest: approval,
    });
    if (updated) this.cacheUpsert(updated);
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
      section: "Done",
      completed: true,
      claimedBy: null,
      claimedAt: null,
      approvalRequest: approvalRequest ?? null,
    });
    if (updated) this.cacheUpsert(updated);
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
      section: "In Progress",
      claimedBy: null,
      claimedAt: null,
      approvalRequest: approvalRequest ?? null,
    });
    if (updated) this.cacheUpsert(updated);
    return updated;
  }
}
