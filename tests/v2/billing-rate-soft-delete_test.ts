/**
 * Soft-delete acceptance suite — Billing Rate.
 * Pattern: `[architecture] MD Planner — Soft-delete (archive) pattern`.
 */

import { registerBillingRateEntity } from "../../v2/domains/billing-rate/cache.ts";
import { BillingRateRepository } from "../../v2/repositories/billing-rate.repository.ts";
import { runSoftDeleteSuite } from "./helpers/soft-delete-suite.ts";

runSoftDeleteSuite({
  name: "Billing Rate",
  table: "billing_rates",
  // Billing rates live under `billing/rates/` on disk, not `billing_rates/`.
  filePath: (dir, id) => `${dir}/billing/rates/${id}.md`,
  makeRepo: (dir) => new BillingRateRepository(dir),
  registerEntity: (repo) =>
    registerBillingRateEntity(repo as BillingRateRepository),
  seedTarget: () => ({
    name: "To Be Archived",
    unit: "h",
    rate: 150,
    notes: "Will be soft-deleted.",
  }),
  seedControl: () => ({
    name: "Stays Visible",
    unit: "h",
    rate: 200,
    notes: "Control row.",
  }),
});
