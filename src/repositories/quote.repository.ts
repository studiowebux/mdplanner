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
  mapArrayFromFm,
  resolveEntityId,
  stampAuditFields,
} from "../utils/frontmatter-mapper.ts";
import { parseBillingBody, parseLineItems } from "../utils/billing-parse.ts";
import { atomicWrite } from "../utils/safe-io.ts";
import { CachedMarkdownRepository } from "./cached.repository.ts";
import { QUOTE_TABLE, rowToQuote } from "../domains/quote/cache.ts";
import { QUOTE_BODY_KEYS } from "../domains/quote/constants.ts";

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

    const rawSchedule = Array.isArray(fm.paymentSchedule)
      ? mapArrayFromFm(fm.paymentSchedule as unknown[])
      : undefined;
    const paymentSchedule: PaymentScheduleItem[] | undefined = rawSchedule
      ?.map((ps) => ({
        description: String(ps.description ?? ""),
        percent: ps.percent != null ? Number(ps.percent) : undefined,
        amount: ps.amount != null ? Number(ps.amount) : undefined,
        dueDate: ps.dueDate != null ? String(ps.dueDate) : undefined,
      }));

    return {
      id,
      number: String(fm.number ?? ""),
      customerId: String(fm.customerId ?? ""),
      title,
      status: (fm.status as Quote["status"]) ?? "draft",
      currency: fm.currency != null ? String(fm.currency) : undefined,
      expiresAt: fm.expiresAt != null ? String(fm.expiresAt) : undefined,
      lineItems,
      paymentSchedule: paymentSchedule?.length ? paymentSchedule : undefined,
      subtotal: Number(fm.subtotal ?? 0),
      tax: fm.tax != null ? Number(fm.tax) : undefined,
      taxRate: fm.taxRate != null ? Number(fm.taxRate) : undefined,
      total: Number(fm.total ?? 0),
      notes,
      footer: fm.footer != null ? String(fm.footer) : undefined,
      revision: fm.revision != null ? Number(fm.revision) : undefined,
      convertedToInvoice: fm.convertedToInvoice != null
        ? String(fm.convertedToInvoice)
        : undefined,
      createdAt: fm.createdAt ? String(fm.createdAt) : new Date().toISOString(),
      updatedAt: fm.updatedAt ? String(fm.updatedAt) : new Date().toISOString(),
      sentAt: fm.sentAt != null ? String(fm.sentAt) : undefined,
      acceptedAt: fm.acceptedAt != null ? String(fm.acceptedAt) : undefined,
      createdBy: fm.createdBy != null ? String(fm.createdBy) : undefined,
      updatedBy: fm.updatedBy != null ? String(fm.updatedBy) : undefined,
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
    return this.serializeStandard(item, QUOTE_BODY_KEYS, this.buildBody(item));
  }

  private buildBody(item: Quote): string {
    const parts: string[] = [`# ${item.title}`];
    if (item.notes) {
      parts.push("", item.notes);
    }
    return parts.join("\n");
  }
}
