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
import { rowToSwot, SWOT_TABLE } from "../domains/swot/cache.ts";

export class SwotRepository extends CachedMarkdownRepository<
  Swot,
  CreateSwot,
  UpdateSwot
> {
  protected readonly tableName = SWOT_TABLE;

  constructor(projectDir: string) {
    super(projectDir, {
      directory: "swot",
      idPrefix: "swot",
      nameField: "title",
    });
  }

  protected rowToEntity(row: Record<string, unknown>): Swot {
    return rowToSwot(row);
  }

  // Filename may not match frontmatter id — try direct lookup, then full scan.
  override async findById(id: string): Promise<Swot | null> {
    const direct = await super.findById(id);
    if (direct) return direct;
    const all = await this.findAll();
    return all.find((item) => item.id === id) ?? null;
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
  ): Swot | null {
    if (!fm.id && !fm.title) return null;
    const id = fm.id ? String(fm.id) : filename.replace(/\.md$/, "");

    const lines = body.split("\n");
    let title = fm.title ? String(fm.title) : "";
    const quadrants: Record<string, string[]> = {
      strengths: [],
      weaknesses: [],
      opportunities: [],
      threats: [],
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
        for (const [prefix, key] of Object.entries(SWOT_SECTION_MAP)) {
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
      title: title || "Untitled SWOT",
      date: fm.date ? String(fm.date) : new Date().toISOString().split("T")[0],
      strengths: quadrants.strengths,
      weaknesses: quadrants.weaknesses,
      opportunities: quadrants.opportunities,
      threats: quadrants.threats,
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
