// BrainstormTemplate repository — markdown file CRUD under brainstorm-templates/.
// Body format: ## Questions section with bullet list of questions.

import type {
  BrainstormTemplate,
  CreateBrainstormTemplate,
  UpdateBrainstormTemplate,
} from "../types/brainstorm-template.types.ts";
import { CachedMarkdownRepository } from "./cached.repository.ts";
import {
  BRAINSTORM_TEMPLATE_TABLE,
  rowToBrainstormTemplate,
} from "../domains/brainstorm-template/cache.ts";
import { BRAINSTORM_TEMPLATE_BODY_KEYS } from "../domains/brainstorm-template/constants.ts";

import {
  resolveEntityId,
  stampAuditFields,
} from "../utils/frontmatter-mapper.ts";
/** Persists BrainstormTemplate entities as markdown with a SQLite cache mirror. */
export class BrainstormTemplateRepository extends CachedMarkdownRepository<
  BrainstormTemplate,
  CreateBrainstormTemplate,
  UpdateBrainstormTemplate
> {
  protected readonly tableName = BRAINSTORM_TEMPLATE_TABLE;
  protected override readonly supportsArchive = true;

  constructor(projectDir: string) {
    super(projectDir, {
      directory: "brainstorm-templates",
      idPrefix: "btemplate",
      nameField: "name",
    });
  }

  protected rowToEntity(
    row: Record<string, string | number | null>,
  ): BrainstormTemplate {
    return rowToBrainstormTemplate(row);
  }

  protected fromCreateInput(
    data: CreateBrainstormTemplate,
    id: string,
    now: string,
  ): BrainstormTemplate {
    return {
      ...data,
      id,
      name: data.name ?? "",
      questions: data.questions ?? [],
      ...stampAuditFields(now),
    };
  }

  protected parse(
    filename: string,
    fm: Record<string, unknown>,
    body: string,
  ): BrainstormTemplate | null {
    if (!fm.id && !fm.name) return null;
    const id = resolveEntityId(filename, fm);
    const name = fm.name ? String(fm.name) : "";

    return {
      id,
      name,
      description: fm.description != null ? String(fm.description) : undefined,
      categories: Array.isArray(fm.categories)
        ? (fm.categories as unknown[]).map(String)
        : undefined,
      questions: this.parseQuestions(body.trim()),
      createdAt: fm.createdAt ? String(fm.createdAt) : new Date().toISOString(),
      updatedAt: fm.updatedAt ? String(fm.updatedAt) : new Date().toISOString(),
      createdBy: fm.createdBy != null ? String(fm.createdBy) : undefined,
      updatedBy: fm.updatedBy != null ? String(fm.updatedBy) : undefined,
    };
  }

  /** Parse `## Questions` section — extract bullet list items. */
  private parseQuestions(body: string): string[] {
    const sectionMatch = body.match(
      /^##\s+Questions\s*$([\s\S]*?)(?:^##\s|(?![\s\S]))/m,
    );
    if (!sectionMatch) return [];
    return sectionMatch[1]
      .split("\n")
      .map((line) => line.replace(/^[-*]\s+/, "").trim())
      .filter((line) => line.length > 0);
  }

  protected serialize(item: BrainstormTemplate): string {
    return this.serializeStandard(
      item,
      BRAINSTORM_TEMPLATE_BODY_KEYS,
      this.buildBody(item),
    );
  }

  private buildBody(item: BrainstormTemplate): string {
    const parts: string[] = ["## Questions"];
    for (const q of item.questions) {
      parts.push(`- ${q}`);
    }
    return parts.join("\n");
  }
}
