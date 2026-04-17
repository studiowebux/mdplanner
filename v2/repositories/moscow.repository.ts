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
import { MOSCOW_TABLE, rowToMoscow } from "../domains/moscow/cache.ts";

export class MoscowRepository extends CachedMarkdownRepository<
  Moscow,
  CreateMoscow,
  UpdateMoscow
> {
  protected readonly tableName = MOSCOW_TABLE;

  constructor(projectDir: string) {
    super(projectDir, {
      directory: "moscow",
      idPrefix: "moscow",
      nameField: "title",
    });
  }

  protected rowToEntity(row: Record<string, unknown>): Moscow {
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

    const lines = body.split("\n");
    let title = fm.title ? String(fm.title) : "";
    const quadrants: Record<string, string[]> = {
      must: [],
      should: [],
      could: [],
      wont: [],
    };
    let currentSection: string | null = null;
    const extraLines: string[] = [];
    let pastQuadrants = false;

    for (const line of lines) {
      if (line.startsWith("# ")) {
        if (!title) title = line.slice(2).trim();
        continue;
      }

      const h2Match = line.match(/^##\s+(.+)$/);
      if (h2Match) {
        const heading = h2Match[1].toLowerCase();
        let matched = false;
        for (const [prefix, key] of Object.entries(MOSCOW_SECTION_MAP)) {
          if (heading.startsWith(prefix)) {
            currentSection = key;
            matched = true;
            break;
          }
        }
        if (!matched) {
          currentSection = null;
          pastQuadrants = true;
          extraLines.push(line);
        }
        continue;
      }

      const listMatch = line.match(/^[-*]\s+(.+)$/);
      if (listMatch && currentSection && !pastQuadrants) {
        quadrants[currentSection].push(listMatch[1].trim());
        continue;
      }

      if (currentSection === null && !pastQuadrants) {
        if (line.trim()) extraLines.push(line);
        continue;
      }

      if (currentSection && !pastQuadrants && line.trim()) {
        pastQuadrants = true;
        extraLines.push(line);
        continue;
      }

      if (pastQuadrants) {
        extraLines.push(line);
      }
    }

    const bodyNotes = extraLines.join("\n").trim();
    const fmNotes = fm.notes != null ? String(fm.notes) : "";
    const notes = bodyNotes || fmNotes || undefined;

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
      createdAt: fm.created_at
        ? String(fm.created_at)
        : new Date().toISOString(),
      updatedAt: fm.updated_at
        ? String(fm.updated_at)
        : new Date().toISOString(),
      createdBy: fm.created_by != null ? String(fm.created_by) : undefined,
      updatedBy: fm.updated_by != null ? String(fm.updated_by) : undefined,
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
