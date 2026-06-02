/**
 * Unit tests for v2 InvoiceRepository (CRUD on disk) + InvoiceService
 * (line items, totals, number generation, payment tracking, overdue).
 *
 * Shared totals utility (`v2/utils/billing.ts`) is exercised through the
 * service so we lock the integration, not the implementation.
 *
 * INVOICE_BODY_KEYS = ["id","notes"] — id is in body, parse-guard
 * `!fm.id && !fm.title` must hold via fm.title post-update.
 */

import { assertEquals, assertExists, assertStrictEquals } from "@std/assert";
import { join } from "@std/path";
import { InvoiceRepository } from "../../src/repositories/invoice.repository.ts";
import { InvoiceService } from "../../src/services/invoice.service.ts";
import type { LineItem } from "../../src/types/billing.types.ts";

async function setup(): Promise<
  { repo: InvoiceRepository; service: InvoiceService; dir: string }
> {
  const dir = await Deno.makeTempDir({ prefix: "mdplanner-invoice-test-" });
  const repo = new InvoiceRepository(dir);
  const service = new InvoiceService(repo);
  return { repo, service, dir };
}

async function cleanup(dir: string): Promise<void> {
  try {
    await Deno.remove(dir, { recursive: true });
  } catch {
    // ignore
  }
}

function line(overrides: Partial<LineItem>): LineItem {
  return {
    id: overrides.id ?? `li_${Math.random().toString(36).slice(2, 8)}`,
    type: overrides.type ?? "service",
    description: overrides.description ?? "Work",
    quantity: overrides.quantity ?? 1,
    unitRate: overrides.unitRate ?? 100,
    amount: overrides.amount ?? 0,
    ...overrides,
  };
}

// === repository CRUD ===

Deno.test("InvoiceRepository - create stores file with default-fill", async () => {
  const { repo, dir } = await setup();
  try {
    const inv = await repo.create({
      customerId: "customer_001",
      title: "Year 1 Plan",
      lineItems: [],
    });
    assertExists(inv.id);
    assertEquals(inv.customerId, "customer_001");
    assertEquals(inv.title, "Year 1 Plan");
    assertEquals(inv.status, "draft");
    assertEquals(inv.lineItems, []);
    assertEquals(inv.subtotal, 0);
    assertEquals(inv.total, 0);
    assertEquals(inv.paidAmount, 0);
  } finally {
    await cleanup(dir);
  }
});

Deno.test("InvoiceRepository - findById returns null for missing ID", async () => {
  const { repo, dir } = await setup();
  try {
    assertStrictEquals(await repo.findById("invoice_nonexistent"), null);
  } finally {
    await cleanup(dir);
  }
});

// === parse-guard regression ===

Deno.test("InvoiceRepository - findById succeeds after update with lineItems populated (parse-guard regression)", async () => {
  const { repo, dir } = await setup();
  try {
    const created = await repo.create({
      customerId: "c1",
      title: "Parse Guard",
      lineItems: [
        line({
          id: "li_1",
          type: "service",
          description: "Hours",
          quantity: 10,
          unitRate: 100,
          amount: 1000,
        }),
      ],
    });
    // INVOICE_BODY_KEYS = ["id","notes"] — id absent from fm; guard `!fm.id
    // && !fm.title` must hold via fm.title.
    const updated = await repo.update(created.id, { dueDate: "2026-12-31" });
    assertExists(updated);
    const fetched = await repo.findById(created.id);
    assertExists(fetched);
    assertEquals(fetched!.id, created.id);
    assertEquals(fetched!.title, "Parse Guard");
    assertEquals(fetched!.dueDate, "2026-12-31");
    assertEquals(fetched!.lineItems.length, 1);
    assertEquals(fetched!.lineItems[0].id, "li_1");
    assertEquals(fetched!.lineItems[0].quantity, 10);
    assertEquals(fetched!.lineItems[0].unitRate, 100);
    assertEquals(fetched!.lineItems[0].amount, 1000);
  } finally {
    await cleanup(dir);
  }
});

// === update ===

