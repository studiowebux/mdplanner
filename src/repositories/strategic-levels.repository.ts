// Strategic Levels repository — markdown file CRUD under strategiclevels/.
// Body: # Title + ## Vision/Mission/... sections with level items.

import { serializeFrontmatter } from "../utils/frontmatter.ts";
import type {
  CreateStrategicLevelsBuilder,
  StrategicLevel,
  StrategicLevelsBuilder,
  StrategicLevelType,
  UpdateStrategicLevelsBuilder,
} from "../types/strategic-levels.types.ts";
import { LEVEL_ORDER } from "../types/strategic-levels.types.ts";
import { CachedMarkdownRepository } from "./cached.repository.ts";
import {
  rowToStrategicLevelsBuilder,
  STRATEGIC_LEVELS_TABLE,
} from "../domains/strategic-levels/cache.ts";

import {
  resolveEntityId,
  stampAuditFields,
} from "../utils/frontmatter-mapper.ts";
export class StrategicLevelsRepository extends CachedMarkdownRepository<
  StrategicLevelsBuilder,
  CreateStrategicLevelsBuilder,
  UpdateStrategicLevelsBuilder
> {
  protected readonly tableName = STRATEGIC_LEVELS_TABLE;
  protected override readonly supportsArchive = true;

  constructor(projectDir: string) {
    super(projectDir, {
      directory: "strategiclevels",
      idPrefix: "strategic",
      nameField: "title",
    });
  }

  protected rowToEntity(
    row: Record<string, string | number | null>,
  ): StrategicLevelsBuilder {
    return rowToStrategicLevelsBuilder(row);
  }

  protected fromCreateInput(
    data: CreateStrategicLevelsBuilder,
    id: string,
    now: string,
  ): StrategicLevelsBuilder {
    return {
      ...data,
      id,
      date: data.date ?? new Date().toISOString().slice(0, 10),
      levels: data.levels ?? [],
      ...stampAuditFields(now),
    };
  }

  // ---------------------------------------------------------------------------
  // Parse — frontmatter (id, date) + body sections
  // ---------------------------------------------------------------------------

  protected parse(
    filename: string,
    fm: Record<string, unknown>,
    body: string,
  ): StrategicLevelsBuilder | null {
    if (!fm.id && !fm.title) return null;
    const id = resolveEntityId(filename, fm);

    const lines = body.split("\n");
    let title = "Untitled Strategic Levels";
    const levels: StrategicLevel[] = [];
    let currentLevelType: StrategicLevelType | null = null;
    let order = 0;

    for (const line of lines) {
      if (line.startsWith("# ")) {
        title = line.slice(2).trim();
        continue;
      }

      if (line.startsWith("## ")) {
        const headerText = line.slice(3).trim().toLowerCase();
        currentLevelType = null;
        for (const levelType of LEVEL_ORDER) {
          if (headerText.includes(levelType)) {
            currentLevelType = levelType;
            break;
          }
        }
        continue;
      }

      if (currentLevelType) {
        // Format: - (level_id) Title
        const levelMatch = line.match(/^[-*]\s+\((\w+)\)\s+(.+?)(?:\s*\|.*)?$/);
        if (levelMatch) {
          levels.push({
            id: levelMatch[1],
            title: levelMatch[2].trim(),
            level: currentLevelType,
            order: order++,
          });
        }
      }
    }

    const now = new Date().toISOString();
    return {
      id,
      title,
      date: fm.date ? String(fm.date) : now.slice(0, 10),
      levels,
      createdAt: fm.createdAt ? String(fm.createdAt) : now,
      updatedAt: fm.updatedAt ? String(fm.updatedAt) : now,
      createdBy: fm.createdBy != null ? String(fm.createdBy) : undefined,
      updatedBy: fm.updatedBy != null ? String(fm.updatedBy) : undefined,
    };
  }

  // ---------------------------------------------------------------------------
  // Serialize — frontmatter + body sections
  // ---------------------------------------------------------------------------

  protected serialize(item: StrategicLevelsBuilder): string {
    const fm: Record<string, unknown> = {
      id: item.id,
      date: item.date,
      created_at: item.createdAt,
      updated_at: item.updatedAt,
    };
    if (item.createdBy) fm.created_by = item.createdBy;
    if (item.updatedBy) fm.updated_by = item.updatedBy;
    if (item.archived) fm.archived = item.archived;
    if (item.archivedAt) fm.archived_at = item.archivedAt;
    if (item.archivedBy) fm.archived_by = item.archivedBy;

    // Group levels by type, preserving order within each group
    const byType = new Map<StrategicLevelType, StrategicLevel[]>();
    for (const levelType of LEVEL_ORDER) {
      byType.set(levelType, []);
    }
    for (const level of item.levels) {
      byType.get(level.level)?.push(level);
    }

    const sections: string[] = [`# ${item.title}`];

    for (const levelType of LEVEL_ORDER) {
      const levels = byType.get(levelType) ?? [];
      if (levels.length === 0) continue;

      sections.push("");
      sections.push(
        `## ${levelType.charAt(0).toUpperCase() + levelType.slice(1)}`,
      );
      sections.push("");

      for (const level of levels.sort((a, b) => a.order - b.order)) {
        sections.push(`- (${level.id}) ${level.title}`);
      }
    }

    return serializeFrontmatter(fm, sections.join("\n").trimEnd());
  }
}
