// Finance service — business logic over FinanceRepository.

import type { FinanceRepository } from "../repositories/finance.repository.ts";
import type {
  CreateFinance,
  Finance,
  FinanceSummary,
  FinanceType,
  ListFinanceOptions,
  UpdateFinance,
} from "../types/finance.types.ts";
import { ciIncludes } from "../utils/string.ts";
import { BaseService } from "./base.service.ts";

export class FinanceService extends BaseService<
  Finance,
  CreateFinance,
  UpdateFinance,
  ListFinanceOptions
> {
  constructor(financeRepo: FinanceRepository) {
    super(financeRepo);
  }

  protected applyFilters(
    entries: Finance[],
    options: ListFinanceOptions,
  ): Finance[] {
    if (options.q) {
      entries = entries.filter((f) =>
        ciIncludes(f.title, options.q!) ||
        ciIncludes(f.description, options.q!) ||
        (f.tags ?? []).some((t) => ciIncludes(t, options.q!))
      );
    }
    if (options.type) {
      entries = entries.filter((f) => f.type === options.type);
    }
    if (options.tag) {
      const tag = options.tag.toLowerCase();
      entries = entries.filter((f) =>
        (f.tags ?? []).some((t) => t.toLowerCase() === tag)
      );
    }
    if (options.from) {
      entries = entries.filter((f) =>
        f.date != null && f.date >= options.from!
      );
    }
    if (options.to) {
      entries = entries.filter((f) => f.date != null && f.date <= options.to!);
    }
    return entries;
  }

  async getSummary(options?: {
    from?: string;
    to?: string;
  }): Promise<FinanceSummary> {
    const all = await this.list({ from: options?.from, to: options?.to });

    let totalIncome = 0;
    let totalExpense = 0;
    const tagMap = new Map<string, { type: FinanceType; total: number }>();

    for (const f of all) {
      if (f.type === "income") {
        totalIncome += f.amount;
      } else {
        totalExpense += f.amount;
      }
      const tagList = f.tags?.length ? f.tags : ["uncategorized"];
      for (const tag of tagList) {
        const key = `${f.type}::${tag}`;
        const existing = tagMap.get(key);
        if (existing) {
          existing.total += f.amount;
        } else {
          tagMap.set(key, { type: f.type, total: f.amount });
        }
      }
    }

    const byTag = [...tagMap.entries()].map(([key, v]) => ({
      tag: key.split("::")[1],
      type: v.type,
      total: v.total,
    })).sort((a, b) => b.total - a.total);

    return {
      totalIncome,
      totalExpense,
      balance: totalIncome - totalExpense,
      byTag,
    };
  }
}
