// BillingRate repository — markdown file CRUD under billing/rates/.

import type {
  BillingRate,
  CreateBillingRate,
  UpdateBillingRate,
} from "../types/billing-rate.types.ts";
import { CachedMarkdownRepository } from "./cached.repository.ts";
import {
  BILLING_RATE_TABLE,
  rowToBillingRate,
} from "../domains/billing-rate/cache.ts";

const BODY_KEYS = ["id", "notes"] as const;

export class BillingRateRepository extends CachedMarkdownRepository<
  BillingRate,
  CreateBillingRate,
  UpdateBillingRate
> {
  protected readonly tableName = BILLING_RATE_TABLE;

  constructor(projectDir: string) {
    super(projectDir, {
      directory: "billing/rates",
      idPrefix: "rate",
      nameField: "name",
    });
  }

  protected rowToEntity(row: Record<string, unknown>): BillingRate {
    return rowToBillingRate(row);
  }

  protected fromCreateInput(
    data: CreateBillingRate,
    id: string,
    now: string,
  ): BillingRate {
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
  ): BillingRate | null {
    if (!fm.id && !fm.name) return null;
    const id = fm.id ? String(fm.id) : filename.replace(/\.md$/, "");

    const bodyText = body.trim();
    const headingMatch = bodyText.match(/^#\s+(.+)$/m);
    const name = fm.name
      ? String(fm.name)
      : headingMatch
      ? headingMatch[1]
      : "";

    // Extract notes from body after heading
    let notes: string | undefined;
    if (headingMatch) {
      const afterHeading = bodyText.replace(/^#\s+.+\n?/, "").trim();
      notes = afterHeading.replace(/^##\s+Notes\n?/, "").trim() || undefined;
    } else {
      notes = bodyText || undefined;
    }

    // v1 compat: hourlyRate → rate, default unit to "h"
    const rate = fm.rate != null
      ? Number(fm.rate)
      : fm.hourly_rate != null
      ? Number(fm.hourly_rate)
      : fm.hourlyRate != null
      ? Number(fm.hourlyRate)
      : 0;

    const unit = fm.unit != null ? String(fm.unit) as BillingRate["unit"] : "h";

    return {
      id,
      name,
      unit,
      rate,
      currency: fm.currency != null ? String(fm.currency) : undefined,
      assignee: fm.assignee != null ? String(fm.assignee) : undefined,
      isDefault: fm.is_default != null
        ? Boolean(fm.is_default)
        : fm.isDefault != null
        ? Boolean(fm.isDefault)
        : undefined,
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

  protected serialize(item: BillingRate): string {
    return this.serializeStandard(item, BODY_KEYS, this.buildBody(item));
  }

  private buildBody(item: BillingRate): string {
    const parts: string[] = [`# ${item.name}`];
    if (item.notes) {
      parts.push("", "## Notes", "", item.notes);
    }
    return parts.join("\n");
  }
}
