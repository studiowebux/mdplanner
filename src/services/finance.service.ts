// Finance service — business logic over FinanceRepository.

import type { FinanceRepository } from "../repositories/finance.repository.ts";
import type {
  CreateFinance,
  Finance,
  FinanceMonthlyTotal,
  FinanceSummary,
  ListFinanceOptions,
  UpdateFinance,
} from "../types/finance.types.ts";
import type { PaymentService } from "./payment.service.ts";
import type { InvoiceService } from "./invoice.service.ts";
import type { CustomerService } from "./customer.service.ts";
import { ciIncludes } from "../utils/string.ts";
import { BaseService } from "./base.service.ts";

/** Prefix that marks a Finance row as a read-only billing-income projection of a
 * payment (see buildBillingIncome). Payments already use this id prefix. */
export const BILLING_INCOME_ID_PREFIX = "payment_";

/** Finance CRUD service: getSummary aggregates totals; filters by type, tag, date range (from/to), and text query (q). Billing income (recorded payments) is projected read-time into list()/getSummary as read-only income rows — never persisted, no double entry. */
export class FinanceService extends BaseService<
  Finance,
  CreateFinance,
  UpdateFinance,
  ListFinanceOptions
> {
  constructor(
    financeRepo: FinanceRepository,
    private paymentService: PaymentService,
    private invoiceService: InvoiceService,
    private customerService: CustomerService,
  ) {
    super(financeRepo);
  }

  /**
   * Project recorded payments into read-only "income" Finance rows (read-time;
   * never persisted — payments stay the source of truth, no double bookkeeping).
   * Identified downstream by the `payment_` id prefix so the UI renders them
   * read-only and links to the payment instead of a finance detail.
   */
  private async buildBillingIncome(): Promise<Finance[]> {
    const [payments, invoices, customers] = await Promise.all([
      this.paymentService.list(),
      this.invoiceService.list(),
      this.customerService.list(),
    ]);
    const invoiceById = new Map(invoices.map((i) => [i.id, i]));
    const customerName = new Map(customers.map((c) => [c.id, c.name]));
    return payments.map((p) => {
      const inv = invoiceById.get(p.invoiceId);
      const who = inv ? customerName.get(inv.customerId) ?? "" : "";
      const label = inv
        ? `Payment — ${inv.number}${who ? ` (${who})` : ""}`
        : `Payment — ${p.invoiceId}`;
      return {
        id: p.id,
        title: label,
        type: "income",
        amount: p.amount,
        currency: inv?.currency,
        date: p.date,
        description: p.notes,
        tags: ["payment"],
        createdAt: p.createdAt,
        updatedAt: p.updatedAt,
        archived: false,
      } satisfies Finance;
    });
  }

  /**
   * Manual finance entries + read-time billing income (payments). The same
   * domain filters apply to both, so the table, summary banner, chart, and
   * by-tag views all see one consistent set.
   */
  override async list(options?: ListFinanceOptions): Promise<Finance[]> {
    const [manual, income] = await Promise.all([
      super.list(options),
      this.buildBillingIncome(),
    ]);
    const filtered = options ? this.applyFilters(income, options) : income;
    return [...manual, ...filtered];
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
    for (const f of all) {
      if (f.type === "income") totalIncome += f.amount;
      else totalExpense += f.amount;
    }

    return {
      totalIncome,
      totalExpense,
      balance: totalIncome - totalExpense,
      byTag: FinanceService.aggregateByTag(all),
    };
  }

  /**
   * Aggregate entries into `(tag, type) → total` rows, sorted by total desc.
   * Entries with no tags fall into a `"uncategorized"` bucket. Pure function —
   * mirrors the `PeopleService.buildTree(items)` static-helper pattern.
   */
  static aggregateByTag(items: Finance[]): FinanceSummary["byTag"] {
    const tagMap = new Map<
      string,
      { tag: string; type: Finance["type"]; total: number }
    >();
    for (const f of items) {
      const tagList = f.tags?.length ? f.tags : ["uncategorized"];
      for (const tag of tagList) {
        const key = `${f.type}::${tag}`;
        const existing = tagMap.get(key);
        if (existing) existing.total += f.amount;
        else tagMap.set(key, { tag, type: f.type, total: f.amount });
      }
    }
    return [...tagMap.values()].sort((a, b) => b.total - a.total);
  }

  /**
   * Compute a running balance per entry: cumulative `income − expense` over a
   * date-ascending projection. Returns `Map<id, runningBalance>` so callers can
   * look up each row's value regardless of the user's current sort.
   *
   * Entries with no `date` are placed first (treated as "earliest"), keeping
   * them visible in the cumulative without breaking the date-asc ordering of
   * the rest. Pure function.
   */
  static computeRunningBalance(items: Finance[]): Map<string, number> {
    const sorted = [...items].sort((a, b) => {
      const ad = a.date ?? "";
      const bd = b.date ?? "";
      return ad.localeCompare(bd);
    });
    const out = new Map<string, number>();
    let running = 0;
    for (const f of sorted) {
      running += f.type === "income" ? f.amount : -f.amount;
      out.set(f.id, running);
    }
    return out;
  }

  /**
   * Bucket entries into monthly income/expense totals, sorted ascending by
   * `YYYY-MM`. Entries with no `date` are skipped. Pure function.
   */
  static aggregateMonthly(items: Finance[]): FinanceMonthlyTotal[] {
    const monthMap = new Map<string, FinanceMonthlyTotal>();
    for (const f of items) {
      if (!f.date) continue;
      const month = f.date.slice(0, 7);
      let bucket = monthMap.get(month);
      if (!bucket) {
        bucket = { month, income: 0, expense: 0 };
        monthMap.set(month, bucket);
      }
      if (f.type === "income") bucket.income += f.amount;
      else bucket.expense += f.amount;
    }
    return [...monthMap.values()].sort((a, b) =>
      a.month.localeCompare(b.month)
    );
  }
}
