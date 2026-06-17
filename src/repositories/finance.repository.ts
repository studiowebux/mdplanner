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

import {
  fmStr,
  resolveEntityId,
  stampAuditFields,
} from "../utils/frontmatter-mapper.ts";
/** Persists Finance entries as markdown with a SQLite cache mirror. */
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
      ...stampAuditFields(now),
    };
  }

  protected parse(
    filename: string,
    fm: Record<string, unknown>,
    body: string,
  ): Finance | null {
    if (!fm.id && !fm.title) return null;
    const id = resolveEntityId(filename, fm);

    const typeRaw = fmStr(fm, "type");
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
      currency: fmStr(fm, "currency"),
      date: fmStr(fm, "date"),
      description: body.trim() || undefined,
      tags,
      createdAt: fmStr(fm, "createdAt") ?? new Date().toISOString(),
      updatedAt: fmStr(fm, "updatedAt") ?? new Date().toISOString(),
      createdBy: fmStr(fm, "createdBy"),
      updatedBy: fmStr(fm, "updatedBy"),
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
