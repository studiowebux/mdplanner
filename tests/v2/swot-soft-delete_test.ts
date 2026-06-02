/**
 * Soft-delete acceptance suite — SWOT.
 * Pattern: `[architecture] MD Planner — Soft-delete (archive) pattern`.
 */

import { registerSwotEntity } from "../../src/domains/swot/cache.ts";
import { SwotRepository } from "../../src/repositories/swot.repository.ts";
import { runSoftDeleteSuite } from "./helpers/soft-delete-suite.ts";

runSoftDeleteSuite({
  name: "Swot",
  table: "swot",
  makeRepo: (dir) => new SwotRepository(dir),
  registerEntity: (repo) => registerSwotEntity(repo as SwotRepository),
  seedTarget: () => ({ title: "SWOT To Archive", date: "2026-01-01" }),
  seedControl: () => ({ title: "SWOT Stays", date: "2026-02-01" }),
});
