/**
 * Soft-delete acceptance suite — Eisenhower.
 * Pattern: `[architecture] MD Planner — Soft-delete (archive) pattern`.
 */

import { registerEisenhowerEntity } from "../../src/domains/eisenhower/cache.ts";
import { EisenhowerRepository } from "../../src/repositories/eisenhower.repository.ts";
import { runSoftDeleteSuite } from "./helpers/soft-delete-suite.ts";

runSoftDeleteSuite({
  name: "Eisenhower",
  table: "eisenhower",
  makeRepo: (dir) => new EisenhowerRepository(dir),
  registerEntity: (repo) =>
    registerEisenhowerEntity(repo as EisenhowerRepository),
  seedTarget: () => ({ title: "To Be Archived" }),
  seedControl: () => ({ title: "Stays Visible" }),
});
