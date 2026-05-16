// OnboardingTemplate view routes — factory list/create/edit + custom detail.

import { createDomainRoutes } from "../../factories/domain-routes.ts";
import { onboardingTemplateConfig } from "../../domains/onboarding-template/config.tsx";
import { getOnboardingTemplateService } from "../../singletons/services.ts";
import { OnboardingTemplateDetailView } from "../onboarding-template-detail.tsx";
import { viewProps } from "../../middleware/view-props.ts";

export const onboardingTemplatesRouter = createDomainRoutes(
  onboardingTemplateConfig,
);

onboardingTemplatesRouter.get("/:id", async (c) => {
  const id = c.req.param("id");
  const item = await getOnboardingTemplateService().getById(id);
  if (!item) return c.notFound();

  return c.html(
    <OnboardingTemplateDetailView
      {...viewProps(c, "/onboarding-templates")}
      item={item}
    />,
  );
});
