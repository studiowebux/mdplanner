// ReflectionTemplate repository — markdown file CRUD under reflection-templates/.
// Body format: ## Prompts section with bullet list of prompts.

import type {
  CreateReflectionTemplate,
  ReflectionTemplate,
  UpdateReflectionTemplate,
} from "../types/reflection-template.types.ts";
import { CachedMarkdownRepository } from "./cached.repository.ts";
import {
  REFLECTION_TEMPLATE_TABLE,
  rowToReflectionTemplate,
} from "../domains/reflection-template/cache.ts";
import { REFLECTION_TEMPLATE_BODY_KEYS } from "../domains/reflection-template/constants.ts";

import {
  resolveEntityId,
  stampAuditFields,
} from "../utils/frontmatter-mapper.ts";
/** Persists ReflectionTemplate entities as markdown with a SQLite cache mirror. */
export class ReflectionTemplateRepository extends CachedMarkdownRepository<
  ReflectionTemplate,
  CreateReflectionTemplate,
  UpdateReflectionTemplate
> {
  protected readonly tableName = REFLECTION_TEMPLATE_TABLE;
  protected override readonly supportsArchive = true;

  constructor(projectDir: string) {
    super(projectDir, {
      directory: "reflection-templates",
      idPrefix: "rtemplate",
      nameField: "name",
    });
  }

  protected rowToEntity(
    row: Record<string, string | number | null>,
  ): ReflectionTemplate {
    return rowToReflectionTemplate(row);
  }

  protected fromCreateInput(
    data: CreateReflectionTemplate,
    id: string,
    now: string,
  ): ReflectionTemplate {
    return {
      ...data,
      id,
      name: data.name ?? "",
      prompts: data.prompts ?? [],
      ...stampAuditFields(now),
    };
  }

  protected parse(
    filename: string,
    fm: Record<string, unknown>,
    body: string,
  ): ReflectionTemplate | null {
    if (!fm.id && !fm.name) return null;
    const id = resolveEntityId(filename, fm);
    const name = fm.name ? String(fm.name) : "";

    return {
      id,
      name,
      description: fm.description != null ? String(fm.description) : undefined,
      period: fm.period != null ? String(fm.period) : undefined,
      categories: Array.isArray(fm.categories)
        ? (fm.categories as unknown[]).map(String)
        : undefined,
      prompts: this.parsePrompts(body.trim()),
      createdAt: fm.createdAt ? String(fm.createdAt) : new Date().toISOString(),
      updatedAt: fm.updatedAt ? String(fm.updatedAt) : new Date().toISOString(),
      createdBy: fm.createdBy != null ? String(fm.createdBy) : undefined,
      updatedBy: fm.updatedBy != null ? String(fm.updatedBy) : undefined,
    };
  }

  /** Parse `## Prompts` section — extract bullet list items. */
  private parsePrompts(body: string): string[] {
    const sectionMatch = body.match(
      /^##\s+Prompts\s*$([\s\S]*?)(?:^##\s|(?![\s\S]))/m,
    );
    if (!sectionMatch) return [];
    return sectionMatch[1]
      .split("\n")
      .map((line) => line.replace(/^[-*]\s+/, "").trim())
      .filter((line) => line.length > 0);
  }

  protected serialize(item: ReflectionTemplate): string {
    return this.serializeStandard(
      item,
      REFLECTION_TEMPLATE_BODY_KEYS,
      this.buildBody(item),
    );
  }

  private buildBody(item: ReflectionTemplate): string {
    const parts: string[] = ["## Prompts"];
    for (const p of item.prompts) {
      parts.push(`- ${p}`);
    }
    return parts.join("\n");
  }
}
