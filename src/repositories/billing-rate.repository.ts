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

import {
  fmBool,
  fmNum,
  fmStr,
  resolveEntityId,
  stampAuditFields,
} from "../utils/frontmatter-mapper.ts";
/** Persists BillingRate entities as markdown with a SQLite cache mirror. */
export class BillingRateRepository extends CachedMarkdownRepository<
  BillingRate,
  CreateBillingRate,
  UpdateBillingRate
> {
  protected readonly tableName = BILLING_RATE_TABLE;
  protected override readonly supportsArchive = true;

  constructor(projectDir: string) {
    super(projectDir, {
      directory: "billing/rates",
      idPrefix: "rate",
      nameField: "name",
    });
  }

  protected rowToEntity(
    row: Record<string, string | number | null>,
  ): BillingRate {
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
      ...stampAuditFields(now),
    };
  }

  protected parse(
    filename: string,
    fm: Record<string, unknown>,
    body: string,
  ): BillingRate | null {
    if (!fm.id && !fm.name) return null;
    const id = resolveEntityId(filename, fm);

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
      unit: (fmStr(fm, "unit") ?? "h") as BillingRate["unit"],
      rate: fmNum(fm, "rate") ?? 0,
      currency: fmStr(fm, "currency"),
      assignee: fmStr(fm, "assignee"),
      isDefault: fmBool(fm, "isDefault"),
      notes,
      createdAt: fmStr(fm, "createdAt") ?? new Date().toISOString(),
      updatedAt: fmStr(fm, "updatedAt") ?? new Date().toISOString(),
      createdBy: fmStr(fm, "createdBy"),
      updatedBy: fmStr(fm, "updatedBy"),
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
