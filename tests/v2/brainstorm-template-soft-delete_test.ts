/**
 * Soft-delete acceptance suite — Brainstorm Template.
 * Pattern: `[architecture] MD Planner — Soft-delete (archive) pattern`.
 */

import { registerBrainstormTemplateEntity } from "../../src/domains/brainstorm-template/cache.ts";
import { BrainstormTemplateRepository } from "../../src/repositories/brainstorm-template.repository.ts";
import { runSoftDeleteSuite } from "./helpers/soft-delete-suite.ts";

runSoftDeleteSuite({
  name: "Brainstorm Template",
  table: "brainstorm_templates",
  // Templates live under `brainstorm-templates/` on disk.
  filePath: (dir, id) => `${dir}/brainstorm-templates/${id}.md`,
  makeRepo: (dir) => new BrainstormTemplateRepository(dir),
  registerEntity: (repo) =>
    registerBrainstormTemplateEntity(repo as BrainstormTemplateRepository),
  seedTarget: () => ({
    name: "To Be Archived",
    questions: ["Q1?", "Q2?"],
  }),
  seedControl: () => ({
    name: "Stays Visible",
    questions: ["Q3?", "Q4?"],
  }),
});
