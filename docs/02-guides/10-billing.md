# Billing Guide

MD Planner's billing module covers the full customer → quote → invoice → payment
lifecycle. All data lives under `billing/` in your project directory as markdown
files with YAML frontmatter.

## Canonical Flow

```
Customer → Quote (draft → sent → accepted) → Invoice (sent → paid) → Payment(s)
```

Each step is a separate entity. Quotes own all billable line-item data; invoices
derive their totals from the quote and track payment progress.

---

## 1. Customers

Create a customer record first. All quotes and invoices reference a customer.

**UI:** Billing → Customers → New Customer

**MCP:** `create_customer`

Key fields: `name`, `email`, `billing_address` (street, city, state,
postalCode, country).

---

## 2. Quotes

A quote is a proposal sent to a customer. It holds all line-item and pricing
data. Invoices derive from quotes — you never re-enter line items on the invoice.

A quote can optionally be linked to a **portfolio project** (`portfolioItemId`,
set via the Portfolio Project autocomplete on the quote form). The linked
project's detail page then shows a **Billing** reconciliation — quoted →
invoiced → paid → outstanding — derived from its quotes and their invoices
(currency-aware, same numbers as the customer Billing summary).

### Statuses

| Status | Meaning |
|--------|---------|
| `draft` | Being prepared, not yet sent |
| `pending_approval` | Submitted for internal approval |
| `approved` | Internally approved, ready to send |
| `sent` | Sent to customer (snapshot saved as revision) |
| `accepted` | Customer accepted |
| `rejected` | Customer declined |

### Line Item Types

| Type | Use |
|------|-----|
| `service` | Time-based or unit work (has quantity + unit_rate) |
| `product` | Physical or digital product |
| `expense` | Pass-through cost (e.g. hosting, travel) |
| `text` | Section header or descriptive text (no amount) |

Line items support:
- `group` — visual grouping label
- `optional: true` — shown but excluded from subtotal
- `taxable: true` — included in tax calculation
- `discount` + `discount_type` (`percent` or `fixed`)
- `rate_id` — link to a billing rate record

### Totals (derived, never stored)

`subtotal`, `tax`, and `total` are recomputed from line items on every read.
Edit the `.md` file directly and totals update automatically on next load.

### Payment Schedule

Optional milestone-based payment schedule:

```yaml
payment_schedule:
  - description: 50% deposit
    percent: 50
    due_date: 2026-02-15
  - description: Balance on completion
    percent: 50
    due_date: 2026-03-15
```

Each entry can use `percent` or a fixed `amount`.

### Revision History

When a quote is re-sent, the previous totals are snapshotted as a revision
record (stored under `billing/quotes/<id>/revisions/`). The `revision` counter
increments automatically.

### Converting a Quote to an Invoice

Once a quote is `accepted`, use the **Create Invoice** button on the quote
detail page (or `POST /quotes/:id/to-invoice` via the API). This:

1. Creates an invoice linked to the quote via `quote_id`
2. Sets `converted_to_invoice` on the quote to the new invoice ID
3. Redirects to the new invoice

A quote can only be converted once. The button disappears after conversion; a
**View Invoice** link appears in its place.

---

## 3. Invoices

An invoice bills a customer for an accepted quote. It stores only its own
metadata — line items, totals, and the footer (Terms) are always derived from
the linked quote.

### Statuses

| Status | Meaning |
|--------|---------|
| `draft` | Created, not yet sent |
| `sent` | Sent to customer |
| `paid` | Fully paid |
| `overdue` | Past due date, unpaid |
| `cancelled` | Voided |

### Key Fields

- `quote_id` — required; all billable data comes from here
- `paid_amount` — running total of payments recorded (auto-updated)
- `due_date` + `payment_terms` — e.g. `NET 30`, `Due on receipt`
- `description` — optional short client-visible summary above line items
- `notes` — internal, stored in the markdown body
- `footer` (Terms) — derived from the linked quote's footer; set an invoice
  footer only to override the quote's terms for this invoice

### To Change Line Items

Edit the **quote**, not the invoice. Invoice totals update automatically on the
next read.

### Printing / PDF Export

Invoice detail → **Print** opens `/invoices/:id/print`, a Letter-sized export
that auto-fires the print dialog. The layout is tuned so a typical invoice fits
on a single page. The export footer carries a fingerprint line:

```
Generated <date> · SHA-256 <hash>
```

The SHA-256 is computed over the invoice's stored markdown file, so the printed
checksum tracks the local state — re-exporting after any edit yields a new hash.

---

## 4. Payments

Record money received against an invoice. Multiple partial payments are
supported — `paid_amount` on the invoice is the sum of all linked payments.

In the UI the invoice field is an **autocomplete**: focus it to see every
invoice (number · title · customer) and pick one — no need to paste a raw id.

**UI:** Invoice detail → Add Payment

**MCP:** `create_payment`

```yaml
invoice_id: invoice_startup1
amount: 662.40
method: bank          # bank | card | cash | cheque | other
date: 2026-02-18
reference: EFT-2026-0218
```

Invoice status is **derived**, not set by hand: sending issues the invoice, and
when recorded payments cover the total it flips to `paid` automatically (and back
to `sent` if a payment is later removed). There is no manual status field.

Recorded payments also appear in **Finance** as read-only **income** entries
(tagged `payment`), aggregated read-time — they are never duplicated on disk and
always reconcile with the invoice. Edit or delete them from the payment itself,
not from Finance.

**Multi-currency:** rollups (the customer Billing summary and the Finance
income/expense/balance tiles) group by currency. When a set spans more than one
currency they show a per-currency breakdown instead of a single blended total,
so amounts are never summed across currencies.

---

## 5. Billing Rates

Optional reusable rate definitions (e.g. `Standard Rate: $150/h`). Reference
them on line items via `rate_id` to auto-populate `unit_rate`.

**Directory:** `billing/rates/`

Fields: `name`, `unit` (`h`, `d`, `unit`, `mo`, `fixed`), `rate`, `currency`,
`assignee` (person ID, optional), `is_default`.

---

## Example: Full Billing Cycle

```
1. Create customer: customer_startup (Startup Labs)
2. Create quote Q-2026-001 (draft) with 12× Team Plan @ $96/unit
3. Submit for approval → approved → send (status: sent, revision: 1)
4. Customer accepts → status: accepted
5. Convert to invoice: INV-2026-001 (status: draft → sent)
6. Record payment: $662.40 deposit (bank, EFT-2026-0218)
7. Record payment: $662.40 balance (card, CC-2026-0228)
8. Mark invoice paid (paid_amount = $1,324.80 = subtotal $1,152 + 15% tax)
```

---

## MCP Tools

| Tool | Description |
|------|-------------|
| `list_customers` / `create_customer` / `update_customer` | Manage customers |
| `list_quotes` / `create_quote` / `update_quote` | Manage quotes |
| `list_invoices` / `create_invoice` / `update_invoice` | Manage invoices |
| `list_payments` / `create_payment` / `update_payment` | Record payments |
| `list_billing_rates` / `create_billing_rate` | Manage billing rates |

All list tools support `slim: true` for compact output.
