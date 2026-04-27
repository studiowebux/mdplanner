// Brief repository — markdown file CRUD under briefs/.
// Body format: # Title, then ## sections with keyword-matched headings.

import type {
  Brief,
  BriefSectionKey,
  CreateBrief,
  UpdateBrief,
} from "../types/brief.types.ts";
import { BRIEF_SECTIONS } from "../types/brief.types.ts";
import { CachedMarkdownRepository } from "./cached.repository.ts";
import { BRIEF_TABLE, rowToBrief } from "../domains/brief/cache.ts";
import { BRIEF_BODY_KEYS } from "../domains/brief/constants.ts";

export class BriefRepository extends CachedMarkdownRepository<
  Brief,
  CreateBrief,
  UpdateBrief
> {
  protected readonly tableName = BRIEF_TABLE;

  constructor(projectDir: string) {
    super(projectDir, {
      directory: "briefs",
      idPrefix: "brief",
      nameField: "title",
    });
  }

  protected rowToEntity(row: Record<string, unknown>): Brief {
    return rowToBrief(row);
  }

  protected fromCreateInput(
    data: CreateBrief,
    id: string,
    now: string,
  ): Brief {
    return {
      ...data,
      id,
      createdAt: now,
      updatedAt: now,
    };
  }

  protected parse(
    filename: string,
    fm: Record<string, unknown>,
    body: string,
  ): Brief | null {
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
      date: fm.date != null ? String(fm.date) : undefined,
      summary: sections.summary,
      mission: sections.mission,
      responsible: sections.responsible,
      accountable: sections.accountable,
      consulted: sections.consulted,
      informed: sections.informed,
      highLevelBudget: sections.highLevelBudget,
      highLevelTimeline: sections.highLevelTimeline,
      culture: sections.culture,
      changeCapacity: sections.changeCapacity,
      guidingPrinciples: sections.guidingPrinciples,
      createdAt: fm.createdAt ? String(fm.createdAt) : new Date().toISOString(),
      updatedAt: fm.updatedAt ? String(fm.updatedAt) : new Date().toISOString(),
      createdBy: fm.createdBy != null ? String(fm.createdBy) : undefined,
      updatedBy: fm.updatedBy != null ? String(fm.updatedBy) : undefined,
    };
  }

  /** Parse H2 sections into named fields using keyword matching. */
  private parseSections(
    body: string,
  ): Record<BriefSectionKey, string[] | undefined> {
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

      result[key] = this.parseContent(content);
    }

    return result as Record<BriefSectionKey, string[] | undefined>;
  }

  /** Match an H2 heading to a section key using keywords. */
  private matchSectionKey(heading: string): BriefSectionKey | null {
    // Strip RACI labels like "(R)", "(A)", "(C)", "(I)"
    const normalized = heading.replace(/\s*\([RACI]\)\s*$/i, "").trim()
      .toLowerCase();
    for (const section of BRIEF_SECTIONS) {
      if (section.keywords.some((kw) => normalized.includes(kw))) {
        return section.key;
      }
    }
    return null;
  }

  /** Parse section content into string array: bullets as items, prose as single strings. */
  private parseContent(content: string): string[] {
    const lines = content.split("\n");
    const items: string[] = [];
    let prose = "";

    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.startsWith("- ")) {
        if (prose) {
          items.push(prose.trim());
          prose = "";
        }
        items.push(trimmed.slice(2).trim());
      } else if (trimmed) {
        prose += (prose ? " " : "") + trimmed;
      } else if (prose) {
        items.push(prose.trim());
        prose = "";
      }
    }
    if (prose) items.push(prose.trim());

    return items.length > 0 ? items : [];
  }

  protected serialize(item: Brief): string {
    return this.serializeStandard(item, BRIEF_BODY_KEYS, this.buildBody(item));
  }

  private buildBody(item: Brief): string {
    const parts: string[] = [`# ${item.title}`];

    for (const section of BRIEF_SECTIONS) {
      const values = item[section.key as keyof Brief] as
        | string[]
        | undefined;
      if (!values || values.length === 0) continue;
      parts.push("", `## ${section.label}`);
      if (values.length === 1 && !values[0].includes("\n")) {
        // Single item — render as prose paragraph
        parts.push("", values[0]);
      } else {
        // Multiple items — render as bullet list
        parts.push("");
        for (const v of values) {
          parts.push(`- ${v}`);
        }
      }
    }

    return parts.join("\n");
  }
}
