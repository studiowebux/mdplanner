// Onboarding view routes — factory list/create/edit + custom detail.
// Step completion + step-title edits persist via htmx POSTs that re-render
// the detail page (journal pattern); the API router stays JSON-only.

import type { AppContext } from "../../types/app.ts";
import { createDomainRoutes } from "../../factories/domain-routes.ts";
import { onboardingConfig } from "../../domains/onboarding/config.tsx";
import { getOnboardingService } from "../../singletons/services.ts";
import { OnboardingDetailView } from "../onboarding-detail.tsx";
import { viewProps } from "../../middleware/view-props.ts";
import { publish } from "../../singletons/event-bus.ts";

export const onboardingRouter = createDomainRoutes(onboardingConfig);

/** Render the onboarding detail page. */
async function renderDetail(c: AppContext, id: string) {
  const item = await getOnboardingService().getById(id);
  if (!item) return c.notFound();
  return c.html(
    <OnboardingDetailView
      {...viewProps(c, "/onboarding")}
      item={item}
    />,
  );
}

onboardingRouter.get(
  "/:id",
  (c: AppContext) => renderDetail(c, c.req.param("id")!),
);

// Toggle a step's completion (complete <-> not_started).
onboardingRouter.post("/:id/steps/:stepId/toggle", async (c: AppContext) => {
  const id = c.req.param("id")!;
  const stepId = c.req.param("stepId")!;
  const updated = await getOnboardingService().toggleStep(id, stepId);
  if (!updated) return c.notFound();
  publish("onboarding.updated");
  return renderDetail(c, id);
});

// Save an in-place step title edit.
onboardingRouter.post("/:id/steps/:stepId/title", async (c: AppContext) => {
  const id = c.req.param("id")!;
  const stepId = c.req.param("stepId")!;
  const body = await c.req.parseBody();
  const title = String(body.title ?? "").trim();
  if (!title) return renderDetail(c, id);
  const updated = await getOnboardingService().updateStepTitle(
    id,
    stepId,
    title,
  );
  if (!updated) return c.notFound();
  publish("onboarding.updated");
  return renderDetail(c, id);
});
