// Vacation repository — markdown-backed VacationItem store with cache mirror.
import type {
  CreateVacationRequest,
  UpdateVacationRequest,
  VacationRequest,
} from "../types/vacation.types.ts";
import { CachedMarkdownRepository } from "./cached.repository.ts";
import { rowToVacation, VACATION_TABLE } from "../domains/vacation/cache.ts";
import { VACATION_BODY_KEYS } from "../domains/vacation/constants.tsx";

import {
  resolveEntityId,
  stampAuditFields,
} from "../utils/frontmatter-mapper.ts";
/** Persists Vacation entities as markdown with a SQLite cache mirror. */
export class VacationRepository extends CachedMarkdownRepository<
  VacationRequest,
  CreateVacationRequest,
  UpdateVacationRequest
> {
  protected readonly tableName = VACATION_TABLE;
  protected override readonly supportsArchive = true;

  constructor(projectDir: string) {
    super(projectDir, {
      directory: "vacation",
      idPrefix: "vacation",
      nameField: "personId",
    });
  }

  protected rowToEntity(
    row: Record<string, string | number | null>,
  ): VacationRequest {
    return rowToVacation(row);
  }

  protected fromCreateInput(
    data: CreateVacationRequest,
    id: string,
    now: string,
  ): VacationRequest {
    return {
      ...data,
      id,
      type: data.type ?? "vacation",
      status: data.status ?? "pending",
      ...stampAuditFields(now),
    };
  }

  protected parse(
    filename: string,
    fm: Record<string, unknown>,
    body: string,
  ): VacationRequest | null {
    if (!fm.id && !fm.personId) return null;
    const id = resolveEntityId(filename, fm);
    return {
      id,
      personId: fm.personId ? String(fm.personId) : "",
      startDate: fm.startDate ? String(fm.startDate) : "",
      endDate: fm.endDate ? String(fm.endDate) : "",
      type: (fm.type as VacationRequest["type"]) ?? "vacation",
      status: (fm.status as VacationRequest["status"]) ?? "pending",
      notes: body.trim() || undefined,
      createdAt: fm.createdAt ? String(fm.createdAt) : new Date().toISOString(),
      updatedAt: fm.updatedAt ? String(fm.updatedAt) : new Date().toISOString(),
      createdBy: fm.createdBy != null ? String(fm.createdBy) : undefined,
      updatedBy: fm.updatedBy != null ? String(fm.updatedBy) : undefined,
    };
  }

  protected serialize(item: VacationRequest): string {
    return this.serializeStandard(item, VACATION_BODY_KEYS, item.notes ?? "");
  }
}
