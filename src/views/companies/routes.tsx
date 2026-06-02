// Company view routes — factory-generated list/create/edit + custom detail route.
// Structured fields edit via the factory sidenav (GET/POST /:id/edit);
// `notes` edits in-place via "Edit Mode" (?editing=true, PUT /:id/notes).

import type { AppContext } from "../../types/app.ts";
import { createDomainRoutes } from "../../factories/domain-routes.ts";
import { companyConfig } from "../../domains/company/config.tsx";
import { getCompanyService } from "../../singletons/services.ts";
import { CompanyDetailView } from "../company-detail.tsx";
import { viewProps } from "../../middleware/view-props.ts";
import { publish } from "../../singletons/event-bus.ts";

export const companiesRouter = createDomainRoutes(companyConfig);

async function renderDetail(c: AppContext, id: string) {
  const company = await getCompanyService().getById(id);
  if (!company) return c.notFound();
  const editing = c.req.query("editing") === "true";
  return c.html(
    <CompanyDetailView
      {...viewProps(c, "/companies")}
      item={company}
      editing={editing}
    />,
  );
}

companiesRouter.get(
  "/:id",
  (c: AppContext) => renderDetail(c, c.req.param("id")!),
);

companiesRouter.put("/:id/notes", async (c: AppContext) => {
  const id = c.req.param("id")!;
  const body = await c.req.parseBody();
  const notes = String(body.notes ?? "").trim() || undefined;
  await getCompanyService().update(id, { notes });
  publish("company.updated");
  return renderDetail(c, id);
});
