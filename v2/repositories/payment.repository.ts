// Payment repository — markdown file CRUD under billing/payments/.

import type {
  CreatePayment,
  Payment,
  UpdatePayment,
} from "../types/payment.types.ts";
import { CachedMarkdownRepository } from "./cached.repository.ts";
import { PAYMENT_TABLE, rowToPayment } from "../domains/payment/cache.ts";
import { PAYMENT_BODY_KEYS } from "../domains/payment/constants.ts";

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
      invoiceId: String(fm.invoice_id ?? ""),
      amount: Number(fm.amount ?? 0),
      date: String(fm.date ?? ""),
      method: fm.method != null
        ? String(fm.method) as Payment["method"]
        : undefined,
      reference: fm.reference != null ? String(fm.reference) : undefined,
      notes,
      createdAt: fm.created_at
        ? String(fm.created_at)
        : new Date().toISOString(),
      updatedAt: fm.updated_at
        ? String(fm.updated_at)
        : new Date().toISOString(),
      createdBy: fm.created_by != null ? String(fm.created_by) : undefined,
      updatedBy: fm.updated_by != null ? String(fm.updated_by) : undefined,
    };
  }

  protected serialize(item: Payment): string {
    return this.serializeStandard(
      item,
      PAYMENT_BODY_KEYS,
      this.buildBody(item),
    );
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
