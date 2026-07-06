/**
 * Unit tests for v2 InvoiceRepository (CRUD on disk) + InvoiceService.
 *
 * Canonical model (decision note_1781464477815): an invoice DERIVES from a
 * quote. `quoteId` is required, the invoice owns NO line items or totals —
 * customer, line items, subtotal/tax/total are hydrated from the referenced
 * quote at read time (InvoiceService.hydrate). Optional `projectId` rounds-trips
 * on both quote and invoice.
 *
 * The repository persists only the invoice's own fields (quoteId, projectId,
 * status, dueDate, paymentTerms, paidAmount, notes, footer). It does NOT derive
 * — only the service hydrates. Repo-level assertions therefore see empty
 * customerId / line items.
 */

import {
  assertEquals,
  assertExists,
  assertRejects,
  assertStrictEquals,
} from "@std/assert";
import { join } from "@std/path";
import { InvoiceRepository } from "../../src/repositories/invoice.repository.ts";
import { InvoiceService } from "../../src/services/invoice.service.ts";
import { QuoteRepository } from "../../src/repositories/quote.repository.ts";
import { QuoteService } from "../../src/services/quote.service.ts";
import type { LineItem } from "../../src/types/billing.types.ts";
import type { CreateQuote } from "../../src/types/quote.types.ts";

interface Harness {
  repo: InvoiceRepository;
  service: InvoiceService;
  quoteRepo: QuoteRepository;
  quoteService: QuoteService;
  dir: string;
}

