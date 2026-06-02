/**
 * Soft-delete acceptance suite — Risk.
 * Pattern: `[architecture] MD Planner — Soft-delete (archive) pattern`.
 */

import { registerRiskEntity } from "../../src/domains/risk/cache.ts";
import { RiskRepository } from "../../src/repositories/risk.repository.ts";
import { runSoftDeleteSuite } from "./helpers/soft-delete-suite.ts";

runSoftDeleteSuite({
  name: "Risk",
  table: "risk",
  filePath: (dir, id) => `${dir}/risks/${id}.md`,
  makeRepo: (dir) => new RiskRepository(dir),
  registerEntity: (repo) => registerRiskEntity(repo as RiskRepository),
  seedTarget: () => ({
    title: "To Be Archived",
    category: "technical" as const,
    likelihood: 3,
    impact: 4,
    status: "open" as const,
  }),
  seedControl: () => ({
    title: "Stays Visible",
    category: "operational" as const,
    likelihood: 2,
    impact: 2,
    status: "open" as const,
  }),
});
