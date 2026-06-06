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

/** Onboarding service: CRUD plus per-step toggling/renaming (toggleStep/updateStepTitle); filters by role, status, and text query (q). */
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

  /**
   * Toggle a single step's completion: `complete` <-> `not_started`.
   * Steps are matched by stable step ID. Returns null if the record or
   * the step is not found.
   */
  async toggleStep(
    id: string,
    stepId: string,
  ): Promise<Onboarding | null> {
    const item = await this.repo.findById(id);
    if (!item) return null;
    if (!item.steps.some((s) => s.id === stepId)) return null;
    const steps = item.steps.map((s) =>
      s.id === stepId
        ? {
          ...s,
          status: s.status === "complete"
            ? "not_started" as const
            : "complete" as const,
        }
        : s
    );
    return this.repo.update(id, { steps });
  }

  /**
   * Update a single step's title, matched by stable step ID. Returns null
   * if the record or the step is not found.
   */
  async updateStepTitle(
    id: string,
    stepId: string,
    title: string,
  ): Promise<Onboarding | null> {
    const item = await this.repo.findById(id);
    if (!item) return null;
    if (!item.steps.some((s) => s.id === stepId)) return null;
    const steps = item.steps.map((s) => s.id === stepId ? { ...s, title } : s);
    return this.repo.update(id, { steps });
  }
}
