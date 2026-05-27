// Contact view routes — factory-generated list/create/edit + custom detail route.
// Structured fields edit via the factory sidenav (GET/POST /:id/edit);
// `notes` edits in-place via "Edit Mode" (?editing=true, PUT /:id/notes).

import type { AppContext } from "../../types/app.ts";
import { createDomainRoutes } from "../../factories/domain-routes.ts";
import { contactConfig } from "../../domains/contact/config.tsx";
import { getContactService } from "../../singletons/services.ts";
import { ContactDetailView } from "../contact-detail.tsx";
import { viewProps } from "../../middleware/view-props.ts";
import { publish } from "../../singletons/event-bus.ts";

export const contactsRouter = createDomainRoutes(contactConfig);

async function renderDetail(c: AppContext, id: string) {
  const contact = await getContactService().getById(id);
  if (!contact) return c.notFound();
  const editing = c.req.query("editing") === "true";
  return c.html(
    <ContactDetailView
      {...viewProps(c, "/contacts")}
      item={contact}
      editing={editing}
    />,
  );
}

contactsRouter.get(
  "/:id",
  (c: AppContext) => renderDetail(c, c.req.param("id")!),
);

contactsRouter.put("/:id/notes", async (c: AppContext) => {
  const id = c.req.param("id")!;
  const body = await c.req.parseBody();
  const notes = String(body.notes ?? "").trim() || undefined;
  await getContactService().update(id, { notes });
  publish("contact.updated");
  return renderDetail(c, id);
});
