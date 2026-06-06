// Reflection service — business logic over ReflectionRepository.

import type { ReflectionRepository } from "../repositories/reflection.repository.ts";
import type {
  CreateReflection,
  ListReflectionOptions,
  Reflection,
  UpdateReflection,
} from "../types/reflection.types.ts";
import { ciIncludes } from "../utils/string.ts";
import { BaseService } from "./base.service.ts";

/** Reflection CRUD service; filters by period, tag, date range (from/to), and text query (q). */
export class ReflectionService extends BaseService<
  Reflection,
  CreateReflection,
  UpdateReflection,
  ListReflectionOptions
> {
  constructor(repo: ReflectionRepository) {
    super(repo);
  }

  protected applyFilters(
    items: Reflection[],
    options: ListReflectionOptions,
  ): Reflection[] {
    if (options.period) {
      items = items.filter((r) => r.period === options.period);
    }
    if (options.tag) {
      const tag = options.tag;
      items = items.filter((r) => r.tags?.includes(tag));
    }
    if (options.from) {
      const from = options.from;
      items = items.filter((r) => r.date >= from);
    }
    if (options.to) {
      const to = options.to;
      items = items.filter((r) => r.date <= to);
    }
    if (options.q) {
      const q = options.q;
      items = items.filter(
        (r) =>
          ciIncludes(r.title, q) ||
          ciIncludes(r.content, q),
      );
    }
    return items;
  }
}
