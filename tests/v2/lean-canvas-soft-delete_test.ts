/**
 * Soft-delete acceptance suite — Lean Canvas.
 * Pattern: `[architecture] MD Planner — Soft-delete (archive) pattern`.
 */

import { registerLeanCanvasEntity } from "../../src/domains/lean-canvas/cache.ts";
import { LeanCanvasRepository } from "../../src/repositories/lean-canvas.repository.ts";
import { runSoftDeleteSuite } from "./helpers/soft-delete-suite.ts";

runSoftDeleteSuite({
  name: "LeanCanvas",
  table: "lean_canvases",
  filePath: (dir, id) => `${dir}/leancanvas/${id}.md`,
  makeRepo: (dir) => new LeanCanvasRepository(dir),
  registerEntity: (repo) =>
    registerLeanCanvasEntity(repo as LeanCanvasRepository),
  seedTarget: () => ({ title: "To Be Archived" }),
  seedControl: () => ({ title: "Stays Visible" }),
});
