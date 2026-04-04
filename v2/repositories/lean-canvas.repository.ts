// Lean Canvas repository — markdown file CRUD under leancanvas/.
// Body format: # Title, then ## sections with keyword-matched headings.

import type {
  CreateLeanCanvas,
  LeanCanvas,
  LeanCanvasSectionKey,
  UpdateLeanCanvas,
} from "../types/lean-canvas.types.ts";
import { LEAN_CANVAS_SECTIONS } from "../types/lean-canvas.types.ts";
import { CachedMarkdownRepository } from "./cached.repository.ts";
import {
  LEAN_CANVAS_TABLE,
  rowToLeanCanvas,
} from "../domains/lean-canvas/cache.ts";
import { LEAN_CANVAS_BODY_KEYS } from "../domains/lean-canvas/constants.ts";

export class LeanCanvasRepository extends CachedMarkdownRepository<
  LeanCanvas,
  CreateLeanCanvas,
  UpdateLeanCanvas
> {
  protected readonly tableName = LEAN_CANVAS_TABLE;

  constructor(projectDir: string) {
    super(projectDir, {
      directory: "leancanvas",
      idPrefix: "lean_canvas",
      nameField: "title",
    });
  }

  protected rowToEntity(row: Record<string, unknown>): LeanCanvas {
    return rowToLeanCanvas(row);
  }

  protected fromCreateInput(
    data: CreateLeanCanvas,
    id: string,
    now: string,
  ): LeanCanvas {
    return {
      ...data,
      id,
      title: data.title ?? "",
      problem: data.problem ?? [],
      solution: data.solution ?? [],
      uniqueValueProp: data.uniqueValueProp ?? [],
      unfairAdvantage: data.unfairAdvantage ?? [],
      customerSegments: data.customerSegments ?? [],
      existingAlternatives: data.existingAlternatives ?? [],
      keyMetrics: data.keyMetrics ?? [],
      highLevelConcept: data.highLevelConcept ?? [],
      channels: data.channels ?? [],
      earlyAdopters: data.earlyAdopters ?? [],
      costStructure: data.costStructure ?? [],
      revenueStreams: data.revenueStreams ?? [],
      completedSections: 0,
      sectionCount: 0,
      completionPct: 0,
      createdAt: now,
      updatedAt: now,
    };
  }

  protected parse(
    filename: string,
    fm: Record<string, unknown>,
    body: string,
  ): LeanCanvas | null {
    if (!fm.id && !fm.title) return null;
    const id = fm.id ? String(fm.id) : filename.replace(/\.md$/, "");

    const bodyText = body.trim();
    const headingMatch = bodyText.match(/^#\s+(.+)$/m);
    const title = fm.title
      ? String(fm.title)
      : headingMatch
      ? headingMatch[1]
      : "";

    const sections = this.parseSections(bodyText);

    return {
      id,
      title,
      project: fm.project != null ? String(fm.project) : undefined,
      date: fm.date != null ? String(fm.date) : undefined,
      problem: sections.problem ?? [],
      solution: sections.solution ?? [],
      uniqueValueProp: sections.uniqueValueProp ?? [],
      unfairAdvantage: sections.unfairAdvantage ?? [],
      customerSegments: sections.customerSegments ?? [],
      existingAlternatives: sections.existingAlternatives ?? [],
      keyMetrics: sections.keyMetrics ?? [],
      highLevelConcept: sections.highLevelConcept ?? [],
      channels: sections.channels ?? [],
      earlyAdopters: sections.earlyAdopters ?? [],
      costStructure: sections.costStructure ?? [],
      revenueStreams: sections.revenueStreams ?? [],
      completedSections: 0,
      sectionCount: 0,
      completionPct: 0,
      createdAt: fm.createdAt ? String(fm.createdAt) : new Date().toISOString(),
      updatedAt: fm.updatedAt ? String(fm.updatedAt) : new Date().toISOString(),
      createdBy: fm.createdBy != null ? String(fm.createdBy) : undefined,
      updatedBy: fm.updatedBy != null ? String(fm.updatedBy) : undefined,
    };
  }

  /** Parse H2 sections into named fields using keyword matching. */
  private parseSections(
    body: string,
  ): Record<LeanCanvasSectionKey, string[] | undefined> {
    const result: Record<string, string[] | undefined> = {};
    const h2Pattern = /^##\s+(.+)$/gm;
    const matches: { heading: string; start: number }[] = [];

    let match: RegExpExecArray | null;
    while ((match = h2Pattern.exec(body)) !== null) {
      matches.push({
        heading: match[1],
        start: match.index + match[0].length,
      });
    }

    for (let i = 0; i < matches.length; i++) {
      const end = i + 1 < matches.length
        ? body.lastIndexOf("\n##", matches[i + 1].start)
        : body.length;
      const content = body.slice(matches[i].start, end).trim();
      if (!content) continue;

      const key = this.matchSectionKey(matches[i].heading);
      if (!key) continue;

      result[key] = this.parseListItems(content);
    }

    return result as Record<LeanCanvasSectionKey, string[] | undefined>;
  }

  /** Match an H2 heading to a section key using keywords. */
  private matchSectionKey(heading: string): LeanCanvasSectionKey | null {
    const normalized = heading.trim().toLowerCase();
    for (const section of LEAN_CANVAS_SECTIONS) {
      if (section.keywords.some((kw) => normalized.includes(kw))) {
        return section.key;
      }
    }
    return null;
  }

  /** Parse section content into string array from bullet list or plain text. */
  private parseListItems(content: string): string[] {
    const items: string[] = [];
    for (const line of content.split("\n")) {
      const trimmed = line.trim();
      if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
        items.push(trimmed.slice(2).trim());
      } else if (trimmed && !trimmed.startsWith("#")) {
        items.push(trimmed);
      }
    }
    return items;
  }

  protected serialize(item: LeanCanvas): string {
    return this.serializeStandard(
      item,
      LEAN_CANVAS_BODY_KEYS,
      this.buildBody(item),
    );
  }

  private buildBody(item: LeanCanvas): string {
    const parts: string[] = [`# ${item.title}`];

    for (const section of LEAN_CANVAS_SECTIONS) {
      const values = item[section.key as keyof LeanCanvas] as string[];
      if (!values || values.length === 0) continue;
      parts.push("", `## ${section.label}`);
      parts.push("");
      for (const v of values) {
        parts.push(`- ${v}`);
      }
    }

    return parts.join("\n");
  }
}
