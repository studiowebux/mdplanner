/**
 * Soft-delete acceptance suite — Deal.
 * Pattern: `[architecture] MD Planner — Soft-delete (archive) pattern`.
 */

import { registerDealEntity } from "../../src/domains/deal/cache.ts";
import { DealRepository } from "../../src/repositories/deal.repository.ts";
import { runSoftDeleteSuite } from "./helpers/soft-delete-suite.ts";

runSoftDeleteSuite({
  name: "Deal",
  table: "deals",
  makeRepo: (dir) => new DealRepository(dir),
  registerEntity: (repo) => registerDealEntity(repo as DealRepository),
  seedTarget: () => ({ title: "To Be Archived", stage: "lead" }),
  seedControl: () => ({ title: "Stays Visible", stage: "lead" }),
});
