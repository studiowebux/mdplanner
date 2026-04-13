// MoSCoW service — business logic over MoscowRepository.

import type { MoscowRepository } from "../repositories/moscow.repository.ts";
import type {
  CreateMoscow,
  ListMoscowOptions,
  Moscow,
  UpdateMoscow,
} from "../types/moscow.types.ts";
import { ciEquals, ciIncludes } from "../utils/string.ts";
import { BaseService } from "./base.service.ts";

export class MoscowService extends BaseService<
  Moscow,
  CreateMoscow,
  UpdateMoscow,
  ListMoscowOptions
> {
  constructor(repo: MoscowRepository) {
    super(repo);
  }

  protected applyFilters(
    items: Moscow[],
    options: ListMoscowOptions,
  ): Moscow[] {
    if (options.project) {
      items = items.filter((m) => ciEquals(m.project, options.project));
    }
    if (options.q) {
      const q = options.q;
      items = items.filter((m) =>
        ciIncludes(m.title, q) ||
        m.must.some((i) => ciIncludes(i, q)) ||
        m.should.some((i) => ciIncludes(i, q)) ||
        m.could.some((i) => ciIncludes(i, q)) ||
        m.wont.some((i) => ciIncludes(i, q)) ||
        ciIncludes(m.notes, q)
      );
    }
    return items;
  }
}
