// Marketing Plan service — business logic over MarketingPlanRepository.

import type { MarketingPlanRepository } from "../repositories/marketing-plan.repository.ts";
import type {
  CreateMarketingPlan,
  ListMarketingPlanOptions,
  MarketingPlan,
  UpdateMarketingPlan,
} from "../types/marketing-plan.types.ts";
import { ciIncludes } from "../utils/string.ts";
import { BaseService } from "./base.service.ts";

export class MarketingPlanService extends BaseService<
  MarketingPlan,
  CreateMarketingPlan,
  UpdateMarketingPlan,
  ListMarketingPlanOptions
> {
  constructor(repo: MarketingPlanRepository) {
    super(repo);
  }

  protected applyFilters(
    plans: MarketingPlan[],
    options: ListMarketingPlanOptions,
  ): MarketingPlan[] {
    if (options.status) {
      plans = plans.filter((p) => p.status === options.status);
    }
    if (options.q) {
      plans = plans.filter((p) =>
        ciIncludes(p.name, options.q!) ||
        ciIncludes(p.description, options.q!) ||
        ciIncludes(p.notes, options.q!)
      );
    }
    return plans;
  }
}
