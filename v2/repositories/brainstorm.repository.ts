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
      linkedProjects: Array.isArray(fm.linked_projects)
        ? (fm.linked_projects as unknown[]).map(String)
        : undefined,
      linkedTasks: Array.isArray(fm.linked_tasks)
        ? (fm.linked_tasks as unknown[]).map(String)
        : undefined,
      linkedGoals: Array.isArray(fm.linked_goals)
        ? (fm.linked_goals as unknown[]).map(String)
        : undefined,
      questions,
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
