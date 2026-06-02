/**
 * Unit tests for v2 PaymentRepository (CRUD on disk) + PaymentService
 * (filter behaviour + invoice-sync side effects).
 *
 * Regression focus:
 * - PAYMENT_BODY_KEYS = ["notes"] — `id` stays in frontmatter; `parse()` 404s
 *   without it (`if (!fm.id) return null`). Asserts findById survives update.
 * - PaymentService.create / .delete must call invoiceService.updatePaidAmount
 *   with the cumulative sum of remaining payments. Uses a fake InvoiceService
 *   that captures every call.
 */

import { assertEquals, assertExists, assertStrictEquals } from "@std/assert";
import { join } from "@std/path";
import { PaymentRepository } from "../../src/repositories/payment.repository.ts";
import { PaymentService } from "../../src/services/payment.service.ts";
import type { InvoiceService } from "../../src/services/invoice.service.ts";

interface SyncCall {
  invoiceId: string;
  totalPaid: number;
}

function fakeInvoiceService(): {
  service: InvoiceService;
  calls: SyncCall[];
} {
  const calls: SyncCall[] = [];
  const service = {
    async updatePaidAmount(invoiceId: string, totalPaid: number) {
      calls.push({ invoiceId, totalPaid });
      return null;
    },
    // deno-lint-ignore no-explicit-any
  } as any as InvoiceService;
  return { service, calls };
}

async function setup(): Promise<{
  repo: PaymentRepository;
  service: PaymentService;
  invoiceCalls: SyncCall[];
  dir: string;
}> {
  const dir = await Deno.makeTempDir({ prefix: "mdplanner-payment-test-" });
  const repo = new PaymentRepository(dir);
  const { service: invoiceService, calls: invoiceCalls } = fakeInvoiceService();
  const service = new PaymentService(repo, invoiceService);
  return { repo, service, invoiceCalls, dir };
}

async function cleanup(dir: string): Promise<void> {
  try {
    await Deno.remove(dir, { recursive: true });
  } catch {
    // ignore
  }
}

// === create + findById ===

Deno.test("PaymentRepository - create stores file and returns entity", async () => {
  const { repo, dir } = await setup();
  try {
    const payment = await repo.create({
      invoiceId: "invoice_001",
      amount: 1500,
      date: "2026-02-18",
      method: "card",
      reference: "ch_1234567890",
      notes: "First half of milestone 1.",
    });
    assertExists(payment.id);
    assertEquals(payment.invoiceId, "invoice_001");
    assertEquals(payment.amount, 1500);
    assertEquals(payment.date, "2026-02-18");
    assertEquals(payment.method, "card");
    assertEquals(payment.reference, "ch_1234567890");
    assertEquals(payment.notes, "First half of milestone 1.");
    assertExists(payment.createdAt);
    assertExists(payment.updatedAt);
  } finally {
    await cleanup(dir);
  }
});

Deno.test("PaymentRepository - findById returns correct entity", async () => {
  const { repo, dir } = await setup();
  try {
    const created = await repo.create({
      invoiceId: "invoice_002",
      amount: 250,
      date: "2026-03-01",
    });
    const found = await repo.findById(created.id);
    assertExists(found);
    assertEquals(found!.id, created.id);
    assertEquals(found!.invoiceId, "invoice_002");
    assertEquals(found!.amount, 250);
    assertEquals(found!.date, "2026-03-01");
  } finally {
    await cleanup(dir);
  }
});

Deno.test("PaymentRepository - findById returns null for missing ID", async () => {
  const { repo, dir } = await setup();
  try {
    const found = await repo.findById("payment_nonexistent");
    assertStrictEquals(found, null);
  } finally {
    await cleanup(dir);
  }
});

// === parse-guard regression ===

Deno.test("PaymentRepository - findById succeeds after update (parse-guard regression)", async () => {
  const { repo, dir } = await setup();
  try {
    const created = await repo.create({
      invoiceId: "invoice_pg",
      amount: 100,
      date: "2026-01-01",
      reference: "ref-pg",
      notes: "Original notes.",
    });
    // PAYMENT_BODY_KEYS = ["notes"] — id stays in frontmatter; the guard
    // `if (!fm.id) return null` must still hold after re-serialization.
    const updated = await repo.update(created.id, { amount: 200 });
    assertExists(updated);
    const fetched = await repo.findById(created.id);
    assertExists(fetched);
    assertEquals(fetched!.id, created.id);
    assertEquals(fetched!.invoiceId, "invoice_pg");
    assertEquals(fetched!.amount, 200);
    assertEquals(fetched!.reference, "ref-pg");
    assertEquals(fetched!.notes, "Original notes.");
  } finally {
    await cleanup(dir);
  }
});

