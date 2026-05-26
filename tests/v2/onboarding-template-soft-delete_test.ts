/**
 * Soft-delete acceptance suite — Onboarding Template.
 * Pattern: `[architecture] MD Planner — Soft-delete (archive) pattern`.
 */

import { registerOnboardingTemplateEntity } from "../../v2/domains/onboarding-template/cache.ts";
import { OnboardingTemplateRepository } from "../../v2/repositories/onboarding-template.repository.ts";
import { runSoftDeleteSuite } from "./helpers/soft-delete-suite.ts";

runSoftDeleteSuite({
  name: "Onboarding Template",
  table: "onboarding_templates",
  // Repo directory is "onboarding-templates" (hyphen); table is
  // "onboarding_templates" (underscore) — override required.
  filePath: (dir, id) => `${dir}/onboarding-templates/${id}.md`,
  makeRepo: (dir) => new OnboardingTemplateRepository(dir),
  registerEntity: (repo) =>
    registerOnboardingTemplateEntity(repo as OnboardingTemplateRepository),
  seedTarget: () => ({ name: "Archived Template" }),
  seedControl: () => ({ name: "Active Template" }),
});
