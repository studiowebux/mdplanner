// Meeting view routes — factory-generated list/create/edit + custom detail route.

import { createDomainRoutes } from "../../factories/domain-routes.ts";
import { meetingConfig } from "../../domains/meeting/config.tsx";
import { getMeetingService } from "../../singletons/services.ts";
import { MeetingDetailView } from "../meeting-detail.tsx";
import { viewProps } from "../../middleware/view-props.ts";

export const meetingsRouter = createDomainRoutes(meetingConfig);

meetingsRouter.get("/:id", async (c) => {
  const id = c.req.param("id");
  const item = await getMeetingService().getById(id);
  if (!item) return c.notFound();

  return c.html(
    <MeetingDetailView
      {...viewProps(c, "/meetings")}
      item={item}
    />,
  );
});
