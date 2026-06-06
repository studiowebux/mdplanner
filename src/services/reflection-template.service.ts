// ReflectionTemplate service — business logic over ReflectionTemplateRepository.

import type { ReflectionTemplateRepository } from "../repositories/reflection-template.repository.ts";
import type {
  CreateReflectionTemplate,
  ListReflectionTemplateOptions,
  ReflectionTemplate,
  UpdateReflectionTemplate,
} from "../types/reflection-template.types.ts";
import { ciIncludes } from "../utils/string.ts";
import { BaseService } from "./base.service.ts";

/** Reflection-template CRUD service; filters by category, period, and text query (q). */
export class ReflectionTemplateService extends BaseService<
  ReflectionTemplate,
  CreateReflectionTemplate,
  UpdateReflectionTemplate,
  ListReflectionTemplateOptions
> {
  constructor(repo: ReflectionTemplateRepository) {
    super(repo);
  }

  protected applyFilters(
    items: ReflectionTemplate[],
    options: ListReflectionTemplateOptions,
  ): ReflectionTemplate[] {
    if (options.category) {
      const cat = options.category.toLowerCase();
      items = items.filter((t) =>
        t.categories?.some((c) => c.toLowerCase() === cat)
      );
    }
    if (options.period) {
      const period = options.period.toLowerCase();
      items = items.filter((t) => t.period?.toLowerCase() === period);
    }
    if (options.q) {
      items = items.filter((t) =>
        ciIncludes(t.name, options.q!) ||
        (t.description != null && ciIncludes(t.description, options.q!)) ||
        (t.categories ?? []).some((c) => ciIncludes(c, options.q!)) ||
        t.prompts.some((p) => ciIncludes(p, options.q!))
      );
    }
    return items;
  }
}
