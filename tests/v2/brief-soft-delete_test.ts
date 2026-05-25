/**
 * Soft-delete acceptance suite — Brief.
 * Pattern: `[architecture] MD Planner — Soft-delete (archive) pattern`.
 */

import { registerBriefEntity } from "../../v2/domains/brief/cache.ts";
import { BriefRepository } from "../../v2/repositories/brief.repository.ts";
import { runSoftDeleteSuite } from "./helpers/soft-delete-suite.ts";

runSoftDeleteSuite({
  name: "Brief",
  table: "briefs",
  makeRepo: (dir) => new BriefRepository(dir),
  registerEntity: (repo) => registerBriefEntity(repo as BriefRepository),
  seedTarget: () => ({
    title: "To Be Archived",
    summary: ["Will be soft-deleted."],
  }),
  seedControl: () => ({
    title: "Stays Visible",
    summary: ["Control row."],
  }),
});
