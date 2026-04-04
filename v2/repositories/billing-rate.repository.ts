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
import { BILLING_RATE_BODY_KEYS } from "../domains/billing-rate/constants.ts";

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

    return {
      id,
      name,
      unit: fm.unit != null ? String(fm.unit) as BillingRate["unit"] : "h",
      rate: fm.rate != null ? Number(fm.rate) : 0,
      currency: fm.currency != null ? String(fm.currency) : undefined,
      assignee: fm.assignee != null ? String(fm.assignee) : undefined,
      isDefault: fm.isDefault != null ? Boolean(fm.isDefault) : undefined,
      notes,
      createdAt: fm.createdAt ? String(fm.createdAt) : new Date().toISOString(),
      updatedAt: fm.updatedAt ? String(fm.updatedAt) : new Date().toISOString(),
      createdBy: fm.createdBy != null ? String(fm.createdBy) : undefined,
      updatedBy: fm.updatedBy != null ? String(fm.updatedBy) : undefined,
    };
  }

  protected serialize(item: BillingRate): string {
    return this.serializeStandard(
      item,
      BILLING_RATE_BODY_KEYS,
      this.buildBody(item),
    );
  }

  private buildBody(item: BillingRate): string {
    const parts: string[] = [`# ${item.name}`];
    if (item.notes) {
      parts.push("", "## Notes", "", item.notes);
    }
    return parts.join("\n");
  }
}
