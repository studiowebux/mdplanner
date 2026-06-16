// Deal repository — markdown file CRUD under deals/.

import type {
  CreateDeal,
  Deal,
  DealStage,
  UpdateDeal,
} from "../types/deal.types.ts";
import { DEAL_STAGES } from "../types/deal.types.ts";
import { CachedMarkdownRepository } from "./cached.repository.ts";
import { DEAL_TABLE, rowToDeal } from "../domains/deal/cache.ts";
import { DEAL_BODY_KEYS } from "../domains/deal/constants.ts";

import {
  fmStr,
  fmStrArr,
  resolveEntityId,
  stampAuditFields,
} from "../utils/frontmatter-mapper.ts";
/** Persists Deal entities as markdown with a SQLite cache mirror. */
export class DealRepository extends CachedMarkdownRepository<
  Deal,
  CreateDeal,
  UpdateDeal
> {
  protected readonly tableName = DEAL_TABLE;
  protected override readonly supportsArchive = true;

  constructor(projectDir: string) {
    super(projectDir, {
      directory: "deals",
      idPrefix: "deal",
      nameField: "title",
    });
  }

  protected rowToEntity(row: Record<string, string | number | null>): Deal {
    return rowToDeal(row);
  }

  protected fromCreateInput(
    data: CreateDeal,
    id: string,
    now: string,
  ): Deal {
    return {
      ...data,
      id,
      stage: data.stage ?? "lead",
      tags: data.tags ?? [],
      ...stampAuditFields(now),
    };
  }

  protected parse(
    filename: string,
    fm: Record<string, unknown>,
    body: string,
  ): Deal | null {
    if (!fm.id && !fm.title) return null;
    const id = resolveEntityId(filename, fm);

    const stageRaw = fmStr(fm, "stage");
    const stage: DealStage =
      stageRaw && (DEAL_STAGES as readonly string[]).includes(stageRaw)
        ? (stageRaw as DealStage)
        : "lead";

    return {
      id,
      title: fmStr(fm, "title") ?? "Untitled Deal",
      stage,
      value: fm.value != null ? Number(fm.value) : undefined,
      currency: fmStr(fm, "currency"),
      company: fmStr(fm, "company"),
      contact: fmStr(fm, "contact"),
      assignee: fmStr(fm, "assignee"),
      description: body.trim() || undefined,
      tags: fmStrArr(fm, "tags") ?? [],
      closedAt: fmStr(fm, "closedAt"),
      createdAt: fmStr(fm, "createdAt") ?? new Date().toISOString(),
      updatedAt: fmStr(fm, "updatedAt") ?? new Date().toISOString(),
      createdBy: fmStr(fm, "createdBy"),
      updatedBy: fmStr(fm, "updatedBy"),
    };
  }

  protected serialize(item: Deal): string {
    return this.serializeStandard(
      item,
      DEAL_BODY_KEYS,
      item.description ?? "",
    );
  }
}
