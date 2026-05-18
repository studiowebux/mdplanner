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

export class ReflectionRepository extends CachedMarkdownRepository<
  Reflection,
  CreateReflection,
  UpdateReflection
> {
  protected readonly tableName = REFLECTION_TABLE;

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
      createdAt: now,
      updatedAt: now,
    };
  }

  protected parse(
    filename: string,
    fm: Record<string, unknown>,
    body: string,
  ): Reflection | null {
    if (!fm.id && !fm.title) return null;
    const id = fm.id ? String(fm.id) : filename.replace(/\.md$/, "");

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
      date: fm.date ? String(fm.date) : new Date().toISOString().slice(0, 10),
      templateId: fm.templateId != null ? String(fm.templateId) : undefined,
      content,
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

  protected serialize(item: Reflection): string {
    const fm: Record<string, unknown> = {};
    fm.id = item.id;
    fm.title = item.title;
    fm.period = item.period;
    fm.date = item.date;
    if (item.templateId) fm.template_id = item.templateId;
    if (item.tags && item.tags.length > 0) fm.tags = item.tags;
    fm.created_at = item.createdAt;
    fm.updated_at = item.updatedAt;
    if (item.createdBy) fm.created_by = item.createdBy;
    if (item.updatedBy) fm.updated_by = item.updatedBy;

    return serializeFrontmatter(fm, item.content ?? "");
  }
}
