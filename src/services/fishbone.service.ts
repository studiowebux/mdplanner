// Fishbone service — business logic over FishboneRepository.

import type { FishboneRepository } from "../repositories/fishbone.repository.ts";
import type {
  CreateFishbone,
  Fishbone,
  ListFishboneOptions,
  UpdateFishbone,
} from "../types/fishbone.types.ts";
import { ciEquals, ciIncludes } from "../utils/string.ts";
import { BaseService } from "./base.service.ts";

/** Fishbone (cause-and-effect) CRUD service; filters by project and text query (q). */
export class FishboneService extends BaseService<
  Fishbone,
  CreateFishbone,
  UpdateFishbone,
  ListFishboneOptions
> {
  constructor(repo: FishboneRepository) {
    super(repo);
  }

  protected applyFilters(
    items: Fishbone[],
    options: ListFishboneOptions,
  ): Fishbone[] {
    if (options.project) {
      items = items.filter((f) => ciEquals(f.project, options.project));
    }
    if (options.q) {
      const q = options.q;
      items = items.filter((f) =>
        ciIncludes(f.title, q) ||
        ciIncludes(f.description, q) ||
        f.causes.some(
          (c) =>
            ciIncludes(c.section, q) || c.items.some((i) => ciIncludes(i, q)),
        )
      );
    }
    return items;
  }
}
