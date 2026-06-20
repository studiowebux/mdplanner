/**
 * Render guard for InvoicePrintView — the print-only invoice page behind
 * GET /invoices/:id/print (browser Print / Save as PDF).
 *
 * Asserts the exported document includes the payment terms (NET 30 etc., which
 * were previously never rendered in the export) and the quote-derived footer
 * under the Terms and Conditions heading.
 */

import { assert } from "@std/assert";
import { renderToString } from "hono/jsx/dom/server";
import { InvoicePrintView } from "../../src/views/invoice-print.tsx";
import type { Invoice } from "../../src/types/invoice.types.ts";
import type { Customer } from "../../src/types/customer.types.ts";
import type { ProjectConfig } from "../../src/types/project.types.ts";
import { APP_VERSION } from "../../src/constants/mod.ts";

const invoice = {
  id: "invoice_test",
  number: "INV-2026-009",
  quoteId: "quote_test",
  customerId: "customer_test",
  title: "Annual Retainer",
  status: "sent",
  currency: "CAD",
  dueDate: "2026-07-01",
  paymentTerms: "NET 30",
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
  paidAmount: 0,
  footer: "Payment due within 30 days of receipt.",
  createdAt: "2026-06-01T00:00:00.000Z",
  updatedAt: "2026-06-01T00:00:00.000Z",
} as unknown as Invoice;

const customer = {
  id: "customer_test",
  name: "Acme Corp",
  company: "Acme Corporation",
} as unknown as Customer;

const billingConfig = {
  billingDefaultFooter: "Default footer",
} as unknown as ProjectConfig;

function render(): string {
  return renderToString(
    InvoicePrintView({
      invoice,
      displayStatus: "sent",
      billingConfig,
      customer,
      checksum: "a".repeat(64),
      generatedAt: "2026-06-20T00:00:00.000Z",
      nonce: "test-nonce",
    }),
  );
}

Deno.test("InvoicePrintView renders the payment terms in the export", () => {
  const html = render();
  assert(html.includes("INV-2026-009"), "must show the invoice number");
  assert(html.includes(">Terms<"), "must render a Terms meta label");
  assert(html.includes("NET 30"), "must render the payment terms value");
});

Deno.test("InvoicePrintView version-stamps its stylesheets (cache busting)", () => {
  const html = render();
  assert(
    html.includes(`/css/views/invoices.css?v=${APP_VERSION}`),
    "print stylesheet must carry the app-version cache-busting query",
  );
});

Deno.test("InvoicePrintView renders the footer under Terms and Conditions", () => {
  const html = render();
  assert(
    html.includes("Terms and Conditions"),
    "must render the Terms and Conditions heading",
  );
  assert(
    html.includes("Payment due within 30 days of receipt."),
    "must render the footer text",
  );
});

Deno.test("InvoicePrintView stamps the generation date and content checksum", () => {
  const html = render();
  assert(html.includes("Generated"), "must show the generation date label");
  assert(
    html.includes(`SHA-256 ${"a".repeat(64)}`),
    "must render the content checksum tag",
  );
});
