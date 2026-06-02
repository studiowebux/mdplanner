// Risk service — business logic over RiskRepository.

import type { RiskRepository } from "../repositories/risk.repository.ts";
import type {
  CreateRisk,
  ListRiskOptions,
  Risk,
  UpdateRisk,
} from "../types/risk.types.ts";
import { ciEquals, ciIncludes } from "../utils/string.ts";
import { BaseService } from "./base.service.ts";

export class RiskService extends BaseService<
  Risk,
  CreateRisk,
  UpdateRisk,
  ListRiskOptions
> {
  constructor(repo: RiskRepository) {
    super(repo);
  }

  protected applyFilters(items: Risk[], options: ListRiskOptions): Risk[] {
    if (options.category) {
      items = items.filter((r) => r.category === options.category);
    }
    if (options.status) {
      items = items.filter((r) => r.status === options.status);
    }
    if (options.project) {
      items = items.filter((r) => ciEquals(r.project, options.project));
    }
    if (options.q) {
      const q = options.q;
      items = items.filter(
        (r) =>
          ciIncludes(r.title, q) ||
          ciIncludes(r.description, q) ||
          ciIncludes(r.mitigation, q) ||
          ciIncludes(r.owner, q),
      );
    }
    return items;
  }
}
