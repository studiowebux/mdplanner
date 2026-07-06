// Idea view routes — factory-generated list/create/edit + custom detail route.
// Structured fields edit via the factory sidenav; `description` edits in-place
// via "Edit Mode" (?editing=true, PUT /:id/description).

import type { AppContext } from "../../types/app.ts";
import { createDomainRoutes } from "../../factories/domain-routes.ts";
import { ideaConfig } from "../../domains/idea/config.tsx";
import { getIdeaService, getPeopleService } from "../../singletons/services.ts";
import { IdeaDetailView } from "../idea-detail.tsx";
import { viewProps } from "../../middleware/view-props.ts";
import { resolvePersonByName } from "../../utils/person-name-match.ts";

export const ideasRouter = createDomainRoutes(ideaConfig);

async function renderDetail(c: AppContext, id: string) {
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

  // Resolve submittedBy name → person for the detail-page link.
  // Tolerant resolver (exact → case-insensitive → unambiguous first-word).
  let submittedByPerson: { id: string; name: string } | null = null;
  if (idea.submittedBy) {
    const people = await getPeopleService().list();
    const match = resolvePersonByName(idea.submittedBy, people);
    if (match) submittedByPerson = { id: match.id, name: match.name };
  }

  const editing = c.req.query("editing") === "true";

  return c.html(
    <IdeaDetailView
      {...viewProps(c, "/ideas")}
      item={idea}
      linkedIdeas={linkedIdeas}
      backlinks={backlinks}
      submittedByPerson={submittedByPerson}
      editing={editing}
    />,
  );
}

ideasRouter.get(
  "/:id",
  (c: AppContext) => renderDetail(c, c.req.param("id")!),
);

ideasRouter.put("/:id/description", async (c: AppContext) => {
  const id = c.req.param("id")!;
  const body = await c.req.parseBody();
  const description = String(body.description ?? "").trim() || undefined;
  await getIdeaService().update(id, { description });
  return renderDetail(c, id);
});
