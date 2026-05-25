/**
 * Soft-delete acceptance suite — Habit.
 * Pattern: `[architecture] MD Planner — Soft-delete (archive) pattern`.
 * Custom serialize() — archive guard preserves archived/_at/_by.
 */

import { registerHabitEntity } from "../../v2/domains/habit/cache.ts";
import { HabitRepository } from "../../v2/repositories/habit.repository.ts";
import { runSoftDeleteSuite } from "./helpers/soft-delete-suite.ts";

runSoftDeleteSuite({
  name: "Habit",
  table: "habit",
  filePath: (dir, id) => `${dir}/habits/${id}.md`,
  makeRepo: (dir) => new HabitRepository(dir),
  registerEntity: (repo) => registerHabitEntity(repo as HabitRepository),
  seedTarget: () => ({ title: "To Be Archived", frequency: "daily" }),
  seedControl: () => ({ title: "Stays Visible", frequency: "weekly" }),
});
