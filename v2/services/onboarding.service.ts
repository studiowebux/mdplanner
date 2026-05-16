// Onboarding service — business logic over OnboardingRepository.

import type { OnboardingRepository } from "../repositories/onboarding.repository.ts";
import type {
  CreateOnboarding,
  ListOnboardingOptions,
  Onboarding,
  UpdateOnboarding,
} from "../types/onboarding.types.ts";
import { ciIncludes } from "../utils/string.ts";
import { BaseService } from "./base.service.ts";

export class OnboardingService extends BaseService<
  Onboarding,
  CreateOnboarding,
  UpdateOnboarding,
  ListOnboardingOptions
> {
  constructor(repo: OnboardingRepository) {
    super(repo);
  }

  protected applyFilters(
    items: Onboarding[],
    options: ListOnboardingOptions,
  ): Onboarding[] {
    if (options.role) {
      const role = options.role.toLowerCase();
      items = items.filter((o) => ciIncludes(o.role, role));
    }
    if (options.status) {
      const status = options.status;
      if (status === "complete") {
        // All steps complete (or no steps and status filter is "complete" — exclude)
        items = items.filter(
          (o) =>
            o.steps.length > 0 &&
            o.steps.every((s) => s.status === "complete"),
        );
      } else if (status === "in_progress") {
        items = items.filter(
          (o) =>
            o.steps.some((s) => s.status === "in_progress") ||
            (o.steps.some((s) => s.status === "complete") &&
              o.steps.some((s) => s.status !== "complete")),
        );
      } else if (status === "not_started") {
        items = items.filter(
          (o) =>
            o.steps.length === 0 ||
            o.steps.every((s) => s.status === "not_started"),
        );
      }
    }
    if (options.q) {
      items = items.filter((o) =>
        ciIncludes(o.employeeName, options.q!) ||
        ciIncludes(o.role, options.q!) ||
        (o.notes != null && ciIncludes(o.notes, options.q!))
      );
    }
    return items;
  }
}
