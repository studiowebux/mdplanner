// Finance repository — markdown file CRUD under finances/.

import type {
  CreateFinance,
  Finance,
  FinanceType,
  UpdateFinance,
} from "../types/finance.types.ts";
import { FINANCE_TYPES } from "../types/finance.types.ts";
import { CachedMarkdownRepository } from "./cached.repository.ts";
import { FINANCE_TABLE, rowToFinance } from "../domains/finance/cache.ts";
import { FINANCE_BODY_KEYS } from "../domains/finance/constants.ts";

export class FinanceRepository extends CachedMarkdownRepository<
  Finance,
  CreateFinance,
  UpdateFinance
> {
  protected readonly tableName = FINANCE_TABLE;
  protected override readonly supportsArchive = true;

  constructor(projectDir: string) {
    super(projectDir, {
      directory: "finances",
      idPrefix: "finance",
      nameField: "title",
    });
  }

  protected rowToEntity(row: Record<string, string | number | null>): Finance {
    return rowToFinance(row);
  }

  protected fromCreateInput(
    data: CreateFinance,
    id: string,
    now: string,
  ): Finance {
    return {
      ...data,
      id,
      tags: data.tags ?? [],
      createdAt: now,
      updatedAt: now,
    };
  }

  protected parse(
    filename: string,
    fm: Record<string, unknown>,
    body: string,
  ): Finance | null {
    if (!fm.id && !fm.title) return null;
    const id = fm.id ? String(fm.id) : filename.replace(/\.md$/, "");

    const typeRaw = fm.type != null ? String(fm.type) : undefined;
    const type: FinanceType =
      typeRaw && (FINANCE_TYPES as readonly string[]).includes(typeRaw)
        ? (typeRaw as FinanceType)
        : "expense";

    const tags = Array.isArray(fm.tags)
      ? (fm.tags as unknown[]).map(String)
      : [];

    return {
      id,
      title: fm.title ? String(fm.title) : "Untitled Entry",
      type,
      amount: fm.amount != null ? Number(fm.amount) : 0,
      currency: fm.currency != null ? String(fm.currency) : undefined,
      date: fm.date != null ? String(fm.date) : undefined,
      description: body.trim() || undefined,
      tags,
      createdAt: fm.createdAt ? String(fm.createdAt) : new Date().toISOString(),
      updatedAt: fm.updatedAt ? String(fm.updatedAt) : new Date().toISOString(),
      createdBy: fm.createdBy != null ? String(fm.createdBy) : undefined,
      updatedBy: fm.updatedBy != null ? String(fm.updatedBy) : undefined,
    };
  }

  protected serialize(item: Finance): string {
    return this.serializeStandard(
      item,
      FINANCE_BODY_KEYS,
      item.description ?? "",
    );
  }
}
