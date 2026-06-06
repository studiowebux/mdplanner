// SAFe repository — markdown file CRUD under safe/.
// Body: decorative title line only; all data in frontmatter.

import { serializeFrontmatter } from "../utils/frontmatter.ts";
import type { CreateSafe, Safe, UpdateSafe } from "../types/safe.types.ts";
import { CachedMarkdownRepository } from "./cached.repository.ts";
import { rowToSafe, SAFE_TABLE } from "../domains/safe/cache.ts";

import {
  resolveEntityId,
  stampAuditFields,
} from "../utils/frontmatter-mapper.ts";
/** Persists SAFE-note entities as markdown with a SQLite cache mirror. */
export class SafeRepository extends CachedMarkdownRepository<
  Safe,
  CreateSafe,
  UpdateSafe
> {
  protected readonly tableName = SAFE_TABLE;
  protected override readonly supportsArchive = true;

  constructor(projectDir: string) {
    super(projectDir, {
      directory: "safe",
      idPrefix: "safe",
      nameField: "investor",
    });
  }

  protected rowToEntity(row: Record<string, string | number | null>): Safe {
    return rowToSafe(row);
  }

  protected fromCreateInput(data: CreateSafe, id: string, now: string): Safe {
    return {
      ...data,
      id,
      valuation_cap: data.valuation_cap ?? 0,
      discount: data.discount ?? 0,
      type: data.type ?? "post-money",
      status: data.status ?? "draft",
      ...stampAuditFields(now),
    };
  }

  // ---------------------------------------------------------------------------
  // Parse — frontmatter only, body is decorative
  // ---------------------------------------------------------------------------

  protected parse(
    filename: string,
    fm: Record<string, unknown>,
    _body: string,
  ): Safe | null {
    if (!fm.id && !fm.investor) return null;
    const id = resolveEntityId(filename, fm);

    return {
      id,
      investor: fm.investor ? String(fm.investor) : "Unknown Investor",
      amount: fm.amount != null ? Number(fm.amount) : 0,
      valuation_cap: fm.valuationCap != null ? Number(fm.valuationCap) : 0,
      discount: fm.discount != null ? Number(fm.discount) : 0,
      type: (fm.type as Safe["type"]) ?? "post-money",
      date: fm.date ? String(fm.date) : new Date().toISOString().split("T")[0],
      status: (fm.status as Safe["status"]) ?? "draft",
      notes: fm.notes != null ? String(fm.notes) : undefined,
      createdAt: fm.createdAt ? String(fm.createdAt) : new Date().toISOString(),
      updatedAt: fm.updatedAt ? String(fm.updatedAt) : new Date().toISOString(),
      createdBy: fm.createdBy != null ? String(fm.createdBy) : undefined,
      updatedBy: fm.updatedBy != null ? String(fm.updatedBy) : undefined,
    };
  }

  // ---------------------------------------------------------------------------
  // Serialize — frontmatter + decorative title body
  // ---------------------------------------------------------------------------

  protected serialize(item: Safe): string {
    const fm: Record<string, unknown> = {
      id: item.id,
      investor: item.investor,
      amount: item.amount,
      valuation_cap: item.valuation_cap,
      discount: item.discount,
      type: item.type,
      date: item.date,
      status: item.status,
    };
    if (item.notes) fm.notes = item.notes;
    fm.created_at = item.createdAt;
    fm.updated_at = item.updatedAt;
    if (item.createdBy) fm.created_by = item.createdBy;
    if (item.updatedBy) fm.updated_by = item.updatedBy;
    if (item.archived) fm.archived = item.archived;
    if (item.archivedAt) fm.archived_at = item.archivedAt;
    if (item.archivedBy) fm.archived_by = item.archivedBy;

    const body = `# ${item.investor} — $${item.amount.toLocaleString()} SAFE`;

    return serializeFrontmatter(fm, body);
  }
}
