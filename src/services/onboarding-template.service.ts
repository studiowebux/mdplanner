// OnboardingTemplate service — business logic over OnboardingTemplateRepository.

import type { OnboardingTemplateRepository } from "../repositories/onboarding-template.repository.ts";
import type {
  CreateOnboardingTemplate,
  ListOnboardingTemplateOptions,
  OnboardingTemplate,
  UpdateOnboardingTemplate,
} from "../types/onboarding-template.types.ts";
import { ciIncludes } from "../utils/string.ts";
import { BaseService } from "./base.service.ts";

/** Onboarding-template CRUD service; filters by role, tag, and text query (q). */
export class OnboardingTemplateService extends BaseService<
  OnboardingTemplate,
  CreateOnboardingTemplate,
  UpdateOnboardingTemplate,
  ListOnboardingTemplateOptions
> {
  constructor(repo: OnboardingTemplateRepository) {
    super(repo);
  }

  protected applyFilters(
    items: OnboardingTemplate[],
    options: ListOnboardingTemplateOptions,
  ): OnboardingTemplate[] {
    if (options.role) {
      const role = options.role.toLowerCase();
      items = items.filter((t) => t.role != null && ciIncludes(t.role, role));
    }
    if (options.tag) {
      const tag = options.tag.toLowerCase();
      items = items.filter((t) =>
        t.tags?.some((t2) => t2.toLowerCase() === tag)
      );
    }
    if (options.q) {
      items = items.filter((t) =>
        ciIncludes(t.name, options.q!) ||
        (t.role != null && ciIncludes(t.role, options.q!)) ||
        (t.description != null && ciIncludes(t.description, options.q!)) ||
        t.steps.some((s) => ciIncludes(s.title, options.q!))
      );
    }
    return items;
  }
}
