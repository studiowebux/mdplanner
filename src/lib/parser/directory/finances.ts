/**
 * Directory-based parser for Financial Period records.
 * Each period is stored as a separate markdown file under finances/.
 */
import { buildFileContent, DirectoryParser, parseFrontmatter } from "./base.ts";
import type { FinancePeriodItem, FinancialPeriod } from "../../types.ts";

interface FinancesFrontmatter {
  id: string;
  period: string;
  cash_on_hand: number;
  revenue?: FinancePeriodItem[];
  expenses?: FinancePeriodItem[];
  created: string;
}

export class FinancesDirectoryParser extends DirectoryParser<FinancialPeriod> {
  constructor(projectDir: string) {
    super({ projectDir, sectionName: "finances" });
  }

  protected parseFile(
    content: string,
    _filePath: string,
  ): FinancialPeriod | null {
    const { frontmatter, content: body } = parseFrontmatter<
      FinancesFrontmatter
    >(
      content,
    );

    if (!frontmatter.id || !frontmatter.period) return null;

    return {
      id: frontmatter.id,
      period: frontmatter.period,
      cash_on_hand: Number(frontmatter.cash_on_hand) || 0,
      revenue: (frontmatter.revenue ?? []).map((item) => ({
        category: item.category || "",
        amount: Number(item.amount) || 0,
      })),
      expenses: (frontmatter.expenses ?? []).map((item) => ({
        category: item.category || "",
        amount: Number(item.amount) || 0,
      })),
      notes: body.trim() || undefined,
      created: frontmatter.created || new Date().toISOString(),
    };
  }

  protected serializeItem(record: FinancialPeriod): string {
    const frontmatter: FinancesFrontmatter = {
      id: record.id,
      period: record.period,
      cash_on_hand: record.cash_on_hand,
      created: record.created,
    };

    if (record.revenue && record.revenue.length > 0) {
      frontmatter.revenue = record.revenue;
    }
    if (record.expenses && record.expenses.length > 0) {
      frontmatter.expenses = record.expenses;
    }

    return buildFileContent(frontmatter, record.notes ?? "");
  }

  async add(
    record: Omit<FinancialPeriod, "id" | "created">,
  ): Promise<FinancialPeriod> {
    const newRecord: FinancialPeriod = {
      ...record,
      revenue: record.revenue ?? [],
      expenses: record.expenses ?? [],
      id: this.generateId("finance"),
      created: new Date().toISOString(),
    };
    await this.write(newRecord);
    return newRecord;
  }

  async update(
    id: string,
    updates: Partial<FinancialPeriod>,
  ): Promise<FinancialPeriod | null> {
    const existing = await this.read(id);
    if (!existing) return null;

    const updated: FinancialPeriod = {
      ...existing,
      ...updates,
      id: existing.id,
      created: existing.created,
    };
    await this.write(updated);
    return updated;
  }
}
