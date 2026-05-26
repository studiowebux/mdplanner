/**
 * Soft-delete acceptance suite — Onboarding.
 * Pattern: `[architecture] MD Planner — Soft-delete (archive) pattern`.
 */

import { registerOnboardingEntity } from "../../v2/domains/onboarding/cache.ts";
import { OnboardingRepository } from "../../v2/repositories/onboarding.repository.ts";
import { runSoftDeleteSuite } from "./helpers/soft-delete-suite.ts";

runSoftDeleteSuite({
  name: "Onboarding",
  table: "onboarding",
  makeRepo: (dir) => new OnboardingRepository(dir),
  registerEntity: (repo) =>
    registerOnboardingEntity(repo as OnboardingRepository),
  seedTarget: () => ({ employeeName: "Archived Hire", role: "Engineer" }),
  seedControl: () => ({ employeeName: "Active Hire", role: "Designer" }),
});
