// Reflection view routes — factory-generated list + custom detail.

import type { AppContext } from "../../types/app.ts";
import { createDomainRoutes } from "../../factories/domain-routes.ts";
import { reflectionConfig } from "../../domains/reflection/config.tsx";
import { getReflectionService } from "../../singletons/services.ts";
import { ReflectionDetailView } from "../reflection-detail.tsx";
import { viewProps } from "../../middleware/view-props.ts";

export const reflectionRouter = createDomainRoutes(reflectionConfig);

reflectionRouter.get("/:id", async (c: AppContext) => {
  const id = c.req.param("id");
  const item = await getReflectionService().getById(id!);
  if (!item) return c.notFound();
  return c.html(
    <ReflectionDetailView {...viewProps(c, "/reflections")} item={item} />,
  );
});
