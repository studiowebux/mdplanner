// Shared filter option extractors for domain configs.
// Replaces duplicated getPortfolioService().list() → map(p => p.name).sort()
// across 5+ domain configs.

import { getPortfolioService } from "../singletons/services.ts";

/** Fetch sorted project names from portfolio. Use in extractFilterOptions. */
export async function extractProjectNames(): Promise<string[]> {
  const items = await getPortfolioService().list();
  return items.map((p) => p.name).sort();
}
