// Retrospective repository — markdown file CRUD under retrospectives/.
// Body format: # Title, then ## sections with keyword-matched headings.

import type {
  CreateRetrospective,
  Retrospective,
  RetrospectiveSectionKey,
  UpdateRetrospective,
} from "../types/retrospective.types.ts";
import { RETROSPECTIVE_SECTIONS } from "../types/retrospective.types.ts";
import { CachedMarkdownRepository } from "./cached.repository.ts";
import {
  RETROSPECTIVE_TABLE,
  rowToRetrospective,
} from "../domains/retrospective/cache.ts";
import { RETROSPECTIVE_BODY_KEYS } from "../domains/retrospective/constants.ts";

export class RetrospectiveRepository extends CachedMarkdownRepository<
  Retrospective,
  CreateRetrospective,
  UpdateRetrospective
> {
  protected readonly tableName = RETROSPECTIVE_TABLE;

  constructor(projectDir: string) {
    super(projectDir, {
      directory: "retrospectives",
      idPrefix: "retro",
      nameField: "title",
    });
  }

  protected rowToEntity(row: Record<string, unknown>): Retrospective {
    return rowToRetrospective(row);
  }

  protected fromCreateInput(
    data: CreateRetrospective,
    id: string,
    now: string,
  ): Retrospective {
    return {
      ...data,
      id,
      status: data.status ?? "open",
      continue: data.continue ?? [],
      stop: data.stop ?? [],
      start: data.start ?? [],
      createdAt: now,
      updatedAt: now,
    };
  }

  protected parse(
    filename: string,
    fm: Record<string, unknown>,
    body: string,
  ): Retrospective | null {
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
      status: (fm.status === "closed" ? "closed" : "open") as
        | "open"
        | "closed",
      continue: sections.continue ?? [],
      stop: sections.stop ?? [],
      start: sections.start ?? [],
      createdAt: fm.createdAt ? String(fm.createdAt) : new Date().toISOString(),
      updatedAt: fm.updatedAt ? String(fm.updatedAt) : new Date().toISOString(),
      createdBy: fm.createdBy != null ? String(fm.createdBy) : undefined,
      updatedBy: fm.updatedBy != null ? String(fm.updatedBy) : undefined,
    };
  }

  /** Parse H2 sections into named fields using keyword matching. */
  private parseSections(
    body: string,
  ): Record<RetrospectiveSectionKey, string[] | undefined> {
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

    return result as Record<RetrospectiveSectionKey, string[] | undefined>;
  }

  /** Match an H2 heading to a section key using keywords. */
  private matchSectionKey(heading: string): RetrospectiveSectionKey | null {
    const normalized = heading.trim().toLowerCase();
    for (const section of RETROSPECTIVE_SECTIONS) {
      if (section.keywords.some((kw) => normalized.includes(kw))) {
        return section.key;
      }
    }
    return null;
  }

  /** Parse section content into string array from bullet list items. */
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

  protected serialize(item: Retrospective): string {
    return this.serializeStandard(
      item,
      RETROSPECTIVE_BODY_KEYS,
      this.buildBody(item),
    );
  }

  private buildBody(item: Retrospective): string {
    const parts: string[] = [`# ${item.title}`];

    for (const section of RETROSPECTIVE_SECTIONS) {
      const values = item[section.key as keyof Retrospective] as string[];
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
