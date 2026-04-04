// SWOT service — business logic over SwotRepository.

import type { SwotRepository } from "../repositories/swot.repository.ts";
import type {
  CreateSwot,
  ListSwotOptions,
  Swot,
  UpdateSwot,
} from "../types/swot.types.ts";
import { ciEquals, ciIncludes } from "../utils/string.ts";
import { BaseService } from "./base.service.ts";

export class SwotService extends BaseService<
  Swot,
  CreateSwot,
  UpdateSwot,
  ListSwotOptions
> {
  constructor(repo: SwotRepository) {
    super(repo);
  }

  protected applyFilters(items: Swot[], options: ListSwotOptions): Swot[] {
    if (options.project) {
      items = items.filter((s) => ciEquals(s.project, options.project));
    }
    if (options.q) {
      const q = options.q;
      items = items.filter((s) =>
        ciIncludes(s.title, q) ||
        s.strengths.some((i) => ciIncludes(i, q)) ||
        s.weaknesses.some((i) => ciIncludes(i, q)) ||
        s.opportunities.some((i) => ciIncludes(i, q)) ||
        s.threats.some((i) => ciIncludes(i, q)) ||
        ciIncludes(s.notes, q)
      );
    }
    return items;
  }
}
