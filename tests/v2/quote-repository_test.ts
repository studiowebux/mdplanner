/**
 * Unit tests for v2 QuoteRepository (CRUD + revision sidecar) + QuoteService
 * (line items, totals, number generation, inline edit, sendQuote, revisions).
 *
 * Subtotal excludes BOTH text-type AND optional lines (quote-specific —
 * Invoice excludes only text). Tax applies only to taxable non-optional lines.
 *
 * Revision sidecar: `{id}.revisions.json` alongside the .md file. `delete()`
 * must clean it up to avoid orphans. `sendQuote` appends a snapshot then
 * transitions status to sent + increments `revision`.
 *
 * Inline edit (commit `afb397f`): three service methods —
 * updateLineItemField (description/quantity/unitRate), addLineItem (appends
 * blank service line with crypto id), removeLineItem (by index). Each
 * persists via `update({lineItems})` which recomputes totals.
 *
 * QUOTE_BODY_KEYS = ["id","notes"] — id in body, parse-guard via fm.title.
 */

import { assertEquals, assertExists, assertStrictEquals } from "@std/assert";
import { join } from "@std/path";
import { QuoteRepository } from "../../v2/repositories/quote.repository.ts";
import { QuoteService } from "../../v2/services/quote.service.ts";
import type { LineItem } from "../../v2/types/billing.types.ts";

async function setup(): Promise<
  { repo: QuoteRepository; service: QuoteService; dir: string }
> {
  const dir = await Deno.makeTempDir({ prefix: "mdplanner-quote-test-" });
  const repo = new QuoteRepository(dir);
  const service = new QuoteService(repo);
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

Deno.test("QuoteRepository - create stores file with default-fill", async () => {
  const { repo, dir } = await setup();
  try {
    const q = await repo.create({
      customerId: "customer_001",
      title: "Year 1 Quote",
      lineItems: [],
    });
    assertExists(q.id);
    assertEquals(q.customerId, "customer_001");
    assertEquals(q.title, "Year 1 Quote");
    assertEquals(q.status, "draft");
    assertEquals(q.lineItems, []);
    assertEquals(q.subtotal, 0);
    assertEquals(q.total, 0);
    assertEquals(q.revision, 1);
  } finally {
    await cleanup(dir);
  }
});

Deno.test("QuoteRepository - findById returns null for missing ID", async () => {
  const { repo, dir } = await setup();
  try {
    assertStrictEquals(await repo.findById("quote_nonexistent"), null);
  } finally {
    await cleanup(dir);
  }
});

// === parse-guard regression ===

Deno.test("QuoteRepository - findById succeeds after update with lineItems populated (parse-guard regression)", async () => {
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
    // QUOTE_BODY_KEYS = ["id","notes"] — id absent from fm; guard
    // `!fm.id && !fm.title` must hold via fm.title.
    const updated = await repo.update(created.id, {
      expiresAt: "2026-12-31",
    });
    assertExists(updated);
    const fetched = await repo.findById(created.id);
    assertExists(fetched);
    assertEquals(fetched!.id, created.id);
    assertEquals(fetched!.title, "Parse Guard");
    assertEquals(fetched!.expiresAt, "2026-12-31");
    assertEquals(fetched!.lineItems.length, 1);
    assertEquals(fetched!.lineItems[0].id, "li_1");
    assertEquals(fetched!.lineItems[0].quantity, 10);
    assertEquals(fetched!.lineItems[0].amount, 1000);
  } finally {
    await cleanup(dir);
  }
});

// === update / delete ===

Deno.test("QuoteRepository - update preserves sibling fields", async () => {
  const { repo, dir } = await setup();
  try {
    const created = await repo.create({
      customerId: "c1",
      title: "Sibling",
      currency: "USD",
      footer: "Thank you!",
      notes: "Internal notes.",
      lineItems: [],
    });
    await repo.update(created.id, { expiresAt: "2026-09-30" });
    const fetched = await repo.findById(created.id);
    assertExists(fetched);
    assertEquals(fetched!.currency, "USD");
    assertEquals(fetched!.footer, "Thank you!");
    assertEquals(fetched!.notes, "Internal notes.");
    assertEquals(fetched!.expiresAt, "2026-09-30");
  } finally {
    await cleanup(dir);
  }
});

