// Goal service — business logic over GoalRepository.

import type { GoalRepository } from "../repositories/goal.repository.ts";
import type { CreateGoal, Goal, UpdateGoal } from "../types/goal.types.ts";
import { ciEquals } from "../utils/string.ts";
import { BaseService } from "./base.service.ts";

interface GoalListOptions {
  status?: string;
  type?: string;
  project?: string;
}

export class GoalService extends BaseService<
  Goal,
  CreateGoal,
  UpdateGoal,
  GoalListOptions
> {
  constructor(repo: GoalRepository) {
    super(repo);
  }

  protected applyFilters(goals: Goal[], options: GoalListOptions): Goal[] {
    if (options.status) {
      goals = goals.filter((g) => g.status === options.status);
    }
    if (options.type) {
      goals = goals.filter((g) => g.type === options.type);
    }
    if (options.project) {
      goals = goals.filter((g) => ciEquals(g.project, options.project));
    }
    return goals;
  }
}
