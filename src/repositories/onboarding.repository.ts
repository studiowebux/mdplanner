// Onboarding repository — markdown file CRUD under onboarding/.
// Steps stored in frontmatter as YAML array of objects; notes in body.

import type {
  CreateOnboarding,
  Onboarding,
  OnboardingStep,
  UpdateOnboarding,
} from "../types/onboarding.types.ts";
import { CachedMarkdownRepository } from "./cached.repository.ts";
import {
  ONBOARDING_TABLE,
  rowToOnboarding,
} from "../domains/onboarding/cache.ts";
import { ONBOARDING_BODY_KEYS } from "../domains/onboarding/constants.ts";

import {
  resolveEntityId,
  stampAuditFields,
} from "../utils/frontmatter-mapper.ts";
export class OnboardingRepository extends CachedMarkdownRepository<
  Onboarding,
  CreateOnboarding,
  UpdateOnboarding
> {
  protected readonly tableName = ONBOARDING_TABLE;
  protected override readonly supportsArchive = true;

  constructor(projectDir: string) {
    super(projectDir, {
      directory: "onboarding",
      idPrefix: "onboarding",
      nameField: "employeeName",
    });
  }

  protected rowToEntity(
    row: Record<string, string | number | null>,
  ): Onboarding {
    return rowToOnboarding(row);
  }

  protected fromCreateInput(
    data: CreateOnboarding,
    id: string,
    now: string,
  ): Onboarding {
    return {
      ...data,
      id,
      employeeName: data.employeeName ?? "",
      role: data.role ?? "",
      steps: data.steps ?? [],
      ...stampAuditFields(now),
    };
  }

  protected parse(
    filename: string,
    fm: Record<string, unknown>,
    body: string,
  ): Onboarding | null {
    if (!fm.id && !fm.employeeName) return null;
    const id = resolveEntityId(filename, fm);

    return {
      id,
      employeeName: fm.employeeName ? String(fm.employeeName) : "",
      role: fm.role ? String(fm.role) : "",
      startDate: fm.start_date != null
        ? String(fm.start_date)
        : (fm.startDate != null ? String(fm.startDate) : undefined),
      personId: fm.personId != null
        ? String(fm.personId)
        : (fm.person_id != null ? String(fm.person_id) : undefined),
      notes: body.trim() || undefined,
      steps: this.parseSteps(fm.steps),
      createdAt: fm.createdAt
        ? String(fm.createdAt)
        : (fm.created_at ? String(fm.created_at) : new Date().toISOString()),
      updatedAt: fm.updatedAt
        ? String(fm.updatedAt)
        : (fm.updated_at ? String(fm.updated_at) : new Date().toISOString()),
      createdBy: fm.createdBy != null ? String(fm.createdBy) : undefined,
      updatedBy: fm.updatedBy != null ? String(fm.updatedBy) : undefined,
    };
  }

  private parseSteps(raw: unknown): OnboardingStep[] {
    if (!Array.isArray(raw)) return [];
    return raw.flatMap((item) => {
      if (typeof item !== "object" || item === null) return [];
      const s = item as Record<string, unknown>;
      if (!s.title) return [];
      return [{
        id: s.id ? String(s.id) : crypto.randomUUID().slice(0, 8),
        title: String(s.title),
        category:
          (["equipment", "accounts", "docs", "training", "intro", "other"]
              .includes(
                String(s.category),
              )
            ? String(s.category)
            : "other") as OnboardingStep["category"],
        status: (["not_started", "in_progress", "complete"].includes(
            String(s.status),
          )
          ? String(s.status)
          : "not_started") as OnboardingStep["status"],
        owner: s.owner != null && String(s.owner).length > 0
          ? String(s.owner)
          : undefined,
      }];
    });
  }

  protected serialize(item: Onboarding): string {
    return this.serializeStandard(
      item,
      ONBOARDING_BODY_KEYS,
      item.notes?.trim() ?? "",
    );
  }
}
