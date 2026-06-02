// OnboardingTemplate repository — markdown file CRUD under onboarding-templates/.
// Steps stored in frontmatter as a YAML array of { title, category } objects.

import type {
  CreateOnboardingTemplate,
  OnboardingTemplate,
  OnboardingTemplateStep,
  UpdateOnboardingTemplate,
} from "../types/onboarding-template.types.ts";
import { ONBOARDING_STEP_CATEGORIES } from "../types/onboarding.types.ts";
import { CachedMarkdownRepository } from "./cached.repository.ts";
import {
  ONBOARDING_TEMPLATE_TABLE,
  rowToOnboardingTemplate,
} from "../domains/onboarding-template/cache.ts";

// No body fields — the markdown body is empty, every field lives in
// frontmatter. id and name MUST stay in frontmatter: serializeStandard
// excludes body keys from frontmatter, and name is not recoverable from the
// filename, so listing them here drops both on the first update() (404).
const ONBOARDING_TEMPLATE_BODY_KEYS = [] as const;

const VALID_CATEGORIES = new Set<string>(ONBOARDING_STEP_CATEGORIES);

export class OnboardingTemplateRepository extends CachedMarkdownRepository<
  OnboardingTemplate,
  CreateOnboardingTemplate,
  UpdateOnboardingTemplate
> {
  protected readonly tableName = ONBOARDING_TEMPLATE_TABLE;
  protected override readonly supportsArchive = true;

  constructor(projectDir: string) {
    super(projectDir, {
      directory: "onboarding-templates",
      idPrefix: "onboarding_template",
      nameField: "name",
    });
  }

  protected rowToEntity(
    row: Record<string, string | number | null>,
  ): OnboardingTemplate {
    return rowToOnboardingTemplate(row);
  }

  protected fromCreateInput(
    data: CreateOnboardingTemplate,
    id: string,
    now: string,
  ): OnboardingTemplate {
    return {
      ...data,
      id,
      name: data.name ?? "",
      steps: data.steps ?? [],
      createdAt: now,
      updatedAt: now,
    };
  }

  protected parse(
    filename: string,
    fm: Record<string, unknown>,
    _body: string,
  ): OnboardingTemplate | null {
    if (!fm.id && !fm.name) return null;
    const id = fm.id ? String(fm.id) : filename.replace(/\.md$/, "");

    return {
      id,
      name: fm.name ? String(fm.name) : "",
      description: fm.description != null ? String(fm.description) : undefined,
      role: fm.role != null ? String(fm.role) : undefined,
      tags: Array.isArray(fm.tags)
        ? (fm.tags as unknown[]).map(String)
        : undefined,
      steps: this.parseSteps(fm.steps),
      createdAt: fm.createdAt ? String(fm.createdAt) : new Date().toISOString(),
      updatedAt: fm.updatedAt ? String(fm.updatedAt) : new Date().toISOString(),
      createdBy: fm.createdBy != null ? String(fm.createdBy) : undefined,
      updatedBy: fm.updatedBy != null ? String(fm.updatedBy) : undefined,
    };
  }

  private parseSteps(raw: unknown): OnboardingTemplateStep[] {
    if (!Array.isArray(raw)) return [];
    return raw.flatMap((item) => {
      if (typeof item !== "object" || item === null) return [];
      const s = item as Record<string, unknown>;
      if (!s.title) return [];
      const category = String(s.category ?? "").toLowerCase();
      return [{
        title: String(s.title),
        category: (VALID_CATEGORIES.has(category)
          ? category
          : "other") as OnboardingTemplateStep["category"],
      }];
    });
  }

  protected serialize(item: OnboardingTemplate): string {
    return this.serializeStandard(item, ONBOARDING_TEMPLATE_BODY_KEYS, "");
  }
}