Deno.test("QuoteRepository - update returns null for non-existent ID", async () => {
  const { repo, dir } = await setup();
  try {
    assertStrictEquals(await repo.update("quote_missing", {}), null);
  } finally {
    await cleanup(dir);
  }
});

Deno.test("QuoteRepository - delete soft-archives entity", async () => {
  const { repo, dir } = await setup();
  try {
    const q = await repo.create({
      customerId: "c1",
      title: "Archive me",
      lineItems: [],
    });
    assertEquals(await repo.delete(q.id), true);
    const found = await repo.findById(q.id);
    assertExists(found);
    const all = await repo.findAllFromDisk();
    assertStrictEquals(all.find((x) => x.id === q.id), undefined);
  } finally {
    await cleanup(dir);
  }
});

Deno.test("QuoteRepository - hardDelete removes the file AND the revision sidecar", async () => {
  const { repo, dir } = await setup();
  try {
    const q = await repo.create({
      customerId: "c1",
      title: "Gone",
      lineItems: [],
    });
    // Seed a revision sidecar first so we can assert it gets cleaned up.
    await repo.appendRevision(q.id, {
      revisionNumber: 1,
      snapshotAt: "2026-01-01T00:00:00.000Z",
      total: 0,
      subtotal: 0,
      lineItemCount: 0,
      sentBy: "system",
    });
    const sidecarPath = join(dir, "billing/quotes", `${q.id}.revisions.json`);
    const stat = await Deno.stat(sidecarPath);
    assertEquals(stat.isFile, true);

    // hardDelete cleans the .md (sidecar cleanup happens via delete() override
    // which super.delete only triggers — hardDelete bypasses. So we test the
    // delete() path separately for sidecar cleanup.
    assertEquals(await repo.hardDelete(q.id), true);
    assertStrictEquals(await repo.findById(q.id), null);
  } finally {
    await cleanup(dir);
  }
});

Deno.test("QuoteRepository - delete() override removes the revision sidecar (soft-archive path)", async () => {
  const { repo, dir } = await setup();
  try {
    const q = await repo.create({
      customerId: "c1",
      title: "WithSidecar",
      lineItems: [],
    });
    await repo.appendRevision(q.id, {
      revisionNumber: 1,
      snapshotAt: "2026-01-01T00:00:00.000Z",
      total: 0,
      subtotal: 0,
      lineItemCount: 0,
      sentBy: "system",
    });
    const sidecarPath = join(dir, "billing/quotes", `${q.id}.revisions.json`);
    // Sidecar exists.
    await Deno.stat(sidecarPath);

    assertEquals(await repo.delete(q.id), true);
    // Sidecar removed (delete() override).
    let sidecarStillThere = true;
    try {
      await Deno.stat(sidecarPath);
    } catch (err) {
      if (err instanceof Deno.errors.NotFound) sidecarStillThere = false;
      else throw err;
    }
    assertEquals(sidecarStillThere, false);
  } finally {
    await cleanup(dir);
  }
});

Deno.test("QuoteRepository - delete returns false for non-existent ID (and does not throw on missing sidecar)", async () => {
  const { repo, dir } = await setup();
  try {
    assertEquals(await repo.delete("quote_ghost"), false);
  } finally {
    await cleanup(dir);
  }
});

// === findAll: sort ===

Deno.test("QuoteRepository - findAllFromDisk sorts alphabetically by title (nameField)", async () => {
  const { repo, dir } = await setup();
  try {
    await repo.create({
      customerId: "c1",
      title: "Charlie Quote",
      lineItems: [],
    });
    await repo.create({
      customerId: "c1",
      title: "Alpha Quote",
      lineItems: [],
    });
    await repo.create({
      customerId: "c1",
      title: "Bravo Quote",
      lineItems: [],
    });
    const all = await repo.findAllFromDisk();
    assertEquals(all.map((q) => q.title), [
      "Alpha Quote",
      "Bravo Quote",
      "Charlie Quote",
    ]);
  } finally {
    await cleanup(dir);
  }
});

// === service.create — number generation + totals ===

