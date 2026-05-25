/**
 * Soft-delete acceptance suite — C4 Component.
 * Pattern: `[architecture] MD Planner — Soft-delete (archive) pattern`.
 */

import { registerC4Entity } from "../../v2/domains/c4/cache.ts";
import { C4Repository } from "../../v2/repositories/c4.repository.ts";
import { runSoftDeleteSuite } from "./helpers/soft-delete-suite.ts";

runSoftDeleteSuite({
  name: "C4 Component",
  table: "c4_components",
  // C4 components live under `c4/` on disk.
  filePath: (dir, id) => `${dir}/c4/${id}.md`,
  makeRepo: (dir) => new C4Repository(dir),
  registerEntity: (repo) => registerC4Entity(repo as C4Repository),
  seedTarget: () => ({
    name: "To Be Archived",
    level: "container" as const,
    type: "API Application",
    position: { x: 0, y: 0 },
  }),
  seedControl: () => ({
    name: "Stays Visible",
    level: "container" as const,
    type: "Database",
    position: { x: 100, y: 100 },
  }),
});
