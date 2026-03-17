// Milestone service — orchestrates repository + domain logic.
// Consumed by API routes, MCP tools, and SSR views.

import type { MilestoneRepository } from "../repositories/milestone.repository.ts";
import type { TaskRepository } from "../repositories/task.repository.ts";
import type {
  CreateMilestone,
  Milestone,
  MilestoneStatus,
  UpdateMilestone,
} from "../types/milestone.types.ts";
import type { Task } from "../types/task.types.ts";
import type { CacheSync } from "../database/sqlite/mod.ts";
import {
  enrichMilestone,
  enrichMilestones,
} from "../domains/milestone/milestone.ts";
import { val } from "../database/sqlite/mod.ts";
import { DONE_SECTION, SECTION_DISPLAY_ORDER } from "../constants/mod.ts";

export interface ListMilestoneOptions {
  status?: MilestoneStatus;
  project?: string;
}

export interface MilestoneSummary {
  milestone: string;
  id: string;
  status: MilestoneStatus;
  description?: string;
  target?: string;
  totalOpen: number;
  totalDone: number;
  completionPct: number;
  sections: Record<string, { id: string; title: string; tags: string[] }[]>;
}

export class MilestoneService {
  private cache: CacheSync | null = null;

  constructor(
    private milestoneRepo: MilestoneRepository,
    private taskRepo: TaskRepository,
  ) {}

  setCache(cache: CacheSync): void {
    this.cache = cache;
  }

  private cacheUpsert(m: Milestone): void {
    this.cache?.upsert("milestones", {
      id: val(m.id),
      name: val(m.name),
      status: val(m.status),
      target: val(m.target),
      description: val(m.description),
      project: val(m.project),
      completed_at: val(m.completedAt),
      created_at: val(m.createdAt),
      task_count: m.taskCount,
      completed_count: m.completedCount,
      progress: m.progress,
    });
  }

  async list(options?: ListMilestoneOptions): Promise<Milestone[]> {
    const [raw, tasks] = await Promise.all([
      this.milestoneRepo.findAll(),
      this.taskRepo.findAll(),
    ]);
    let result = enrichMilestones(raw, tasks);
    if (options?.status) {
      result = result.filter((m) => m.status === options.status);
    }
    if (options?.project) {
      const proj = options.project.toLowerCase();
      result = result.filter(
        (m) => (m.project ?? "").toLowerCase() === proj,
      );
    }
    return result;
  }

  async getById(id: string): Promise<Milestone | null> {
    const [raw, tasks] = await Promise.all([
      this.milestoneRepo.findById(id),
      this.taskRepo.findAll(),
    ]);
    if (!raw) return null;
    return enrichMilestone(raw, tasks);
  }

  async getByName(name: string): Promise<Milestone | null> {
    const [raw, tasks] = await Promise.all([
      this.milestoneRepo.findByName(name),
      this.taskRepo.findAll(),
    ]);
    if (!raw) return null;
    return enrichMilestone(raw, tasks);
  }

  async create(data: CreateMilestone): Promise<Milestone> {
    if (data.project) {
      const existing = await this.milestoneRepo.findAll();
      const duplicate = existing.find(
        (m) => m.name === data.name && m.project === data.project,
      );
      if (duplicate) {
        throw new DuplicateMilestoneError(
          data.name,
          data.project,
          duplicate.id,
        );
      }
    }
    const created = await this.milestoneRepo.create(data);
    const tasks = await this.taskRepo.findAll();
    const enriched = enrichMilestone(created, tasks);
    this.cacheUpsert(enriched);
    return enriched;
  }

  async update(id: string, data: UpdateMilestone): Promise<Milestone | null> {
    const updated = await this.milestoneRepo.update(id, data);
    if (!updated) return null;
    const tasks = await this.taskRepo.findAll();
    const enriched = enrichMilestone(updated, tasks);
    this.cacheUpsert(enriched);
    return enriched;
  }

  async delete(id: string): Promise<boolean> {
    const deleted = await this.milestoneRepo.delete(id);
    if (deleted) this.cache?.remove("milestones", id);
    return deleted;
  }

  async getTasksForMilestone(milestoneName: string): Promise<Task[]> {
    const tasks = await this.taskRepo.findAll();
    return tasks.filter(
      (t) =>
        (t.milestone ?? "").toLowerCase() === milestoneName.toLowerCase(),
    );
  }

  async getSummary(
    milestoneName: string,
    project?: string,
  ): Promise<MilestoneSummary | null> {
    const m = await this.getByName(milestoneName);
    if (!m) return null;

    let tasks = await this.getTasksForMilestone(milestoneName);
    if (project) {
      const proj = project.toLowerCase();
      tasks = tasks.filter(
        (t) => (t.project ?? "").toLowerCase() === proj,
      );
    }

    // Seed known sections in display order, then append any extras from data
    const sections: MilestoneSummary["sections"] = {};
    for (const name of SECTION_DISPLAY_ORDER) {
      sections[name] = [];
    }
    for (const t of tasks) {
      if (!sections[t.section]) sections[t.section] = [];
      sections[t.section].push({
        id: t.id,
        title: t.title,
        tags: t.tags ?? [],
      });
    }

    const totalDone = sections[DONE_SECTION].length;
    return {
      milestone: m.name,
      id: m.id,
      status: m.status,
      description: m.description,
      target: m.target,
      totalOpen: tasks.length - totalDone,
      totalDone,
      completionPct: tasks.length > 0
        ? Math.round((totalDone / tasks.length) * 100)
        : 0,
      sections,
    };
  }
}

export class DuplicateMilestoneError extends Error {
  readonly code = "DUPLICATE_MILESTONE";
  constructor(
    readonly milestoneName: string,
    readonly project: string,
    readonly existingId: string,
  ) {
    super(
      `Milestone '${milestoneName}' already exists for project '${project}' (id: ${existingId})`,
    );
    this.name = "DuplicateMilestoneError";
  }
}
