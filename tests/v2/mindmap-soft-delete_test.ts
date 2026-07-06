/**
 * Soft-delete acceptance suite — Mindmap.
 * Pattern: `[architecture] MD Planner — Soft-delete (archive) pattern`.
 */

import { registerMindmapEntity } from "../../src/domains/mindmap/cache.ts";
import { MindmapRepository } from "../../src/repositories/mindmap.repository.ts";
import { runSoftDeleteSuite } from "./helpers/soft-delete-suite.ts";

runSoftDeleteSuite({
  name: "Mindmap",
  table: "mindmaps",
  makeRepo: (dir) => new MindmapRepository(dir),
  registerEntity: (repo) => registerMindmapEntity(repo as MindmapRepository),
  seedTarget: () => ({ title: "To Be Archived", project: "MD Planner" }),
  seedControl: () => ({ title: "Stays Visible", project: "MD Planner" }),
});
