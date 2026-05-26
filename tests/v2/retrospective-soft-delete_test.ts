/**
 * Soft-delete acceptance suite — Retrospective.
 * Pattern: `[architecture] MD Planner — Soft-delete (archive) pattern`.
 */

import { registerRetrospectiveEntity } from "../../v2/domains/retrospective/cache.ts";
import { RetrospectiveRepository } from "../../v2/repositories/retrospective.repository.ts";
import { runSoftDeleteSuite } from "./helpers/soft-delete-suite.ts";

runSoftDeleteSuite({
  name: "Retrospective",
  table: "retrospectives",
  makeRepo: (dir) => new RetrospectiveRepository(dir),
  registerEntity: (repo) =>
    registerRetrospectiveEntity(repo as RetrospectiveRepository),
  seedTarget: () => ({ title: "To Be Archived" }),
  seedControl: () => ({ title: "Stays Visible" }),
});
