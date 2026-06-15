// Quote repository — markdown file CRUD under billing/quotes/.

import { join } from "@std/path";
import type {
  CreateQuote,
  PaymentScheduleItem,
  Quote,
  QuoteRevision,
  UpdateQuote,
} from "../types/quote.types.ts";
import {
  fmNum,
  fmStr,
  mapArrayFromFm,
  resolveEntityId,
  stampAuditFields,
} from "../utils/frontmatter-mapper.ts";
import { parseBillingBody, parseLineItems } from "../utils/billing-parse.ts";
import type { LineItem } from "../types/billing.types.ts";
import { atomicWrite } from "../utils/safe-io.ts";
import { CachedMarkdownRepository } from "./cached.repository.ts";
import { QUOTE_TABLE, rowToQuote } from "../domains/quote/cache.ts";
import { QUOTE_BODY_KEYS } from "../domains/quote/constants.ts";

/** Parse the frontmatter payment-schedule array into typed items, or undefined. */
function parsePaymentSchedule(
  raw: unknown,
): PaymentScheduleItem[] | undefined {
  if (!Array.isArray(raw)) return undefined;
  const items = mapArrayFromFm(raw as unknown[]).map((ps) => ({
    description: String(ps.description ?? ""),
    percent: ps.percent != null ? Number(ps.percent) : undefined,
    amount: ps.amount != null ? Number(ps.amount) : undefined,
    dueDate: ps.dueDate != null ? String(ps.dueDate) : undefined,
  }));
  return items.length ? items : undefined;
}

/** Persists Quote entities as markdown with a SQLite cache mirror; revision history is appended to the body (getRevisions/appendRevision). */
export class QuoteRepository extends CachedMarkdownRepository<
  Quote,
  CreateQuote,
  UpdateQuote
> {
  protected readonly tableName = QUOTE_TABLE;
  protected override readonly supportsArchive = true;

  constructor(projectDir: string) {
    super(projectDir, {
      directory: "billing/quotes",
      idPrefix: "quote",
      nameField: "title",
    });
  }

  protected rowToEntity(row: Record<string, string | number | null>): Quote {
    return rowToQuote(row);
  }

  protected fromCreateInput(
    data: CreateQuote,
    id: string,
    now: string,
  ): Quote {
    return {
      ...data,
      id,
      number: "",
      status: data.status ?? "draft",
      lineItems: data.lineItems ?? [],
      subtotal: 0,
      total: 0,
      revision: 1,
      ...stampAuditFields(now),
    };
  }

  protected parse(
    filename: string,
    fm: Record<string, unknown>,
    body: string,
  ): Quote | null {
    if (!fm.id && !fm.title) return null;
    const id = resolveEntityId(filename, fm);

    const { title, notes } = parseBillingBody(fm.title, body);
    const lineItems = parseLineItems(fm.lineItems);
    const paymentSchedule = parsePaymentSchedule(fm.paymentSchedule);

    return {
      id,
      number: fmStr(fm, "number") ?? "",
      customerId: fmStr(fm, "customerId") ?? "",
      projectId: fmStr(fm, "projectId"),
      title,
      status: (fm.status as Quote["status"]) ?? "draft",
      currency: fmStr(fm, "currency"),
      expiresAt: fmStr(fm, "expiresAt"),
      lineItems,
      paymentSchedule,
      subtotal: fmNum(fm, "subtotal") ?? 0,
      tax: fmNum(fm, "tax"),
      taxRate: fmNum(fm, "taxRate"),
      total: fmNum(fm, "total") ?? 0,
      notes,
      footer: fmStr(fm, "footer"),
      revision: fmNum(fm, "revision"),
      convertedToInvoice: fmStr(fm, "convertedToInvoice"),
      createdAt: fmStr(fm, "createdAt") ?? new Date().toISOString(),
      updatedAt: fmStr(fm, "updatedAt") ?? new Date().toISOString(),
      sentAt: fmStr(fm, "sentAt"),
      acceptedAt: fmStr(fm, "acceptedAt"),
      createdBy: fmStr(fm, "createdBy"),
      updatedBy: fmStr(fm, "updatedBy"),
    };
  }

  // ---------------------------------------------------------------------------
  // Delete — also removes revision sidecar to avoid orphaned files
  // ---------------------------------------------------------------------------

  override async delete(id: string): Promise<boolean> {
    const deleted = await super.delete(id);
    if (deleted) {
      try {
        await Deno.remove(this.revisionPath(id));
      } catch (err) {
        if (!(err instanceof Deno.errors.NotFound)) throw err;
      }
    }
    return deleted;
  }

  // ---------------------------------------------------------------------------
  // Revision sidecar — {quoteId}.revisions.json, append-only
  // ---------------------------------------------------------------------------

  private revisionPath(quoteId: string): string {
    return join(this.dir, `${quoteId}.revisions.json`);
  }

  async getRevisions(quoteId: string): Promise<QuoteRevision[]> {
    try {
      const raw = await Deno.readTextFile(this.revisionPath(quoteId));
      return JSON.parse(raw) as QuoteRevision[];
    } catch (err) {
      if (err instanceof Deno.errors.NotFound) return [];
      throw err;
    }
  }

  async appendRevision(
    quoteId: string,
    revision: QuoteRevision,
  ): Promise<void> {
    const path = this.revisionPath(quoteId);
    await this.writer.write(quoteId + ".revisions", async () => {
      const existing = await this.getRevisions(quoteId);
      existing.push(revision);
      await Deno.mkdir(this.dir, { recursive: true });
      await atomicWrite(path, JSON.stringify(existing, null, 2));
    });
  }

  protected serialize(item: Quote): string {
    // Per-line `amount` is derived (computeLineAmount) — strip it so it is
    // never persisted, matching the subtotal/tax/total exclusion in
    // QUOTE_BODY_KEYS. It is recomputed on read by QuoteService.calculateTotals.
    const persisted: Quote = {
      ...item,
      lineItems: item.lineItems.map(({ amount: _amount, ...li }) =>
        li as LineItem
      ),
    };
    return this.serializeStandard(
      persisted,
      QUOTE_BODY_KEYS,
      this.buildBody(item),
    );
  }

  private buildBody(item: Quote): string {
    const parts: string[] = [`# ${item.title}`];
    if (item.notes) {
      parts.push("", item.notes);
    }
    return parts.join("\n");
  }
}
