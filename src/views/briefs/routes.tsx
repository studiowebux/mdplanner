// Brief view routes — factory list/create/edit + shared inline section editing.
// Every brief section is a string[] (summary, mission, RACI parties, budget,
// timeline, culture, …), so detail + per-item add/edit/remove come from the
// shared registerSectionEditRoutes (same path as SWOT / Retrospective).

import { createDomainRoutes } from "../../factories/domain-routes.ts";
import { registerSectionEditRoutes } from "../../factories/section-edit-routes.tsx";
import { briefConfig } from "../../domains/brief/config.tsx";
import { getBriefService } from "../../singletons/services.ts";
import { BriefDetailView } from "../brief-detail.tsx";
import { BRIEF_SECTIONS } from "../../types/brief.types.ts";

export const briefsRouter = createDomainRoutes(briefConfig);

registerSectionEditRoutes(briefsRouter, {
  path: "/briefs",
  ssePrefix: "brief",
  sections: BRIEF_SECTIONS.map((s) => s.key),
  getService: getBriefService,
  DetailView: BriefDetailView,
});
