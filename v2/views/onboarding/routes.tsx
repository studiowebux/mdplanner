// Onboarding view routes — factory list/create/edit + custom detail.

import { createDomainRoutes } from "../../factories/domain-routes.ts";
import { onboardingConfig } from "../../domains/onboarding/config.tsx";
import { getOnboardingService } from "../../singletons/services.ts";
import { OnboardingDetailView } from "../onboarding-detail.tsx";
import { viewProps } from "../../middleware/view-props.ts";

export const onboardingRouter = createDomainRoutes(onboardingConfig);

onboardingRouter.get("/:id", async (c) => {
  const id = c.req.param("id");
  const item = await getOnboardingService().getById(id);
  if (!item) return c.notFound();

  return c.html(
    <OnboardingDetailView
      {...viewProps(c, "/onboarding")}
      item={item}
    />,
  );
});
