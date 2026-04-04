// Brainstorm service — business logic over BrainstormRepository.

import type { BrainstormRepository } from "../repositories/brainstorm.repository.ts";
import type {
  Brainstorm,
  CreateBrainstorm,
  ListBrainstormOptions,
  UpdateBrainstorm,
} from "../types/brainstorm.types.ts";
import { ciIncludes } from "../utils/string.ts";
import { BaseService } from "./base.service.ts";

export class BrainstormService extends BaseService<
  Brainstorm,
  CreateBrainstorm,
  UpdateBrainstorm,
  ListBrainstormOptions
> {
  constructor(brainstormRepo: BrainstormRepository) {
    super(brainstormRepo);
  }

  protected applyFilters(
    items: Brainstorm[],
    options: ListBrainstormOptions,
  ): Brainstorm[] {
    if (options.tag) {
      items = items.filter((b) => b.tags?.includes(options.tag!));
    }
    if (options.q) {
      items = items.filter((b) =>
        ciIncludes(b.title, options.q!) ||
        b.questions.some((q) =>
          ciIncludes(q.question, options.q!) ||
          ciIncludes(q.answer, options.q!)
        )
      );
    }
    return items;
  }
}
