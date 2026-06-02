/**
 * Soft-delete acceptance suite — Goal.
 * Pattern: `[architecture] MD Planner — Soft-delete (archive) pattern`.
 */

import { registerGoalEntity } from "../../src/domains/goal/cache.ts";
import { GoalRepository } from "../../src/repositories/goal.repository.ts";
import { runSoftDeleteSuite } from "./helpers/soft-delete-suite.ts";

runSoftDeleteSuite({
  name: "Goal",
  table: "goals",
  makeRepo: (dir) => new GoalRepository(dir),
  registerEntity: (repo) => registerGoalEntity(repo as GoalRepository),
  seedTarget: () => ({ title: "To Be Archived", type: "project" }),
  seedControl: () => ({ title: "Stays Visible", type: "project" }),
});
