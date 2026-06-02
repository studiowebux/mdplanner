/**
 * Soft-delete acceptance suite — Milestone.
 * Pattern: `[architecture] MD Planner — Soft-delete (archive) pattern`.
 */

import { registerMilestoneEntity } from "../../src/domains/milestone/cache.ts";
import { MilestoneRepository } from "../../src/repositories/milestone.repository.ts";
import { runSoftDeleteSuite } from "./helpers/soft-delete-suite.ts";

runSoftDeleteSuite({
  name: "Milestone",
  table: "milestones",
  makeRepo: (dir) => new MilestoneRepository(dir),
  registerEntity: (repo) =>
    registerMilestoneEntity(repo as MilestoneRepository),
  seedTarget: () => ({ name: "To Be Archived" }),
  seedControl: () => ({ name: "Stays Visible" }),
});
