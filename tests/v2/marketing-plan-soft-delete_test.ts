/**
 * Soft-delete acceptance suite — Marketing Plan.
 * Pattern: `[architecture] MD Planner — Soft-delete (archive) pattern`.
 */

import { registerMarketingPlanEntity } from "../../src/domains/marketing-plan/cache.ts";
import { MarketingPlanRepository } from "../../src/repositories/marketing-plan.repository.ts";
import { runSoftDeleteSuite } from "./helpers/soft-delete-suite.ts";

runSoftDeleteSuite({
  name: "MarketingPlan",
  table: "marketing_plans",
  filePath: (dir, id) => `${dir}/marketing-plans/${id}.md`,
  makeRepo: (dir) => new MarketingPlanRepository(dir),
  registerEntity: (repo) =>
    registerMarketingPlanEntity(repo as MarketingPlanRepository),
  seedTarget: () => ({ name: "To Be Archived" }),
  seedControl: () => ({ name: "Stays Visible" }),
});
