// Company view routes — factory-generated list/create/edit + custom detail route.

import { createDomainRoutes } from "../../factories/domain-routes.ts";
import { companyConfig } from "../../domains/company/config.tsx";
import { getCompanyService } from "../../singletons/services.ts";
import { CompanyDetailView } from "../company-detail.tsx";
import { viewProps } from "../../middleware/view-props.ts";

export const companiesRouter = createDomainRoutes(companyConfig);

companiesRouter.get("/:id", async (c) => {
  const id = c.req.param("id");
  const company = await getCompanyService().getById(id);
  if (!company) return c.notFound();
  return c.html(
    <CompanyDetailView
      {...viewProps(c, "/companies")}
      item={company}
    />,
  );
});
