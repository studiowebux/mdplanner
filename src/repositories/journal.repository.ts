// Journal repository — markdown file CRUD under journal/.
// Entry content lives in the file body; date/mood/tags in frontmatter.

import { serializeFrontmatter } from "../utils/frontmatter.ts";
import type {
  CreateJournalEntry,
  JournalEntry,
  UpdateJournalEntry,
} from "../types/journal.types.ts";
import { CachedMarkdownRepository } from "./cached.repository.ts";
import { JOURNAL_TABLE, rowToJournalEntry } from "../domains/journal/cache.ts";

import {
  resolveEntityId,
  stampAuditFields,
} from "../utils/frontmatter-mapper.ts";
/** Persists Journal entries as markdown with a SQLite cache mirror. */
export class JournalRepository extends CachedMarkdownRepository<
  JournalEntry,
  CreateJournalEntry,
  UpdateJournalEntry
> {
  protected readonly tableName = JOURNAL_TABLE;
  protected override readonly supportsArchive = true;

  constructor(projectDir: string) {
    super(projectDir, {
      directory: "journal",
      idPrefix: "journal",
      nameField: "title",
    });
  }

  protected rowToEntity(
    row: Record<string, string | number | null>,
  ): JournalEntry {
    return rowToJournalEntry(row);
  }

  protected fromCreateInput(
    data: CreateJournalEntry,
    id: string,
    now: string,
  ): JournalEntry {
    return {
      ...data,
      id,
      date: data.date,
      tags: data.tags ?? [],
      ...stampAuditFields(now),
    };
  }

  protected parse(
    filename: string,
    fm: Record<string, unknown>,
    body: string,
  ): JournalEntry | null {
    if (!fm.id && !fm.title) return null;
    const id = resolveEntityId(filename, fm);

    const title = fm.title
      ? String(fm.title)
      : body.match(/^# (.+)/m)?.[1]?.trim() ?? "Untitled Entry";
    const content = body.trim() || undefined;

    return {
      id,
      title: title || "Untitled Entry",
      content,
      date: fm.date ? String(fm.date) : new Date().toISOString().slice(0, 10),
      mood: fm.mood as JournalEntry["mood"] ?? undefined,
      tags: Array.isArray(fm.tags)
        ? fm.tags.map(String)
        : fm.tags != null
        ? [String(fm.tags)]
        : [],
      createdAt: fm.createdAt ? String(fm.createdAt) : new Date().toISOString(),
      updatedAt: fm.updatedAt ? String(fm.updatedAt) : new Date().toISOString(),
      createdBy: fm.createdBy != null ? String(fm.createdBy) : undefined,
      updatedBy: fm.updatedBy != null ? String(fm.updatedBy) : undefined,
    };
  }

  protected serialize(item: JournalEntry): string {
    const fm: Record<string, unknown> = {};
    fm.id = item.id;
    fm.title = item.title;
    fm.date = item.date;
    if (item.mood) fm.mood = item.mood;
    if (item.tags && item.tags.length > 0) fm.tags = item.tags;
    fm.created_at = item.createdAt;
    fm.updated_at = item.updatedAt;
    if (item.createdBy) fm.created_by = item.createdBy;
    if (item.updatedBy) fm.updated_by = item.updatedBy;

    // Preserve archive fields — custom serializers must round-trip these.
    if (item.archived) fm.archived = item.archived;
    if (item.archivedAt) fm.archived_at = item.archivedAt;
    if (item.archivedBy) fm.archived_by = item.archivedBy;

    return serializeFrontmatter(fm, item.content ?? "");
  }
}
