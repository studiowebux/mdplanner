// Resolve line-item rate IDs to BillingRate names for edit-form rendering.
// Line items reference rates via `rateId` set by the autocomplete
// (source: "billing-rates", valueKey: id, displayKey: name). Unresolved IDs
// simply won't appear in the returned map — the edit form falls back to an
// empty search input (user re-picks).

import type { LineItem } from "../../types/billing.types.ts";
import { getBillingRateService } from "../../singletons/services.ts";

/** Build `rateId → rate name` map for the rates referenced by these line items. */
export async function buildRateNameById(
  lineItems: LineItem[],
): Promise<Record<string, string>> {
  const rateIds = new Set<string>();
  for (const li of lineItems) {
    if (li.rateId) rateIds.add(li.rateId);
  }
  if (rateIds.size === 0) return {};
  const all = await getBillingRateService().list();
  const map: Record<string, string> = {};
  for (const r of all) {
    if (rateIds.has(r.id)) map[r.id] = r.name;
  }
  return map;
}
