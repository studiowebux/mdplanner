// BrainstormTemplate view routes — factory list/create/edit + custom detail.

import { createDomainRoutes } from "../../factories/domain-routes.ts";
import { brainstormTemplateConfig } from "../../domains/brainstorm-template/config.tsx";
import { getBrainstormTemplateService } from "../../singletons/services.ts";
import { BrainstormTemplateDetailView } from "../brainstorm-template-detail.tsx";
import { viewProps } from "../../middleware/view-props.ts";

export const brainstormTemplatesRouter = createDomainRoutes(
  brainstormTemplateConfig,
);

brainstormTemplatesRouter.get("/:id", async (c) => {
  const id = c.req.param("id");
  const item = await getBrainstormTemplateService().getById(id);
  if (!item) return c.notFound();

  return c.html(
    <BrainstormTemplateDetailView
      {...viewProps(c, "/brainstorm-templates")}
      item={item}
    />,
  );
});
