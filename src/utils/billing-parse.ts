// Shared parse helpers for billing documents (invoices + quotes): line-item
// normalization and the title/notes body convention (# heading + trailing
// notes). Keeps invoice.repository and quote.repository in lockstep.

import type { LineItem } from "../types/billing.types.ts";
import { mapArrayFromFm } from "./frontmatter-mapper.ts";

/**
 * Normalize a frontmatter `lineItems` array into typed `LineItem[]`. Nested
 * array item keys arrive snake_case, so `mapArrayFromFm` is applied first.
 */
export function parseLineItems(fmLineItems: unknown): LineItem[] {
  const rawItems = Array.isArray(fmLineItems)
    ? mapArrayFromFm(fmLineItems as unknown[])
    : [];
  return rawItems.map((li) => ({
    id: String(li.id ?? ""),
    type: String(li.type ?? "service"),
    description: String(li.description ?? ""),
    group: li.group != null ? String(li.group) : undefined,
    quantity: li.quantity != null ? Number(li.quantity) : undefined,
    unit: li.unit != null ? String(li.unit) as LineItem["unit"] : undefined,
    unitRate: li.unitRate != null ? Number(li.unitRate) : undefined,
    discount: li.discount != null ? Number(li.discount) : undefined,
    discountType: li.discountType as LineItem["discountType"] ?? undefined,
    taxable: li.taxable != null ? Boolean(li.taxable) : undefined,
    optional: li.optional != null ? Boolean(li.optional) : undefined,
    rateId: li.rateId != null ? String(li.rateId) : undefined,
    taskId: li.taskId != null ? String(li.taskId) : undefined,
    notes: li.notes != null ? String(li.notes) : undefined,
    amount: Number(li.amount ?? 0),
  }));
}

/**
 * Parse a billing document body: the title is `fm.title` when present, else the
 * first `# heading`; notes are the body text after that heading (or the whole
 * body when there is no heading).
 */
export function parseBillingBody(
  fmTitle: unknown,
  body: string,
): { title: string; notes: string | undefined } {
  const bodyText = body.trim();
  const headingMatch = bodyText.match(/^#\s+(.+)$/m);
  const title = fmTitle ? String(fmTitle) : headingMatch ? headingMatch[1] : "";

  let notes: string | undefined;
  if (headingMatch) {
    const afterHeading = bodyText.replace(/^#\s+.+\n?/, "").trim();
    notes = afterHeading || undefined;
  } else {
    notes = bodyText || undefined;
  }
  return { title, notes };
}