Deno.test("InvoiceRepository - update preserves sibling fields", async () => {
  const { repo, dir } = await setup();
  try {
    const created = await repo.create({
      customerId: "c1",
      title: "Sibling",
      paymentTerms: "NET 30",
      currency: "USD",
      notes: "Keep me intact.",
      lineItems: [],
    });
    await repo.update(created.id, { dueDate: "2026-04-30" });
    const fetched = await repo.findById(created.id);
    assertExists(fetched);
    assertEquals(fetched!.paymentTerms, "NET 30");
    assertEquals(fetched!.currency, "USD");
    assertEquals(fetched!.notes, "Keep me intact.");
    assertEquals(fetched!.dueDate, "2026-04-30");
  } finally {
    await cleanup(dir);
  }
});

Deno.test("InvoiceRepository - update returns null for non-existent ID", async () => {
  const { repo, dir } = await setup();
  try {
    assertStrictEquals(await repo.update("invoice_missing", {}), null);
  } finally {
    await cleanup(dir);
  }
});

// === delete + hardDelete ===

Deno.test("InvoiceRepository - delete soft-archives entity", async () => {
  const { repo, dir } = await setup();
  try {
    const inv = await repo.create({
      customerId: "c1",
      title: "Archive me",
      lineItems: [],
    });
    assertEquals(await repo.delete(inv.id), true);
    const found = await repo.findById(inv.id);
    assertExists(found);
    const all = await repo.findAllFromDisk();
    assertStrictEquals(all.find((i) => i.id === inv.id), undefined);
  } finally {
    await cleanup(dir);
  }
});

Deno.test("InvoiceRepository - hardDelete removes the file", async () => {
  const { repo, dir } = await setup();
  try {
    const inv = await repo.create({
      customerId: "c1",
      title: "Gone",
      lineItems: [],
    });
    assertEquals(await repo.hardDelete(inv.id), true);
    assertStrictEquals(await repo.findById(inv.id), null);
  } finally {
    await cleanup(dir);
  }
});

Deno.test("InvoiceRepository - delete returns false for non-existent ID", async () => {
  const { repo, dir } = await setup();
  try {
    assertEquals(await repo.delete("invoice_ghost"), false);
  } finally {
    await cleanup(dir);
  }
});

// === findAll: sort ===

Deno.test("InvoiceRepository - findAllFromDisk sorts alphabetically by title (nameField)", async () => {
  const { repo, dir } = await setup();
  try {
    await repo.create({
      customerId: "c1",
      title: "Charlie Invoice",
      lineItems: [],
    });
    await repo.create({
      customerId: "c1",
      title: "Alpha Invoice",
      lineItems: [],
    });
    await repo.create({
      customerId: "c1",
      title: "Bravo Invoice",
      lineItems: [],
    });
    const all = await repo.findAllFromDisk();
    assertEquals(all.map((i) => i.title), [
      "Alpha Invoice",
      "Bravo Invoice",
      "Charlie Invoice",
    ]);
  } finally {
    await cleanup(dir);
  }
});

// === service.create — number generation + totals ===

Deno.test("InvoiceService.create generates INV-YYYY-NNN number and computes totals", async () => {
  const { service, dir } = await setup();
  try {
    const year = new Date().getFullYear();
    const inv = await service.create({
      customerId: "c1",
      title: "Auto-numbered",
      lineItems: [
        line({
          id: "li_1",
          type: "service",
          description: "Hours",
          quantity: 10,
          unitRate: 100,
        }),
      ],
    });
    assertEquals(inv.number, `INV-${year}-001`);
    // Service.create runs calculateTotals: amount = qty × rate.
    assertEquals(inv.lineItems[0].amount, 1000);
    assertEquals(inv.subtotal, 1000);
    assertEquals(inv.total, 1000);
  } finally {
    await cleanup(dir);
  }
});

Deno.test("InvoiceService.create increments invoice number sequentially", async () => {
  const { service, dir } = await setup();
  try {
    const year = new Date().getFullYear();
    const inv1 = await service.create({
      customerId: "c1",
      title: "A",
      lineItems: [],
    });
    const inv2 = await service.create({
      customerId: "c1",
      title: "B",
      lineItems: [],
    });
    const inv3 = await service.create({
      customerId: "c1",
      title: "C",
      lineItems: [],
    });
    assertEquals(inv1.number, `INV-${year}-001`);
    assertEquals(inv2.number, `INV-${year}-002`);
    assertEquals(inv3.number, `INV-${year}-003`);
  } finally {
    await cleanup(dir);
  }
});

