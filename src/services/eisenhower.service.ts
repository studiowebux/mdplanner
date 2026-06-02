// Eisenhower service — business logic over EisenhowerRepository.

import type { EisenhowerRepository } from "../repositories/eisenhower.repository.ts";
import type {
  CreateEisenhower,
  Eisenhower,
  ListEisenhowerOptions,
  UpdateEisenhower,
} from "../types/eisenhower.types.ts";
import { ciEquals, ciIncludes } from "../utils/string.ts";
import { BaseService } from "./base.service.ts";

export class EisenhowerService extends BaseService<
  Eisenhower,
  CreateEisenhower,
  UpdateEisenhower,
  ListEisenhowerOptions
> {
  constructor(repo: EisenhowerRepository) {
    super(repo);
  }

  protected applyFilters(
    items: Eisenhower[],
    options: ListEisenhowerOptions,
  ): Eisenhower[] {
    if (options.project) {
      items = items.filter((e) => ciEquals(e.project, options.project));
    }
    if (options.q) {
      const q = options.q;
      items = items.filter((e) =>
        ciIncludes(e.title, q) ||
        e.urgentImportant.some((i) => ciIncludes(i, q)) ||
        e.notUrgentImportant.some((i) => ciIncludes(i, q)) ||
        e.urgentNotImportant.some((i) => ciIncludes(i, q)) ||
        e.notUrgentNotImportant.some((i) => ciIncludes(i, q)) ||
        ciIncludes(e.notes, q)
      );
    }
    return items;
  }
}
