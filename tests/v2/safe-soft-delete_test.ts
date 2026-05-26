/**
 * Soft-delete acceptance suite — SAFe.
 * Pattern: `[architecture] MD Planner — Soft-delete (archive) pattern`.
 */

import { registerSafeEntity } from "../../v2/domains/safe/cache.ts";
import { SafeRepository } from "../../v2/repositories/safe.repository.ts";
import { runSoftDeleteSuite } from "./helpers/soft-delete-suite.ts";

runSoftDeleteSuite({
  name: "Safe",
  table: "safe",
  makeRepo: (dir) => new SafeRepository(dir),
  registerEntity: (repo) => registerSafeEntity(repo as SafeRepository),
  seedTarget: () => ({
    investor: "Angel To Archive",
    amount: 100000,
    date: "2026-01-01",
  }),
  seedControl: () => ({
    investor: "Angel Stays",
    amount: 50000,
    date: "2026-01-15",
  }),
});