// === calculateTotals (via service.create) ===

Deno.test("InvoiceService.calculateTotals - text lines excluded from subtotal", async () => {
  const { service, dir } = await setup();
  try {
    const inv = await service.create({
      customerId: "c1",
      title: "Mixed",
      lineItems: [
        line({
          id: "li_t",
          type: "text",
          description: "Section header",
          quantity: 0,
          unitRate: 0,
        }),
        line({
          id: "li_s",
          type: "service",
          description: "Hours",
          quantity: 5,
          unitRate: 200,
        }),
      ],
    });
    // text lines contribute amount 0 to subtotal.
    assertEquals(inv.lineItems[0].amount, 0);
    assertEquals(inv.lineItems[1].amount, 1000);
    assertEquals(inv.subtotal, 1000);
  } finally {
    await cleanup(dir);
  }
});

Deno.test("InvoiceService.calculateTotals - tax applied only to taxable lines and only when taxRate > 0", async () => {
  const { service, dir } = await setup();
  try {
    const inv = await service.create({
      customerId: "c1",
      title: "Taxed",
      taxRate: 15,
      lineItems: [
        line({
          id: "li_tax",
          type: "service",
          description: "Taxable",
          quantity: 1,
          unitRate: 1000,
          taxable: true,
        }),
        line({
          id: "li_nottax",
          type: "expense",
          description: "Non-taxable",
          quantity: 1,
          unitRate: 500,
          taxable: false,
        }),
      ],
    });
    // taxable: 1000 × 15% = 150
    assertEquals(inv.subtotal, 1500);
    assertEquals(inv.tax, 150);
    assertEquals(inv.total, 1650);
  } finally {
    await cleanup(dir);
  }
});

Deno.test("InvoiceService.calculateTotals - percent discount applied per line", async () => {
  const { service, dir } = await setup();
  try {
    const inv = await service.create({
      customerId: "c1",
      title: "Discounted",
      lineItems: [
        line({
          id: "li_pct",
          type: "service",
          description: "20% off",
          quantity: 10,
          unitRate: 100,
          discount: 20,
          discountType: "percent",
        }),
      ],
    });
    // gross 1000, 20% off = 800
    assertEquals(inv.lineItems[0].amount, 800);
    assertEquals(inv.subtotal, 800);
  } finally {
    await cleanup(dir);
  }
});

Deno.test("InvoiceService.calculateTotals - fixed discount applied per line", async () => {
  const { service, dir } = await setup();
  try {
    const inv = await service.create({
      customerId: "c1",
      title: "Fixed Discount",
      lineItems: [
        line({
          id: "li_fix",
          type: "product",
          description: "$50 off",
          quantity: 1,
          unitRate: 500,
          discount: 50,
          discountType: "fixed",
        }),
      ],
    });
    assertEquals(inv.lineItems[0].amount, 450);
  } finally {
    await cleanup(dir);
  }
});

// === service.update recompute behaviour ===

Deno.test("InvoiceService.update recomputes totals when lineItems change", async () => {
  const { service, dir } = await setup();
  try {
    const inv = await service.create({
      customerId: "c1",
      title: "Original",
      lineItems: [
        line({
          id: "li_1",
          type: "service",
          description: "1 hour",
          quantity: 1,
          unitRate: 100,
        }),
      ],
    });
    assertEquals(inv.subtotal, 100);

    const updated = await service.update(inv.id, {
      lineItems: [
        line({
          id: "li_1",
          type: "service",
          description: "5 hours",
          quantity: 5,
          unitRate: 100,
        }),
      ],
    });
    assertExists(updated);
    assertEquals(updated!.subtotal, 500);
    assertEquals(updated!.total, 500);
  } finally {
    await cleanup(dir);
  }
});

Deno.test("InvoiceService.update recomputes totals when taxRate changes", async () => {
  const { service, dir } = await setup();
  try {
    const inv = await service.create({
      customerId: "c1",
      title: "TaxChange",
      lineItems: [
        line({
          id: "li_1",
          type: "service",
          description: "Work",
          quantity: 1,
          unitRate: 1000,
        }),
      ],
    });
    assertStrictEquals(inv.tax, undefined);

    const updated = await service.update(inv.id, { taxRate: 10 });
    assertExists(updated);
    assertEquals(updated!.tax, 100);
    assertEquals(updated!.total, 1100);
  } finally {
    await cleanup(dir);
  }
});

