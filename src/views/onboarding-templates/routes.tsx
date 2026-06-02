// OnboardingTemplate view routes — factory list/create/edit + custom detail.

import type { AppContext } from "../../types/app.ts";
import { createDomainRoutes } from "../../factories/domain-routes.ts";
import { onboardingTemplateConfig } from "../../domains/onboarding-template/config.tsx";
import { getOnboardingTemplateService } from "../../singletons/services.ts";
import { OnboardingTemplateDetailView } from "../onboarding-template-detail.tsx";
import { viewProps } from "../../middleware/view-props.ts";
import { publish } from "../../singletons/event-bus.ts";

export const onboardingTemplatesRouter = createDomainRoutes(
  onboardingTemplateConfig,
);

/** Render the detail page; `?editing=true` enables in-place description editing. */
async function renderDetail(c: AppContext, id: string) {
  const item = await getOnboardingTemplateService().getById(id);
  if (!item) return c.notFound();
  const editing = c.req.query("editing") === "true";
  return c.html(
    <OnboardingTemplateDetailView
      {...viewProps(c, "/onboarding-templates")}
      item={item}
      editing={editing}
    />,
  );
}

onboardingTemplatesRouter.get(
  "/:id",
  (c) => renderDetail(c, c.req.param("id")),
);

// In-place description save (Edit Mode). Factory provides edit/delete routes.
onboardingTemplatesRouter.put("/:id/description", async (c) => {
  const id = c.req.param("id");
  const body = await c.req.parseBody();
  const description = String(body.description ?? "").trim() || undefined;
  await getOnboardingTemplateService().update(id, { description });
  publish("onboarding-template.updated");
  return renderDetail(c, id);
});
