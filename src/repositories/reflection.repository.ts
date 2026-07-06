// Reflection repository — markdown file CRUD under reflections/.
// Content lives in the file body; period/date/templateId in frontmatter.

import { serializeFrontmatter } from "../utils/frontmatter.ts";
import type {
  CreateReflection,
  Reflection,
  UpdateReflection,
} from "../types/reflection.types.ts";
import { CachedMarkdownRepository } from "./cached.repository.ts";
import {
  REFLECTION_TABLE,
  rowToReflection,
} from "../domains/reflection/cache.ts";

import {
  fmStr,
  resolveEntityId,
  serializeAuditFields,
  stampAuditFields,
} from "../utils/frontmatter-mapper.ts";
/** Persists Reflection entities as markdown with a SQLite cache mirror. */
export class ReflectionRepository extends CachedMarkdownRepository<
  Reflection,
  CreateReflection,
  UpdateReflection
> {
  protected readonly tableName = REFLECTION_TABLE;
  protected override readonly supportsArchive = true;

  constructor(projectDir: string) {
    super(projectDir, {
      directory: "reflections",
      idPrefix: "reflection",
      nameField: "title",
    });
  }

  protected rowToEntity(
    row: Record<string, string | number | null>,
  ): Reflection {
    return rowToReflection(row);
  }

  protected fromCreateInput(
    data: CreateReflection,
    id: string,
    now: string,
  ): Reflection {
    return {
      ...data,
      id,
      period: data.period ?? "weekly",
      date: data.date,
      tags: data.tags ?? [],
      ...stampAuditFields(now),
    };
  }

  protected parse(
    filename: string,
    fm: Record<string, unknown>,
    body: string,
  ): Reflection | null {
    if (!fm.id && !fm.title) return null;
    const id = resolveEntityId(filename, fm);

    let title = fm.title ? String(fm.title) : "";
    const contentLines: string[] = [];

    for (const line of body.split("\n")) {
      if (line.startsWith("# ")) {
        if (!title) title = line.slice(2).trim();
        continue;
      }
      contentLines.push(line);
    }

    const content = contentLines.join("\n").trim() || undefined;

    return {
      id,
      title: title || "Untitled Reflection",
      period: (fm.period as Reflection["period"]) ?? "weekly",
      date: fmStr(fm, "date") ?? new Date().toISOString().slice(0, 10),
      templateId: fmStr(fm, "templateId"),
      content,
      tags: Array.isArray(fm.tags)
        ? fm.tags.map(String)
        : fm.tags != null
        ? [String(fm.tags)]
        : [],
      createdAt: fmStr(fm, "createdAt") ?? new Date().toISOString(),
      updatedAt: fmStr(fm, "updatedAt") ?? new Date().toISOString(),
      createdBy: fmStr(fm, "createdBy"),
      updatedBy: fmStr(fm, "updatedBy"),
    };
  }

  protected serialize(item: Reflection): string {
    const fm: Record<string, unknown> = {};
    fm.id = item.id;
    fm.title = item.title;
    fm.period = item.period;
    fm.date = item.date;
    if (item.templateId) fm.template_id = item.templateId;
    if (item.tags && item.tags.length > 0) fm.tags = item.tags;
    serializeAuditFields(fm, item);

    return serializeFrontmatter(fm, item.content ?? "");
  }
}
