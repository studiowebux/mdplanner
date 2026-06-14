// Keys excluded from invoice frontmatter serialization.
// `id`/`notes` live in the body; the rest are DERIVED from the referenced quote
// at read time (InvoiceService.hydrate) and must never be persisted on disk.
export const INVOICE_BODY_KEYS = [
  "id",
  "notes",
  "customerId",
  "lineItems",
  "subtotal",
  "tax",
  "taxRate",
  "total",
] as const;
