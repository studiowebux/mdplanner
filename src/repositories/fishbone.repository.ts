// Fishbone repository — markdown file CRUD under fishbone/.
// Body uses ## SectionName headings with bullet lists as cause items.

import { serializeFrontmatter } from "../utils/frontmatter.ts";
import type {
  CreateFishbone,
  Fishbone,
  FishboneCause,
  UpdateFishbone,
} from "../types/fishbone.types.ts";
import { CachedMarkdownRepository } from "./cached.repository.ts";
import { FISHBONE_TABLE, rowToFishbone } from "../domains/fishbone/cache.ts";

import {
  resolveEntityId,
  stampAuditFields,
} from "../utils/frontmatter-mapper.ts";
export class FishboneRepository extends CachedMarkdownRepository<
  Fishbone,
  CreateFishbone,
  UpdateFishbone
> {
  protected readonly tableName = FISHBONE_TABLE;
  protected override readonly supportsArchive = true;

  constructor(projectDir: string) {
    super(projectDir, {
      directory: "fishbone",
      idPrefix: "fishbone",
      nameField: "title",
    });
  }

  protected rowToEntity(
    row: Record<string, string | number | null>,
  ): Fishbone {
    return rowToFishbone(row);
  }

  protected fromCreateInput(
    data: CreateFishbone,
    id: string,
    now: string,
  ): Fishbone {
    return {
      ...data,
      id,
      causes: data.causes ?? [],
      ...stampAuditFields(now),
    };
  }

  // ---------------------------------------------------------------------------
  // Parse — frontmatter + body sections
  // ---------------------------------------------------------------------------

  protected parse(
    filename: string,
    fm: Record<string, unknown>,
    body: string,
  ): Fishbone | null {
    if (!fm.id && !fm.title) return null;
    const id = resolveEntityId(filename, fm);

    const lines = body.split("\n");
    let title = fm.title ? String(fm.title) : "";
    const causes: FishboneCause[] = [];
    let currentSection: FishboneCause | null = null;

    for (const line of lines) {
      if (line.startsWith("# ")) {
        if (!title) title = line.slice(2).trim();
        continue;
      }

      const h2Match = line.match(/^##\s+(.+)$/);
      if (h2Match) {
        currentSection = { section: h2Match[1].trim(), items: [] };
        causes.push(currentSection);
        continue;
      }

      const listMatch = line.match(/^[-*]\s+(.+)$/);
      if (listMatch && currentSection) {
        currentSection.items.push(listMatch[1].trim());
      }
    }

    return {
      id,
      title: title || "Untitled Fishbone",
      description: fm.description != null ? String(fm.description) : undefined,
      project: fm.project != null ? String(fm.project) : undefined,
      causes,
      createdAt: fm.createdAt ? String(fm.createdAt) : new Date().toISOString(),
      updatedAt: fm.updatedAt ? String(fm.updatedAt) : new Date().toISOString(),
      createdBy: fm.createdBy != null ? String(fm.createdBy) : undefined,
      updatedBy: fm.updatedBy != null ? String(fm.updatedBy) : undefined,
    };
  }

  // ---------------------------------------------------------------------------
  // Serialize — frontmatter + body sections
  // ---------------------------------------------------------------------------

  protected serialize(item: Fishbone): string {
    const fm: Record<string, unknown> = {};
    fm.id = item.id;
    fm.title = item.title;
    if (item.description) fm.description = item.description;
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

    for (const cause of item.causes) {
      sections.push(`## ${cause.section}`);
      sections.push("");
      for (const entry of cause.items) {
        sections.push(`- ${entry}`);
      }
      sections.push("");
    }

    return serializeFrontmatter(fm, sections.join("\n").trimEnd());
  }
}
