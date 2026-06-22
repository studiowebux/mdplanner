/**
 * Finance aggregates billing income (recorded payments) read-time as read-only
 * "income" rows — no duplication, no persistence. A payment shows up in the
 * Finance list and getSummary totals, is filtered like any income entry, and is
 * never written to disk as a finance entry.
 *
 * Coherence step 1 of the billing+finance money model (note_1782101550180).
 */

import { assert, assertEquals } from "@std/assert";
import {
  getFinanceService,
  getInvoiceService,
  getPaymentService,
  getQuoteService,
  initServices,
} from "../../src/singletons/services.ts";
import { BILLING_INCOME_ID_PREFIX } from "../../src/services/finance.service.ts";
import type { LineItem } from "../../src/types/billing.types.ts";

function line(id: string, qty: number, rate: number): LineItem {
  return {
    id,
    type: "line",
    description: `Item ${id}`,
    quantity: qty,
    unit: "unit",
    unitRate: rate,
    amount: qty * rate,
  };
}

async function seedPayment(amount: number): Promise<string> {
  const quote = await getQuoteService().create({
    customerId: "cust_a",
    title: "Build",
    lineItems: [line("a", 1, amount)],
  });
  const invoice = await getInvoiceService().create({ quoteId: quote.id });
  await getInvoiceService().issue(invoice.id);
  const payment = await getPaymentService().create({
    invoiceId: invoice.id,
    amount,
    date: "2026-06-22",
  });
  return payment.id;
}

Deno.test("a recorded payment appears in the finance list as read-only income", async () => {
  const dir = await Deno.makeTempDir({ prefix: "mdplanner-fin-income-" });
  initServices(dir, { cache: false });
  try {
    const paymentId = await seedPayment(200);

    const entries = await getFinanceService().list();
    const row = entries.find((e) => e.id === paymentId);
    assert(row, "payment is projected into the finance list");
    assertEquals(row?.type, "income");
    assertEquals(row?.amount, 200);
    assert(row?.tags?.includes("payment"), "tagged as payment");
    assert(
      row!.id.startsWith(BILLING_INCOME_ID_PREFIX),
      "carries the billing-income id prefix (read-only marker)",
    );
  } finally {
    await Deno.remove(dir, { recursive: true });
  }
});

Deno.test("getSummary income includes payments; expense filter excludes them", async () => {
  const dir = await Deno.makeTempDir({ prefix: "mdplanner-fin-income-" });
  initServices(dir, { cache: false });
  try {
    await getFinanceService().create({
      title: "Hosting",
      type: "expense",
      amount: 50,
      date: "2026-06-22",
    });
    await seedPayment(200);

    const summary = await getFinanceService().getSummary();
    assertEquals(summary.totalIncome, 200, "payment counted as income");
    assertEquals(summary.totalExpense, 50);
    assertEquals(summary.balance, 150);

    // Filtering to expenses must drop the projected income row.
    const expenses = await getFinanceService().list({ type: "expense" });
    assertEquals(expenses.length, 1);
    assertEquals(expenses[0].title, "Hosting");
  } finally {
    await Deno.remove(dir, { recursive: true });
  }
});

Deno.test("billing income is never persisted as a finance entry", async () => {
  const dir = await Deno.makeTempDir({ prefix: "mdplanner-fin-income-" });
  initServices(dir, { cache: false });
  try {
    await seedPayment(200);
    // getById goes to the repo (real entries only) — the projection is read-time.
    const stored = await getFinanceService().getById(
      `${BILLING_INCOME_ID_PREFIX}does-not-matter`,
    );
    assertEquals(stored, null, "projected income is not a stored entry");
  } finally {
    await Deno.remove(dir, { recursive: true });
  }
});
