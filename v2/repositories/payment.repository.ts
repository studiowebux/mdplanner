// Payment repository — markdown file CRUD under billing/payments/.

import type {
  CreatePayment,
  Payment,
  UpdatePayment,
} from "../types/payment.types.ts";
import { CachedMarkdownRepository } from "./cached.repository.ts";
import { PAYMENT_TABLE, rowToPayment } from "../domains/payment/cache.ts";

const BODY_KEYS = ["id", "notes"] as const;

export class PaymentRepository extends CachedMarkdownRepository<
  Payment,
  CreatePayment,
  UpdatePayment
> {
  protected readonly tableName = PAYMENT_TABLE;

  constructor(projectDir: string) {
    super(projectDir, {
      directory: "billing/payments",
      idPrefix: "payment",
      nameField: "reference",
    });
  }

  protected rowToEntity(row: Record<string, unknown>): Payment {
    return rowToPayment(row);
  }

  protected fromCreateInput(
    data: CreatePayment,
    id: string,
    now: string,
  ): Payment {
    return {
      ...data,
      id,
      createdAt: now,
      updatedAt: now,
    };
  }

  protected parse(
    filename: string,
    fm: Record<string, unknown>,
    body: string,
  ): Payment | null {
    if (!fm.id) return null;
    const id = fm.id ? String(fm.id) : filename.replace(/\.md$/, "");

    const bodyText = body.trim();
    const headingMatch = bodyText.match(/^#\s+(.+)$/m);

    let notes: string | undefined;
    if (headingMatch) {
      const afterHeading = bodyText.replace(/^#\s+.+\n?/, "").trim();
      notes = afterHeading.replace(/^##\s+Notes\n?/, "").trim() || undefined;
    } else {
      notes = bodyText || undefined;
    }

    return {
      id,
      invoiceId: String(fm.invoiceId ?? ""),
      amount: Number(fm.amount ?? 0),
      date: String(fm.date ?? ""),
      method: fm.method != null
        ? String(fm.method) as Payment["method"]
        : undefined,
      reference: fm.reference != null ? String(fm.reference) : undefined,
      notes,
      createdAt: fm.createdAt ? String(fm.createdAt) : new Date().toISOString(),
      updatedAt: fm.updatedAt ? String(fm.updatedAt) : new Date().toISOString(),
      createdBy: fm.createdBy != null ? String(fm.createdBy) : undefined,
      updatedBy: fm.updatedBy != null ? String(fm.updatedBy) : undefined,
    };
  }

  protected serialize(item: Payment): string {
    return this.serializeStandard(item, BODY_KEYS, this.buildBody(item));
  }

  private buildBody(item: Payment): string {
    const ref = item.reference ?? item.id;
    const parts: string[] = [`# Payment ${ref}`];
    if (item.notes) {
      parts.push("", "## Notes", "", item.notes);
    }
    return parts.join("\n");
  }
}
