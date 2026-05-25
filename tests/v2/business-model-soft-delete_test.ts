/**
 * Soft-delete acceptance suite — Business Model Canvas.
 * Pattern: `[architecture] MD Planner — Soft-delete (archive) pattern`.
 */

import { registerBusinessModelEntity } from "../../v2/domains/business-model/cache.ts";
import { BusinessModelRepository } from "../../v2/repositories/business-model.repository.ts";
import { runSoftDeleteSuite } from "./helpers/soft-delete-suite.ts";

runSoftDeleteSuite({
  name: "Business Model",
  table: "business_model",
  // Canvases live under `businessmodel/` on disk (legacy directory name).
  filePath: (dir, id) => `${dir}/businessmodel/${id}.md`,
  makeRepo: (dir) => new BusinessModelRepository(dir),
  registerEntity: (repo) =>
    registerBusinessModelEntity(repo as BusinessModelRepository),
  seedTarget: () => ({
    title: "To Be Archived",
    date: "2026-05-24",
    keyPartners: ["Partner A"],
    valueProposition: ["Will be soft-deleted."],
  }),
  seedControl: () => ({
    title: "Stays Visible",
    date: "2026-05-24",
    keyPartners: ["Partner B"],
    valueProposition: ["Control row."],
  }),
});
