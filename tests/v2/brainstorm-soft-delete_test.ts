/**
 * Soft-delete acceptance suite — Brainstorm.
 * Pattern: `[architecture] MD Planner — Soft-delete (archive) pattern`.
 */

import { registerBrainstormEntity } from "../../v2/domains/brainstorm/cache.ts";
import { BrainstormRepository } from "../../v2/repositories/brainstorm.repository.ts";
import { runSoftDeleteSuite } from "./helpers/soft-delete-suite.ts";

runSoftDeleteSuite({
  name: "Brainstorm",
  table: "brainstorms",
  makeRepo: (dir) => new BrainstormRepository(dir),
  registerEntity: (repo) =>
    registerBrainstormEntity(repo as BrainstormRepository),
  seedTarget: () => ({
    title: "To Be Archived",
    questions: [{ question: "Q1?", answer: "A1." }],
  }),
  seedControl: () => ({
    title: "Stays Visible",
    questions: [{ question: "Q2?", answer: "A2." }],
  }),
});
