// SAFe service — business logic over SafeRepository.

import type { SafeRepository } from "../repositories/safe.repository.ts";
import type {
  CreateSafe,
  ListSafeOptions,
  Safe,
  UpdateSafe,
} from "../types/safe.types.ts";
import { ciIncludes } from "../utils/string.ts";
import { BaseService } from "./base.service.ts";

/** SAFE-note CRUD service; filters by type, status, and text query (q). */
export class SafeService extends BaseService<
  Safe,
  CreateSafe,
  UpdateSafe,
  ListSafeOptions
> {
  constructor(repo: SafeRepository) {
    super(repo);
  }

  protected applyFilters(items: Safe[], options: ListSafeOptions): Safe[] {
    if (options.status) {
      items = items.filter((s) => s.status === options.status);
    }
    if (options.type) {
      items = items.filter((s) => s.type === options.type);
    }
    if (options.q) {
      const q = options.q;
      items = items.filter(
        (s) => ciIncludes(s.investor, q) || ciIncludes(s.notes, q),
      );
    }
    return items;
  }
}
