// SWOT Analysis repository — markdown file CRUD under swot/.
// Body uses ## Strengths/Weaknesses/Opportunities/Threats sections with bullet lists.

import { serializeFrontmatter } from "../utils/frontmatter.ts";
import type { CreateSwot, Swot, UpdateSwot } from "../types/swot.types.ts";
import {
  SWOT_QUADRANTS,
  SWOT_SECTION_MAP,
  type SwotQuadrantKey,
} from "../domains/swot/constants.tsx";
import { CachedMarkdownRepository } from "./cached.repository.ts";
import { parseQuadrantMarkdown } from "../utils/quadrant-parse.ts";
import { rowToSwot, SWOT_TABLE } from "../domains/swot/cache.ts";

import {
  resolveEntityId,
  stampAuditFields,
} from "../utils/frontmatter-mapper.ts";
/** Persists SWOT entities as markdown with a SQLite cache mirror. */
export class SwotRepository extends CachedMarkdownRepository<
  Swot,
  CreateSwot,
  UpdateSwot
> {
  protected readonly tableName = SWOT_TABLE;
  protected override readonly supportsArchive = true;

  constructor(projectDir: string) {
    super(projectDir, {
      directory: "swot",
      idPrefix: "swot",
      nameField: "title",
    });
  }

  protected rowToEntity(row: Record<string, string | number | null>): Swot {
    return rowToSwot(row);
  }

  protected fromCreateInput(data: CreateSwot, id: string, now: string): Swot {
    return {
      ...data,
      id,
      date: data.date ?? new Date().toISOString().split("T")[0],
      strengths: data.strengths ?? [],
      weaknesses: data.weaknesses ?? [],
      opportunities: data.opportunities ?? [],
      threats: data.threats ?? [],
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
  ): Swot | null {
    if (!fm.id && !fm.title) return null;
    const id = resolveEntityId(filename, fm);

    const { title, quadrants, notes } = parseQuadrantMarkdown(
      body,
      SWOT_SECTION_MAP,
      fm.title,
      fm.notes,
    );

    return {
      id,
      title: title || "Untitled SWOT",
      date: fm.date ? String(fm.date) : new Date().toISOString().split("T")[0],
      strengths: quadrants.strengths,
      weaknesses: quadrants.weaknesses,
      opportunities: quadrants.opportunities,
      threats: quadrants.threats,
      project: fm.project != null ? String(fm.project) : undefined,
      notes,
      createdAt: fm.createdAt ? String(fm.createdAt) : new Date().toISOString(),
      updatedAt: fm.updatedAt ? String(fm.updatedAt) : new Date().toISOString(),
      createdBy: fm.createdBy != null ? String(fm.createdBy) : undefined,
      updatedBy: fm.updatedBy != null ? String(fm.updatedBy) : undefined,
    };
  }

  // ---------------------------------------------------------------------------
  // Serialize — frontmatter + body sections (v1-compatible format)
  // ---------------------------------------------------------------------------

  protected serialize(item: Swot): string {
    const fm: Record<string, unknown> = {};
    fm.title = item.title;
    fm.date = item.date;
    if (item.project) fm.project = item.project;
    fm.created_at = item.createdAt;
    fm.updated_at = item.updatedAt;
    if (item.createdBy) fm.created_by = item.createdBy;
    if (item.updatedBy) fm.updated_by = item.updatedBy;
    if (item.archived) fm.archived = item.archived;
    if (item.archivedAt) fm.archived_at = item.archivedAt;
    if (item.archivedBy) fm.archived_by = item.archivedBy;

    const sections: string[] = [];

    for (const name of SWOT_QUADRANTS) {
      const key = name.toLowerCase() as SwotQuadrantKey;
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
