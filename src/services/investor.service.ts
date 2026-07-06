// Investor service — business logic over InvestorRepository.

import type { InvestorRepository } from "../repositories/investor.repository.ts";
import type {
  CreateInvestor,
  Investor,
  ListInvestorOptions,
  UpdateInvestor,
} from "../types/investor.types.ts";
import { ciIncludes } from "../utils/string.ts";
import { BaseService } from "./base.service.ts";

/** Investor CRUD service; filters by type, stage, status, tag, and text query (q). */
export class InvestorService extends BaseService<
  Investor,
  CreateInvestor,
  UpdateInvestor,
  ListInvestorOptions
> {
  constructor(repo: InvestorRepository) {
    super(repo);
  }

  protected applyFilters(
    items: Investor[],
    options: ListInvestorOptions,
  ): Investor[] {
    if (options.type) {
      items = items.filter((inv) => inv.type === options.type);
    }
    if (options.stage) {
      items = items.filter((inv) => inv.stage === options.stage);
    }
    if (options.status) {
      items = items.filter((inv) => inv.status === options.status);
    }
    if (options.tag) {
      items = items.filter((inv) => inv.tags?.includes(options.tag!));
    }
    if (options.q) {
      const q = options.q;
      items = items.filter(
        (inv) =>
          ciIncludes(inv.name, q) ||
          ciIncludes(inv.contact, q) ||
          ciIncludes(inv.notes, q),
      );
    }
    return items;
  }
}
