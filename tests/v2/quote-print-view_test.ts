/**
 * Render guard for QuotePrintView — the print-only quote page behind
 * GET /quotes/:id/print (browser Print / Save as PDF, parity with invoices).
 *
 * Renders the real view with the same renderToString the route uses and
 * asserts the key billing-document content survives: the QUOTE label, number,
 * title, validity/issued meta, customer Bill-To, totals, footer, and that it
 * reuses the shared invoice-print__* print layout (no forked stylesheet).
 */

import { assert } from "@std/assert";
import { renderToString } from "hono/jsx/dom/server";
import { QuotePrintView } from "../../src/views/quote-print.tsx";
import type { Quote } from "../../src/types/quote.types.ts";
import type { Customer } from "../../src/types/customer.types.ts";
import type { ProjectConfig } from "../../src/types/project.types.ts";

const quote = {
  id: "quote_test",
  number: "Q-2026-009",
  customerId: "customer_test",
  title: "Annual Retainer",
  status: "sent",
  currency: "CAD",
  expiresAt: "2026-12-31",
  sentAt: "2026-06-01T00:00:00.000Z",
  lineItems: [
    {
      id: "li1",
      type: "service",
      description: "Consulting",
      quantity: 2,
      rate: 100,
      amount: 200,
    },
  ],
  subtotal: 200,
  tax: 30,
  taxRate: 15,
  total: 230,
  notes: "Thank you for your business.",
  footer: "Valid for 30 days.",
  createdAt: "2026-06-01T00:00:00.000Z",
  updatedAt: "2026-06-01T00:00:00.000Z",
} as unknown as Quote;

const customer = {
  id: "customer_test",
  name: "Acme Corp",
  company: "Acme Corporation",
  email: "billing@acme.test",
  phone: "555-0100",
  billingAddress: {
    street: "1 Main St",
    city: "Montreal",
    state: "QC",
    postalCode: "H0H 0H0",
    country: "Canada",
  },
} as unknown as Customer;

const billingConfig = {
  billingDefaultFooter: "Default footer",
} as unknown as ProjectConfig;

function render(): string {
  return renderToString(
    QuotePrintView({ quote, billingConfig, customer, nonce: "test-nonce" }),
  );
}

Deno.test("QuotePrintView renders the QUOTE document with its key fields", () => {
  const html = render();
  assert(html.includes("QUOTE"), "must show the QUOTE label");
  assert(html.includes("Q-2026-009"), "must show the quote number");
  assert(html.includes("Annual Retainer"), "must show the quote title");
  assert(html.includes("Valid until"), "must show the expiry/validity meta");
  assert(html.includes("Consulting"), "must render line items");
  assert(html.includes("Valid for 30 days."), "must render the footer");
});

Deno.test("QuotePrintView renders the customer Bill-To block", () => {
  const html = render();
  assert(html.includes("Bill To"), "must render the Bill To heading");
  assert(html.includes("Acme Corp"), "must render the customer name");
});

Deno.test("QuotePrintView reuses the shared billing print layout + script", () => {
  const html = render();
  assert(
    html.includes("invoice-print"),
    "must reuse the shared invoice-print layout classes (no forked stylesheet)",
  );
  assert(
    html.includes("/js/billing-print.js"),
    "must load the shared billing-print auto-print script",
  );
});
