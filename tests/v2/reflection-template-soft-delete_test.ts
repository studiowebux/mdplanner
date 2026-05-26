/**
 * Soft-delete acceptance suite — Reflection Template.
 * Pattern: `[architecture] MD Planner — Soft-delete (archive) pattern`.
 */

import { registerReflectionTemplateEntity } from "../../v2/domains/reflection-template/cache.ts";
import { ReflectionTemplateRepository } from "../../v2/repositories/reflection-template.repository.ts";
import { runSoftDeleteSuite } from "./helpers/soft-delete-suite.ts";

runSoftDeleteSuite({
  name: "ReflectionTemplate",
  table: "reflection_templates",
  filePath: (dir, id) => `${dir}/reflection-templates/${id}.md`,
  makeRepo: (dir) => new ReflectionTemplateRepository(dir),
  registerEntity: (repo) =>
    registerReflectionTemplateEntity(repo as ReflectionTemplateRepository),
  seedTarget: () => ({ name: "To Be Archived", prompts: ["What worked?"] }),
  seedControl: () => ({ name: "Stays Visible", prompts: ["What didn't?"] }),
});
