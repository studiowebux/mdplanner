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
      createdAt: now,
      updatedAt: now,
    };
  }

  protected parse(
    filename: string,
    fm: Record<string, unknown>,
    body: string,
  ): Deal | null {
    if (!fm.id && !fm.title) return null;
    const id = fm.id ? String(fm.id) : filename.replace(/\.md$/, "");

    const stageRaw = fm.stage != null ? String(fm.stage) : undefined;
    const stage: DealStage =
      stageRaw && (DEAL_STAGES as readonly string[]).includes(stageRaw)
        ? (stageRaw as DealStage)
        : "lead";

    const description = body.trim() || undefined;

    const tags = Array.isArray(fm.tags)
      ? (fm.tags as unknown[]).map(String)
      : [];

    return {
      id,
      title: fm.title ? String(fm.title) : "Untitled Deal",
      stage,
      value: fm.value != null ? Number(fm.value) : undefined,
      currency: fm.currency != null ? String(fm.currency) : undefined,
      company: fm.company != null ? String(fm.company) : undefined,
      contact: fm.contact != null ? String(fm.contact) : undefined,
      assignee: fm.assignee != null ? String(fm.assignee) : undefined,
      description,
      tags,
      closedAt: fm.closedAt != null ? String(fm.closedAt) : undefined,
      createdAt: fm.createdAt ? String(fm.createdAt) : new Date().toISOString(),
      updatedAt: fm.updatedAt ? String(fm.updatedAt) : new Date().toISOString(),
      createdBy: fm.createdBy != null ? String(fm.createdBy) : undefined,
      updatedBy: fm.updatedBy != null ? String(fm.updatedBy) : undefined,
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
