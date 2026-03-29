// SWOT Analysis repository — markdown file CRUD under swot/.
// Body uses ## Strengths/Weaknesses/Opportunities/Threats sections with bullet lists.

import { join } from "@std/path";
import {
  parseFrontmatter,
  serializeFrontmatter,
} from "../utils/frontmatter.ts";
import { generateId } from "../utils/id.ts";
import { atomicWrite, SafeWriter } from "../utils/safe-io.ts";
import { mergeFields, readMarkdownDir } from "../utils/repo-helpers.ts";
import type { CreateSwot, Swot, UpdateSwot } from "../types/swot.types.ts";
import { ciEquals } from "../utils/string.ts";
import {
  SWOT_QUADRANTS,
  SWOT_SECTION_MAP,
  type SwotQuadrantKey,
} from "../domains/swot/constants.tsx";

export class SwotRepository {
  private dir: string;
  private writer = new SafeWriter();

  constructor(projectDir: string) {
    this.dir = join(projectDir, "swot");
  }

  async findAll(): Promise<Swot[]> {
    const items = await readMarkdownDir(
      this.dir,
      (filename, fm, body) => this.parse(filename, fm, body),
    );
    return items.sort((a, b) => a.title.localeCompare(b.title));
  }

  async findById(id: string): Promise<Swot | null> {
    try {
      const content = await Deno.readTextFile(join(this.dir, `${id}.md`));
      const { frontmatter, body } = parseFrontmatter(content);
      return this.parse(`${id}.md`, frontmatter, body);
    } catch (err) {
      if (!(err instanceof Deno.errors.NotFound)) throw err;
    }
    // Fallback: v1 files may use different filename than id.
    const all = await this.findAll();
    return all.find((s) => s.id === id) ?? null;
  }

  async findByName(name: string): Promise<Swot | null> {
    const all = await this.findAll();
    return all.find((s) => ciEquals(s.title, name)) ?? null;
  }

  async create(data: CreateSwot): Promise<Swot> {
    await Deno.mkdir(this.dir, { recursive: true });
    const now = new Date().toISOString();
    const id = generateId("swot");

    const item: Swot = {
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

    const filePath = join(this.dir, `${id}.md`);
    await this.writer.write(
      id,
      () => atomicWrite(filePath, this.serialize(item)),
    );
    return item;
  }

  async update(id: string, data: UpdateSwot): Promise<Swot | null> {
    const existing = await this.findById(id);
    if (!existing) return null;

    const updated = mergeFields(
      { ...existing },
      data as Record<string, unknown>,
    );
    updated.updatedAt = new Date().toISOString();

    await this.writer.write(
      id,
      () => atomicWrite(join(this.dir, `${id}.md`), this.serialize(updated)),
    );
    return updated;
  }

  async delete(id: string): Promise<boolean> {
    try {
      await Deno.remove(join(this.dir, `${id}.md`));
      return true;
    } catch (err) {
      if (err instanceof Deno.errors.NotFound) return false;
      throw err;
    }
  }

  // -------------------------------------------------------------------------
  // Parse — frontmatter + body sections
  // -------------------------------------------------------------------------

  private parse(
    filename: string,
    fm: Record<string, unknown>,
    body: string,
  ): Swot | null {
    if (!fm.id && !fm.title) return null;
    const id = fm.id ? String(fm.id) : filename.replace(/\.md$/, "");

    // Parse title from frontmatter or first # heading in body.
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
      // v1 compat: title may be # heading in body — skip if already set
      if (line.startsWith("# ")) {
        if (!title) title = line.slice(2).trim();
        continue;
      }

      // Detect quadrant section headers
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
          // Non-quadrant ## heading — treat as notes content
          currentSection = null;
          pastQuadrants = true;
          extraLines.push(line);
        }
        continue;
      }

      // Bullet items go into current quadrant
      const listMatch = line.match(/^[-*]\s+(.+)$/);
      if (listMatch && currentSection && !pastQuadrants) {
        quadrants[currentSection].push(listMatch[1].trim());
        continue;
      }

      // Non-quadrant content between title and first ## is description/notes
      if (currentSection === null && !pastQuadrants) {
        if (line.trim()) extraLines.push(line);
        continue;
      }

      // Non-bullet text after a quadrant section → notes
      if (currentSection && !pastQuadrants && line.trim()) {
        pastQuadrants = true;
        extraLines.push(line);
        continue;
      }

      // Content after quadrant sections → notes (including blank lines)
      if (pastQuadrants) {
        extraLines.push(line);
      }
    }

    // Combine frontmatter notes and body extra lines
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

  // -------------------------------------------------------------------------
  // Serialize — frontmatter + body sections (v1-compatible format)
  // -------------------------------------------------------------------------

  private serialize(item: Swot): string {
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