Deno.test("InvoiceService.update skips recompute when neither lineItems nor taxRate changes", async () => {
  const { service, dir } = await setup();
  try {
    const inv = await service.create({
      customerId: "c1",
      title: "NoRecompute",
      lineItems: [
        line({
          id: "li_1",
          type: "service",
          description: "Work",
          quantity: 1,
          unitRate: 100,
        }),
      ],
    });
    const updated = await service.update(inv.id, { notes: "Just notes." });
    assertExists(updated);
    // Totals unchanged.
    assertEquals(updated!.subtotal, 100);
    assertEquals(updated!.notes, "Just notes.");
  } finally {
    await cleanup(dir);
  }
});

// === updatePaidAmount auto-transition ===

Deno.test("InvoiceService.updatePaidAmount transitions sent → paid when paid >= total", async () => {
  const { service, repo, dir } = await setup();
  try {
    const inv = await service.create({
      customerId: "c1",
      title: "Sent",
      lineItems: [
        line({
          id: "li_1",
          type: "service",
          description: "Work",
          quantity: 1,
          unitRate: 1000,
        }),
      ],
    });
    // Move to sent so the auto-transition fires.
    await repo.update(inv.id, { status: "sent" });
    const result = await service.updatePaidAmount(inv.id, 1000);
    assertExists(result);
    assertEquals(result!.status, "paid");
    assertEquals(result!.paidAmount, 1000);
    assertExists(result!.paidAt);
  } finally {
    await cleanup(dir);
  }
});

Deno.test("InvoiceService.updatePaidAmount transitions paid → sent when paid < total and clears paidAt", async () => {
  const { service, repo, dir } = await setup();
  try {
    const inv = await service.create({
      customerId: "c1",
      title: "PaidRevert",
      lineItems: [
        line({
          id: "li_1",
          type: "service",
          description: "Work",
          quantity: 1,
          unitRate: 500,
        }),
      ],
    });
    // Fully paid first.
    await repo.update(inv.id, { status: "sent" });
    const paidResult = await service.updatePaidAmount(inv.id, 500);
    assertExists(paidResult!.paidAt);
    // Refund / underpayment: drop below total.
    const result = await service.updatePaidAmount(inv.id, 100);
    assertExists(result);
    assertEquals(result!.status, "sent");
    assertEquals(result!.paidAmount, 100);
    assertStrictEquals(result!.paidAt, undefined);
  } finally {
    await cleanup(dir);
  }
});

Deno.test("InvoiceService.updatePaidAmount does not transition draft status", async () => {
  const { service, dir } = await setup();
  try {
    const inv = await service.create({
      customerId: "c1",
      title: "Draft",
      lineItems: [
        line({
          id: "li_1",
          type: "service",
          description: "Work",
          quantity: 1,
          unitRate: 100,
        }),
      ],
    });
    assertEquals(inv.status, "draft");
    const result = await service.updatePaidAmount(inv.id, 100);
    assertExists(result);
    assertEquals(result!.paidAmount, 100);
    // Status stays "draft" — transition only fires from sent.
    assertEquals(result!.status, "draft");
  } finally {
    await cleanup(dir);
  }
});

Deno.test("InvoiceService.updatePaidAmount returns null for missing invoice", async () => {
  const { service, dir } = await setup();
  try {
    assertStrictEquals(
      await service.updatePaidAmount("invoice_missing", 100),
      null,
    );
  } finally {
    await cleanup(dir);
  }
});

// === isOverdue + displayStatus ===

Deno.test("InvoiceService.isOverdue returns true when sent and dueDate is past", async () => {
  const { service, dir } = await setup();
  try {
    const inv = await service.create({
      customerId: "c1",
      title: "Past Due",
      dueDate: "2020-01-01", // long past
      lineItems: [],
    });
    // Not sent yet.
    assertEquals(service.isOverdue(inv), false);
    const sent = { ...inv, status: "sent" as const };
    assertEquals(service.isOverdue(sent), true);
    assertEquals(service.displayStatus(sent), "overdue");
  } finally {
    await cleanup(dir);
  }
});

