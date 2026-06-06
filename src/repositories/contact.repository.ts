// Contact repository — markdown file CRUD under contacts/.

import type {
  Contact,
  ContactType,
  CreateContact,
  UpdateContact,
} from "../types/contact.types.ts";
import { CachedMarkdownRepository } from "./cached.repository.ts";
import { CONTACT_TABLE, rowToContact } from "../domains/contact/cache.ts";
import { CONTACT_BODY_KEYS } from "../domains/contact/constants.ts";

import {
  resolveEntityId,
  stampAuditFields,
} from "../utils/frontmatter-mapper.ts";
const CONTACT_TYPES: readonly ContactType[] = [
  "lead",
  "customer",
  "partner",
  "vendor",
  "other",
] as const;

/** Persists Contact entities as markdown with a SQLite cache mirror. */
export class ContactRepository extends CachedMarkdownRepository<
  Contact,
  CreateContact,
  UpdateContact
> {
  protected readonly tableName = CONTACT_TABLE;
  protected override readonly supportsArchive = true;

  constructor(projectDir: string) {
    super(projectDir, {
      directory: "contacts",
      idPrefix: "contact",
      nameField: "name",
    });
  }

  protected rowToEntity(row: Record<string, string | number | null>): Contact {
    return rowToContact(row);
  }

  protected fromCreateInput(
    data: CreateContact,
    id: string,
    now: string,
  ): Contact {
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
  ): Contact | null {
    if (!fm.id && !fm.name) return null;
    const id = resolveEntityId(filename, fm);

    const bodyText = body.trim();
    const headingMatch = bodyText.match(/^#\s+(.+)$/m);
    const name = fm.name
      ? String(fm.name)
      : headingMatch
      ? headingMatch[1]
      : "";

    // Extract notes from body after heading, strip ## Notes header if present
    let notes: string | undefined;
    if (headingMatch) {
      const afterHeading = bodyText.replace(/^#\s+.+\n?/, "").trim();
      notes = afterHeading.replace(/^##\s+Notes\n?/, "").trim() || undefined;
    } else {
      notes = bodyText || undefined;
    }

    const typeRaw = fm.type != null ? String(fm.type) : undefined;
    const type = typeRaw && CONTACT_TYPES.includes(typeRaw as ContactType)
      ? (typeRaw as ContactType)
      : undefined;

    const tags = Array.isArray(fm.tags)
      ? (fm.tags as unknown[]).map(String)
      : [];

    return {
      id,
      name,
      email: fm.email != null ? String(fm.email) : undefined,
      phone: fm.phone != null ? String(fm.phone) : undefined,
      role: fm.role != null ? String(fm.role) : undefined,
      company: fm.company != null ? String(fm.company) : undefined,
      type,
      notes,
      tags,
      createdAt: fm.createdAt ? String(fm.createdAt) : new Date().toISOString(),
      updatedAt: fm.updatedAt ? String(fm.updatedAt) : new Date().toISOString(),
      createdBy: fm.createdBy != null ? String(fm.createdBy) : undefined,
      updatedBy: fm.updatedBy != null ? String(fm.updatedBy) : undefined,
    };
  }

  protected serialize(item: Contact): string {
    return this.serializeStandard(
      item,
      CONTACT_BODY_KEYS,
      this.buildBody(item),
    );
  }

  private buildBody(item: Contact): string {
    const parts: string[] = [`# ${item.name}`];
    if (item.notes) {
      parts.push("", "## Notes", "", item.notes);
    }
    return parts.join("\n");
  }
}
