/**
 * Soft-delete acceptance suite — Capacity Plan.
 * Pattern: `[architecture] MD Planner — Soft-delete (archive) pattern`.
 */

import { registerCapacityPlanEntity } from "../../v2/domains/capacity-plan/cache.ts";
import { CapacityPlanRepository } from "../../v2/repositories/capacity-plan.repository.ts";
import { runSoftDeleteSuite } from "./helpers/soft-delete-suite.ts";

runSoftDeleteSuite({
  name: "Capacity Plan",
  table: "capacity_plans",
  filePath: (dir, id) => `${dir}/capacity-plans/${id}.md`,
  makeRepo: (dir) => new CapacityPlanRepository(dir),
  registerEntity: (repo) =>
    registerCapacityPlanEntity(repo as CapacityPlanRepository),
  seedTarget: () => ({ title: "To Be Archived" }),
  seedControl: () => ({ title: "Stays Visible" }),
});
