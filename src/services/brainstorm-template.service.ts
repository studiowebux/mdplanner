// BrainstormTemplate service — business logic over BrainstormTemplateRepository.

import type { BrainstormTemplateRepository } from "../repositories/brainstorm-template.repository.ts";
import type {
  BrainstormTemplate,
  CreateBrainstormTemplate,
  ListBrainstormTemplateOptions,
  UpdateBrainstormTemplate,
} from "../types/brainstorm-template.types.ts";
import { ciIncludes } from "../utils/string.ts";
import { BaseService } from "./base.service.ts";

export class BrainstormTemplateService extends BaseService<
  BrainstormTemplate,
  CreateBrainstormTemplate,
  UpdateBrainstormTemplate,
  ListBrainstormTemplateOptions
> {
  constructor(repo: BrainstormTemplateRepository) {
    super(repo);
  }

  protected applyFilters(
    items: BrainstormTemplate[],
    options: ListBrainstormTemplateOptions,
  ): BrainstormTemplate[] {
    if (options.category) {
      const cat = options.category.toLowerCase();
      items = items.filter((t) =>
        t.categories?.some((c) => c.toLowerCase() === cat)
      );
    }
    if (options.q) {
      items = items.filter((t) =>
        ciIncludes(t.name, options.q!) ||
        (t.description != null && ciIncludes(t.description, options.q!)) ||
        (t.categories ?? []).some((c) => ciIncludes(c, options.q!)) ||
        t.questions.some((q) => ciIncludes(q, options.q!))
      );
    }
    return items;
  }
}
