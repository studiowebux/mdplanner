// Company repository — markdown file CRUD under companies/.

import type {
  Company,
  CompanySize,
  CompanyType,
  CreateCompany,
  UpdateCompany,
} from "../types/company.types.ts";
import { CachedMarkdownRepository } from "./cached.repository.ts";
import { COMPANY_TABLE, rowToCompany } from "../domains/company/cache.ts";
import { COMPANY_BODY_KEYS } from "../domains/company/cache.ts";

import {
  resolveEntityId,
  stampAuditFields,
} from "../utils/frontmatter-mapper.ts";
const COMPANY_TYPES: readonly CompanyType[] = [
  "prospect",
  "customer",
  "partner",
  "vendor",
  "other",
] as const;

const COMPANY_SIZES: readonly CompanySize[] = [
  "1-10",
  "11-50",
  "51-200",
  "201-1000",
  "1000+",
] as const;

/** Persists Company entities as markdown with a SQLite cache mirror. */
export class CompanyRepository extends CachedMarkdownRepository<
  Company,
  CreateCompany,
  UpdateCompany
> {
  protected readonly tableName = COMPANY_TABLE;
  protected override readonly supportsArchive = true;

  constructor(projectDir: string) {
    super(projectDir, {
      directory: "companies",
      idPrefix: "company",
      nameField: "name",
    });
  }

  protected rowToEntity(row: Record<string, string | number | null>): Company {
    return rowToCompany(row);
  }

  protected fromCreateInput(
    data: CreateCompany,
    id: string,
    now: string,
  ): Company {
    return {
      ...data,
      id,
      tags: data.tags ?? [],
      ...stampAuditFields(now),
    };
  }

  protected parse(
    filename: string,
    fm: Record<string, unknown>,
    body: string,
  ): Company | null {
    if (!fm.id && !fm.name) return null;
    const id = resolveEntityId(filename, fm);

    const bodyText = body.trim();
    const headingMatch = bodyText.match(/^#\s+(.+)$/m);
    const name = fm.name
      ? String(fm.name)
      : headingMatch
      ? headingMatch[1]
      : "";

    let notes: string | undefined;
    if (headingMatch) {
      const afterHeading = bodyText.replace(/^#\s+.+\n?/, "").trim();
      notes = afterHeading.replace(/^##\s+Notes\n?/, "").trim() || undefined;
    } else {
      notes = bodyText || undefined;
    }

    const typeRaw = fm.type != null ? String(fm.type) : undefined;
    const type = typeRaw && COMPANY_TYPES.includes(typeRaw as CompanyType)
      ? (typeRaw as CompanyType)
      : undefined;

    const sizeRaw = fm.size != null ? String(fm.size) : undefined;
    const size = sizeRaw && COMPANY_SIZES.includes(sizeRaw as CompanySize)
      ? (sizeRaw as CompanySize)
      : undefined;

    const tags = Array.isArray(fm.tags)
      ? (fm.tags as unknown[]).map(String)
      : [];

    return {
      id,
      name,
      website: fm.website != null ? String(fm.website) : undefined,
      industry: fm.industry != null ? String(fm.industry) : undefined,
      size,
      type,
      phone: fm.phone != null ? String(fm.phone) : undefined,
      email: fm.email != null ? String(fm.email) : undefined,
      address: fm.address != null ? String(fm.address) : undefined,
      notes,
      tags,
      createdAt: fm.createdAt ? String(fm.createdAt) : new Date().toISOString(),
      updatedAt: fm.updatedAt ? String(fm.updatedAt) : new Date().toISOString(),
      createdBy: fm.createdBy != null ? String(fm.createdBy) : undefined,
      updatedBy: fm.updatedBy != null ? String(fm.updatedBy) : undefined,
    };
  }

  protected serialize(item: Company): string {
    return this.serializeStandard(
      item,
      COMPANY_BODY_KEYS,
      this.buildBody(item),
    );
  }

  private buildBody(item: Company): string {
    const parts: string[] = [`# ${item.name}`];
    if (item.notes) {
      parts.push("", "## Notes", "", item.notes);
    }
    return parts.join("\n");
  }
}
