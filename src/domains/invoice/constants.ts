// Keys excluded from invoice frontmatter serialization.
// `id`/`notes` live in the body. The quote snapshot (customerId, lineItems,
// subtotal/tax/taxRate/total) IS persisted to frontmatter once the invoice is
// issued (frozenAt set) — a frozen invoice is an immutable copy of its quote
// (decision note_1782013833761). Drafts (frozenAt null) carry empty snapshot
// fields and derive live from the quote in InvoiceService.hydrate.
// Per-line `amount` is stripped on serialize and recomputed on read, matching
// the quote repository.
export const INVOICE_BODY_KEYS = [
  "id",
  "notes",
] as const;
