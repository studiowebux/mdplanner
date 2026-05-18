// Business Model Canvas view routes — factory list + shared inline section
// editing via registerSectionEditRoutes.

import { createDomainRoutes } from "../../factories/domain-routes.ts";
import { registerSectionEditRoutes } from "../../factories/section-edit-routes.tsx";
import { businessModelConfig } from "../../domains/business-model/config.tsx";
import { getBusinessModelService } from "../../singletons/services.ts";
import { BusinessModelDetailView } from "../business-model-detail.tsx";
import { BUSINESS_MODEL_SECTION_KEYS } from "../../types/business-model.types.ts";

export const businessModelRouter = createDomainRoutes(businessModelConfig);

registerSectionEditRoutes(businessModelRouter, {
  path: "/business-models",
  ssePrefix: "business-model",
  sections: BUSINESS_MODEL_SECTION_KEYS,
  getService: getBusinessModelService,
  DetailView: BusinessModelDetailView,
});
