// Keys excluded from quote frontmatter serialization.
// `id`/`notes` live in the body; subtotal/tax/total are DERIVED from the line
// items at read time (QuoteService.calculateTotals) and must never be persisted.
// Each line item's `amount` is likewise stripped on serialize (see
// QuoteRepository.serialize) — it is recomputed via computeLineAmount.
export const QUOTE_BODY_KEYS = [
  "id",
  "notes",
  "subtotal",
  "tax",
  "total",
] as const;
