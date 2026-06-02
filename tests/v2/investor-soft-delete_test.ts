/**
 * Soft-delete acceptance suite — Investor.
 * Pattern: `[architecture] MD Planner — Soft-delete (archive) pattern`.
 * Custom serialize() — archive guard preserves archived/_at/_by.
 */

import { registerInvestorEntity } from "../../src/domains/investor/cache.ts";
import { InvestorRepository } from "../../src/repositories/investor.repository.ts";
import { runSoftDeleteSuite } from "./helpers/soft-delete-suite.ts";

runSoftDeleteSuite({
  name: "Investor",
  table: "investor",
  filePath: (dir, id) => `${dir}/investors/${id}.md`,
  makeRepo: (dir) => new InvestorRepository(dir),
  registerEntity: (repo) => registerInvestorEntity(repo as InvestorRepository),
  seedTarget: () => ({
    name: "To Be Archived",
    type: "vc",
    stage: "lead",
    status: "not_started",
  }),
  seedControl: () => ({
    name: "Stays Visible",
    type: "angel",
    stage: "associate",
    status: "in_progress",
  }),
});
