/**
 * Soft-delete acceptance suite — Reflection.
 * Pattern: `[architecture] MD Planner — Soft-delete (archive) pattern`.
 */

import { registerReflectionEntity } from "../../src/domains/reflection/cache.ts";
import { ReflectionRepository } from "../../src/repositories/reflection.repository.ts";
import { runSoftDeleteSuite } from "./helpers/soft-delete-suite.ts";

runSoftDeleteSuite({
  name: "Reflection",
  table: "reflection",
  filePath: (dir, id) => `${dir}/reflections/${id}.md`,
  makeRepo: (dir) => new ReflectionRepository(dir),
  registerEntity: (repo) =>
    registerReflectionEntity(repo as ReflectionRepository),
  seedTarget: () => ({
    title: "To Be Archived",
    period: "weekly" as const,
    date: "2026-01-01",
  }),
  seedControl: () => ({
    title: "Stays Visible",
    period: "weekly" as const,
    date: "2026-01-08",
  }),
});
