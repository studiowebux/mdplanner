/**
 * Soft-delete acceptance suite — Idea (canonical reference).
 *
 * Thin wrapper around the shared `runSoftDeleteSuite` helper. Domain
 * rollouts copy this file shape and swap the repo/entity/seed factories.
 * Pattern: `[architecture] MD Planner — Soft-delete (archive) pattern`.
 */

import { registerIdeaEntity } from "../../src/domains/idea/cache.ts";
import { IdeaRepository } from "../../src/repositories/idea.repository.ts";
import { runSoftDeleteSuite } from "./helpers/soft-delete-suite.ts";

runSoftDeleteSuite({
  name: "Idea reference",
  table: "ideas",
  makeRepo: (dir) => new IdeaRepository(dir),
  registerEntity: (repo) => registerIdeaEntity(repo as IdeaRepository),
  seedTarget: () => ({
    title: "To Be Archived",
    description: "Will be soft-deleted.",
    status: "new",
  }),
  seedControl: () => ({
    title: "Stays Visible",
    description: "Control row, never archived.",
    status: "new",
  }),
});
