// MoSCoW Analysis repository — markdown file CRUD under moscow/.
// Body uses ## Must Have/Should Have/Could Have/Won't Have sections with bullet lists.

import { serializeFrontmatter } from "../utils/frontmatter.ts";
import type {
  CreateMoscow,
  Moscow,
  UpdateMoscow,
} from "../types/moscow.types.ts";
import {
  MOSCOW_QUADRANT_KEYS,
  MOSCOW_QUADRANTS,
  MOSCOW_SECTION_MAP,
  type MoscowQuadrantKey,
} from "../domains/moscow/constants.tsx";
import { CachedMarkdownRepository } from "./cached.repository.ts";
import { parseQuadrantMarkdown } from "../utils/quadrant-parse.ts";
import { MOSCOW_TABLE, rowToMoscow } from "../domains/moscow/cache.ts";

export class MoscowRepository extends CachedMarkdownRepository<
  Moscow,
  CreateMoscow,
  UpdateMoscow
> {
  protected readonly tableName = MOSCOW_TABLE;
  protected override readonly supportsArchive = true;

  constructor(projectDir: string) {
    super(projectDir, {
      directory: "moscow",
      idPrefix: "moscow",
      nameField: "title",
    });
  }

  protected rowToEntity(row: Record<string, string | number | null>): Moscow {
    return rowToMoscow(row);
  }

  protected fromCreateInput(
    data: CreateMoscow,
    id: string,
    now: string,
  ): Moscow {
    return {
      ...data,
      id,
      date: data.date ?? new Date().toISOString().split("T")[0],
      must: data.must ?? [],
      should: data.should ?? [],
      could: data.could ?? [],
      wont: data.wont ?? [],
      createdAt: now,
      updatedAt: now,
    };
  }

  // ---------------------------------------------------------------------------
  // Parse — frontmatter + body sections
  // ---------------------------------------------------------------------------

  protected parse(
    filename: string,
    fm: Record<string, unknown>,
    body: string,
  ): Moscow | null {
    if (!fm.id && !fm.title) return null;
    const id = fm.id ? String(fm.id) : filename.replace(/\.md$/, "");

    const { title, quadrants, notes } = parseQuadrantMarkdown(
      body,
      MOSCOW_SECTION_MAP,
      fm.title,
      fm.notes,
    );

    return {
      id,
      title: title || "Untitled MoSCoW",
      date: fm.date ? String(fm.date) : new Date().toISOString().split("T")[0],
      must: quadrants.must,
      should: quadrants.should,
      could: quadrants.could,
      wont: quadrants.wont,
      project: fm.project != null ? String(fm.project) : undefined,
      notes,
      createdAt: fm.createdAt ? String(fm.createdAt) : new Date().toISOString(),
      updatedAt: fm.updatedAt ? String(fm.updatedAt) : new Date().toISOString(),
      createdBy: fm.createdBy != null ? String(fm.createdBy) : undefined,
      updatedBy: fm.updatedBy != null ? String(fm.updatedBy) : undefined,
    };
  }

  // ---------------------------------------------------------------------------
  // Serialize — frontmatter + body sections
  // ---------------------------------------------------------------------------

  protected serialize(item: Moscow): string {
    const fm: Record<string, unknown> = {};
    fm.title = item.title;
    fm.date = item.date;
    if (item.project) fm.project = item.project;
    fm.created_at = item.createdAt;
    fm.updated_at = item.updatedAt;
    if (item.createdBy) fm.created_by = item.createdBy;
    if (item.updatedBy) fm.updated_by = item.updatedBy;
    // Preserve archive fields — custom serializers must round-trip these.
    if (item.archived) fm.archived = item.archived;
    if (item.archivedAt) fm.archived_at = item.archivedAt;
    if (item.archivedBy) fm.archived_by = item.archivedBy;

    const sections: string[] = [];

    for (const name of MOSCOW_QUADRANTS) {
      const key = MOSCOW_QUADRANT_KEYS[MOSCOW_QUADRANTS.indexOf(name)];
      const items = item[key];
      sections.push(`## ${name}`);
      sections.push("");
      if (items.length > 0) {
        for (const entry of items) {
          sections.push(`- ${entry}`);
        }
      }
      sections.push("");
    }

    if (item.notes) {
      sections.push(item.notes);
      sections.push("");
    }

    return serializeFrontmatter(fm, sections.join("\n").trimEnd());
  }
}
