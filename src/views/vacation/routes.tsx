import { createDomainRoutes } from "../../factories/domain-routes.ts";
import { vacationConfig } from "../../domains/vacation/config.tsx";
import { getVacationService } from "../../singletons/services.ts";
import { hxTrigger } from "../../utils/hx-trigger.ts";

export const vacationRouter = createDomainRoutes(vacationConfig);

vacationRouter.post("/:id/approve", async (c) => {
  const id = c.req.param("id");
  const item = await getVacationService().getById(id);
  if (!item) return c.notFound();
  if (item.archived === true) {
    return new Response(null, {
      status: 422,
      headers: {
        "HX-Trigger": hxTrigger(
          "error",
          "Archived requests cannot be approved",
        ),
      },
    });
  }
  if (item.status !== "pending") {
    return new Response(null, {
      status: 422,
      headers: {
        "HX-Trigger": hxTrigger(
          "error",
          "Only pending requests can be approved",
        ),
      },
    });
  }
  await getVacationService().update(id, { status: "approved" });
  return new Response(null, {
    status: 204,
    headers: { "HX-Redirect": "/vacation" },
  });
});

vacationRouter.post("/:id/reject", async (c) => {
  const id = c.req.param("id");
  const item = await getVacationService().getById(id);
  if (!item) return c.notFound();
  if (item.archived === true) {
    return new Response(null, {
      status: 422,
      headers: {
        "HX-Trigger": hxTrigger(
          "error",
          "Archived requests cannot be rejected",
        ),
      },
    });
  }
  if (item.status !== "pending") {
    return new Response(null, {
      status: 422,
      headers: {
        "HX-Trigger": hxTrigger(
          "error",
          "Only pending requests can be rejected",
        ),
      },
    });
  }
  await getVacationService().update(id, { status: "rejected" });
  return new Response(null, {
    status: 204,
    headers: { "HX-Redirect": "/vacation" },
  });
});
