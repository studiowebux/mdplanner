// Milestone service — orchestrates repository + domain logic.
// Consumed by API routes, MCP tools, and SSR views.

import type { MilestoneRepository } from "../repositories/milestone.repository.ts";
import type { TaskRepository } from "../repositories/task.repository.ts";
import type { Milestone, CreateMilestone, UpdateMilestone } from "../types/milestone.types.ts";
import type { Task } from "../types/task.types.ts";
import type { CacheSync } from "../database/sqlite/mod.ts";
import { enrichMilestone, enrichMilestones } from "../domains/milestone/milestone.ts";
import { val } from "../database/sqlite/mod.ts";

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

  async list(): Promise<Milestone[]> {
    const [raw, tasks] = await Promise.all([
      this.milestoneRepo.findAll(),
      this.taskRepo.findAll(),
    ]);
    return enrichMilestones(raw, tasks);
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
    return tasks.filter((t) => t.milestone === milestoneName);
  }
}
