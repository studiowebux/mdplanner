/**
 * Soft-delete acceptance suite — MoSCoW.
 * Pattern: `[architecture] MD Planner — Soft-delete (archive) pattern`.
 */

import { registerMoscowEntity } from "../../src/domains/moscow/cache.ts";
import { MoscowRepository } from "../../src/repositories/moscow.repository.ts";
import { runSoftDeleteSuite } from "./helpers/soft-delete-suite.ts";

runSoftDeleteSuite({
  name: "Moscow",
  table: "moscow",
  makeRepo: (dir) => new MoscowRepository(dir),
  registerEntity: (repo) => registerMoscowEntity(repo as MoscowRepository),
  seedTarget: () => ({ title: "To Be Archived" }),
  seedControl: () => ({ title: "Stays Visible" }),
});
