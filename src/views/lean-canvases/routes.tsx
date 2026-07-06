// Lean Canvas view routes — factory list + shared inline section editing
// via registerSectionEditRoutes.

import { createDomainRoutes } from "../../factories/domain-routes.ts";
import { registerSectionEditRoutes } from "../../factories/section-edit-routes.tsx";
import { leanCanvasConfig } from "../../domains/lean-canvas/config.tsx";
import { getLeanCanvasService } from "../../singletons/services.ts";
import { LeanCanvasDetailView } from "../lean-canvas-detail.tsx";
import { LEAN_CANVAS_SECTIONS } from "../../types/lean-canvas.types.ts";

export const leanCanvasesRouter = createDomainRoutes(leanCanvasConfig);

registerSectionEditRoutes(leanCanvasesRouter, {
  path: "/lean-canvases",
  sections: LEAN_CANVAS_SECTIONS.map((s) => s.key),
  getService: getLeanCanvasService,
  DetailView: LeanCanvasDetailView,
});
