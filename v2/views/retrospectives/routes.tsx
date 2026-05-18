// Retrospective view routes — factory list/create/edit + shared inline
// section editing (continue / stop / start) via registerSectionEditRoutes.

import { createDomainRoutes } from "../../factories/domain-routes.ts";
import { registerSectionEditRoutes } from "../../factories/section-edit-routes.tsx";
import { retrospectiveConfig } from "../../domains/retrospective/config.tsx";
import {
  getPeopleService,
  getRetrospectiveService,
} from "../../singletons/services.ts";
import { RetrospectiveDetailView } from "../retrospective-detail.tsx";
import { RETROSPECTIVE_SECTIONS } from "../../types/retrospective.types.ts";

export const retrospectivesRouter = createDomainRoutes(retrospectiveConfig);

registerSectionEditRoutes(retrospectivesRouter, {
  path: "/retrospectives",
  ssePrefix: "retrospective",
  sections: RETROSPECTIVE_SECTIONS.map((s) => s.key),
  getService: getRetrospectiveService,
  DetailView: RetrospectiveDetailView,
  // Build a name → person ID lookup so the detail view can link participants
  // to their People page — same pattern as goal contributors (goals/routes.tsx).
  resolveViewProps: async (retro) => {
    if (retro.participants.length === 0) return { personByName: {} };
    const names = new Set(retro.participants);
    const people = await getPeopleService().list();
    const personByName: Record<string, string> = {};
    for (const p of people) {
      if (names.has(p.name)) personByName[p.name] = p.id;
    }
    return { personByName };
  },
});
