// Brief service — business logic over BriefRepository.

import type { BriefRepository } from "../repositories/brief.repository.ts";
import type {
  Brief,
  CreateBrief,
  ListBriefOptions,
  UpdateBrief,
} from "../types/brief.types.ts";
import { ciIncludes } from "../utils/string.ts";
import { BaseService } from "./base.service.ts";

export class BriefService extends BaseService<
  Brief,
  CreateBrief,
  UpdateBrief,
  ListBriefOptions
> {
  constructor(briefRepo: BriefRepository) {
    super(briefRepo);
  }

  protected applyFilters(
    items: Brief[],
    options: ListBriefOptions,
  ): Brief[] {
    if (options.q) {
      items = items.filter((b) =>
        ciIncludes(b.title, options.q!) ||
        b.summary?.some((s) => ciIncludes(s, options.q!)) ||
        b.mission?.some((m) => ciIncludes(m, options.q!))
      );
    }
    return items;
  }
}
