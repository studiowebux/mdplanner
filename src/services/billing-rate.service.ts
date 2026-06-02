// BillingRate service — business logic over BillingRateRepository.

import type { BillingRateRepository } from "../repositories/billing-rate.repository.ts";
import type {
  BillingRate,
  CreateBillingRate,
  ListBillingRateOptions,
  UpdateBillingRate,
} from "../types/billing-rate.types.ts";
import { ciIncludes } from "../utils/string.ts";
import { BaseService } from "./base.service.ts";

export class BillingRateService extends BaseService<
  BillingRate,
  CreateBillingRate,
  UpdateBillingRate,
  ListBillingRateOptions
> {
  constructor(billingRateRepo: BillingRateRepository) {
    super(billingRateRepo);
  }

  protected applyFilters(
    rates: BillingRate[],
    options: ListBillingRateOptions,
  ): BillingRate[] {
    if (options.q) {
      rates = rates.filter((r) =>
        ciIncludes(r.name, options.q!) ||
        ciIncludes(r.notes, options.q!)
      );
    }
    return rates;
  }
}
