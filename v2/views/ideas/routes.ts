// Idea view routes — factory-generated list/create/edit + custom detail route.

import { createDomainRoutes } from "../../factories/domain-routes.ts";
import { ideaConfig } from "../../domains/idea/config.tsx";
import { getIdeaService } from "../../singletons/services.ts";
import { IdeaDetailView } from "../idea-detail.tsx";
import { viewProps } from "../../middleware/view-props.ts";

export const ideasRouter = createDomainRoutes(ideaConfig);

ideasRouter.get("/:id", async (c) => {
  const id = c.req.param("id");
  const idea = await getIdeaService().getById(id);
  if (!idea) return c.notFound();

  // Resolve linked ideas and compute backlinks
  const allIdeas = await getIdeaService().list();

  const linkedIds = new Set(idea.links ?? []);

  const linkedIdeas = (idea.links ?? [])
    .map((linkId) => {
      const linked = allIdeas.find((i) => i.id === linkId);
      return linked ? { id: linked.id, title: linked.title } : null;
    })
    .filter((l): l is { id: string; title: string } => l !== null);

  // Backlinks: ideas that reference this one but are NOT already in our links
  const backlinks = allIdeas
    .filter((other) =>
      other.id !== idea.id &&
      other.links?.includes(idea.id) &&
      !linkedIds.has(other.id)
    )
    .map((other) => ({ id: other.id, title: other.title }));

  return c.html(
    IdeaDetailView({
      ...viewProps(c, "/ideas"),
      item: idea,
      linkedIdeas,
      backlinks,
    }) as unknown as string,
  );
});
