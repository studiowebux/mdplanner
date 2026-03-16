// Milestone service — orchestrates repository + domain logic.
// Consumed by API routes, MCP tools, and SSR views.

import type { MilestoneRepository } from "../repositories/milestone.repository.ts";
import type { TaskRepository } from "../repositories/task.repository.ts";
import type { Milestone, CreateMilestone, UpdateMilestone } from "../types/milestone.types.ts";
import type { Task } from "../types/task.types.ts";
import { enrichMilestone, enrichMilestones } from "../domains/milestone/milestone.ts";

export class MilestoneService {
  constructor(
    private milestoneRepo: MilestoneRepository,
    private taskRepo: TaskRepository,
  ) {}

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
    return enrichMilestone(created, tasks);
  }

  async update(id: string, data: UpdateMilestone): Promise<Milestone | null> {
    const updated = await this.milestoneRepo.update(id, data);
    if (!updated) return null;
    const tasks = await this.taskRepo.findAll();
    return enrichMilestone(updated, tasks);
  }

  async delete(id: string): Promise<boolean> {
    return this.milestoneRepo.delete(id);
  }

  async getTasksForMilestone(milestoneName: string): Promise<Task[]> {
    const tasks = await this.taskRepo.findAll();
    return tasks.filter((t) => t.milestone === milestoneName);
  }
}