Deno.test("InvoiceService.isOverdue returns false when dueDate is in the future", async () => {
  const { service, dir } = await setup();
  try {
    const inv = await service.create({
      customerId: "c1",
      title: "Future Due",
      dueDate: "2099-01-01",
      lineItems: [],
    });
    const sent = { ...inv, status: "sent" as const };
    assertEquals(service.isOverdue(sent), false);
    assertEquals(service.displayStatus(sent), "sent");
  } finally {
    await cleanup(dir);
  }
});

Deno.test("InvoiceService.isOverdue returns false when status is not sent", async () => {
  const { service, dir } = await setup();
  try {
    const inv = await service.create({
      customerId: "c1",
      title: "Draft Past Due",
      dueDate: "2020-01-01",
      lineItems: [],
    });
    // Draft + past due = NOT overdue.
    assertEquals(service.isOverdue(inv), false);
  } finally {
    await cleanup(dir);
  }
});

// === service.list filters ===

Deno.test("InvoiceService - list with status filter (sent excludes overdue, overdue computed from sent + past)", async () => {
  const { service, repo, dir } = await setup();
  try {
    const sent = await service.create({
      customerId: "c1",
      title: "Sent OK",
      dueDate: "2099-01-01",
      lineItems: [],
    });
    await repo.update(sent.id, { status: "sent" });
    const overdue = await service.create({
      customerId: "c1",
      title: "Overdue",
      dueDate: "2020-01-01",
      lineItems: [],
    });
    await repo.update(overdue.id, { status: "sent" });
    await service.create({
      customerId: "c1",
      title: "Draft",
      lineItems: [],
    });

    const sentResults = await service.list({ status: "sent" });
    assertEquals(sentResults.length, 1);
    assertEquals(sentResults[0].title, "Sent OK");

    const overdueResults = await service.list({ status: "overdue" });
    assertEquals(overdueResults.length, 1);
    assertEquals(overdueResults[0].title, "Overdue");

    const drafts = await service.list({ status: "draft" });
    assertEquals(drafts.length, 1);
    assertEquals(drafts[0].title, "Draft");
  } finally {
    await cleanup(dir);
  }
});

Deno.test("InvoiceService - list with customerId filter returns only matching", async () => {
  const { service, dir } = await setup();
  try {
    await service.create({ customerId: "c1", title: "A", lineItems: [] });
    await service.create({ customerId: "c1", title: "B", lineItems: [] });
    await service.create({ customerId: "c2", title: "C", lineItems: [] });
    const matches = await service.list({ customerId: "c1" });
    assertEquals(matches.length, 2);
  } finally {
    await cleanup(dir);
  }
});

Deno.test("InvoiceService - list with q filter matches title, number, and notes", async () => {
  const { service, dir } = await setup();
  try {
    const year = new Date().getFullYear();
    await service.create({
      customerId: "c1",
      title: "Match in TITLE",
      lineItems: [],
    });
    await service.create({
      customerId: "c1",
      title: "Other",
      notes: "Covers ENTERPRISE.",
      lineItems: [],
    });

    const byTitle = await service.list({ q: "title" });
    assertEquals(byTitle.length, 1);

    const byNotes = await service.list({ q: "enterprise" });
    assertEquals(byNotes.length, 1);
    assertEquals(byNotes[0].notes, "Covers ENTERPRISE.");

    const byNumber = await service.list({ q: `INV-${year}` });
    assertEquals(byNumber.length, 2); // both have auto-generated numbers
  } finally {
    await cleanup(dir);
  }
});

Deno.test("InvoiceService - list combines status + customerId (AND)", async () => {
  const { service, repo, dir } = await setup();
  try {
    const match = await service.create({
      customerId: "c1",
      title: "Match",
      lineItems: [],
    });
    await repo.update(match.id, { status: "paid" });
    await service.create({
      customerId: "c1",
      title: "Wrong status",
      lineItems: [],
    }); // draft
    const other = await service.create({
      customerId: "c2",
      title: "Wrong customer",
      lineItems: [],
    });
    await repo.update(other.id, { status: "paid" });

    const matches = await service.list({ status: "paid", customerId: "c1" });
    assertEquals(matches.length, 1);
    assertEquals(matches[0].title, "Match");
  } finally {
    await cleanup(dir);
  }
});

