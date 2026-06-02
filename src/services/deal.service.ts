// Deal service — business logic over DealRepository.

import type { DealRepository } from "../repositories/deal.repository.ts";
import type {
  CreateDeal,
  Deal,
  ListDealOptions,
  UpdateDeal,
} from "../types/deal.types.ts";
import { ciEquals, ciIncludes } from "../utils/string.ts";
import { BaseService } from "./base.service.ts";

export class DealService extends BaseService<
  Deal,
  CreateDeal,
  UpdateDeal,
  ListDealOptions
> {
  constructor(dealRepo: DealRepository) {
    super(dealRepo);
  }

  protected applyFilters(deals: Deal[], options: ListDealOptions): Deal[] {
    if (options.q) {
      deals = deals.filter((d) =>
        ciIncludes(d.title, options.q!) ||
        ciIncludes(d.company, options.q!) ||
        ciIncludes(d.contact, options.q!) ||
        ciIncludes(d.description, options.q!)
      );
    }
    if (options.stage) {
      deals = deals.filter((d) => d.stage === options.stage);
    }
    if (options.assignee) {
      deals = deals.filter((d) => ciEquals(d.assignee, options.assignee!));
    }
    if (options.company) {
      deals = deals.filter((d) => ciEquals(d.company, options.company!));
    }
    return deals;
  }
}
