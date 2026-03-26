// Goal service — business logic over GoalRepository.

import type { GoalRepository } from "../repositories/goal.repository.ts";
import type { CreateGoal, Goal, UpdateGoal } from "../types/goal.types.ts";

export class GoalService {
  constructor(private repo: GoalRepository) {}

  async list(options?: {
    status?: string;
    type?: string;
    project?: string;
  }): Promise<Goal[]> {
    let goals = await this.repo.findAll();
    if (options?.status) {
      goals = goals.filter((g) => g.status === options.status);
    }
    if (options?.type) {
      goals = goals.filter((g) => g.type === options.type);
    }
    if (options?.project) {
      goals = goals.filter((g) =>
        g.project?.toLowerCase() === options.project!.toLowerCase()
      );
    }
    return goals;
  }

  async getById(id: string): Promise<Goal | null> {
    return this.repo.findById(id);
  }

  async getByName(name: string): Promise<Goal | null> {
    return this.repo.findByName(name);
  }

  async create(data: CreateGoal): Promise<Goal> {
    return this.repo.create(data);
  }

  async update(id: string, data: UpdateGoal): Promise<Goal | null> {
    return this.repo.update(id, data);
  }

  async delete(id: string): Promise<boolean> {
    return this.repo.delete(id);
  }
}
