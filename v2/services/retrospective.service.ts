// Retrospective service — business logic over RetrospectiveRepository.

import type { RetrospectiveRepository } from "../repositories/retrospective.repository.ts";
import type {
  CreateRetrospective,
  ListRetrospectiveOptions,
  Retrospective,
  UpdateRetrospective,
} from "../types/retrospective.types.ts";
import { ciIncludes } from "../utils/string.ts";
import { BaseService } from "./base.service.ts";

export class RetrospectiveService extends BaseService<
  Retrospective,
  CreateRetrospective,
  UpdateRetrospective,
  ListRetrospectiveOptions
> {
  constructor(retroRepo: RetrospectiveRepository) {
    super(retroRepo);
  }

  protected applyFilters(
    items: Retrospective[],
    options: ListRetrospectiveOptions,
  ): Retrospective[] {
    if (options.status) {
      items = items.filter((r) => r.status === options.status);
    }
    if (options.q) {
      items = items.filter((r) =>
        ciIncludes(r.title, options.q!) ||
        r.continue.some((s) => ciIncludes(s, options.q!)) ||
        r.stop.some((s) => ciIncludes(s, options.q!)) ||
        r.start.some((s) => ciIncludes(s, options.q!))
      );
    }
    return items;
  }
}
