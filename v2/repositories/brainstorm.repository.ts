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

const BODY_KEYS = ["id", "title", "questions"] as const;

export class BrainstormRepository extends CachedMarkdownRepository<
  Brainstorm,
  CreateBrainstorm,
  UpdateBrainstorm
> {
  protected readonly tableName = BRAINSTORM_TABLE;

  constructor(projectDir: string) {
    super(projectDir, {
      directory: "brainstorms",
      idPrefix: "brainstorm",
      nameField: "title",
    });
  }

  protected rowToEntity(row: Record<string, unknown>): Brainstorm {
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
      createdAt: now,
      updatedAt: now,
    };
  }

  protected parse(
    filename: string,
    fm: Record<string, unknown>,
    body: string,
  ): Brainstorm | null {
    if (!fm.id && !fm.title) return null;
    const id = fm.id ? String(fm.id) : filename.replace(/\.md$/, "");

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
      questions,
      createdAt: fm.createdAt ? String(fm.createdAt) : new Date().toISOString(),
      updatedAt: fm.updatedAt ? String(fm.updatedAt) : new Date().toISOString(),
      createdBy: fm.createdBy != null ? String(fm.createdBy) : undefined,
      updatedBy: fm.updatedBy != null ? String(fm.updatedBy) : undefined,
    };
  }

  /** Parse H2 sections into question/answer pairs. */
  private parseQuestions(body: string): BrainstormQuestion[] {
    const questions: BrainstormQuestion[] = [];
    const h2Pattern = /^##\s+(.+)$/gm;
    const matches: { question: string; start: number }[] = [];

    let match: RegExpExecArray | null;
    while ((match = h2Pattern.exec(body)) !== null) {
      matches.push({
        question: match[1],
        start: match.index + match[0].length,
      });
    }

    for (let i = 0; i < matches.length; i++) {
      const end = i + 1 < matches.length
        ? body.lastIndexOf("\n##", matches[i + 1].start)
        : body.length;
      const answer = body.slice(matches[i].start, end).trim() || undefined;
      questions.push({ question: matches[i].question, answer });
    }

    return questions;
  }

  protected serialize(item: Brainstorm): string {
    return this.serializeStandard(item, BODY_KEYS, this.buildBody(item));
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
