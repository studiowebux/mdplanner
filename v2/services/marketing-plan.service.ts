// Marketing Plan service — business logic over MarketingPlanRepository.

import type { MarketingPlanRepository } from "../repositories/marketing-plan.repository.ts";
import type {
  CreateMarketingPlan,
  ListMarketingPlanOptions,
  MarketingPlan,
  UpdateMarketingPlan,
} from "../types/marketing-plan.types.ts";
import { ciIncludes } from "../utils/string.ts";

export class MarketingPlanService {
  constructor(private repo: MarketingPlanRepository) {}

  async list(options?: ListMarketingPlanOptions): Promise<MarketingPlan[]> {
    let plans = await this.repo.findAll();
    if (options?.status) {
      plans = plans.filter((p) => p.status === options.status);
    }
    if (options?.q) {
      plans = plans.filter((p) =>
        ciIncludes(p.name, options.q!) ||
        ciIncludes(p.description, options.q!) ||
        ciIncludes(p.notes, options.q!)
      );
    }
    return plans;
  }

  async getById(id: string): Promise<MarketingPlan | null> {
    return this.repo.findById(id);
  }

  async getByName(name: string): Promise<MarketingPlan | null> {
    return this.repo.findByName(name);
  }

  async create(data: CreateMarketingPlan): Promise<MarketingPlan> {
    return this.repo.create(data);
  }

  async update(
    id: string,
    data: UpdateMarketingPlan,
  ): Promise<MarketingPlan | null> {
    return this.repo.update(id, data);
  }

  async delete(id: string): Promise<boolean> {
    return this.repo.delete(id);
  }
}
