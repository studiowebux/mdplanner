// Strategic Levels service — business logic over StrategicLevelsRepository.

import type { StrategicLevelsRepository } from "../repositories/strategic-levels.repository.ts";
import type {
  CreateStrategicLevelsBuilder,
  ListStrategicLevelsOptions,
  StrategicLevelsBuilder,
  UpdateStrategicLevelsBuilder,
} from "../types/strategic-levels.types.ts";
import { ciIncludes } from "../utils/string.ts";
import { BaseService } from "./base.service.ts";

export class StrategicLevelsService extends BaseService<
  StrategicLevelsBuilder,
  CreateStrategicLevelsBuilder,
  UpdateStrategicLevelsBuilder,
  ListStrategicLevelsOptions
> {
  constructor(repo: StrategicLevelsRepository) {
    super(repo);
  }

  protected applyFilters(
    items: StrategicLevelsBuilder[],
    options: ListStrategicLevelsOptions,
  ): StrategicLevelsBuilder[] {
    if (options.q) {
      const q = options.q;
      items = items.filter((b) => ciIncludes(b.title, q));
    }
    if (options.date) {
      items = items.filter((b) => b.date === options.date);
    }
    return items;
  }
}