// === update ===

Deno.test("PaymentRepository - update modifies existing entity", async () => {
  const { repo, dir } = await setup();
  try {
    const payment = await repo.create({
      invoiceId: "invoice_u",
      amount: 100,
      date: "2026-01-01",
    });
    const updated = await repo.update(payment.id, { amount: 150 });
    assertExists(updated);
    assertEquals(updated!.amount, 150);

    const found = await repo.findById(payment.id);
    assertEquals(found!.amount, 150);
  } finally {
    await cleanup(dir);
  }
});

Deno.test("PaymentRepository - update preserves sibling fields", async () => {
  const { repo, dir } = await setup();
  try {
    const created = await repo.create({
      invoiceId: "invoice_sib",
      amount: 500,
      date: "2026-04-01",
      method: "bank",
      reference: "wire-abc",
      notes: "Keep me intact.",
    });
    await repo.update(created.id, { amount: 600 });
    const fetched = await repo.findById(created.id);
    assertExists(fetched);
    assertEquals(fetched!.amount, 600);
    assertEquals(fetched!.invoiceId, "invoice_sib");
    assertEquals(fetched!.date, "2026-04-01");
    assertEquals(fetched!.method, "bank");
    assertEquals(fetched!.reference, "wire-abc");
    assertEquals(fetched!.notes, "Keep me intact.");
  } finally {
    await cleanup(dir);
  }
});

Deno.test("PaymentRepository - update returns null for non-existent ID", async () => {
  const { repo, dir } = await setup();
  try {
    const result = await repo.update("payment_missing", { amount: 999 });
    assertStrictEquals(result, null);
  } finally {
    await cleanup(dir);
  }
});

// === delete (soft-archive) + hardDelete ===

Deno.test("PaymentRepository - delete soft-archives entity", async () => {
  const { repo, dir } = await setup();
  try {
    const payment = await repo.create({
      invoiceId: "invoice_d",
      amount: 100,
      date: "2026-01-01",
    });
    const deleted = await repo.delete(payment.id);
    assertEquals(deleted, true);
    const found = await repo.findById(payment.id);
    assertExists(found);
    const all = await repo.findAllFromDisk();
    assertStrictEquals(all.find((p) => p.id === payment.id), undefined);
  } finally {
    await cleanup(dir);
  }
});

Deno.test("PaymentRepository - hardDelete removes the file", async () => {
  const { repo, dir } = await setup();
  try {
    const payment = await repo.create({
      invoiceId: "invoice_hd",
      amount: 100,
      date: "2026-01-01",
    });
    const ok = await repo.hardDelete(payment.id);
    assertEquals(ok, true);
    const found = await repo.findById(payment.id);
    assertStrictEquals(found, null);
  } finally {
    await cleanup(dir);
  }
});

Deno.test("PaymentRepository - delete returns false for non-existent ID", async () => {
  const { repo, dir } = await setup();
  try {
    const result = await repo.delete("payment_ghost");
    assertEquals(result, false);
  } finally {
    await cleanup(dir);
  }
});

// === findAll: sort + archive filtering ===

Deno.test("PaymentRepository - findAllFromDisk sorts alphabetically by reference (nameField)", async () => {
  const { repo, dir } = await setup();
  try {
    await repo.create({
      invoiceId: "i1",
      amount: 100,
      date: "2026-01-01",
      reference: "charlie-ref",
    });
    await repo.create({
      invoiceId: "i2",
      amount: 100,
      date: "2026-01-01",
      reference: "alpha-ref",
    });
    await repo.create({
      invoiceId: "i3",
      amount: 100,
      date: "2026-01-01",
      reference: "bravo-ref",
    });
    const all = await repo.findAllFromDisk();
    assertEquals(all.length, 3);
    assertEquals(all.map((p) => p.reference), [
      "alpha-ref",
      "bravo-ref",
      "charlie-ref",
    ]);
  } finally {
    await cleanup(dir);
  }
});

// === service.list filters ===

Deno.test("PaymentService - list with invoiceId filter returns only matching", async () => {
  const { repo, service, dir } = await setup();
  try {
    await repo.create({
      invoiceId: "invoice_a",
      amount: 100,
      date: "2026-01-01",
    });
    await repo.create({
      invoiceId: "invoice_a",
      amount: 200,
      date: "2026-02-01",
    });
    await repo.create({
      invoiceId: "invoice_b",
      amount: 50,
      date: "2026-01-15",
    });
    const matches = await service.list({ invoiceId: "invoice_a" });
    assertEquals(matches.length, 2);
    assertEquals(matches.every((p) => p.invoiceId === "invoice_a"), true);
  } finally {
    await cleanup(dir);
  }
});

