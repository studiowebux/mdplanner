// SWOT view routes — factory-generated list + shared inline quadrant editing
// via registerSectionEditRoutes.

import { createDomainRoutes } from "../../factories/domain-routes.ts";
import { registerSectionEditRoutes } from "../../factories/section-edit-routes.tsx";
import { swotConfig } from "../../domains/swot/config.tsx";
import { getSwotService } from "../../singletons/services.ts";
import { SwotDetailView } from "../swot-detail.tsx";
import { SWOT_QUADRANTS } from "../../domains/swot/constants.tsx";

export const swotRouter = createDomainRoutes(swotConfig);

registerSectionEditRoutes(swotRouter, {
  path: "/swot",
  ssePrefix: "swot",
  sections: SWOT_QUADRANTS.map((n) => n.toLowerCase()),
  getService: getSwotService,
  DetailView: SwotDetailView,
});
