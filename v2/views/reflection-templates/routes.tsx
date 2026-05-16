// ReflectionTemplate view routes — factory list/create/edit + custom detail.

import { createDomainRoutes } from "../../factories/domain-routes.ts";
import { reflectionTemplateConfig } from "../../domains/reflection-template/config.tsx";
import { getReflectionTemplateService } from "../../singletons/services.ts";
import { ReflectionTemplateDetailView } from "../reflection-template-detail.tsx";
import { viewProps } from "../../middleware/view-props.ts";

export const reflectionTemplatesRouter = createDomainRoutes(
  reflectionTemplateConfig,
);

reflectionTemplatesRouter.get("/:id", async (c) => {
  const id = c.req.param("id");
  const item = await getReflectionTemplateService().getById(id);
  if (!item) return c.notFound();

  return c.html(
    <ReflectionTemplateDetailView
      {...viewProps(c, "/reflection-templates")}
      item={item}
    />,
  );
});
