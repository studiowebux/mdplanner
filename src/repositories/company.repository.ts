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
  fmStr,
  fmStrArr,
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

    const typeRaw = fmStr(fm, "type");
    const type = typeRaw && COMPANY_TYPES.includes(typeRaw as CompanyType)
      ? (typeRaw as CompanyType)
      : undefined;

    const sizeRaw = fmStr(fm, "size");
    const size = sizeRaw && COMPANY_SIZES.includes(sizeRaw as CompanySize)
      ? (sizeRaw as CompanySize)
      : undefined;

    return {
      id,
      name,
      website: fmStr(fm, "website"),
      industry: fmStr(fm, "industry"),
      size,
      type,
      phone: fmStr(fm, "phone"),
      email: fmStr(fm, "email"),
      address: fmStr(fm, "address"),
      notes,
      tags: fmStrArr(fm, "tags") ?? [],
      createdAt: fmStr(fm, "createdAt") ?? new Date().toISOString(),
      updatedAt: fmStr(fm, "updatedAt") ?? new Date().toISOString(),
      createdBy: fmStr(fm, "createdBy"),
      updatedBy: fmStr(fm, "updatedBy"),
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