async function setup(): Promise<Harness> {
  const dir = await Deno.makeTempDir({ prefix: "mdplanner-invoice-test-" });
  const quoteRepo = new QuoteRepository(dir);
  const quoteService = new QuoteService(quoteRepo);
  const repo = new InvoiceRepository(dir);
  const service = new InvoiceService(repo, quoteService);
  return { repo, service, quoteRepo, quoteService, dir };
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

/** Create a quote with a single 10×100 service line (subtotal 1000) by default. */
function mkQuote(
  service: QuoteService,
  overrides: Partial<CreateQuote> = {},
) {
  return service.create({
    customerId: overrides.customerId ?? "customer_001",
    title: overrides.title ?? "Quote",
    lineItems: overrides.lineItems ?? [
      line({ id: "li_1", quantity: 10, unitRate: 100 }),
    ],
    ...overrides,
  });
}

// === repository CRUD ===

Deno.test("InvoiceRepository - create stores file with default-fill (no own line items)", async () => {
  const { repo, dir } = await setup();
  try {
    const inv = await repo.create({
      quoteId: "quote_001",
      title: "Year 1 Plan",
    });
    assertExists(inv.id);
    assertEquals(inv.quoteId, "quote_001");
    assertEquals(inv.title, "Year 1 Plan");
    assertEquals(inv.status, "draft");
    // Invoice owns no line items or totals — derived by the service.
    assertEquals(inv.customerId, "");
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

Deno.test("InvoiceRepository - findById succeeds after update (parse-guard via fm.title)", async () => {
  const { repo, dir } = await setup();
  try {
    const created = await repo.create({
      quoteId: "quote_1",
      title: "Parse Guard",
    });
    // INVOICE_BODY_KEYS excludes id — guard `!fm.id && !fm.title` holds via title.
    const updated = await repo.update(created.id, { dueDate: "2026-12-31" });
    assertExists(updated);
    const fetched = await repo.findById(created.id);
    assertExists(fetched);
    assertEquals(fetched!.id, created.id);
    assertEquals(fetched!.title, "Parse Guard");
    assertEquals(fetched!.dueDate, "2026-12-31");
    assertEquals(fetched!.quoteId, "quote_1");
  } finally {
    await cleanup(dir);
  }
});

// === update ===

Deno.test("InvoiceRepository - update preserves sibling fields", async () => {
  const { repo, dir } = await setup();
  try {
    const created = await repo.create({
      quoteId: "quote_1",
      title: "Sibling",
      paymentTerms: "NET 30",
      currency: "USD",
      notes: "Keep me intact.",
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
    const inv = await repo.create({ quoteId: "quote_1", title: "Archive me" });
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
    const inv = await repo.create({ quoteId: "quote_1", title: "Gone" });
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
    await repo.create({ quoteId: "q", title: "Charlie Invoice" });
    await repo.create({ quoteId: "q", title: "Alpha Invoice" });
    await repo.create({ quoteId: "q", title: "Bravo Invoice" });
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

// === service.create — requires quote, derives from it ===

Deno.test("InvoiceService.create throws when the referenced quote is missing", async () => {
  const { service, dir } = await setup();
  try {
    await assertRejects(
      () => service.create({ quoteId: "quote_missing" }),
      Error,
      "quote_missing",
    );
  } finally {
    await cleanup(dir);
  }
});

Deno.test("InvoiceService.create generates INV-YYYY-NNN, derives customer/title/totals from quote", async () => {
  const { service, quoteService, dir } = await setup();
  try {
    const year = new Date().getFullYear();
    const quote = await mkQuote(quoteService, {
      customerId: "customer_acme",
      title: "Quoted Work",
    });
    const inv = await service.create({ quoteId: quote.id });
    assertEquals(inv.number, `INV-${year}-001`);
    // Title defaults from the quote; customer + totals derive from it.
    assertEquals(inv.title, "Quoted Work");
    assertEquals(inv.customerId, "customer_acme");
    assertEquals(inv.lineItems.length, 1);
    assertEquals(inv.lineItems[0].amount, 1000);
    assertEquals(inv.subtotal, 1000);
    assertEquals(inv.total, 1000);
  } finally {
    await cleanup(dir);
  }
});

Deno.test("InvoiceService.create increments invoice number sequentially", async () => {
  const { service, quoteService, dir } = await setup();
  try {
    const year = new Date().getFullYear();
    const quote = await mkQuote(quoteService);
    const inv1 = await service.create({ quoteId: quote.id, title: "A" });
    const inv2 = await service.create({ quoteId: quote.id, title: "B" });
    const inv3 = await service.create({ quoteId: quote.id, title: "C" });
    assertEquals(inv1.number, `INV-${year}-001`);
    assertEquals(inv2.number, `INV-${year}-002`);
    assertEquals(inv3.number, `INV-${year}-003`);
  } finally {
    await cleanup(dir);
  }
});

// === derived totals mirror the quote (incl. tax + optional exclusion) ===

Deno.test("InvoiceService - derives tax from the quote and excludes optional line items", async () => {
  const { service, quoteService, dir } = await setup();
  try {
    const quote = await mkQuote(quoteService, {
      taxRate: 15,
      lineItems: [
        line({ id: "li_tax", quantity: 1, unitRate: 1000, taxable: true }),
        line({ id: "li_opt", quantity: 1, unitRate: 500, optional: true }),
      ],
    });
    const inv = await service.create({ quoteId: quote.id });
    // Optional line excluded; taxable 1000 × 15% = 150.
    assertEquals(inv.lineItems.length, 1);
    assertEquals(inv.subtotal, 1000);
    assertEquals(inv.tax, 150);
    assertEquals(inv.total, 1150);
  } finally {
    await cleanup(dir);
  }
});

Deno.test("InvoiceService - editing the quote updates the derived invoice view", async () => {
  const { service, quoteService, dir } = await setup();
  try {
    const quote = await mkQuote(quoteService); // subtotal 1000
    const inv = await service.create({ quoteId: quote.id });
    assertEquals(inv.subtotal, 1000);

    await quoteService.update(quote.id, {
      lineItems: [line({ id: "li_1", quantity: 5, unitRate: 100 })],
    });
    const reread = await service.getById(inv.id);
    assertExists(reread);
    assertEquals(reread!.subtotal, 500);
    assertEquals(reread!.total, 500);
  } finally {
    await cleanup(dir);
  }
});

// === optional projectId round-trip (quote + invoice) ===

Deno.test("InvoiceService - projectId round-trips on quote and derives onto the invoice", async () => {
  const { service, quoteService, dir } = await setup();
  try {
    const quote = await mkQuote(quoteService, { projectId: "project_x" });
    const refetchedQuote = await quoteService.getById(quote.id);
    assertEquals(refetchedQuote!.projectId, "project_x");

    const inv = await service.create({ quoteId: quote.id });
    assertEquals(inv.projectId, "project_x");
    const reread = await service.getById(inv.id);
    assertEquals(reread!.projectId, "project_x");
  } finally {
    await cleanup(dir);
  }
});

Deno.test("InvoiceService - explicit invoice projectId overrides the quote projectId", async () => {
  const { service, quoteService, dir } = await setup();
  try {
    const quote = await mkQuote(quoteService, { projectId: "project_quote" });
    const inv = await service.create({
      quoteId: quote.id,
      projectId: "project_invoice",
    });
    assertEquals(inv.projectId, "project_invoice");
    const reread = await service.getById(inv.id);
    assertEquals(reread!.projectId, "project_invoice");
  } finally {
    await cleanup(dir);
  }
});

// === invoice owns no line items on disk (no-copy) ===

Deno.test("InvoiceRepository - invoice does not persist quote line items (no-copy)", async () => {
  const { service, repo, quoteService, dir } = await setup();
  try {
    const quote = await mkQuote(quoteService);
    const inv = await service.create({ quoteId: quote.id });
    // The repository (un-hydrated) sees no line items / customer / totals.
    const raw = await repo.findById(inv.id);
    assertExists(raw);
    assertEquals(raw!.lineItems, []);
    assertEquals(raw!.customerId, "");
    assertEquals(raw!.subtotal, 0);
    assertEquals(raw!.total, 0);
    assertEquals(raw!.quoteId, quote.id);
  } finally {
    await cleanup(dir);
  }
});

// === updatePaidAmount auto-transition (uses derived total) ===

Deno.test("InvoiceService.updatePaidAmount transitions sent → paid when paid >= derived total", async () => {
  const { service, repo, quoteService, dir } = await setup();
  try {
    const quote = await mkQuote(quoteService, {
      lineItems: [line({ id: "li_1", quantity: 1, unitRate: 1000 })],
    });
    const inv = await service.create({ quoteId: quote.id });
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
  const { service, repo, quoteService, dir } = await setup();
  try {
    const quote = await mkQuote(quoteService, {
      lineItems: [line({ id: "li_1", quantity: 1, unitRate: 500 })],
    });
    const inv = await service.create({ quoteId: quote.id });
    await repo.update(inv.id, { status: "sent" });
    const paidResult = await service.updatePaidAmount(inv.id, 500);
    assertExists(paidResult!.paidAt);
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
  const { service, quoteService, dir } = await setup();
  try {
    const quote = await mkQuote(quoteService);
    const inv = await service.create({ quoteId: quote.id });
    assertEquals(inv.status, "draft");
    const result = await service.updatePaidAmount(inv.id, 100);
    assertExists(result);
    assertEquals(result!.paidAmount, 100);
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
  const { service, quoteService, dir } = await setup();
  try {
    const quote = await mkQuote(quoteService);
    const inv = await service.create({
      quoteId: quote.id,
      dueDate: "2020-01-01",
    });
    assertEquals(service.isOverdue(inv), false);
    const sent = { ...inv, status: "sent" as const };
    assertEquals(service.isOverdue(sent), true);
    assertEquals(service.displayStatus(sent), "overdue");
  } finally {
    await cleanup(dir);
  }
});

Deno.test("InvoiceService.isOverdue returns false when dueDate is in the future", async () => {
  const { service, quoteService, dir } = await setup();
  try {
    const quote = await mkQuote(quoteService);
    const inv = await service.create({
      quoteId: quote.id,
      dueDate: "2099-01-01",
    });
    const sent = { ...inv, status: "sent" as const };
    assertEquals(service.isOverdue(sent), false);
    assertEquals(service.displayStatus(sent), "sent");
  } finally {
    await cleanup(dir);
  }
});

Deno.test("InvoiceService.isOverdue returns false when status is not sent", async () => {
  const { service, quoteService, dir } = await setup();
  try {
    const quote = await mkQuote(quoteService);
    const inv = await service.create({
      quoteId: quote.id,
      dueDate: "2020-01-01",
    });
    assertEquals(service.isOverdue(inv), false);
  } finally {
    await cleanup(dir);
  }
});

// === service.list filters ===

Deno.test("InvoiceService - list status filter (sent excludes overdue, overdue from sent + past)", async () => {
  const { service, repo, quoteService, dir } = await setup();
  try {
    const quote = await mkQuote(quoteService);
    const sent = await service.create({
      quoteId: quote.id,
      title: "Sent OK",
      dueDate: "2099-01-01",
    });
    await repo.update(sent.id, { status: "sent" });
    const overdue = await service.create({
      quoteId: quote.id,
      title: "Overdue",
      dueDate: "2020-01-01",
    });
    await repo.update(overdue.id, { status: "sent" });
    await service.create({ quoteId: quote.id, title: "Draft" });

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

Deno.test("InvoiceService - list customerId filter matches the quote-derived customer", async () => {
  const { service, quoteService, dir } = await setup();
  try {
    const q1 = await mkQuote(quoteService, { customerId: "c1", title: "Q1" });
    const q2 = await mkQuote(quoteService, { customerId: "c2", title: "Q2" });
    await service.create({ quoteId: q1.id, title: "A" });
    await service.create({ quoteId: q1.id, title: "B" });
    await service.create({ quoteId: q2.id, title: "C" });
    const matches = await service.list({ customerId: "c1" });
    assertEquals(matches.length, 2);
  } finally {
    await cleanup(dir);
  }
});

Deno.test("InvoiceService - list q filter matches title, number, and notes", async () => {
  const { service, quoteService, dir } = await setup();
  try {
    const year = new Date().getFullYear();
    const quote = await mkQuote(quoteService);
    await service.create({ quoteId: quote.id, title: "Match in TITLE" });
    await service.create({
      quoteId: quote.id,
      title: "Other",
      notes: "Covers ENTERPRISE.",
    });

    const byTitle = await service.list({ q: "title" });
    assertEquals(byTitle.length, 1);

    const byNotes = await service.list({ q: "enterprise" });
    assertEquals(byNotes.length, 1);
    assertEquals(byNotes[0].notes, "Covers ENTERPRISE.");

    const byNumber = await service.list({ q: `INV-${year}` });
    assertEquals(byNumber.length, 2);
  } finally {
    await cleanup(dir);
  }
});

Deno.test("InvoiceService - list combines status + customerId (AND)", async () => {
  const { service, repo, quoteService, dir } = await setup();
  try {
    const q1 = await mkQuote(quoteService, { customerId: "c1", title: "Q1" });
    const q2 = await mkQuote(quoteService, { customerId: "c2", title: "Q2" });
    const match = await service.create({ quoteId: q1.id, title: "Match" });
    await repo.update(match.id, { status: "paid" });
    await service.create({ quoteId: q1.id, title: "Wrong status" }); // draft
    const other = await service.create({
      quoteId: q2.id,
      title: "Wrong customer",
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
  const { service, quoteService, dir } = await setup();
  try {
    const quote = await mkQuote(quoteService, { title: "From Quote" });
    const inv = await service.create({ quoteId: quote.id });
    assertEquals(inv.quoteId, quote.id);
    const fetched = await service.getById(inv.id);
    assertExists(fetched);
    assertEquals(fetched!.quoteId, quote.id);
  } finally {
    await cleanup(dir);
  }
});

// === manual fixture parse: a frozen invoice persists & reads its quote snapshot ===

Deno.test("InvoiceRepository - parse reads the stored quote snapshot of a frozen invoice", async () => {
  const { repo, dir } = await setup();
  try {
    await Deno.mkdir(join(dir, "billing/invoices"), { recursive: true });
    await Deno.writeTextFile(
      join(dir, "billing/invoices", "invoice_manual.md"),
      [
        "---",
        "number: INV-2026-099",
        "customer_id: customer_manual",
        "quote_id: quote_manual",
        "project_id: project_manual",
        "title: Manual Invoice",
        "status: sent",
        "currency: USD",
        "due_date: 2026-12-31",
        "payment_terms: NET 30",
        "paid_amount: 0",
        // Frozen snapshot — persisted to frontmatter, read back on parse.
        "frozen_at: 2026-01-02T00:00:00.000Z",
        "subtotal: 1000",
        "tax: 150",
        "total: 1150",
        "line_items:",
        "  - id: li_1",
        "    type: service",
        "    description: Hours",
        "    quantity: 10",
        "    unit_rate: 100",
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
    assertEquals(fetched!.quoteId, "quote_manual");
    assertEquals(fetched!.projectId, "project_manual");
    assertEquals(fetched!.title, "Manual Invoice");
    assertEquals(fetched!.status, "sent");
    assertEquals(fetched!.dueDate, "2026-12-31");
    assertEquals(fetched!.paymentTerms, "NET 30");
    // Frozen snapshot fields ARE read from invoice frontmatter.
    assertEquals(fetched!.frozenAt, "2026-01-02T00:00:00.000Z");
    assertEquals(fetched!.customerId, "customer_manual");
    assertEquals(fetched!.lineItems.length, 1);
    assertEquals(fetched!.lineItems[0].id, "li_1");
    assertEquals(fetched!.subtotal, 1000);
    assertEquals(fetched!.total, 1150);
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
      quoteId: "quote_1",
      title: "Notes",
      notes: "## Strategy\n\nThank you.",
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
    await repo.create({ quoteId: "q", title: "Premium Invoice" });
    await repo.create({ quoteId: "q", title: "Standard Invoice" });
    const found = await repo.findByName("premium invoice");
    assertExists(found);
    assertEquals(found!.title, "Premium Invoice");
  } finally {
    await cleanup(dir);
  }
});
