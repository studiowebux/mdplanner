// Investor repository — markdown file CRUD under investors/.
// Body: notes markdown in the main body.

import { serializeFrontmatter } from "../utils/frontmatter.ts";
import type {
  CreateInvestor,
  Investor,
  UpdateInvestor,
} from "../types/investor.types.ts";
import { CachedMarkdownRepository } from "./cached.repository.ts";
import { INVESTOR_TABLE, rowToInvestor } from "../domains/investor/cache.ts";

export class InvestorRepository extends CachedMarkdownRepository<
  Investor,
  CreateInvestor,
  UpdateInvestor
> {
  protected readonly tableName = INVESTOR_TABLE;

  constructor(projectDir: string) {
    super(projectDir, {
      directory: "investors",
      idPrefix: "investor",
      nameField: "name",
    });
  }

  protected rowToEntity(
    row: Record<string, string | number | null>,
  ): Investor {
    return rowToInvestor(row);
  }

  protected fromCreateInput(
    data: CreateInvestor,
    id: string,
    now: string,
  ): Investor {
    return {
      ...data,
      id,
      type: data.type ?? "vc",
      stage: data.stage ?? "lead",
      status: data.status ?? "not_started",
      tags: data.tags ?? [],
      createdAt: now,
      updatedAt: now,
    };
  }

  // ---------------------------------------------------------------------------
  // Parse — frontmatter + body (notes)
  // ---------------------------------------------------------------------------

  protected parse(
    filename: string,
    fm: Record<string, unknown>,
    body: string,
  ): Investor | null {
    if (!fm.id && !fm.name) return null;
    const id = fm.id ? String(fm.id) : filename.replace(/\.md$/, "");

    const notes = body.trim() || undefined;

    return {
      id,
      name: fm.name ? String(fm.name) : "Untitled Investor",
      type: (fm.type as Investor["type"]) ?? "vc",
      stage: (fm.stage as Investor["stage"]) ?? "lead",
      status: (fm.status as Investor["status"]) ?? "not_started",
      amountTarget: fm.amount_target != null
        ? Number(fm.amount_target)
        : undefined,
      contact: fm.contact != null ? String(fm.contact) : undefined,
      introDate: fm.intro_date != null ? String(fm.intro_date) : undefined,
      lastContact: fm.last_contact != null
        ? String(fm.last_contact)
        : undefined,
      notes,
      tags: Array.isArray(fm.tags)
        ? fm.tags.map(String)
        : fm.tags != null
        ? [String(fm.tags)]
        : [],
      createdAt: fm.createdAt
        ? String(fm.createdAt)
        : fm.created_at
        ? String(fm.created_at)
        : new Date().toISOString(),
      updatedAt: fm.updatedAt
        ? String(fm.updatedAt)
        : fm.updated_at
        ? String(fm.updated_at)
        : new Date().toISOString(),
      createdBy: fm.createdBy != null ? String(fm.createdBy) : undefined,
      updatedBy: fm.updatedBy != null ? String(fm.updatedBy) : undefined,
    };
  }

  // ---------------------------------------------------------------------------
  // Serialize — frontmatter + body
  // ---------------------------------------------------------------------------

  protected serialize(item: Investor): string {
    const fm: Record<string, unknown> = {};
    fm.id = item.id;
    fm.name = item.name;
    fm.type = item.type;
    fm.stage = item.stage;
    fm.status = item.status;
    if (item.amountTarget != null) fm.amount_target = item.amountTarget;
    if (item.contact) fm.contact = item.contact;
    if (item.introDate) fm.intro_date = item.introDate;
    if (item.lastContact) fm.last_contact = item.lastContact;
    if (item.tags && item.tags.length > 0) fm.tags = item.tags;
    fm.created_at = item.createdAt;
    fm.updated_at = item.updatedAt;
    if (item.createdBy) fm.created_by = item.createdBy;
    if (item.updatedBy) fm.updated_by = item.updatedBy;

    return serializeFrontmatter(fm, item.notes ?? "");
  }
}