// === quote → invoice linkage ===

Deno.test("InvoiceRepository - quoteId round-trips through frontmatter", async () => {
  const { service, dir } = await setup();
  try {
    const inv = await service.create({
      customerId: "c1",
      title: "From Quote",
      quoteId: "quote_123",
      lineItems: [],
    });
    assertEquals(inv.quoteId, "quote_123");
    // Fetch fresh to confirm disk round-trip.
    const fetched = await service.getById(inv.id);
    assertExists(fetched);
    assertEquals(fetched!.quoteId, "quote_123");
  } finally {
    await cleanup(dir);
  }
});

// === manual fixture parse with snake_case line items ===

Deno.test("InvoiceRepository - parses a manually-written file with snake_case line item keys", async () => {
  const { repo, dir } = await setup();
  try {
    await Deno.mkdir(join(dir, "billing/invoices"), { recursive: true });
    await Deno.writeTextFile(
      join(dir, "billing/invoices", "invoice_manual.md"),
      [
        "---",
        "number: INV-2026-099",
        "customer_id: customer_manual",
        "title: Manual Invoice",
        "status: sent",
        "currency: USD",
        "due_date: 2026-12-31",
        "payment_terms: NET 30",
        "subtotal: 1000",
        "tax: 150",
        "tax_rate: 15",
        "total: 1150",
        "paid_amount: 0",
        "line_items:",
        "  - id: li_1",
        "    type: service",
        "    description: Hours",
        "    quantity: 10",
        "    unit_rate: 100",
        "    taxable: true",
        "    amount: 1000",
        "created_at: 2026-01-01T00:00:00.000Z",
        "updated_at: 2026-01-02T00:00:00.000Z",
        "---",
        "# Manual Invoice",
        "",
        "Hand-written notes.",
        "",
      ].join("\n"),
    );
    const fetched = await repo.findById("invoice_manual");
    assertExists(fetched);
    assertEquals(fetched!.id, "invoice_manual");
    assertEquals(fetched!.number, "INV-2026-099");
    assertEquals(fetched!.customerId, "customer_manual");
    assertEquals(fetched!.title, "Manual Invoice");
    assertEquals(fetched!.status, "sent");
    assertEquals(fetched!.dueDate, "2026-12-31");
    assertEquals(fetched!.paymentTerms, "NET 30");
    assertEquals(fetched!.subtotal, 1000);
    assertEquals(fetched!.tax, 150);
    assertEquals(fetched!.taxRate, 15);
    assertEquals(fetched!.total, 1150);
    // line_items → camelCase via mapArrayFromFm.
    assertEquals(fetched!.lineItems.length, 1);
    assertEquals(fetched!.lineItems[0].id, "li_1");
    assertEquals(fetched!.lineItems[0].quantity, 10);
    assertEquals(fetched!.lineItems[0].unitRate, 100);
    assertEquals(fetched!.lineItems[0].taxable, true);
    assertEquals(fetched!.lineItems[0].amount, 1000);
    assertEquals(fetched!.notes, "Hand-written notes.");
  } finally {
    await cleanup(dir);
  }
});

// === edge cases ===

Deno.test("InvoiceRepository - notes round-trip through body", async () => {
  const { repo, dir } = await setup();
  try {
    const created = await repo.create({
      customerId: "c1",
      title: "Notes",
      notes: "## Strategy\n\nThank you.",
      lineItems: [],
    });
    const fetched = await repo.findById(created.id);
    assertExists(fetched);
    assertEquals(fetched!.notes, "## Strategy\n\nThank you.");
  } finally {
    await cleanup(dir);
  }
});

Deno.test("InvoiceRepository - findByName returns matching invoice by title (case-insensitive)", async () => {
  const { repo, dir } = await setup();
  try {
    await repo.create({
      customerId: "c1",
      title: "Premium Invoice",
      lineItems: [],
    });
    await repo.create({
      customerId: "c1",
      title: "Standard Invoice",
      lineItems: [],
    });
    const found = await repo.findByName("premium invoice");
    assertExists(found);
    assertEquals(found!.title, "Premium Invoice");
  } finally {
    await cleanup(dir);
  }
});