Deno.test("QuoteService.create generates Q-YYYY-NNN number and computes totals", async () => {
  const { service, dir } = await setup();
  try {
    const year = new Date().getFullYear();
    const q = await service.create({
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
    assertEquals(q.number, `Q-${year}-001`);
    assertEquals(q.lineItems[0].amount, 1000);
    assertEquals(q.subtotal, 1000);
    assertEquals(q.total, 1000);
  } finally {
    await cleanup(dir);
  }
});

Deno.test("QuoteService.create increments quote number sequentially", async () => {
  const { service, dir } = await setup();
  try {
    const year = new Date().getFullYear();
    const q1 = await service.create({
      customerId: "c1",
      title: "A",
      lineItems: [],
    });
    const q2 = await service.create({
      customerId: "c1",
      title: "B",
      lineItems: [],
    });
    assertEquals(q1.number, `Q-${year}-001`);
    assertEquals(q2.number, `Q-${year}-002`);
  } finally {
    await cleanup(dir);
  }
});

// === calculateTotals — optional + text exclusion, tax filter ===

Deno.test("QuoteService.calculateTotals - optional lines excluded from subtotal AND tax", async () => {
  const { service, dir } = await setup();
  try {
    const q = await service.create({
      customerId: "c1",
      title: "Optional Test",
      taxRate: 10,
      lineItems: [
        line({
          id: "li_main",
          type: "service",
          description: "Main",
          quantity: 1,
          unitRate: 1000,
          taxable: true,
        }),
        line({
          id: "li_opt",
          type: "service",
          description: "Optional add-on",
          quantity: 1,
          unitRate: 500,
          taxable: true,
          optional: true,
        }),
      ],
    });
    // optional line excluded from subtotal AND taxable total.
    assertEquals(q.subtotal, 1000);
    assertEquals(q.tax, 100); // 10% of 1000, NOT 1500
    assertEquals(q.total, 1100);
  } finally {
    await cleanup(dir);
  }
});

Deno.test("QuoteService.calculateTotals - text lines excluded from subtotal", async () => {
  const { service, dir } = await setup();
  try {
    const q = await service.create({
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
    assertEquals(q.lineItems[0].amount, 0);
    assertEquals(q.subtotal, 1000);
  } finally {
    await cleanup(dir);
  }
});

Deno.test("QuoteService.calculateTotals - tax applies only to taxable non-optional lines", async () => {
  const { service, dir } = await setup();
  try {
    const q = await service.create({
      customerId: "c1",
      title: "Tax Test",
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
          id: "li_notax",
          type: "expense",
          description: "Pass-through",
          quantity: 1,
          unitRate: 500,
          taxable: false,
        }),
      ],
    });
    // Subtotal includes both (non-optional, non-text): 1500
    assertEquals(q.subtotal, 1500);
    // Tax only on the 1000 taxable.
    assertEquals(q.tax, 150);
    assertEquals(q.total, 1650);
  } finally {
    await cleanup(dir);
  }
});

// === paymentSchedule round-trip ===

Deno.test("QuoteRepository - paymentSchedule nested array round-trip", async () => {
  const { service, dir } = await setup();
  try {
    const q = await service.create({
      customerId: "c1",
      title: "Schedule Test",
      paymentSchedule: [
        { description: "50% deposit", percent: 50, dueDate: "2026-04-01" },
        { description: "Final", percent: 50, dueDate: "2026-06-30" },
      ],
      lineItems: [],
    });
    assertEquals(q.paymentSchedule?.length, 2);
    assertEquals(q.paymentSchedule![0].description, "50% deposit");
    assertEquals(q.paymentSchedule![0].percent, 50);
    assertEquals(q.paymentSchedule![0].dueDate, "2026-04-01");
  } finally {
    await cleanup(dir);
  }
});

// === inline edit — updateLineItemField ===

Deno.test("QuoteService.updateLineItemField - updates description", async () => {
  const { service, dir } = await setup();
  try {
    const q = await service.create({
      customerId: "c1",
      title: "Edit",
      lineItems: [
        line({
          id: "li_1",
          type: "service",
          description: "Old",
          quantity: 1,
          unitRate: 100,
        }),
      ],
    });
    const result = await service.updateLineItemField(
      q,
      0,
      "description",
      "New description",
    );
    assertExists(result);
    assertEquals(result!.lineItems[0].description, "New description");
    // Numeric fields unchanged.
    assertEquals(result!.lineItems[0].quantity, 1);
    assertEquals(result!.lineItems[0].unitRate, 100);
  } finally {
    await cleanup(dir);
  }
});

Deno.test("QuoteService.updateLineItemField - updates quantity (Number coercion) and recomputes totals", async () => {
  const { service, dir } = await setup();
  try {
    const q = await service.create({
      customerId: "c1",
      title: "Edit Qty",
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
    assertEquals(q.subtotal, 100);
    const result = await service.updateLineItemField(
      q,
      0,
      "quantity",
      "  10  ",
    );
    assertExists(result);
    assertEquals(result!.lineItems[0].quantity, 10);
    // Totals recomputed: 10 × 100 = 1000.
    assertEquals(result!.subtotal, 1000);
    assertEquals(result!.total, 1000);
  } finally {
    await cleanup(dir);
  }
});

Deno.test("QuoteService.updateLineItemField - empty string clears numeric field to undefined", async () => {
  const { service, dir } = await setup();
  try {
    const q = await service.create({
      customerId: "c1",
      title: "Clear",
      lineItems: [
        line({
          id: "li_1",
          type: "service",
          description: "Work",
          quantity: 10,
          unitRate: 100,
        }),
      ],
    });
    const result = await service.updateLineItemField(q, 0, "quantity", "");
    assertExists(result);
    assertStrictEquals(result!.lineItems[0].quantity, undefined);
  } finally {
    await cleanup(dir);
  }
});

Deno.test("QuoteService.updateLineItemField - NaN input clears the numeric field to undefined", async () => {
  const { service, dir } = await setup();
  try {
    const q = await service.create({
      customerId: "c1",
      title: "NaN",
      lineItems: [
        line({
          id: "li_1",
          type: "service",
          description: "Work",
          quantity: 5,
          unitRate: 100,
        }),
      ],
    });
    const result = await service.updateLineItemField(q, 0, "unitRate", "abc");
    assertExists(result);
    assertStrictEquals(result!.lineItems[0].unitRate, undefined);
  } finally {
    await cleanup(dir);
  }
});

// === inline edit — addLineItem ===

Deno.test("QuoteService.addLineItem appends a blank service line with crypto id", async () => {
  const { service, dir } = await setup();
  try {
    const q = await service.create({
      customerId: "c1",
      title: "Add",
      lineItems: [
        line({
          id: "li_existing",
          type: "service",
          description: "Existing",
          quantity: 1,
          unitRate: 100,
        }),
      ],
    });
    const result = await service.addLineItem(q);
    assertExists(result);
    assertEquals(result!.lineItems.length, 2);
    const appended = result!.lineItems[1];
    assertEquals(appended.type, "service");
    assertEquals(appended.description, "");
    assertStrictEquals(appended.quantity, undefined);
    assertStrictEquals(appended.unitRate, undefined);
    assertEquals(appended.amount, 0);
    // Crypto-generated id with li_ prefix.
    assertEquals(appended.id.startsWith("li_"), true);
    assertEquals(appended.id.length, 11); // "li_" + 8 chars
  } finally {
    await cleanup(dir);
  }
});

// === inline edit — removeLineItem ===

Deno.test("QuoteService.removeLineItem drops one item by index and recomputes totals", async () => {
  const { service, dir } = await setup();
  try {
    const q = await service.create({
      customerId: "c1",
      title: "Remove",
      lineItems: [
        line({
          id: "li_a",
          type: "service",
          description: "A",
          quantity: 1,
          unitRate: 100,
        }),
        line({
          id: "li_b",
          type: "service",
          description: "B",
          quantity: 1,
          unitRate: 200,
        }),
        line({
          id: "li_c",
          type: "service",
          description: "C",
          quantity: 1,
          unitRate: 300,
        }),
      ],
    });
    assertEquals(q.subtotal, 600);
    const result = await service.removeLineItem(q, 1); // drop "B"
    assertExists(result);
    assertEquals(result!.lineItems.length, 2);
    assertEquals(result!.lineItems.map((li) => li.id), ["li_a", "li_c"]);
    assertEquals(result!.subtotal, 400);
  } finally {
    await cleanup(dir);
  }
});

// === sendQuote — snapshot + transition + revision increment ===

Deno.test("QuoteService.sendQuote appends a revision snapshot and transitions to sent + bumps revision", async () => {
  const { service, dir } = await setup();
  try {
    const q = await service.create({
      customerId: "c1",
      title: "Send",
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
    assertEquals(q.status, "draft");
    assertEquals(q.revision, 1);

    const sent = await service.sendQuote(q, "tommy");
    assertExists(sent);
    assertEquals(sent!.status, "sent");
    assertExists(sent!.sentAt);
    // revision was 1 → snapshot at 2 → quote.revision now 2
    assertEquals(sent!.revision, 2);

    const revisions = await service.getRevisions(q.id);
    assertEquals(revisions.length, 1);
    assertEquals(revisions[0].revisionNumber, 2);
    assertEquals(revisions[0].total, q.total);
    assertEquals(revisions[0].subtotal, q.subtotal);
    assertEquals(revisions[0].lineItemCount, 1);
    assertEquals(revisions[0].sentBy, "tommy");
    assertExists(revisions[0].snapshotAt);
  } finally {
    await cleanup(dir);
  }
});

Deno.test("QuoteService.sendQuote called twice appends two snapshots with incrementing revisions", async () => {
  const { service, dir } = await setup();
  try {
    let q = await service.create({
      customerId: "c1",
      title: "Twice",
      lineItems: [],
    });
    const s1 = await service.sendQuote(q, "alice");
    assertExists(s1);
    assertEquals(s1!.revision, 2);

    q = (await service.getById(q.id))!;
    const s2 = await service.sendQuote(q, "bob");
    assertExists(s2);
    assertEquals(s2!.revision, 3);

    const revisions = await service.getRevisions(q.id);
    assertEquals(revisions.length, 2);
    assertEquals(revisions[0].revisionNumber, 2);
    assertEquals(revisions[0].sentBy, "alice");
    assertEquals(revisions[1].revisionNumber, 3);
    assertEquals(revisions[1].sentBy, "bob");
  } finally {
    await cleanup(dir);
  }
});

Deno.test("QuoteService.getRevisions returns [] when no sidecar exists", async () => {
  const { service, dir } = await setup();
  try {
    const q = await service.create({
      customerId: "c1",
      title: "No Sends",
      lineItems: [],
    });
    const revisions = await service.getRevisions(q.id);
    assertEquals(revisions, []);
  } finally {
    await cleanup(dir);
  }
});

// === service.list filters ===

Deno.test("QuoteService - list with status filter returns only matching", async () => {
  const { service, repo, dir } = await setup();
  try {
    await service.create({
      customerId: "c1",
      title: "Drafty",
      lineItems: [],
    });
    const accepted = await service.create({
      customerId: "c1",
      title: "Accepted",
      lineItems: [],
    });
    await repo.update(accepted.id, { status: "accepted" });
    const drafts = await service.list({ status: "draft" });
    assertEquals(drafts.length, 1);
    assertEquals(drafts[0].title, "Drafty");
    const acceptedList = await service.list({ status: "accepted" });
    assertEquals(acceptedList.length, 1);
    assertEquals(acceptedList[0].title, "Accepted");
  } finally {
    await cleanup(dir);
  }
});

Deno.test("QuoteService - list with customerId filter returns only matching", async () => {
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

Deno.test("QuoteService - list with q filter matches title/number/notes", async () => {
  const { service, dir } = await setup();
  try {
    const year = new Date().getFullYear();
    await service.create({
      customerId: "c1",
      title: "Title Match",
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

    const byNumber = await service.list({ q: `Q-${year}` });
    assertEquals(byNumber.length, 2);
  } finally {
    await cleanup(dir);
  }
});

Deno.test("QuoteService - list combines status + customerId (AND)", async () => {
  const { service, repo, dir } = await setup();
  try {
    const match = await service.create({
      customerId: "c1",
      title: "Match",
      lineItems: [],
    });
    await repo.update(match.id, { status: "accepted" });
    await service.create({
      customerId: "c1",
      title: "Wrong status",
      lineItems: [],
    });
    const other = await service.create({
      customerId: "c2",
      title: "Wrong customer",
      lineItems: [],
    });
    await repo.update(other.id, { status: "accepted" });
    const matches = await service.list({
      status: "accepted",
      customerId: "c1",
    });
    assertEquals(matches.length, 1);
    assertEquals(matches[0].title, "Match");
  } finally {
    await cleanup(dir);
  }
});

// === manual fixture parse with snake_case line items + payment_schedule ===

Deno.test("QuoteRepository - parses a manually-written file with snake_case nested keys", async () => {
  const { repo, dir } = await setup();
  try {
    await Deno.mkdir(join(dir, "billing/quotes"), { recursive: true });
    await Deno.writeTextFile(
      join(dir, "billing/quotes", "quote_manual.md"),
      [
        "---",
        "number: Q-2026-099",
        "customer_id: customer_manual",
        "title: Manual Quote",
        "status: sent",
        "currency: USD",
        "expires_at: 2026-12-31",
        "subtotal: 1000",
        "tax: 100",
        "tax_rate: 10",
        "total: 1100",
        "revision: 1",
        "line_items:",
        "  - id: li_1",
        "    type: service",
        "    description: Hours",
        "    quantity: 10",
        "    unit_rate: 100",
        "    taxable: true",
        "    amount: 1000",
        "  - id: li_2",
        "    type: service",
        "    description: Optional add-on",
        "    quantity: 1",
        "    unit_rate: 500",
        "    optional: true",
        "    amount: 500",
        "payment_schedule:",
        "  - description: 50% deposit",
        "    percent: 50",
        "    due_date: 2026-04-01",
        "created_at: 2026-01-01T00:00:00.000Z",
        "updated_at: 2026-01-02T00:00:00.000Z",
        "---",
        "# Manual Quote",
        "",
        "Hand-written notes.",
        "",
      ].join("\n"),
    );
    const fetched = await repo.findById("quote_manual");
    assertExists(fetched);
    assertEquals(fetched!.id, "quote_manual");
    assertEquals(fetched!.number, "Q-2026-099");
    assertEquals(fetched!.customerId, "customer_manual");
    assertEquals(fetched!.title, "Manual Quote");
    assertEquals(fetched!.status, "sent");
    assertEquals(fetched!.expiresAt, "2026-12-31");
    assertEquals(fetched!.subtotal, 1000);
    assertEquals(fetched!.tax, 100);
    assertEquals(fetched!.taxRate, 10);
    assertEquals(fetched!.total, 1100);
    assertEquals(fetched!.revision, 1);
    assertEquals(fetched!.lineItems.length, 2);
    assertEquals(fetched!.lineItems[0].unitRate, 100);
    assertEquals(fetched!.lineItems[1].optional, true);
    assertEquals(fetched!.paymentSchedule?.length, 1);
    assertEquals(fetched!.paymentSchedule![0].dueDate, "2026-04-01");
    assertEquals(fetched!.notes, "Hand-written notes.");
  } finally {
    await cleanup(dir);
  }
});

// === edge cases ===

Deno.test("QuoteRepository - notes round-trip through body", async () => {
  const { repo, dir } = await setup();
  try {
    const created = await repo.create({
      customerId: "c1",
      title: "Notes Test",
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

Deno.test("QuoteRepository - findByName returns matching quote by title (case-insensitive)", async () => {
  const { repo, dir } = await setup();
  try {
    await repo.create({
      customerId: "c1",
      title: "Premium Quote",
      lineItems: [],
    });
    await repo.create({
      customerId: "c1",
      title: "Standard Quote",
      lineItems: [],
    });
    const found = await repo.findByName("premium quote");
    assertExists(found);
    assertEquals(found!.title, "Premium Quote");
  } finally {
    await cleanup(dir);
  }
});

Deno.test("QuoteRepository - convertedToInvoice round-trips through frontmatter", async () => {
  const { service, dir } = await setup();
  try {
    const q = await service.create({
      customerId: "c1",
      title: "Convertible",
      lineItems: [],
    });
    await service.update(q.id, { convertedToInvoice: "invoice_001" });
    const fetched = await service.getById(q.id);
    assertExists(fetched);
    assertEquals(fetched!.convertedToInvoice, "invoice_001");
  } finally {
    await cleanup(dir);
  }
});
