// Contact view routes — factory-generated list/create/edit + custom detail route.

import { createDomainRoutes } from "../../factories/domain-routes.ts";
import { contactConfig } from "../../domains/contact/config.tsx";
import { getContactService } from "../../singletons/services.ts";
import { ContactDetailView } from "../contact-detail.tsx";
import { viewProps } from "../../middleware/view-props.ts";

export const contactsRouter = createDomainRoutes(contactConfig);

contactsRouter.get("/:id", async (c) => {
  const id = c.req.param("id");
  const contact = await getContactService().getById(id);
  if (!contact) return c.notFound();
  return c.html(
    <ContactDetailView
      {...viewProps(c, "/contacts")}
      item={contact}
    />,
  );
});