Deno.test("PaymentService - list with method filter is case-insensitive", async () => {
  const { repo, service, dir } = await setup();
  try {
    await repo.create({
      invoiceId: "i1",
      amount: 100,
      date: "2026-01-01",
      method: "card",
    });
    await repo.create({
      invoiceId: "i2",
      amount: 100,
      date: "2026-01-01",
      method: "bank",
    });
    await repo.create({
      invoiceId: "i3",
      amount: 100,
      date: "2026-01-01",
      method: "card",
    });
    const cardPayments = await service.list({ method: "card" });
    assertEquals(cardPayments.length, 2);
    assertEquals(cardPayments.every((p) => p.method === "card"), true);
  } finally {
    await cleanup(dir);
  }
});

Deno.test("PaymentService - list with q filter matches reference (case-insensitive)", async () => {
  const { repo, service, dir } = await setup();
  try {
    await repo.create({
      invoiceId: "i1",
      amount: 100,
      date: "2026-01-01",
      reference: "STRIPE-abc",
    });
    await repo.create({
      invoiceId: "i2",
      amount: 100,
      date: "2026-01-01",
      reference: "wire-xyz",
    });
    const matches = await service.list({ q: "stripe" });
    assertEquals(matches.length, 1);
    assertEquals(matches[0].reference, "STRIPE-abc");
  } finally {
    await cleanup(dir);
  }
});

Deno.test("PaymentService - list with q filter matches notes (case-insensitive)", async () => {
  const { repo, service, dir } = await setup();
  try {
    await repo.create({
      invoiceId: "i1",
      amount: 100,
      date: "2026-01-01",
      notes: "Applies to ONBOARDING fees.",
    });
    await repo.create({
      invoiceId: "i2",
      amount: 100,
      date: "2026-01-01",
      notes: "Retainer payment.",
    });
    const matches = await service.list({ q: "onboarding" });
    assertEquals(matches.length, 1);
    assertEquals(matches[0].notes, "Applies to ONBOARDING fees.");
  } finally {
    await cleanup(dir);
  }
});

Deno.test("PaymentService - list combines invoiceId + method (AND)", async () => {
  const { repo, service, dir } = await setup();
  try {
    await repo.create({
      invoiceId: "i1",
      amount: 100,
      date: "2026-01-01",
      method: "card",
    });
    await repo.create({
      invoiceId: "i1",
      amount: 200,
      date: "2026-01-02",
      method: "bank",
    });
    await repo.create({
      invoiceId: "i2",
      amount: 50,
      date: "2026-01-03",
      method: "card",
    });
    const matches = await service.list({
      invoiceId: "i1",
      method: "card",
    });
    assertEquals(matches.length, 1);
    assertEquals(matches[0].amount, 100);
  } finally {
    await cleanup(dir);
  }
});

Deno.test("PaymentService - list with no options returns all", async () => {
  const { repo, service, dir } = await setup();
  try {
    await repo.create({ invoiceId: "i1", amount: 100, date: "2026-01-01" });
    await repo.create({ invoiceId: "i2", amount: 200, date: "2026-01-02" });
    const all = await service.list();
    assertEquals(all.length, 2);
  } finally {
    await cleanup(dir);
  }
});

// === service.getPaymentsForInvoice + sumForInvoice ===

Deno.test("PaymentService.getPaymentsForInvoice + sumForInvoice", async () => {
  const { repo, service, dir } = await setup();
  try {
    await repo.create({ invoiceId: "i1", amount: 100, date: "2026-01-01" });
    await repo.create({ invoiceId: "i1", amount: 250, date: "2026-02-01" });
    await repo.create({ invoiceId: "i2", amount: 999, date: "2026-01-15" });

    const forI1 = await service.getPaymentsForInvoice("i1");
    assertEquals(forI1.length, 2);
    assertEquals(forI1.every((p) => p.invoiceId === "i1"), true);

    const sumI1 = await service.sumForInvoice("i1");
    assertEquals(sumI1, 350);

    const sumNone = await service.sumForInvoice("nonexistent");
    assertEquals(sumNone, 0);
  } finally {
    await cleanup(dir);
  }
});

// === service.create triggers invoice sync ===

