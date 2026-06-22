/**
 * A quote can be linked to a portfolio item (project) via portfolioItemId, and
 * the portfolio detail page shows a Billing reconciliation derived from the
 * linked quotes + their invoices/payments. Coherence step 3b
 * (note_1782101550180) — wires invoices to portfolio.
 */

import { assert, assertStringIncludes } from "@std/assert";
import { portfolioRouter } from "../../src/views/portfolio/routes.tsx";
import {
  getInvoiceService,
  getPaymentService,
  getPortfolioService,
  getQuoteService,
  initServices,
} from "../../src/singletons/services.ts";
import type { LineItem } from "../../src/types/billing.types.ts";

function line(amount: number): LineItem {
  return {
    id: "a",
    type: "line",
    description: "Work",
    quantity: 1,
    unit: "unit",
    unitRate: amount,
    amount,
  };
}

Deno.test("portfolio detail shows billing reconciliation for linked quotes", async () => {
  const dir = await Deno.makeTempDir({ prefix: "mdplanner-pf-billing-" });
  initServices(dir, { cache: false });
  try {
    const item = await getPortfolioService().create({
      name: "Redesign",
      status: "active",
    });
    // Linked quote → invoice → payment.
    const quote = await getQuoteService().create({
      customerId: "cust_a",
      title: "Redesign build",
      portfolioItemId: item.id,
      lineItems: [line(1000)],
    });
    const invoice = await getInvoiceService().create({ quoteId: quote.id });
    await getInvoiceService().issue(invoice.id);
    await getPaymentService().create({
      invoiceId: invoice.id,
      amount: 400,
      date: "2026-06-22",
    });
    // An unrelated quote on no portfolio must not leak in.
    await getQuoteService().create({
      customerId: "cust_b",
      title: "Other",
      lineItems: [line(9999)],
    });

    const res = await portfolioRouter.request(`http://localhost/${item.id}`);
    const html = await res.text();

    assertStringIncludes(html, "Billing");
    assertStringIncludes(html, "Quoted");
    assertStringIncludes(html, "Outstanding");
    // Linked amounts present; the unrelated 9999 quote does not.
    assert(html.includes("1000") || html.includes("1,000.00"), "quoted shown");
    assert(!html.includes("9999"), "unrelated quote excluded");
  } finally {
    await Deno.remove(dir, { recursive: true });
  }
});

Deno.test("portfolioItemId round-trips through the quote repository", async () => {
  const dir = await Deno.makeTempDir({ prefix: "mdplanner-pf-billing-" });
  initServices(dir, { cache: false });
  try {
    const created = await getQuoteService().create({
      customerId: "cust_a",
      title: "Q",
      portfolioItemId: "portfolio_x",
      lineItems: [],
    });
    const fetched = await getQuoteService().getById(created.id);
    assert(fetched?.portfolioItemId === "portfolio_x");
  } finally {
    await Deno.remove(dir, { recursive: true });
  }
});
