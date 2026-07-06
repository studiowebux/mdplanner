// Brainstorm repository — markdown file CRUD under brainstorms/.
// Body format: # Title, then ## Question / Answer sections.

import type {
  Brainstorm,
  BrainstormQuestion,
  CreateBrainstorm,
  UpdateBrainstorm,
} from "../types/brainstorm.types.ts";
import { CachedMarkdownRepository } from "./cached.repository.ts";
import {
  BRAINSTORM_TABLE,
  rowToBrainstorm,
} from "../domains/brainstorm/cache.ts";
import { BRAINSTORM_BODY_KEYS } from "../domains/brainstorm/constants.ts";
import { splitH2Sections } from "../utils/markdown-sections.ts";

import {
  resolveEntityId,
  stampAuditFields,
} from "../utils/frontmatter-mapper.ts";
/** Persists Brainstorm entities as markdown with a SQLite cache mirror. */
export class BrainstormRepository extends CachedMarkdownRepository<
  Brainstorm,
  CreateBrainstorm,
  UpdateBrainstorm
> {
  protected readonly tableName = BRAINSTORM_TABLE;
  protected override readonly supportsArchive = true;

  constructor(projectDir: string) {
    super(projectDir, {
      directory: "brainstorms",
      idPrefix: "brainstorm",
      nameField: "title",
    });
  }

  protected rowToEntity(
    row: Record<string, string | number | null>,
  ): Brainstorm {
    return rowToBrainstorm(row);
  }

  protected fromCreateInput(
    data: CreateBrainstorm,
    id: string,
    now: string,
  ): Brainstorm {
    return {
      ...data,
      id,
      questions: data.questions ?? [],
      ...stampAuditFields(now),
    };
  }

  protected parse(
    filename: string,
    fm: Record<string, unknown>,
    body: string,
  ): Brainstorm | null {
    if (!fm.id && !fm.title) return null;
    const id = resolveEntityId(filename, fm);

    const bodyText = body.trim();
    const headingMatch = bodyText.match(/^#\s+(.+)$/m);
    const title = fm.title
      ? String(fm.title)
      : headingMatch
      ? headingMatch[1]
      : "";

    const questions = this.parseQuestions(bodyText);

    return {
      id,
      title,
      tags: Array.isArray(fm.tags)
        ? (fm.tags as unknown[]).map(String)
        : undefined,
      linkedProjects: Array.isArray(fm.linkedProjects)
        ? (fm.linkedProjects as unknown[]).map(String)
        : undefined,
      linkedTasks: Array.isArray(fm.linkedTasks)
        ? (fm.linkedTasks as unknown[]).map(String)
        : undefined,
      linkedGoals: Array.isArray(fm.linkedGoals)
        ? (fm.linkedGoals as unknown[]).map(String)
        : undefined,
      templateId: fm.templateId != null ? String(fm.templateId) : undefined,
      questions,
      createdAt: fm.createdAt ? String(fm.createdAt) : new Date().toISOString(),
      updatedAt: fm.updatedAt ? String(fm.updatedAt) : new Date().toISOString(),
      createdBy: fm.createdBy != null ? String(fm.createdBy) : undefined,
      updatedBy: fm.updatedBy != null ? String(fm.updatedBy) : undefined,
    };
  }

  /** Parse H2 sections into question/answer pairs. */
  private parseQuestions(body: string): BrainstormQuestion[] {
    return splitH2Sections(body).map(({ heading, content }) => ({
      question: heading,
      answer: content || undefined,
    }));
  }

  protected serialize(item: Brainstorm): string {
    return this.serializeStandard(
      item,
      BRAINSTORM_BODY_KEYS,
      this.buildBody(item),
    );
  }

  private buildBody(item: Brainstorm): string {
    const parts: string[] = [`# ${item.title}`];
    for (const q of item.questions) {
      parts.push("", `## ${q.question}`);
      if (q.answer) {
        parts.push("", q.answer);
      }
    }
    return parts.join("\n");
  }
}