Deno.test("PaymentService.create syncs invoice paidAmount with cumulative sum", async () => {
  const { service, invoiceCalls, dir } = await setup();
  try {
    await service.create({
      invoiceId: "inv_sync",
      amount: 100,
      date: "2026-01-01",
    });
    assertEquals(invoiceCalls.length, 1);
    assertEquals(invoiceCalls[0], { invoiceId: "inv_sync", totalPaid: 100 });

    await service.create({
      invoiceId: "inv_sync",
      amount: 250,
      date: "2026-02-01",
    });
    assertEquals(invoiceCalls.length, 2);
    assertEquals(invoiceCalls[1], { invoiceId: "inv_sync", totalPaid: 350 });

    // Different invoice — separate cumulative sum.
    await service.create({
      invoiceId: "inv_other",
      amount: 50,
      date: "2026-03-01",
    });
    assertEquals(invoiceCalls.length, 3);
    assertEquals(invoiceCalls[2], { invoiceId: "inv_other", totalPaid: 50 });
  } finally {
    await cleanup(dir);
  }
});

// === service.delete triggers invoice sync ===

Deno.test("PaymentService.delete syncs invoice paidAmount with remaining sum", async () => {
  const { service, invoiceCalls, dir } = await setup();
  try {
    const p1 = await service.create({
      invoiceId: "inv_del",
      amount: 100,
      date: "2026-01-01",
    });
    await service.create({
      invoiceId: "inv_del",
      amount: 250,
      date: "2026-02-01",
    });
    invoiceCalls.length = 0; // clear setup calls

    const deleted = await service.delete(p1.id);
    assertEquals(deleted, true);
    assertEquals(invoiceCalls.length, 1);
    // After soft-archiving p1, only the 250 payment remains.
    assertEquals(invoiceCalls[0], { invoiceId: "inv_del", totalPaid: 250 });
  } finally {
    await cleanup(dir);
  }
});

Deno.test("PaymentService.delete with non-existent ID does NOT call invoice sync", async () => {
  const { service, invoiceCalls, dir } = await setup();
  try {
    const result = await service.delete("payment_ghost");
    assertEquals(result, false);
    assertEquals(invoiceCalls.length, 0);
  } finally {
    await cleanup(dir);
  }
});

// === snake_case ↔ camelCase round-trip ===

Deno.test("PaymentRepository - writes invoice_id snake_case on disk, reads invoiceId camelCase", async () => {
  const { repo, dir } = await setup();
  try {
    const payment = await repo.create({
      invoiceId: "invoice_round_trip",
      amount: 500,
      date: "2026-05-01",
      method: "bank",
    });
    const filePath = join(dir, "billing/payments", `${payment.id}.md`);
    const raw = await Deno.readTextFile(filePath);
    const fmEnd = raw.indexOf("\n---", 4);
    const fm = raw.slice(0, fmEnd);
    assertEquals(fm.includes("invoice_id:"), true);
    assertEquals(fm.includes("invoiceId:"), false);
    assertEquals(fm.includes("created_at:"), true);
    // Entity reads back camelCase.
    const fetched = await repo.findById(payment.id);
    assertExists(fetched);
    assertEquals(fetched!.invoiceId, "invoice_round_trip");
    assertExists(fetched!.createdAt);
  } finally {
    await cleanup(dir);
  }
});

// === edge cases ===

Deno.test("PaymentRepository - optional fields left undefined round-trip as undefined", async () => {
  const { repo, dir } = await setup();
  try {
    const created = await repo.create({
      invoiceId: "invoice_min",
      amount: 50,
      date: "2026-01-01",
      // method / reference / notes intentionally omitted
    });
    assertStrictEquals(created.method, undefined);
    assertStrictEquals(created.reference, undefined);
    assertStrictEquals(created.notes, undefined);

    const fetched = await repo.findById(created.id);
    assertExists(fetched);
    assertStrictEquals(fetched!.method, undefined);
    assertStrictEquals(fetched!.reference, undefined);
    assertStrictEquals(fetched!.notes, undefined);
  } finally {
    await cleanup(dir);
  }
});

Deno.test("PaymentRepository - findByName matches by reference (case-insensitive)", async () => {
  const { repo, dir } = await setup();
  try {
    await repo.create({
      invoiceId: "i1",
      amount: 100,
      date: "2026-01-01",
      reference: "Premium-Wire-001",
    });
    await repo.create({
      invoiceId: "i2",
      amount: 100,
      date: "2026-01-01",
      reference: "standard-wire-002",
    });
    const found = await repo.findByName("premium-wire-001");
    assertExists(found);
    assertEquals(found!.reference, "Premium-Wire-001");
  } finally {
    await cleanup(dir);
  }
});
