// Reflection service — business logic over ReflectionRepository.

import type { ReflectionRepository } from "../repositories/reflection.repository.ts";
import type {
  CreateReflection,
  ListReflectionOptions,
  Reflection,
  UpdateReflection,
} from "../types/reflection.types.ts";
import {
  filterByDateRange,
  filterByQuery,
  filterByTag,
} from "../utils/list-filters.ts";
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
    items = filterByTag(items, options.tag);
    items = filterByDateRange(items, options.from, options.to);
    items = filterByQuery(items, options.q, (r) => [r.title, r.content]);
    return items;
  }
}
