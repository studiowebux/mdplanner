// Vacation service — CRUD over VacationRepository for time-off requests.
import type { VacationRepository } from "../repositories/vacation.repository.ts";
import type {
  CreateVacationRequest,
  ListVacationOptions,
  UpdateVacationRequest,
  VacationRequest,
} from "../types/vacation.types.ts";
import { ciIncludes } from "../utils/string.ts";
import { BaseService } from "./base.service.ts";

/** Vacation CRUD service; filters by personId, type, status, and text query (q). */
export class VacationService extends BaseService<
  VacationRequest,
  CreateVacationRequest,
  UpdateVacationRequest,
  ListVacationOptions
> {
  constructor(repo: VacationRepository) {
    super(repo);
  }

  protected applyFilters(
    items: VacationRequest[],
    options: ListVacationOptions,
  ): VacationRequest[] {
    if (options.status) {
      items = items.filter((r) => r.status === options.status);
    }
    if (options.type) {
      items = items.filter((r) => r.type === options.type);
    }
    if (options.personId) {
      items = items.filter((r) => r.personId === options.personId);
    }
    if (options.q) {
      const q = options.q;
      items = items.filter(
        (r) => ciIncludes(r.personId, q) || ciIncludes(r.notes, q),
      );
    }
    return items;
  }
}
